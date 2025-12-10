from fastapi import APIRouter, Query, Body
from fastapi.responses import JSONResponse
import requests
from typing import Optional, List, Union
from pydantic import BaseModel

router = APIRouter()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"


def geocode_place(query: str) -> Optional[dict]:
    """Geocode a place string using Nominatim. Returns {'lat': float, 'lon': float} or None."""
    if not query:
        return None
    params = {"q": query, "format": "json", "limit": 1}
    try:
        r = requests.get(NOMINATIM_URL, params=params, timeout=5, headers={"User-Agent": "Ai_Convoy/1.0"})
        r.raise_for_status()
        data = r.json()
        if data and isinstance(data, list) and len(data) > 0:
            return {"lat": float(data[0]["lat"]), "lon": float(data[0]["lon"]) }
    except Exception as e:
        print("[GEOCODE] error", e)
    return None


@router.get("/route_from_places")
def route_from_places(
    start_place: str = Query(..., description="Start place/address"),
    end_place: str = Query(..., description="End place/address"),
    closure_points: Optional[str] = Query(None, description="Optional closures semicolon-separated lat,lon list")
):
    """
    Geocode start/end place strings and forward request to dynamic_reroute_json.
    Returns the same JSON structure as `/dynamic_reroute_json`.
    """
    # Geocode start and end
    s = geocode_place(start_place)
    e = geocode_place(end_place)
    if not s or not e:
        return JSONResponse({"error": "geocoding_failed", "start": s, "end": e}, status_code=400)

    # Import the core reroute function locally to avoid circular imports
    try:
        from core.dynamic_router import dynamic_reroute
    except Exception as ex:
        print("[GEOCODE] error importing dynamic_reroute:", ex)
        return JSONResponse({"error": "internal_server_error", "detail": str(ex)}, status_code=500)

    # Parse closure_points (expected format: "lat,lon;lat,lon;...")
    closures = []
    if closure_points:
        try:
            for part in closure_points.split(";"):
                part = part.strip()
                if not part:
                    continue
                lat_str, lon_str = part.split(",")
                closures.append((float(lat_str), float(lon_str)))
        except Exception as ex:
            return JSONResponse({"error": "invalid_closure_points", "detail": str(ex)}, status_code=400)

    # Call the dynamic reroute engine
    result = dynamic_reroute(s["lat"], s["lon"], e["lat"], e["lon"], closures)

    # If engine returned an error, forward it
    if isinstance(result, dict) and "error" in result:
        return JSONResponse({"status": "error", "message": result["error"]}, status_code=500)

    # Normalize and return the successful response, matching other endpoints
    return JSONResponse({
        "status": "success",
        "original_route": [[c[0], c[1]] for c in result.get("original_route", [])],
        "optimized_route": [[c[0], c[1]] for c in result.get("chosen_route", [])],
        "closures": result.get("closures", []),
        "closed_segments": result.get("closed_segments", []),
        "distance_km": round(result.get("distance_m", 0.0) / 1000, 2),
        "duration_minutes": round(result.get("eta_seconds", 0.0) / 60, 1),
        "safety_score": round(result.get("score", 0.0), 2)
    })


class RouteFromPlacesRequest(BaseModel):
    start_place: str
    end_place: str
    # closure_points can be provided as list of [lat, lon] pairs or list of {"lat":.., "lon":..}
    closure_points: Optional[List[Union[List[float], dict]]] = None


@router.post("/route_from_places")
def route_from_places_post(payload: RouteFromPlacesRequest = Body(...)):
    """POST variant: accepts JSON body with `start_place`, `end_place`, and optional `closure_points`.
    `closure_points` may be an array of [lat, lon] pairs or objects {"lat":.., "lon":..}.
    """
    start_place = payload.start_place
    end_place = payload.end_place

    # Geocode start and end
    s = geocode_place(start_place)
    e = geocode_place(end_place)
    if not s or not e:
        return JSONResponse({"error": "geocoding_failed", "start": s, "end": e}, status_code=400)

    # Import the core reroute function locally to avoid circular imports
    try:
        from core.dynamic_router import dynamic_reroute
    except Exception as ex:
        print("[GEOCODE] error importing dynamic_reroute:", ex)
        return JSONResponse({"error": "internal_server_error", "detail": str(ex)}, status_code=500)

    # Parse closure_points from body
    closures = []
    if payload.closure_points:
        try:
            for item in payload.closure_points:
                if isinstance(item, dict):
                    lat = float(item.get("lat"))
                    lon = float(item.get("lon"))
                    closures.append((lat, lon))
                elif isinstance(item, list) or isinstance(item, tuple):
                    lat = float(item[0])
                    lon = float(item[1])
                    closures.append((lat, lon))
                else:
                    # ignore unknown formats
                    continue
        except Exception as ex:
            return JSONResponse({"error": "invalid_closure_points", "detail": str(ex)}, status_code=400)

    # Call the dynamic reroute engine
    result = dynamic_reroute(s["lat"], s["lon"], e["lat"], e["lon"], closures)

    # If engine returned an error, forward it
    if isinstance(result, dict) and "error" in result:
        return JSONResponse({"status": "error", "message": result["error"]}, status_code=500)

    # Normalize and return the successful response, matching other endpoints
    return JSONResponse({
        "status": "success",
        "original_route": [[c[0], c[1]] for c in result.get("original_route", [])],
        "optimized_route": [[c[0], c[1]] for c in result.get("chosen_route", [])],
        "closures": result.get("closures", []),
        "closed_segments": result.get("closed_segments", []),
        "distance_km": round(result.get("distance_m", 0.0) / 1000, 2),
        "duration_minutes": round(result.get("eta_seconds", 0.0) / 60, 1),
        "safety_score": round(result.get("score", 0.0), 2)
    })
