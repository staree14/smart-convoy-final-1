# routers/convoy_routes.py

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
from models.convoy import Convoy, Vehicle
from utils.helpers import haversine_km
import requests
from typing import Dict

router = APIRouter()

# In-memory storage
convoys_db: Dict[int, Convoy] = {}
convoy_counter = 0


@router.post("/create")
def create_convoy(convoy: Convoy):
    """
    Create a new convoy.

    Example JSON:
    {
      "convoy_name": "Medical Supply Alpha",
      "source_lat": 28.6139,
      "source_lon": 77.2090,
      "destination_lat": 28.4595,
      "destination_lon": 77.0266,
      "priority": "high",
      "vehicles": [
        {
          "vehicle_type": "truck",
          "registration_number": "DL-01-AB-1234",
          "source_lat": 28.6139,
          "source_lon": 77.2090,
          "destination_lat": 28.4595,
          "destination_lon": 77.0266,
          "load_type": "medical",
          "load_weight_kg": 500,
          "capacity_kg": 1000,
          "driver_name": "Raj Kumar"
        }
      ]
    }
    """
    global convoy_counter

    try:
        # Assign ID
        convoy_counter += 1
        convoy.id = convoy_counter

        # Store convoy
        convoys_db[convoy.id] = convoy

        return JSONResponse({
            "status": "success",
            "convoy_id": convoy.id,
            "convoy_name": convoy.convoy_name,
            "vehicle_count": convoy.vehicle_count,
            "total_load_kg": convoy.total_load_kg,
            "priority": convoy.priority,
            "message": f"Convoy '{convoy.convoy_name}' created successfully"
        })
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/list")
def list_convoys():
    """Get all convoys."""
    return JSONResponse({
        "status": "success",
        "count": len(convoys_db),
        "convoys": [
            {
                "id": c.id,
                "convoy_name": c.convoy_name,
                "vehicle_count": c.vehicle_count,
                "total_load_kg": c.total_load_kg,
                "priority": c.priority.value,
                "source": {"lat": c.source_lat, "lon": c.source_lon},
                "destination": {"lat": c.destination_lat, "lon": c.destination_lon}
            }
            for c in convoys_db.values()
        ]
    })


@router.get("/{convoy_id}")
def get_convoy(convoy_id: int):
    """Get specific convoy details."""
    if convoy_id not in convoys_db:
        raise HTTPException(status_code=404, detail="Convoy not found")

    convoy = convoys_db[convoy_id]
    return JSONResponse({
        "status": "success",
        "convoy": {
            "id": convoy.id,
            "convoy_name": convoy.convoy_name,
            "vehicle_count": convoy.vehicle_count,
            "total_load_kg": convoy.total_load_kg,
            "priority": convoy.priority.value,
            "source": {"lat": convoy.source_lat, "lon": convoy.source_lon},
            "destination": {"lat": convoy.destination_lat, "lon": convoy.destination_lon},
            "vehicles": [
                {
                    "id": v.id,
                    "registration": v.registration_number,
                    "type": v.vehicle_type.value,
                    "load_type": v.load_type.value,
                    "load_kg": v.load_weight_kg,
                    "capacity_kg": v.capacity_kg,
                    "driver": v.driver_name,
                    "status": v.current_status.value
                }
                for v in convoy.vehicles
            ]
        }
    })


@router.delete("/{convoy_id}")
def delete_convoy(convoy_id: int):
    """Delete a convoy."""
    if convoy_id not in convoys_db:
        raise HTTPException(status_code=404, detail="Convoy not found")

    convoy_name = convoys_db[convoy_id].convoy_name
    del convoys_db[convoy_id]

    return JSONResponse({
        "status": "success",
        "message": f"Convoy '{convoy_name}' deleted successfully"
    })


@router.post("/suggest_merge")
def suggest_merge(convoy_a: Convoy, convoy_b: Convoy, max_extra_minutes: float = 30.0,
                  same_dest_radius_km: float = 5.0):
    """
    Suggest whether two convoys should merge based on capacity, destination proximity, and route detour.

    Rules:
      - One convoy must have spare capacity to absorb the other's load
      - Destinations must be within same_dest_radius_km kilometers
      - Detour must be <= max_extra_minutes

    Example JSON body:
    {
      "convoy_a": {
        "convoy_name": "Alpha",
        "source_lat": 28.6139, "source_lon": 77.2090,
        "destination_lat": 28.4595, "destination_lon": 77.0266,
        "priority": "high",
        "vehicles": [
          {
            "vehicle_type": "truck",
            "registration_number": "DL-01-AB-1234",
            "source_lat": 28.6139, "source_lon": 77.2090,
            "destination_lat": 28.4595, "destination_lon": 77.0266,
            "load_type": "medical",
            "load_weight_kg": 500,
            "capacity_kg": 1000
          }
        ]
      },
      "convoy_b": { ... similar structure ... },
      "max_extra_minutes": 30.0,
      "same_dest_radius_km": 5.0
    }
    """
    try:
        # Calculate spare capacity for both convoys
        def total_capacity(convoy: Convoy) -> float:
            return sum(v.capacity_kg for v in convoy.vehicles)

        def spare_capacity(convoy: Convoy) -> float:
            return total_capacity(convoy) - convoy.total_load_kg

        avail_a = spare_capacity(convoy_a)
        avail_b = spare_capacity(convoy_b)

        # Check if either can absorb the other
        a_can_absorb_b = avail_a >= convoy_b.total_load_kg
        b_can_absorb_a = avail_b >= convoy_a.total_load_kg

        if not (a_can_absorb_b or b_can_absorb_a):
            return JSONResponse({
                "can_merge": False,
                "reason": "No convoy has enough spare capacity to absorb the other",
                "convoy_a_spare_kg": round(avail_a, 2),
                "convoy_b_spare_kg": round(avail_b, 2),
                "convoy_a_load_kg": round(convoy_a.total_load_kg, 2),
                "convoy_b_load_kg": round(convoy_b.total_load_kg, 2)
            })

        # Check destination proximity
        dest_dist_km = haversine_km(
            convoy_a.destination_lat, convoy_a.destination_lon,
            convoy_b.destination_lat, convoy_b.destination_lon
        )

        if dest_dist_km > same_dest_radius_km:
            return JSONResponse({
                "can_merge": False,
                "reason": f"Destinations too far apart ({dest_dist_km:.2f} km) > threshold {same_dest_radius_km} km",
                "dest_distance_km": round(dest_dist_km, 2)
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
            (convoy_a.source_lat, convoy_a.source_lon),
            (convoy_a.destination_lat, convoy_a.destination_lon)
        ])
        pickup_dur_A, _ = osrm_duration([
            (convoy_a.source_lat, convoy_a.source_lon),
            (convoy_b.source_lat, convoy_b.source_lon),
            (convoy_a.destination_lat, convoy_a.destination_lon)
        ])
        extra_A = None
        if direct_dur_A is not None and pickup_dur_A is not None:
            extra_A = (pickup_dur_A - direct_dur_A) / 60.0

        # Scenario B picks up A
        direct_dur_B, _ = osrm_duration([
            (convoy_b.source_lat, convoy_b.source_lon),
            (convoy_b.destination_lat, convoy_b.destination_lon)
        ])
        pickup_dur_B, _ = osrm_duration([
            (convoy_b.source_lat, convoy_b.source_lon),
            (convoy_a.source_lat, convoy_a.source_lon),
            (convoy_b.destination_lat, convoy_b.destination_lon)
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

        if extra_min <= max_extra_minutes:
            # Estimate fuel savings (convoy B doesn't need to make full trip)
            fuel_savings_liters = dest_dist_km * 0.3  # ~0.3L per km saved

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
                "reason": f"Best scenario {scenario} costs extra {extra_min:.1f} min > allowed {max_extra_minutes} min",
                "extra_minutes": round(extra_min, 2)
            })

    except Exception as e:
        return JSONResponse({
            "can_merge": False,
            "reason": f"Error: {str(e)}"
        })