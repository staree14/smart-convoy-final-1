# routers/route_visualization.py
from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from utils.helpers import compute_eta, haversine_km
from core.risk_zone_manager import get_risk_manager
import requests
from datetime import datetime, timedelta

router = APIRouter()


@router.get("/predict_eta")
def predict_eta(
        start_lat: float = Query(...),
        start_lon: float = Query(...),
        end_lat: float = Query(...),
        end_lon: float = Query(...),
        traffic_level: int = 1,
        terrain: str = "plain",
        priority: str = "normal"
):
    """
    Predict ETA between two points.
    Returns JSON for React frontend.
    """
    result = compute_eta(
        start_lat, start_lon, end_lat, end_lon,
        traffic_level, terrain, "truck", priority
    )
    return JSONResponse(result)


@router.get("/get_route")
def get_route(
        start_lat: float = Query(...),
        start_lon: float = Query(...),
        end_lat: float = Query(...),
        end_lon: float = Query(...),
        traffic_level: int = 1,
        terrain: str = "plain"
):
    """
    Get route data for React frontend visualization.
    Returns route coordinates, distance, duration, and checkpoints.

    Example: /api/routes/get_route?start_lat=28.6139&start_lon=77.2090&end_lat=28.4595&end_lon=77.0266
    """
    try:
        route_coordinates = None
        total_distance_km = 0
        osrm_duration_sec = 0
        osrm_available = False

        # Try to get route from OSRM
        try:
            coords_str = f"{start_lon},{start_lat};{end_lon},{end_lat}"
            url = f"https://router.project-osrm.org/route/v1/driving/{coords_str}?overview=full&geometries=geojson"
            resp = requests.get(url, timeout=10)
            resp.raise_for_status()
            data = resp.json()

            if "routes" in data and data["routes"]:
                # Extract route data
                route = data["routes"][0]
                geometry = route["geometry"]["coordinates"]

                # Convert to [lat, lon] format for frontend
                route_coordinates = [[coord[1], coord[0]] for coord in geometry]

                total_distance_km = route.get("distance", 0) / 1000
                osrm_duration_sec = route.get("duration", 0)
                osrm_available = True
                print(f"[ROUTE] OSRM route fetched: {len(route_coordinates)} points")
        except Exception as e:
            print(f"[ROUTE] OSRM unavailable ({str(e)}), falling back to straight line route")

        # Fallback: Create straight line route if OSRM failed
        if route_coordinates is None:
            # Create straight line with intermediate points for better visualization
            num_points = 10
            route_coordinates = []
            for i in range(num_points + 1):
                fraction = i / num_points
                lat = start_lat + (end_lat - start_lat) * fraction
                lon = start_lon + (end_lon - start_lon) * fraction
                route_coordinates.append([lat, lon])

            # Calculate straight line distance
            total_distance_km = haversine_km(start_lat, start_lon, end_lat, end_lon)
            print(f"[ROUTE] Using fallback straight line route: {total_distance_km:.2f} km")

        # Get ETA with our model
        eta_data = compute_eta(
            start_lat, start_lon, end_lat, end_lon,
            traffic_level, terrain, "truck", "normal"
        )
        eta_minutes = eta_data.get("eta_minutes", 0)

        # Calculate times
        departure = datetime.now()
        arrival = departure + timedelta(minutes=eta_minutes)

        # Generate checkpoints (3 evenly spaced points along route)
        checkpoints = []
        if len(route_coordinates) > 4:
            checkpoint_indices = [
                len(route_coordinates) // 4,
                len(route_coordinates) // 2,
                3 * len(route_coordinates) // 4
            ]

            for i, idx in enumerate(checkpoint_indices, 1):
                lat, lon = route_coordinates[idx]

                # Calculate ETA to checkpoint
                cp_eta = compute_eta(
                    start_lat, start_lon, lat, lon,
                    traffic_level, terrain, "truck", "normal"
                )
                cp_minutes = cp_eta.get("eta_minutes", 0)
                cp_arrival = departure + timedelta(minutes=cp_minutes)

                checkpoints.append({
                    "checkpoint_id": i,
                    "lat": lat,
                    "lon": lon,
                    "time_from_start_minutes": round(cp_minutes, 1),
                    "estimated_arrival": cp_arrival.strftime("%H:%M:%S")
                })

        # Detect risk zones along the route
        risk_analysis = {}
        danger_points = []
        try:
            risk_manager = get_risk_manager()
            route_coords = [(coord[0], coord[1]) for coord in route_coordinates]
            risk_analysis = risk_manager.detect_route_risks(route_coords, buffer_km=1.0)
            danger_points = risk_analysis.get("danger_points", [])
            print(f"[ROUTE] Found {len(danger_points)} risk zones along route")
        except Exception as e:
            print(f"[ROUTE] Risk detection failed: {e}")
            risk_analysis = {"total_dangers": 0, "danger_points": [], "risk_summary": {}}

        return JSONResponse({
            "status": "success",
            "route": {
                "coordinates": route_coordinates,  # Array of [lat, lon]
                "distance_km": round(total_distance_km, 2),
                "duration_minutes": round(eta_minutes, 1),
                "osrm_duration_seconds": osrm_duration_sec,
                "departure_time": departure.strftime("%H:%M:%S"),
                "estimated_arrival": arrival.strftime("%H:%M:%S"),
                "terrain": terrain,
                "traffic_level": traffic_level,
                "model_used": eta_data.get("model_used", False),
                "osrm_available": osrm_available,
                "route_type": "osrm" if osrm_available else "straight_line"
            },
            "start_point": {
                "lat": start_lat,
                "lon": start_lon
            },
            "end_point": {
                "lat": end_lat,
                "lon": end_lon
            },
            "checkpoints": checkpoints,
            "danger_points": danger_points,
            "risk_analysis": risk_analysis,
            "warning": None if osrm_available else "OSRM routing service unavailable - showing straight line route as fallback"
        })

    except Exception as e:
        return JSONResponse(
            {"status": "error", "message": str(e)},
            status_code=500
        )


@router.post("/optimize_convoy_route")
def optimize_convoy_route(convoy_id: int):
    """
    Get optimized route for a specific convoy.
    Returns route with risk zones and checkpoints.

    Example: POST /api/routes/optimize_convoy_route?convoy_id=1
    """
    from routers.convoy_routes import convoys_db

    # Find convoy by ID (convoys_db uses convoy_name as key)
    convoy = None
    for c in convoys_db.values():
        if c.id == convoy_id:
            convoy = c
            break

    if not convoy:
        return JSONResponse(
            {"status": "error", "message": "Convoy not found"},
            status_code=404
        )

    # Get route for convoy
    result = get_route(
        start_lat=convoy.source_lat,
        start_lon=convoy.source_lon,
        end_lat=convoy.destination_lat,
        end_lon=convoy.destination_lon,
        traffic_level=1,  # Can be dynamic
        terrain="plain"  # Can be dynamic
    )

    # Parse the JSON response
    route_data = result.body.decode('utf-8')
    import json
    parsed = json.loads(route_data)

    if parsed.get("status") == "error":
        return result

    # Add convoy-specific data
    parsed["convoy_info"] = {
        "convoy_id": convoy.id,
        "convoy_name": convoy.convoy_name,
        "vehicle_count": convoy.vehicle_count,
        "total_load_kg": convoy.total_load_kg,
        "priority": convoy.priority.value
    }

    return JSONResponse(parsed)


@router.get("/multi_convoy_routes")
def multi_convoy_routes(convoy_ids: str = Query(..., description="Comma-separated convoy IDs, e.g., '1,2,3'")):
    """
    Get routes for multiple convoys at once.
    Useful for dashboard visualization showing all active convoys.

    Example: /api/routes/multi_convoy_routes?convoy_ids=1,2,3
    """
    from routers.convoy_routes import convoys_db

    try:
        ids = [int(id.strip()) for id in convoy_ids.split(",")]
    except:
        return JSONResponse(
            {"status": "error", "message": "Invalid convoy IDs format"},
            status_code=400
        )

    routes = []

    for convoy_id in ids:
        # Find convoy by ID (convoys_db uses convoy_name as key)
        convoy = None
        for c in convoys_db.values():
            if c.id == convoy_id:
                convoy = c
                break

        if not convoy:
            continue

        try:
            # Get route
            route_response = get_route(
                start_lat=convoy.source_lat,
                start_lon=convoy.source_lon,
                end_lat=convoy.destination_lat,
                end_lon=convoy.destination_lon,
                traffic_level=1,
                terrain="plain"
            )

            import json
            route_data = json.loads(route_response.body.decode('utf-8'))

            if route_data.get("status") == "success":
                routes.append({
                    "convoy_id": convoy.id,
                    "convoy_name": convoy.convoy_name,
                    "priority": convoy.priority.value,
                    "vehicle_count": convoy.vehicle_count,
                    "route": route_data.get("route"),
                    "start_point": route_data.get("start_point"),
                    "end_point": route_data.get("end_point"),
                    "checkpoints": route_data.get("checkpoints")
                })
        except Exception as e:
            continue

    return JSONResponse({
        "status": "success",
        "count": len(routes),
        "routes": routes
    })