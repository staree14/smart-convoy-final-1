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
        # Geocode places if needed
        if convoy.source_place and (convoy.source_lat is None or convoy.source_lon is None):
            s = geocode_place(convoy.source_place)
            if s:
                convoy.source_lat = s["lat"]
                convoy.source_lon = s["lon"]

        if convoy.destination_place and (convoy.destination_lat is None or convoy.destination_lon is None):
            d = geocode_place(convoy.destination_place)
            if d:
                convoy.destination_lat = d["lat"]
                convoy.destination_lon = d["lon"]

        # Validate coordinates exist
        if convoy.source_lat is None or convoy.source_lon is None or convoy.destination_lat is None or convoy.destination_lon is None:
            raise HTTPException(status_code=400, detail="Convoy must include source and destination coordinates (lat/lon).")

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
                   source_lat, source_lon, destination_lat, destination_lon, created_at, created_by
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
def get_convoy(convoy_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        # Get convoy
        cur.execute("""
            SELECT convoy_id, convoy_name, priority, source_place, destination_place,
                   source_lat, source_lon, destination_lat, destination_lon, created_at
            FROM convoys WHERE convoy_id=%s;
        """, (convoy_id,))

        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Convoy not found")

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
def delete_convoy(convoy_id: int):
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()
    try:
        cur.execute("SELECT convoy_name FROM convoys WHERE convoy_id=%s;", (convoy_id,))
        rec = cur.fetchone()
        if not rec:
            raise HTTPException(status_code=404, detail="Convoy not found")

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

        # Check destination proximity FIRST
        dest_dist_km = haversine_km(
            convoy_a_rec["destination_lat"], convoy_a_rec["destination_lon"],
            convoy_b_rec["destination_lat"], convoy_b_rec["destination_lon"]
        )

        if dest_dist_km > request.same_dest_radius_km:
            return JSONResponse({
                "can_merge": False,
                "reason": f"Destinations too far apart ({dest_dist_km:.2f} km, threshold: {request.same_dest_radius_km} km)",
                "dest_distance_km": round(dest_dist_km, 2)
            })

        # Calculate capacity and load
        total_capacity_a = sum(v["capacity_kg"] for v in vehicles_a)
        total_load_a = sum(v["load_weight_kg"] for v in vehicles_a)
        total_capacity_b = sum(v["capacity_kg"] for v in vehicles_b)
        total_load_b = sum(v["load_weight_kg"] for v in vehicles_b)

        avail_a = total_capacity_a - total_load_a
        avail_b = total_capacity_b - total_load_b

        a_can_absorb_b = avail_a >= total_load_b
        b_can_absorb_a = avail_b >= total_load_a

        if not (a_can_absorb_b or b_can_absorb_a):
            return JSONResponse({
                "can_merge": False,
                "reason": "No convoy has enough spare capacity to absorb the other",
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
                if "routes" in j and j["routes"]:
                    return j["routes"][0].get("duration"), j["routes"][0].get("distance")
            except Exception:
                return None, None
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

        # Find best scenario
        candidates = []
        if a_can_absorb_b and extra_A is not None:
            candidates.append(("A_picks_B", extra_A))
        if b_can_absorb_a and extra_B is not None:
            candidates.append(("B_picks_A", extra_B))

        if not candidates:
            return JSONResponse({
                "can_merge": False,
                "reason": "Could not calculate detour durations or no capacity",
                "extra_A": extra_A,
                "extra_B": extra_B
            })

        best = min(candidates, key=lambda x: x[1])
        scenario, extra_min = best

        if extra_min <= request.max_extra_minutes:
            fuel_savings_liters = dest_dist_km * 0.3

            return JSONResponse({
                "can_merge": True,
                "reason": f"{scenario} feasible with extra time {extra_min:.1f} min",
                "scenario": scenario,
                "extra_minutes": round(extra_min, 2),
                "dest_distance_km": round(dest_dist_km, 2),
                "fuel_savings_liters": round(fuel_savings_liters, 2),
                "convoy_a_spare_kg": round(avail_a, 2),
                "convoy_b_spare_kg": round(avail_b, 2)
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
            # Compute dynamic route using the dynamic router
            route_result = dynamic_reroute(
                start_lat=convoy_rec["source_lat"],
                start_lon=convoy_rec["source_lon"],
                end_lat=convoy_rec["destination_lat"],
                end_lon=convoy_rec["destination_lon"],
                closure_points=[]  # You can add closure points from database if you have them
            )

            if "error" in route_result:
                raise HTTPException(status_code=500, detail=route_result["error"])

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

