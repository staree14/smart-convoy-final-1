# routers/convoy_routes.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from models.convoy import Convoy, Vehicle
from utils.helpers import haversine_km
from utils.auth_utils import get_current_user
from db_connection import get_connection
from geocode_router import geocode_place
from core.dynamic_router import dynamic_reroute
import requests
import json
import time
from typing import Optional
from pydantic import BaseModel

router = APIRouter()

# Request model for merge suggestion
class MergeRequest(BaseModel):
    convoy_a_id: int
    convoy_b_id: int
    max_extra_minutes: float = 30.0
    same_dest_radius_km: float = 5.0


# ----------------------------
# Create convoy + vehicles + route
# ----------------------------
@router.post("/create")
def create_convoy(convoy: Convoy, current_user: dict = Depends(get_current_user)):
    """
    Create a new convoy and persist vehicles and route if provided.
    Automatically sets created_by = logged-in user_id (from JWT).
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Geocode places if needed (Nominatim requires 1 request/second rate limit)
        if convoy.source_place and (convoy.source_lat is None or convoy.source_lon is None):
            s = geocode_place(convoy.source_place)
            if s:
                convoy.source_lat = s["lat"]
                convoy.source_lon = s["lon"]
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to geocode source location '{convoy.source_place}'. Please try a more specific address (e.g., 'New Delhi, India' instead of just 'Delhi')"
                )
            # Rate limit: wait 1 second before next geocode request
            time.sleep(1)

        if convoy.destination_place and (convoy.destination_lat is None or convoy.destination_lon is None):
            d = geocode_place(convoy.destination_place)
            if d:
                convoy.destination_lat = d["lat"]
                convoy.destination_lon = d["lon"]
            else:
                raise HTTPException(
                    status_code=400,
                    detail=f"Failed to geocode destination location '{convoy.destination_place}'. Please try a more specific address (e.g., 'Mumbai, India' instead of just 'Mumbai')"
                )

        # Validate coordinates exist
        if convoy.source_lat is None or convoy.source_lon is None or convoy.destination_lat is None or convoy.destination_lon is None:
            raise HTTPException(
                status_code=400,
                detail="Convoy must include source and destination coordinates. Either provide place names for geocoding or provide lat/lon coordinates directly."
            )

        # Validate each vehicle's load vs capacity
        for idx, v in enumerate(convoy.vehicles, 1):
            if v.load_weight_kg > v.capacity_kg:
                raise HTTPException(
                    status_code=400,
                    detail=f"Vehicle {idx} ({v.registration_number}): Load ({v.load_weight_kg:.2f} kg) exceeds capacity ({v.capacity_kg:.2f} kg). Please reduce load by {(v.load_weight_kg - v.capacity_kg):.2f} kg."
                )

        # Insert convoy with created_by = user_id
        cur.execute("""
            INSERT INTO convoys
            (convoy_name, source_place, destination_place,
             source_lat, source_lon, destination_lat, destination_lon, priority, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING convoy_id;
        """, (
            convoy.convoy_name,
            convoy.source_place or None,
            convoy.destination_place or None,
            convoy.source_lat,
            convoy.source_lon,
            convoy.destination_lat,
            convoy.destination_lon,
            convoy.priority.value if hasattr(convoy.priority, "value") else convoy.priority,
            user_id
        ))

        row = cur.fetchone()
        convoy_id = row["convoy_id"]

        # Insert vehicles
        for v in convoy.vehicles:
            cur.execute("""
                INSERT INTO vehicles
                (convoy_id, vehicle_type, registration_number, load_type, load_weight_kg, capacity_kg, driver_name, current_status)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                RETURNING vehicle_id;
            """, (
                convoy_id,
                v.vehicle_type.value if hasattr(v.vehicle_type, "value") else v.vehicle_type,
                v.registration_number,
                v.load_type.value if hasattr(v.load_type, "value") else v.load_type,
                v.load_weight_kg,
                v.capacity_kg,
                v.driver_name,
                v.current_status.value if hasattr(v.current_status, "value") else v.current_status
            ))

        # Insert route if present
        if getattr(convoy, "route", None):
            waypoints_json = json.dumps(convoy.route.waypoints) if convoy.route.waypoints else None

            # Ensure routes table has waypoints column
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                                   WHERE table_name='routes' AND column_name='waypoints') THEN
                        ALTER TABLE routes ADD COLUMN waypoints JSONB;
                    END IF;
                END$$;
            """)

            cur.execute("""
                INSERT INTO routes (convoy_id, waypoints, total_distance_km, estimated_duration_minutes)
                VALUES (%s, %s, %s, %s)
                RETURNING route_id;
            """, (
                convoy_id,
                waypoints_json,
                getattr(convoy.route, "total_distance_km", None),
                getattr(convoy.route, "estimated_duration_minutes", None)
            ))

        conn.commit()
        return JSONResponse({
            "status": "success",
            "convoy_id": convoy_id,
            "convoy_name": convoy.convoy_name,
            "vehicle_count": len(convoy.vehicles),
            "total_load_kg": convoy.total_load_kg,
            "priority": convoy.priority.value if hasattr(convoy.priority, "value") else convoy.priority,
            "message": f"Convoy '{convoy.convoy_name}' created successfully"
        })

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ----------------------------
# Add vehicle to existing convoy
# ----------------------------
@router.post("/add-vehicle/{convoy_id}")
def add_vehicle_to_convoy(convoy_id: int, vehicle: Vehicle, current_user: dict = Depends(get_current_user)):
    """
    Add a vehicle to an existing convoy.
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        # Check convoy exists
        cur.execute("SELECT convoy_id FROM convoys WHERE convoy_id=%s;", (convoy_id,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Convoy not found")

        # Check duplicate registration
        if getattr(vehicle, "registration_number", None):
            cur.execute("""
                SELECT 1 FROM vehicles WHERE convoy_id=%s AND registration_number=%s LIMIT 1;
            """, (convoy_id, vehicle.registration_number))
            if cur.fetchone():
                raise HTTPException(status_code=400, detail="Vehicle registration already exists for this convoy")

        # Insert vehicle
        cur.execute("""
            INSERT INTO vehicles
            (convoy_id, vehicle_type, registration_number, load_type, load_weight_kg, capacity_kg, driver_name, current_status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING vehicle_id;
        """, (
            convoy_id,
            vehicle.vehicle_type.value if hasattr(vehicle.vehicle_type, "value") else vehicle.vehicle_type,
            getattr(vehicle, "registration_number", None),
            vehicle.load_type.value if hasattr(vehicle.load_type, "value") else vehicle.load_type,
            vehicle.load_weight_kg,
            vehicle.capacity_kg,
            vehicle.driver_name,
            vehicle.current_status.value if hasattr(vehicle.current_status, "value") else vehicle.current_status
        ))

        row = cur.fetchone()
        vehicle_id = row["vehicle_id"]

        conn.commit()
        return JSONResponse({"status": "success", "vehicle_id": vehicle_id, "message": f"Vehicle {vehicle.registration_number} added successfully."})

    except HTTPException:
        conn.rollback()
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ----------------------------
# List convoys
# ----------------------------
@router.get("/list")
def list_convoys(current_user: dict = Depends(get_current_user)):
    """
    List all convoys created by the logged-in user only.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        cur.execute("""
            SELECT convoy_id, convoy_name, priority, source_place, destination_place,
                   source_lat, source_lon, destination_lat, destination_lon, created_at, created_by,
                   status
            FROM convoys
            WHERE created_by = %s
            ORDER BY created_at DESC;
        """, (user_id,))
        rows = cur.fetchall()

        convoys = []
        for rec in rows:
            # Count vehicles
            cur.execute("SELECT COUNT(*) as count FROM vehicles WHERE convoy_id=%s;", (rec["convoy_id"],))
            vehicle_count = cur.fetchone()["count"]

            # Calculate total load
            cur.execute("SELECT COALESCE(SUM(load_weight_kg), 0) as total_load FROM vehicles WHERE convoy_id=%s;", (rec["convoy_id"],))
            total_load = cur.fetchone()["total_load"]

            convoys.append({
                "id": rec["convoy_id"],
                "convoy_name": rec["convoy_name"],
                "priority": rec["priority"],
                "status": rec.get("status", "pending"),
                "vehicle_count": vehicle_count,
                "total_load_kg": float(total_load),
                "source": {"lat": rec["source_lat"], "lon": rec["source_lon"], "place": rec["source_place"]},
                "destination": {"lat": rec["destination_lat"], "lon": rec["destination_lon"], "place": rec["destination_place"]},
                "created_at": str(rec["created_at"]) if rec.get("created_at") else None,
                "created_by": rec["created_by"]
            })

        return JSONResponse({"status": "success", "count": len(convoys), "convoys": convoys})

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ----------------------------
# Get convoy details
# ----------------------------
@router.get("/{convoy_id}")
def get_convoy(convoy_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get convoy details by ID.
    Requires authentication - users can only access convoys they created.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        # Get convoy and verify ownership
        cur.execute("""
            SELECT convoy_id, convoy_name, priority, source_place, destination_place,
                   source_lat, source_lon, destination_lat, destination_lon, created_at, created_by
            FROM convoys WHERE convoy_id=%s;
        """, (convoy_id,))

        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Convoy not found")

        # Verify user owns this convoy
        if rec["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied: You can only view your own convoys")

        # Get vehicles
        cur.execute("""
            SELECT vehicle_id, vehicle_type, registration_number, load_type, load_weight_kg,
                   capacity_kg, driver_name, current_status
            FROM vehicles WHERE convoy_id=%s ORDER BY vehicle_id;
        """, (convoy_id,))
        vehicles_raw = cur.fetchall()

        # Format vehicles for frontend
        vehicles = []
        total_load = 0
        for v in vehicles_raw:
            vehicles.append({
                "registration": v["registration_number"],
                "type": v["vehicle_type"],
                "status": v["current_status"],
                "driver": v["driver_name"],
                "load_type": v["load_type"],
                "load_kg": float(v["load_weight_kg"]),
                "capacity_kg": float(v["capacity_kg"])
            })
            total_load += float(v["load_weight_kg"] or 0)

        # Get route
        cur.execute("""
            SELECT route_id, waypoints, total_distance_km, estimated_duration_minutes
            FROM routes WHERE convoy_id=%s LIMIT 1;
        """, (convoy_id,))
        route = cur.fetchone()

        return JSONResponse({
            "status": "success",
            "convoy": {
                "id": rec["convoy_id"],
                "convoy_name": rec["convoy_name"],
                "priority": rec["priority"],
                "source_place": rec["source_place"],
                "destination_place": rec["destination_place"],
                "source_lat": rec["source_lat"],
                "source_lon": rec["source_lon"],
                "destination_lat": rec["destination_lat"],
                "destination_lon": rec["destination_lon"],
                "source": {"lat": rec["source_lat"], "lon": rec["source_lon"]},
                "destination": {"lat": rec["destination_lat"], "lon": rec["destination_lon"]},
                "vehicles": vehicles,
                "vehicle_count": len(vehicles),
                "total_load_kg": total_load,
                "route": dict(route) if route else None,
                "created_at": str(rec["created_at"]) if rec.get("created_at") else None
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ----------------------------
# Delete convoy
# ----------------------------
@router.delete("/{convoy_id}")
def delete_convoy(convoy_id: int, current_user: dict = Depends(get_current_user)):
    """
    Delete a convoy by ID.
    Requires authentication - users can only delete convoys they created.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        cur.execute("SELECT convoy_name, created_by FROM convoys WHERE convoy_id=%s;", (convoy_id,))
        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Convoy not found")

        # Verify user owns this convoy
        if rec["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied: You can only delete your own convoys")

        conv_name = rec["convoy_name"]
        cur.execute("DELETE FROM convoys WHERE convoy_id=%s;", (convoy_id,))
        conn.commit()

        return JSONResponse({"status": "success", "message": f"Convoy '{conv_name}' deleted successfully"})

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


# ----------------------------
# Suggest merge (with database integration)
# ----------------------------
@router.post("/suggest_merge")
def suggest_merge(request: MergeRequest):
    """
    Suggest whether two convoys should merge based on capacity, destination proximity, and route detour.

    Rules:
      - Destinations must be within same_dest_radius_km kilometers (checked first)
      - One convoy must have spare capacity to absorb the other's load
      - Detour must be <= max_extra_minutes

    Example JSON body:
    {
      "convoy_a_id": 1,
      "convoy_b_id": 2,
      "max_extra_minutes": 30.0,
      "same_dest_radius_km": 5.0
    }
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Fetch convoy A from database
        cur.execute("""
            SELECT convoy_id, convoy_name, priority, source_lat, source_lon, destination_lat, destination_lon
            FROM convoys WHERE convoy_id=%s;
        """, (request.convoy_a_id,))
        convoy_a_rec = cur.fetchone()
        if not convoy_a_rec:
            raise HTTPException(status_code=404, detail=f"Convoy with ID {request.convoy_a_id} not found")

        # Fetch convoy B from database
        cur.execute("""
            SELECT convoy_id, convoy_name, priority, source_lat, source_lon, destination_lat, destination_lon
            FROM convoys WHERE convoy_id=%s;
        """, (request.convoy_b_id,))
        convoy_b_rec = cur.fetchone()
        if not convoy_b_rec:
            raise HTTPException(status_code=404, detail=f"Convoy with ID {request.convoy_b_id} not found")

        # Fetch vehicles for both convoys
        cur.execute("SELECT load_weight_kg, capacity_kg FROM vehicles WHERE convoy_id=%s;", (request.convoy_a_id,))
        vehicles_a = cur.fetchall()

        cur.execute("SELECT load_weight_kg, capacity_kg FROM vehicles WHERE convoy_id=%s;", (request.convoy_b_id,))
        vehicles_b = cur.fetchall()

        # IMPROVED MERGE LOGIC: Check if routes intersect and calculate meeting point
        # First check destination proximity
        dest_dist_km = haversine_km(
            convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"],
            convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"]
        )

        destinations_close = dest_dist_km <= request.same_dest_radius_km

        # Calculate route intersection point
        def point_to_line_distance(px, py, x1, y1, x2, y2):
            """Calculate perpendicular distance from point to line segment and closest point"""
            dx = x2 - x1
            dy = y2 - y1

            if dx == 0 and dy == 0:
                return haversine_km(y1, x1, py, px), y1, x1

            # Parameter t for projection onto line (0 = start, 1 = end)
            t = max(0, min(1, ((px - x1) * dx + (py - y1) * dy) / (dx * dx + dy * dy)))

            # Closest point on line segment
            closest_x = x1 + t * dx
            closest_y = y1 + t * dy

            return haversine_km(closest_y, closest_x, py, px), closest_y, closest_x

        # Check if B's source is on A's route
        b_dist_to_a, b_meet_lat, b_meet_lon = point_to_line_distance(
            convoy_b_rec["source_lon"], convoy_b_rec["source_lat"],
            convoy_a_rec["source_lon"], convoy_a_rec["source_lat"],
            convoy_a_rec["destination_lon"], convoy_a_rec["destination_lat"]
        )

        # Check if A's source is on B's route
        a_dist_to_b, a_meet_lat, a_meet_lon = point_to_line_distance(
            convoy_a_rec["source_lon"], convoy_a_rec["source_lat"],
            convoy_b_rec["source_lon"], convoy_b_rec["source_lat"],
            convoy_b_rec["destination_lon"], convoy_b_rec["destination_lat"]
        )

        # Routes intersect if either source is within 15 km of the other's route
        ROUTE_PROXIMITY_KM = 15.0
        b_on_a_route = b_dist_to_a <= ROUTE_PROXIMITY_KM
        a_on_b_route = a_dist_to_b <= ROUTE_PROXIMITY_KM

        # Merge is possible if either destinations are close OR routes intersect
        if not (destinations_close or b_on_a_route or a_on_b_route):
            return JSONResponse({
                "can_merge": False,
                "reason": f"Destinations too far ({dest_dist_km:.1f} km apart, limit: {request.same_dest_radius_km} km) and routes don't intersect (closest: {min(b_dist_to_a, a_dist_to_b):.1f} km, limit: {ROUTE_PROXIMITY_KM} km)",
                "dest_distance_km": round(dest_dist_km, 2),
                "b_distance_to_a_route_km": round(b_dist_to_a, 2),
                "a_distance_to_b_route_km": round(a_dist_to_b, 2),
                "routes_intersect": False
            })

        # Calculate capacity and load for each convoy
        total_capacity_a = sum(v["capacity_kg"] for v in vehicles_a)
        total_load_a = sum(v["load_weight_kg"] for v in vehicles_a)
        total_capacity_b = sum(v["capacity_kg"] for v in vehicles_b)
        total_load_b = sum(v["load_weight_kg"] for v in vehicles_b)

        avail_a = total_capacity_a - total_load_a
        avail_b = total_capacity_b - total_load_b

        # Determine merge scenarios based on capacity
        a_can_absorb_b = avail_a >= total_load_b
        b_can_absorb_a = avail_b >= total_load_a

        # NEW: Check if partial load transfer is possible (for checkpoint-based transfer)
        can_transfer_partial = avail_a > 0 or avail_b > 0

        if not (a_can_absorb_b or b_can_absorb_a or can_transfer_partial):
            return JSONResponse({
                "can_merge": False,
                "reason": "Both convoys are at full capacity - no load transfer possible",
                "convoy_a_spare_kg": round(avail_a, 2),
                "convoy_b_spare_kg": round(avail_b, 2),
                "convoy_a_load_kg": round(total_load_a, 2),
                "convoy_b_load_kg": round(total_load_b, 2)
            })

        # Helper to get OSRM route duration
        def osrm_duration(points):
            coords = ";".join([f"{p[1]},{p[0]}" for p in points])
            url = f"https://router.project-osrm.org/route/v1/driving/{coords}?overview=false"
            try:
                r = requests.get(url, timeout=10)
                r.raise_for_status()
                j = r.json()

                # Check for OSRM errors
                if j.get("code") != "Ok":
                    print(f"[MERGE] OSRM error: {j.get('code')} - {j.get('message')}")
                    return None, None

                if "routes" in j and j["routes"]:
                    duration = j["routes"][0].get("duration")
                    distance = j["routes"][0].get("distance")
                    print(f"[MERGE] OSRM success: {duration}s, {distance}m for {len(points)} points")
                    return duration, distance
                else:
                    print(f"[MERGE] OSRM returned no routes for {len(points)} points")
                    return None, None
            except requests.exceptions.Timeout:
                print(f"[MERGE] OSRM timeout for URL: {url}")
                return None, None
            except requests.exceptions.RequestException as e:
                print(f"[MERGE] OSRM request failed: {e}")
                return None, None
            except Exception as e:
                print(f"[MERGE] OSRM unexpected error: {e}")
                return None, None

        # Scenario A picks up B
        direct_dur_A, _ = osrm_duration([
            (convoy_a_rec["source_lat"], convoy_a_rec["source_lon"]),
            (convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"])
        ])
        pickup_dur_A, _ = osrm_duration([
            (convoy_a_rec["source_lat"], convoy_a_rec["source_lon"]),
            (convoy_b_rec["source_lat"], convoy_b_rec["source_lon"]),
            (convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"])
        ])
        extra_A = None
        if direct_dur_A is not None and pickup_dur_A is not None:
            extra_A = (pickup_dur_A - direct_dur_A) / 60.0
        elif a_can_absorb_b:
            # Fallback: estimate using Haversine
            print("[MERGE] Using Haversine fallback for A picks B scenario")
            direct_km = haversine_km(
                convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"]
            )
            detour_km = (
                haversine_km(convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                           convoy_b_rec["source_lat"], convoy_b_rec["source_lon"]) +
                haversine_km(convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                           convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"])
            )
            extra_km = detour_km - direct_km
            extra_A = (extra_km / 50.0) * 60.0  # Assume 50 km/h avg speed

        # Scenario B picks up A
        direct_dur_B, _ = osrm_duration([
            (convoy_b_rec["source_lat"], convoy_b_rec["source_lon"]),
            (convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"])
        ])
        pickup_dur_B, _ = osrm_duration([
            (convoy_b_rec["source_lat"], convoy_b_rec["source_lon"]),
            (convoy_a_rec["source_lat"], convoy_a_rec["source_lon"]),
            (convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"])
        ])
        extra_B = None
        if direct_dur_B is not None and pickup_dur_B is not None:
            extra_B = (pickup_dur_B - direct_dur_B) / 60.0
        elif b_can_absorb_a:
            # Fallback: estimate using Haversine
            print("[MERGE] Using Haversine fallback for B picks A scenario")
            direct_km = haversine_km(
                convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"]
            )
            detour_km = (
                haversine_km(convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                           convoy_a_rec["source_lat"], convoy_a_rec["source_lon"]) +
                haversine_km(convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                           convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"])
            )
            extra_km = detour_km - direct_km
            extra_B = (extra_km / 50.0) * 60.0  # Assume 50 km/h avg speed

        # Determine merge type and calculate actual savings
        convoy_a_name = convoy_a_rec["convoy_name"]
        convoy_b_name = convoy_b_rec["convoy_name"]

        # Calculate baseline distances (running separately)
        direct_dist_a_km = haversine_km(
            convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
            convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"]
        )
        direct_dist_b_km = haversine_km(
            convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
            convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"]
        )
        total_separate_km = direct_dist_a_km + direct_dist_b_km

        # Determine merge scenario
        merge_type = None
        scenario = None
        extra_min = None
        combined_distance_km = None
        transfer_point_lat = None
        transfer_point_lon = None
        transfer_load_kg = 0

        # Scenario 1: Full pickup (one absorbs the other completely)
        candidates = []
        if a_can_absorb_b and extra_A is not None:
            # Calculate combined distance for A picking up B
            pickup_dist_km = (
                haversine_km(convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                           convoy_b_rec["source_lat"], convoy_b_rec["source_lon"]) +
                haversine_km(convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                           convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"])
            )
            candidates.append(("A_picks_B", extra_A, pickup_dist_km, "full_pickup",
                             convoy_b_rec["source_lat"], convoy_b_rec["source_lon"], total_load_b))

        if b_can_absorb_a and extra_B is not None:
            # Calculate combined distance for B picking up A
            pickup_dist_km = (
                haversine_km(convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                           convoy_a_rec["source_lat"], convoy_a_rec["source_lon"]) +
                haversine_km(convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                           convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"])
            )
            candidates.append(("B_picks_A", extra_B, pickup_dist_km, "full_pickup",
                             convoy_a_rec["source_lat"], convoy_a_rec["source_lon"], total_load_a))

        # Scenario 2: Checkpoint transfer (partial load transfer at intersection)
        if not destinations_close and (b_on_a_route or a_on_b_route) and can_transfer_partial:
            if b_on_a_route:
                # Transfer from B to A at meeting point
                transfer_amount = min(avail_a, total_load_b)
                if transfer_amount > 0:
                    # A continues with extra load, B returns or continues lighter
                    transfer_dist_km = direct_dist_a_km + haversine_km(
                        convoy_b_rec["source_lat"], convoy_b_rec["source_lon"],
                        b_meet_lat, b_meet_lon
                    )
                    # Estimate time based on distance
                    transfer_extra_min = (transfer_dist_km - direct_dist_a_km) / 50.0 * 60.0
                    candidates.append(("A_receives_at_checkpoint", transfer_extra_min, transfer_dist_km,
                                     "checkpoint_transfer", b_meet_lat, b_meet_lon, transfer_amount))

            if a_on_b_route:
                # Transfer from A to B at meeting point
                transfer_amount = min(avail_b, total_load_a)
                if transfer_amount > 0:
                    transfer_dist_km = direct_dist_b_km + haversine_km(
                        convoy_a_rec["source_lat"], convoy_a_rec["source_lon"],
                        a_meet_lat, a_meet_lon
                    )
                    transfer_extra_min = (transfer_dist_km - direct_dist_b_km) / 50.0 * 60.0
                    candidates.append(("B_receives_at_checkpoint", transfer_extra_min, transfer_dist_km,
                                     "checkpoint_transfer", a_meet_lat, a_meet_lon, transfer_amount))

        if not candidates:
            error_parts = []
            if not a_can_absorb_b and not b_can_absorb_a:
                error_parts.append("No convoy has enough spare capacity")
            if a_can_absorb_b and extra_A is None:
                error_parts.append("Failed to calculate route for A picking up B (OSRM error)")
            if b_can_absorb_a and extra_B is None:
                error_parts.append("Failed to calculate route for B picking up A (OSRM error)")

            reason = "; ".join(error_parts) if error_parts else "Could not calculate detour durations"
            return JSONResponse({
                "can_merge": False,
                "reason": reason
            })

        # Choose best scenario (minimum extra time)
        best = min(candidates, key=lambda x: x[1])
        scenario, extra_min, combined_distance_km, merge_type, transfer_point_lat, transfer_point_lon, transfer_load_kg = best

        if extra_min <= request.max_extra_minutes:
            # Calculate ACTUAL fuel savings
            distance_saved_km = total_separate_km - combined_distance_km
            fuel_savings_liters = distance_saved_km * 0.3  # 0.3 L/km for military vehicles

            # Build merge reason
            if merge_type == "full_pickup":
                if scenario == "A_picks_B":
                    scenario_text = f"'{convoy_a_name}' picks up '{convoy_b_name}' at {convoy_b_rec.get('source_place', 'checkpoint')}"
                    instruction = f"FULL LOAD TRANSFER: '{convoy_b_name}' transfers ALL cargo ({total_load_b:.0f} kg) to '{convoy_a_name}' vehicles at pickup point"
                else:
                    scenario_text = f"'{convoy_b_name}' picks up '{convoy_a_name}' at {convoy_a_rec.get('source_place', 'checkpoint')}"
                    instruction = f"FULL LOAD TRANSFER: '{convoy_a_name}' transfers ALL cargo ({total_load_a:.0f} kg) to '{convoy_b_name}' vehicles at pickup point"
            else:
                # Checkpoint transfer
                if scenario == "A_receives_at_checkpoint":
                    scenario_text = f"'{convoy_a_name}' receives load from '{convoy_b_name}' at checkpoint"
                    instruction = f"PARTIAL LOAD TRANSFER AT CHECKPOINT ONLY: '{convoy_b_name}' transfers {transfer_load_kg:.0f} kg to '{convoy_a_name}' at intersection point (lat: {transfer_point_lat:.4f}, lon: {transfer_point_lon:.4f})"
                else:
                    scenario_text = f"'{convoy_b_name}' receives load from '{convoy_a_name}' at checkpoint"
                    instruction = f"PARTIAL LOAD TRANSFER AT CHECKPOINT ONLY: '{convoy_a_name}' transfers {transfer_load_kg:.0f} kg to '{convoy_b_name}' at intersection point (lat: {transfer_point_lat:.4f}, lon: {transfer_point_lon:.4f})"

            # Build merge reasons
            merge_reasons = []
            if destinations_close:
                merge_reasons.append(f"destinations close ({dest_dist_km:.1f} km apart)")
            if b_on_a_route:
                merge_reasons.append(f"routes intersect ({b_dist_to_a:.1f} km from route)")
            if a_on_b_route:
                merge_reasons.append(f"routes intersect ({a_dist_to_b:.1f} km from route)")

            reason_text = " AND ".join(merge_reasons) if merge_reasons else "routes compatible"
            full_reason = f"{scenario_text}. {instruction}. Savings: {distance_saved_km:.1f} km, ~{fuel_savings_liters:.1f}L fuel, ~₹{fuel_savings_liters * 150:.0f}"

            # Save merge suggestion to database (check for duplicates first)
            merge_id = None
            try:
                # Check if this merge suggestion already exists
                # Check both directions: (A,B) and (B,A) are considered the same merge
                cur.execute("""
                    SELECT merge_id FROM merge_history
                    WHERE ((convoy_a_id = %s AND convoy_b_id = %s)
                           OR (convoy_a_id = %s AND convoy_b_id = %s))
                          AND status = 'suggested'
                    LIMIT 1;
                """, (request.convoy_a_id, request.convoy_b_id, request.convoy_b_id, request.convoy_a_id))
                existing_merge = cur.fetchone()

                if existing_merge:
                    merge_id = existing_merge["merge_id"]
                    print(f"[MERGE] Merge suggestion already exists: merge_id={merge_id}")
                else:
                    # Insert new merge suggestion
                    cur.execute("""
                        INSERT INTO merge_history
                        (convoy_a_id, convoy_b_id, merged_into, merge_type, distance_saved_km,
                         fuel_saved_liters, cost_saved_inr, detour_minutes, merged_by, status, notes)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                        RETURNING merge_id;
                    """, (
                        request.convoy_a_id,
                        request.convoy_b_id,
                        request.convoy_a_id if scenario == "A_picks_B" else request.convoy_b_id,
                        'pickup',
                        0.0,  # distance_saved_km - will calculate after actual merge
                        fuel_savings_liters,
                        fuel_savings_liters * 150.0,  # cost_saved_inr
                        extra_min,
                        None,  # merged_by - no user yet, just suggested
                        'suggested',  # status
                        reason_text
                    ))
                    merge_record = cur.fetchone()
                    merge_id = merge_record["merge_id"] if merge_record else None
                    print(f"[MERGE] Saved NEW suggestion merge_id={merge_id}: {scenario_text}")

                conn.commit()
            except Exception as e:
                print(f"[MERGE] Failed to save suggestion: {e}")
                conn.rollback()

            return JSONResponse({
                "can_merge": True,
                "reason": full_reason,
                "scenario": scenario,
                "scenario_readable": scenario_text,
                "merge_type": merge_type,
                "instruction": instruction,

                # Convoy info
                "convoy_a_name": convoy_a_name,
                "convoy_b_name": convoy_b_name,
                "merge_id": merge_id,

                # Capacity info
                "convoy_a": {
                    "load_kg": round(total_load_a, 2),
                    "capacity_kg": round(total_capacity_a, 2),
                    "spare_kg": round(avail_a, 2),
                    "utilization_pct": round((total_load_a / total_capacity_a) * 100, 1) if total_capacity_a > 0 else 0
                },
                "convoy_b": {
                    "load_kg": round(total_load_b, 2),
                    "capacity_kg": round(total_capacity_b, 2),
                    "spare_kg": round(avail_b, 2),
                    "utilization_pct": round((total_load_b / total_capacity_b) * 100, 1) if total_capacity_b > 0 else 0
                },

                # Load transfer info
                "transfer": {
                    "amount_kg": round(transfer_load_kg, 2),
                    "type": merge_type,
                    "checkpoint_lat": round(transfer_point_lat, 6) if transfer_point_lat else None,
                    "checkpoint_lon": round(transfer_point_lon, 6) if transfer_point_lon else None
                },

                # Time and distance metrics
                "metrics": {
                    "extra_time_min": round(extra_min, 2),
                    "distance_saved_km": round(distance_saved_km, 2),
                    "fuel_saved_liters": round(fuel_savings_liters, 2),
                    "cost_saved_inr": round(fuel_savings_liters * 150, 0),
                    "total_distance_separate_km": round(total_separate_km, 2),
                    "total_distance_merged_km": round(combined_distance_km, 2),
                    "efficiency_gain_pct": round((distance_saved_km / total_separate_km) * 100, 1) if total_separate_km > 0 else 0
                },

                # Route analysis
                "route_analysis": {
                    "destinations_close": destinations_close,
                    "dest_distance_km": round(dest_dist_km, 2),
                    "routes_intersect": b_on_a_route or a_on_b_route,
                    "b_distance_to_a_route_km": round(b_dist_to_a, 2),
                    "a_distance_to_b_route_km": round(a_dist_to_b, 2)
                }
            })
        else:
            return JSONResponse({
                "can_merge": False,
                "reason": f"Best scenario {scenario} costs extra {extra_min:.1f} min > allowed {request.max_extra_minutes} min",
                "extra_minutes": round(extra_min, 2)
            })

    except HTTPException:
        raise
    except Exception as e:
        return JSONResponse({
            "can_merge": False,
            "reason": f"Error: {str(e)}"
        })
    finally:
        cur.close()
        conn.close()


# ----------------------------
# Get convoy route with optimized path
# ----------------------------
@router.patch("/{convoy_id}/status")
def update_convoy_status(
    convoy_id: int,
    status: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update convoy status: pending, en_route, completed, cancelled
    """
    user_id = current_user["user_id"]

    valid_statuses = ["pending", "en_route", "completed", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid status. Must be one of: {valid_statuses}"
        )

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        # Verify convoy ownership
        cur.execute("""
            SELECT convoy_name, created_by FROM convoys
            WHERE convoy_id = %s;
        """, (convoy_id,))
        convoy = cur.fetchone()

        if not convoy:
            raise HTTPException(status_code=404, detail="Convoy not found")

        if convoy["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update convoy status
        cur.execute("""
            UPDATE convoys
            SET status = %s
            WHERE convoy_id = %s
            RETURNING convoy_id, convoy_name, status;
        """, (status, convoy_id))

        updated_convoy = cur.fetchone()
        conn.commit()

        return JSONResponse({
            "status": "success",
            "message": f"Convoy '{convoy['convoy_name']}' status updated to '{status}'",
            "convoy_id": convoy_id,
            "new_status": status
        })

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/{convoy_id}/route")
def get_convoy_route(convoy_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get optimized route for a convoy including waypoints.
    Returns the dynamic route avoiding weather hazards and closures.
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        # Get convoy details
        cur.execute("""
            SELECT convoy_id, convoy_name, source_lat, source_lon, destination_lat, destination_lon
            FROM convoys WHERE convoy_id=%s AND created_by=%s;
        """, (convoy_id, current_user["user_id"]))

        convoy_rec = cur.fetchone()
        if not convoy_rec:
            raise HTTPException(status_code=404, detail="Convoy not found or access denied")

        # Check if route exists in database
        cur.execute("""
            SELECT waypoints, total_distance_km, estimated_duration_minutes
            FROM routes WHERE convoy_id=%s LIMIT 1;
        """, (convoy_id,))
        stored_route = cur.fetchone()

        # If no stored route, compute dynamic route
        if not stored_route or not stored_route.get("waypoints"):
            try:
                # Try to compute dynamic route using the dynamic router
                route_result = dynamic_reroute(
                    start_lat=convoy_rec["source_lat"],
                    start_lon=convoy_rec["source_lon"],
                    end_lat=convoy_rec["destination_lat"],
                    end_lon=convoy_rec["destination_lon"],
                    closure_points=[]  # You can add closure points from database if you have them
                )

                if "error" not in route_result:
                    # Convert coordinates to waypoints format
                    waypoints = [{"lat": lat, "lon": lon} for lat, lon in route_result["chosen_route"]]

                    return JSONResponse({
                        "status": "success",
                        "convoy_id": convoy_id,
                        "convoy_name": convoy_rec["convoy_name"],
                        "source": {
                            "lat": convoy_rec["source_lat"],
                            "lon": convoy_rec["source_lon"]
                        },
                        "destination": {
                            "lat": convoy_rec["destination_lat"],
                            "lon": convoy_rec["destination_lon"]
                        },
                        "waypoints": waypoints,
                        "distance_m": route_result.get("distance_m", 0),
                        "eta_seconds": route_result.get("eta_seconds", 0),
                        "closures": route_result.get("closures", []),
                        "closed_segments": route_result.get("closed_segments", [])
                    })
            except Exception as route_error:
                # Fallback to simple straight-line route if OSRM/dynamic routing fails
                print(f"[ROUTE FALLBACK] Dynamic routing failed: {route_error}")
                pass  # Continue to fallback below

            # Fallback: Return simple straight-line route
            simple_waypoints = [
                {"lat": convoy_rec["source_lat"], "lon": convoy_rec["source_lon"]},
                {"lat": convoy_rec["destination_lat"], "lon": convoy_rec["destination_lon"]}
            ]

            # Calculate approximate distance
            distance_m = haversine_km(
                convoy_rec["source_lat"], convoy_rec["source_lon"],
                convoy_rec["destination_lat"], convoy_rec["destination_lon"]
            ) * 1000

            return JSONResponse({
                "status": "success",
                "convoy_id": convoy_id,
                "convoy_name": convoy_rec["convoy_name"],
                "source": {
                    "lat": convoy_rec["source_lat"],
                    "lon": convoy_rec["source_lon"]
                },
                "destination": {
                    "lat": convoy_rec["destination_lat"],
                    "lon": convoy_rec["destination_lon"]
                },
                "waypoints": simple_waypoints,
                "distance_m": distance_m,
                "eta_seconds": distance_m / 13.89,  # Assume ~50 km/h average speed
                "closures": [],
                "closed_segments": [],
                "note": "Using fallback route (OSRM unavailable)"
            })
        else:
            # Return stored route
            waypoints = stored_route["waypoints"]
            if isinstance(waypoints, str):
                waypoints = json.loads(waypoints)

            return JSONResponse({
                "status": "success",
                "convoy_id": convoy_id,
                "convoy_name": convoy_rec["convoy_name"],
                "source": {
                    "lat": convoy_rec["source_lat"],
                    "lon": convoy_rec["source_lon"]
                },
                "destination": {
                    "lat": convoy_rec["destination_lat"],
                    "lon": convoy_rec["destination_lon"]
                },
                "waypoints": waypoints,
                "distance_km": stored_route.get("total_distance_km", 0),
                "duration_minutes": stored_route.get("estimated_duration_minutes", 0)
            })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
