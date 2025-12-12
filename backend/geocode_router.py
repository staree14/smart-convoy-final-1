from fastapi import APIRouter, Query, Body
from fastapi.responses import JSONResponse
import requests
import time
from typing import Optional, List, Union
from pydantic import BaseModel

router = APIRouter()

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
NOMINATIM_REVERSE_URL = "https://nominatim.openstreetmap.org/reverse"


def geocode_place(query: str, retries: int = 2) -> Optional[dict]:
    """
    Geocode a place string using Nominatim with smart fallback strategies.
    Returns {'lat': float, 'lon': float, 'display_name': str} or None.

    Strategy:
    1. Try exact query first
    2. If fails, extract city/area name from query (text after last comma)
    3. If still fails, try removing special characters and business names
    """
    if not query:
        return None

    # Try multiple search strategies
    search_queries = [query]

    # Strategy 2: If query contains comma, try the last part (usually city/area)
    if ',' in query:
        parts = [p.strip() for p in query.split(',')]
        # Try "area, city" or just "city"
        if len(parts) >= 2:
            search_queries.append(f"{parts[-2]}, {parts[-1]}")  # Last 2 parts
        search_queries.append(parts[-1])  # Just the last part (city/state)

    # Strategy 3: Remove common business prefixes
    clean_query = query
    business_keywords = ['Institute', 'Career', 'Campus', 'Center', 'Centre', 'School', 'College']
    for keyword in business_keywords:
        clean_query = clean_query.replace(keyword, '')
    clean_query = ' '.join(clean_query.split())  # Remove extra spaces
    if clean_query != query and clean_query:
        search_queries.append(clean_query)

    for search_query in search_queries:
        params = {"q": search_query, "format": "json", "limit": 1}

        for attempt in range(retries + 1):
            try:
                r = requests.get(
                    NOMINATIM_URL,
                    params=params,
                    timeout=10,
                    headers={"User-Agent": "SmartConvoyAI/1.0"}
                )
                r.raise_for_status()
                data = r.json()

                if data and isinstance(data, list) and len(data) > 0:
                    result = {
                        "lat": float(data[0]["lat"]),
                        "lon": float(data[0]["lon"]),
                        "display_name": data[0].get("display_name", "")
                    }
                    if search_query != query:
                        print(f"[GEOCODE] Success with fallback: '{query}' -> '{search_query}' -> {result['display_name']}")
                    else:
                        print(f"[GEOCODE] Success: '{query}' -> {result['display_name']}")
                    return result

            except requests.exceptions.Timeout:
                print(f"[GEOCODE] Timeout on attempt {attempt + 1}/{retries + 1} for '{search_query}'")
                if attempt < retries:
                    time.sleep(1)
                    continue
            except requests.exceptions.RequestException as e:
                print(f"[GEOCODE] Request error on attempt {attempt + 1}/{retries + 1} for '{search_query}': {e}")
                if attempt < retries:
                    time.sleep(1)
                    continue
            except Exception as e:
                print(f"[GEOCODE] Unexpected error for '{search_query}': {e}")
                break

        # Rate limit between different search strategies
        time.sleep(1)

    print(f"[GEOCODE] Failed all strategies for '{query}'. Tried: {search_queries}")
    return None


class GeocodingService:
    """Service class for geocoding operations"""

    @staticmethod
    def geocode(address: str) -> Optional[dict]:
        """
        Convert an address to coordinates.
        Returns: {'lat': float, 'lon': float, 'display_name': str, 'address': dict} or None
        """
        if not address:
            return None

        params = {"q": address, "format": "json", "limit": 1, "addressdetails": 1}
        try:
            r = requests.get(NOMINATIM_URL, params=params, timeout=5, headers={"User-Agent": "SmartConvoyAI/1.0"})
            r.raise_for_status()
            data = r.json()

            if data and isinstance(data, list) and len(data) > 0:
                result = data[0]
                return {
                    "lat": float(result["lat"]),
                    "lon": float(result["lon"]),
                    "display_name": result.get("display_name", ""),
                    "address": result.get("address", {})
                }
        except Exception as e:
            print(f"[GEOCODE] Error geocoding {address}: {e}")

        return None

    @staticmethod
    def reverse_geocode(lat: float, lon: float) -> Optional[dict]:
        """
        Convert coordinates to address.
        Returns: {'formatted': str, 'road': str, 'city': str, 'state': str, 'country': str, 'postcode': str} or None
        """
        params = {"lat": lat, "lon": lon, "format": "json"}
        try:
            r = requests.get(NOMINATIM_REVERSE_URL, params=params, timeout=5, headers={"User-Agent": "SmartConvoyAI/1.0"})
            r.raise_for_status()
            data = r.json()

            if data and "address" in data:
                address = data["address"]
                return {
                    "formatted": data.get("display_name", ""),
                    "road": address.get("road", ""),
                    "city": address.get("city") or address.get("town") or address.get("village", ""),
                    "state": address.get("state", ""),
                    "country": address.get("country", ""),
                    "postcode": address.get("postcode", "")
                }
        except Exception as e:
            print(f"[REVERSE_GEOCODE] Error reverse geocoding {lat},{lon}: {e}")

        return None

    @staticmethod
    def batch_geocode(addresses: List[str]) -> List[Optional[dict]]:
        """
        Geocode multiple addresses with rate limiting.
        Returns: List of geocoding results (can contain None for failed addresses)
        """
        results = []
        for address in addresses:
            result = GeocodingService.geocode(address)
            results.append(result)
            # Rate limiting: Nominatim requires 1 request per second
            time.sleep(1)

        return results


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
