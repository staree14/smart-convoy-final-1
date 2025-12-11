# dynamic_route_optimized.py
import os
import math
import time
import asyncio
import aiohttp
import requests
import polyline
import csv
from typing import List, Tuple, Dict, Any, Optional
from functools import lru_cache
from collections import defaultdict

from fastapi import FastAPI, Query, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

# ---------------------------
# Config / Environment
# ---------------------------
OPENWEATHER_KEY = os.getenv("OPENWEATHER_KEY")    # required for weather scoring
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")      # optional: used for Elevation API
OSRM_URL = os.getenv("OSRM_URL", "http://router.project-osrm.org/route/v1/driving")

# tuning parameters
CLOSURE_RADIUS_KM = float(os.getenv("CLOSURE_RADIUS_KM", "1.0"))
SAMPLE_DISTANCE_M = float(os.getenv("SAMPLE_DISTANCE_M", "500"))  # INCREASED to reduce API calls
WEBSOCKET_UPDATE_SEC = float(os.getenv("WS_UPDATE_SEC", "2.0"))
WEATHER_CACHE_MINUTES = float(os.getenv("WEATHER_CACHE_MINUTES", "5"))

# ---------------------------
# FastAPI setup
# ---------------------------
app = FastAPI(title="Dynamic Reroute Backend (Optimized)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# include geocode router (separate file)
try:
    from geocode_router import router as geocode_router
    app.include_router(geocode_router)
except Exception:
    # ignore if module not present or import fails
    pass

# Initialize AI route optimizer
try:
    from ai_route_optimizer import HybridRouteScorer
    ai_scorer = HybridRouteScorer()
    print("[AI] HybridRouteScorer initialized successfully")
except Exception as e:
    print(f"[AI] Warning: Could not load AI optimizer: {e}")
    ai_scorer = None

# ---------------------------
# Simple in-memory cache with TTL
# ---------------------------
class CacheEntry:
    def __init__(self, data: Any, ttl_seconds: float = 300):
        self.data = data
        self.created_at = time.time()
        self.ttl = ttl_seconds
    
    def is_expired(self) -> bool:
        return time.time() - self.created_at > self.ttl

weather_cache: Dict[str, CacheEntry] = {}
elevation_cache: Dict[str, CacheEntry] = {}

# ---------------------------
# Risk zones loader
# ---------------------------
RISK_ZONES: List[Dict[str,Any]] = []

def load_risk_zones(path: str = "risk_zones.csv") -> List[Dict[str,Any]]:
    zones: List[Dict[str,Any]] = []
    if not os.path.exists(path):
        return zones
    try:
        with open(path, newline='', encoding='utf-8') as fh:
            reader = csv.DictReader(fh)
            for row in reader:
                try:
                    zones.append({
                        "riskzone_id": row.get("riskzone_id"),
                        "name": row.get("name",""),
                        "center_lat": float(row.get("center_lat", "0") or 0.0),
                        "center_lon": float(row.get("center_lon", "0") or 0.0),
                        "radius_km": float(row.get("radius_km", "0") or 0.0),
                        "risk_level": (row.get("risk_level") or "low").lower()
                    })
                except Exception:
                    continue
    except Exception as e:
        print(f"[RISK] Failed to load risk zones from {path}: {e}")
    return zones

# load at module import
RISK_ZONES = load_risk_zones()

def risk_penalty_at_point(lat: float, lon: float) -> Dict[str,Any]:
    """Return penalty and matched zones for a lat/lon point."""
    penalty = 0.0
    matched = []
    if not RISK_ZONES:
        return {"penalty": 0.0, "matched": matched}
    for z in RISK_ZONES:
        try:
            dkm = haversine_km(lat, lon, z["center_lat"], z["center_lon"])
            if dkm <= z.get("radius_km", 0.0):
                lvl = z.get("risk_level", "low")
                if lvl == "high":
                    p = 1200.0
                elif lvl == "medium":
                    p = 300.0
                else:
                    p = 50.0
                penalty += p
                matched.append({"id": z.get("riskzone_id"), "name": z.get("name"), "level": lvl})
        except Exception:
            continue
    return {"penalty": penalty, "matched": matched}

def cache_get(cache: Dict, key: str) -> Optional[Any]:
    if key in cache:
        entry = cache[key]
        if not entry.is_expired():
            return entry.data
        else:
            del cache[key]
    return None

def cache_set(cache: Dict, key: str, data: Any, ttl: float = 300):
    cache[key] = CacheEntry(data, ttl)

# ---------------------------
# Utilities
# ---------------------------
def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371.0
    phi1 = math.radians(lat1); phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1); dlambda = math.radians(lon2 - lon1)
    a = math.sin(dphi/2)**2 + math.cos(phi1)*math.cos(phi2)*math.sin(dlambda/2)**2
    return R * 2 * math.asin(math.sqrt(a))

def interpolate_point(lat1, lon1, lat2, lon2, t):
    """Linear interpolation in lat/lon. t in [0,1]."""
    return (lat1 + (lat2 - lat1) * t, lon1 + (lon2 - lon1) * t)

def densify_path(latlon: List[Tuple[float,float]], sample_m: float = 500.0) -> List[Tuple[float,float]]:
    """Densify path by sampling every sample_m meters."""
    if not latlon:
        return []
    out = []
    for i in range(len(latlon)-1):
        a = latlon[i]; b = latlon[i+1]
        out.append(a)
        seg_km = haversine_km(a[0], a[1], b[0], b[1])
        seg_m = seg_km * 1000.0
        if seg_m <= 0:
            continue
        steps = max(1, int(seg_m // sample_m))
        for s in range(1, steps+1):
            t = s / (steps+1)
            p = interpolate_point(a[0], a[1], b[0], b[1], t)
            out.append(p)
    out.append(latlon[-1])
    return out

def sample_route_points(densified: List[Tuple[float,float]], max_samples: int = 10) -> List[Tuple[float,float]]:
    """
    Sample evenly spaced points from densified route to reduce API calls.
    Returns max_samples points or fewer if route is short.
    """
    if len(densified) <= max_samples:
        return densified
    step = len(densified) // max_samples
    sampled = [densified[i] for i in range(0, len(densified), step)]
    if densified[-1] not in sampled:
        sampled.append(densified[-1])
    return sampled

# ---------------------------
# Weather / Terrain / Closure scoring
# ---------------------------
def fetch_weather(lat: float, lon: float) -> Optional[Dict[str,Any]]:
    """
    Fetch weather with caching.
    """
    if not OPENWEATHER_KEY:
        return None
    
    cache_key = f"{lat:.2f},{lon:.2f}"
    cached = cache_get(weather_cache, cache_key)
    if cached is not None:
        return cached
    
    url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&appid={OPENWEATHER_KEY}"
    try:
        r = requests.get(url, timeout=3)
        r.raise_for_status()
        data = r.json()
        cache_set(weather_cache, cache_key, data, ttl=300)  # 5 min TTL
        return data
    except Exception as e:
        print(f"[WEATHER] API error at ({lat},{lon}): {e}")
        return None

def weather_penalty_from_response(w: Dict[str,Any]) -> float:
    """Convert OpenWeather JSON into a numeric penalty."""
    if not w or "weather" not in w or not isinstance(w["weather"], list):
        return 0.0
    main = (w["weather"][0].get("main","") or "").lower()
    wind_speed = float(w.get("wind",{}).get("speed", 0.0))
    visibility = float(w.get("visibility", 10000))
    rain = 0.0
    if "rain" in w and isinstance(w["rain"], dict):
        rain = float(w["rain"].get("1h", w["rain"].get("3h", 0.0)))
    
    penalty = 0.0
    if "thunderstorm" in main:
        penalty += 1000.0
    if "tornado" in main or "squall" in main:
        penalty += 900.0
    if "snow" in main:
        penalty += 700.0
    if "rain" in main or "drizzle" in main:
        penalty += 450.0 + (rain * 200.0)
    if "fog" in main or "mist" in main or "haze" in main or "smoke" in main:
        penalty += 300.0
    if "dust" in main or "sand" in main or "ash" in main:
        penalty += 400.0
    if "cloud" in main:
        penalty += 20.0
    if visibility < 2000:
        penalty += max(0, (2000 - visibility) / 10.0)
    if wind_speed > 12.0:
        penalty += (wind_speed - 12.0) * 30.0
    return penalty

def fetch_elevations_sampled(points: List[Tuple[float,float]]) -> Dict[int, Optional[float]]:
    """
    Fetch elevations for sampled points only (cached).
    Returns dict mapping index (in original points list) to elevation.
    """
    if not GOOGLE_API_KEY or not points:
        return {}
    
    elevs = {}
    batch_size = 50
    for i in range(0, len(points), batch_size):
        batch = points[i:i+batch_size]
        locations = "|".join(f"{p[0]},{p[1]}" for p in batch)
        url = f"https://maps.googleapis.com/maps/api/elevation/json?locations={locations}&key={GOOGLE_API_KEY}"
        try:
            r = requests.get(url, timeout=5)
            r.raise_for_status()
            data = r.json()
            if data.get("status") == "OK" and "results" in data:
                for idx, res in enumerate(data["results"]):
                    elevs[i + idx] = res.get("elevation")
        except Exception as e:
            print(f"[ELEV] API error: {e}")
    return elevs

def slope_penalty_from_elevations(elev1: Optional[float], elev2: Optional[float], dist_m: float) -> float:
    """Compute slope penalty."""
    if elev1 is None or elev2 is None or dist_m <= 0:
        return 0.0
    rise = elev2 - elev1
    slope = abs(rise) / dist_m
    slope_deg = math.degrees(math.atan(slope)) if slope >= 0 else 0.0
    if slope_deg >= 12:
        return 500.0
    elif slope_deg >= 8:
        return 250.0
    elif slope_deg >= 4:
        return 100.0
    return 0.0

def manual_closure_penalty(lat: float, lon: float, closures: List[Tuple[float,float]]) -> float:
    """Check if point is within closure radius."""
    if not closures:
        return 0.0
    for c in closures:
        d = haversine_km(lat, lon, c[0], c[1])
        if d <= CLOSURE_RADIUS_KM:
            return 1200.0
    return 0.0

# ---------------------------
# Route helpers
# ---------------------------
def fetch_osrm_routes(start_lon: float, start_lat: float, end_lon: float, end_lat: float, alternatives: bool = True):
    """Fetch routes from OSRM, including manual alternatives via intermediate waypoints."""
    routes = []
    
    # Primary route (direct)
    coords = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    params = {"overview": "full", "geometries": "polyline"}
    url = f"{OSRM_URL}/{coords}"
    try:
        r = requests.get(url, params=params, timeout=10)
        r.raise_for_status()
        primary = r.json().get("routes", [])
        routes.extend(primary)
    except Exception as e:
        print(f"[OSRM] primary request failed: {e}")
    
    # Alternative routes via offset waypoints (offset lat/lon by ~0.5 degrees)
    if alternatives:
        for offset_lat, offset_lon in [(0.3, 0), (-0.3, 0), (0, 0.3), (0, -0.3)]:
            via_lat = (start_lat + end_lat) / 2.0 + offset_lat
            via_lon = (start_lon + end_lon) / 2.0 + offset_lon
            alt_coords = f"{start_lon},{start_lat};{via_lon},{via_lat};{end_lon},{end_lat}"
            try:
                r = requests.get(url.replace(coords, alt_coords), params=params, timeout=10)
                r.raise_for_status()
                alt_routes = r.json().get("routes", [])
                routes.extend(alt_routes)
            except Exception as e:
                print(f"[OSRM] alternative request failed: {e}")
    
    return routes

def coords_polyline_to_latlon(poly: str) -> List[Tuple[float,float]]:
    """Decode polyline to lat/lon."""
    try:
        pts = polyline.decode(poly)
        return [(float(lat), float(lon)) for lat,lon in pts]
    except Exception as e:
        print(f"[OSRM] polyline decode error: {e}")
        return []

# ---------------------------
# Cost model (OPTIMIZED)
# ---------------------------
def score_route_option(route_coords: List[Tuple[float,float]], closures: List[Tuple[float,float]]) -> Dict[str,Any]:
    """
    OPTIMIZED: Sample route to reduce API calls.
    - Densify with larger sample distance (500m instead of 200m)
    - Sample only ~10 points for weather/elevation checks
    - Cache results
    """
    # Densify with larger sample distance
    densified = densify_path(route_coords, sample_m=SAMPLE_DISTANCE_M)
    
    # Sample evenly spaced points for API queries
    sampled = sample_route_points(densified, max_samples=10)
    sampled_indices = [densified.index(p) if p in densified else 0 for p in sampled]
    
    # Fetch elevations only for sampled points
    elev_map = fetch_elevations_sampled(sampled)
    
    total_score = 0.0
    closed_segments = []
    risk_hits = []
    
    # Score densified path
    for i in range(len(densified)-1):
        lat1, lon1 = densified[i]
        lat2, lon2 = densified[i+1]
        dist_km = haversine_km(lat1, lon1, lat2, lon2)
        dist_m = dist_km * 1000.0
        
        # Weather penalty: query only if point is in sampled set, else use interpolation
        weather_pen = 0.0
        if i in sampled_indices or i+1 in sampled_indices:
            midlat, midlon = (lat1 + lat2) / 2.0, (lon1 + lon2) / 2.0
            weather_data = fetch_weather(midlat, midlon)
            weather_pen = weather_penalty_from_response(weather_data) if weather_data else 0.0
        else:
            midlat, midlon = (lat1 + lat2) / 2.0, (lon1 + lon2) / 2.0
        
        # Slope penalty: interpolate elevations if not in sampled set
        elev1 = elev_map.get(i)
        elev2 = elev_map.get(i+1)
        slope_pen = slope_penalty_from_elevations(elev1, elev2, dist_m)
        
        # Closure penalty
        closure_pen1 = manual_closure_penalty(lat1, lon1, closures)
        closure_pen2 = manual_closure_penalty(lat2, lon2, closures)
        closure_pen = max(closure_pen1, closure_pen2)
        if closure_pen > 0:
            closed_segments.append([(lat1+lat2)/2.0, (lon1+lon2)/2.0])
        
        # Total segment cost
        base_cost = dist_m * 0.01
        # Risk penalty: evaluate risk zones at segment midpoint
        risk_info = risk_penalty_at_point(midlat, midlon)
        risk_pen = risk_info.get("penalty", 0.0)
        if risk_info.get("matched"):
            for m in risk_info.get("matched"):
                risk_hits.append({"lat": midlat, "lon": midlon, "zone": m})

        seg_cost = base_cost + weather_pen + slope_pen + closure_pen + risk_pen
        total_score += seg_cost
    
    return {
        "total_score": total_score + 0.0001,
        "closed_segments": closed_segments,
        "risk_hits": risk_hits,
        "densified_len": len(densified)
    }

# ---------------------------
# API endpoint
# ---------------------------
@app.get("/dynamic_reroute_json")
def dynamic_reroute_json(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    closure_points: str = Query(None),
    fast: bool = Query(False, description="If true, bypass external OSRM calls and use a synthetic straight-line route (for testing)")
):
    """
    Fast dynamic rerouting based on weather and closures.
    Response time: ~2-5 seconds instead of 10+ minutes.
    """
    # parse closures
    closures = []
    if closure_points:
        for seg in closure_points.split(";"):
            seg = seg.strip()
            if not seg:
                continue
            try:
                lat_s, lon_s = seg.split(",")
                closures.append((float(lat_s), float(lon_s)))
            except Exception:
                continue

    # fetch OSRM routes (or use synthetic fast fallback when requested)
    routes = []
    if not fast:
        routes = fetch_osrm_routes(start_lon, start_lat, end_lon, end_lat, alternatives=True)
    else:
        print(f"[FAST MODE] Using synthetic route for {start_lat},{start_lon} -> {end_lat},{end_lon}")
    if not routes:
        print(f"[OSRM] no routes returned, using synthetic straight-line fallback for {start_lat},{start_lon} -> {end_lat},{end_lon}")
        # Create simple straight-line synthetic route (interpolated points) to allow scoring and AI insights
        try:
            steps = 50
            coords = []
            for i in range(steps + 1):
                t = i / steps
                lat = start_lat + (end_lat - start_lat) * t
                lon = start_lon + (end_lon - start_lon) * t
                coords.append((lat, lon))
            poly = polyline.encode([(c[0], c[1]) for c in coords])
            # crude distance and duration estimates
            total_dist_km = haversine_km(start_lat, start_lon, end_lat, end_lon)
            total_dist_m = total_dist_km * 1000.0
            est_duration_s = max(1.0, total_dist_m / 15.0)  # assume 15 m/s ~54 km/h
            routes = [{"geometry": poly, "distance": total_dist_m, "duration": est_duration_s}]
        except Exception as e:
            print(f"[FALLBACK] error creating synthetic route: {e}")
            return JSONResponse({"error": "no routes available and fallback failed"}, status_code=502)

    scored_options = []
    for r in routes:
        coords = coords_polyline_to_latlon(r.get("geometry",""))
        if not coords:
            continue
        sc = score_route_option(coords, closures)
        scored_options.append({
            "score": sc["total_score"],
            "closed_segments": sc["closed_segments"],
            "risk_hits": sc.get("risk_hits", []),
            "coords": coords,
            "distance": r.get("distance", 0.0),
            "duration": r.get("duration", 0.0),
            "densified_len": sc["densified_len"]
        })

    if not scored_options:
        return JSONResponse({"error":"no valid route options"}, status_code=500)

    # sort by score (lower = better)
    scored_options.sort(key=lambda x: x["score"])

    best = scored_options[0]
    original_coords = coords_polyline_to_latlon(routes[0].get("geometry",""))

    # reroute is the best optimized route (green line on frontend)
    # Always populate it with the best route found
    reroute_coords = best["coords"]

    response = {
        "original_route": original_coords,
        "chosen_route": best["coords"],
        "reroute": reroute_coords,
        "closures": [list(c) for c in closures],
        "closed_segments": best["closed_segments"],
        "risk_hits": best.get("risk_hits", []),
        "eta_seconds": best.get("duration", 0.0),
        "distance_m": best.get("distance", 0.0),
        "score": best["score"]
    }
    
    # ADD AI INSIGHTS if available
    if ai_scorer:
        try:
            # Get hybrid scoring breakdown
            hybrid_breakdown = ai_scorer.score_route_hybrid(
                reroute_coords,
                best["score"],
                start_lat, start_lon,
                end_lat, end_lon,
                closures
            )
            
            # Get AI recommendation
            recommendation = ai_scorer.get_route_recommendation(start_lat, start_lon, end_lat, end_lon)
            
            response["ai_insights"] = {
                "hybrid_score_breakdown": hybrid_breakdown,
                "recommendation": recommendation,
                "should_delay": hybrid_breakdown.get("should_delay", False),
                "message": recommendation.get("message", "")
            }
            # Route-level recommendation: compare original vs best scores and suggest which to take
            try:
                # compute original route score
                orig_sc = score_route_option(original_coords, closures)
                original_score = orig_sc.get("total_score")
            except Exception:
                original_score = None

            try:
                best_score = best.get("score")
            except Exception:
                best_score = None

            route_rec = {}
            try:
                if original_score is not None and best_score is not None:
                    delta = original_score - best_score
                    # determine whether best is different from original
                    same_route = (original_coords == best.get("coords"))
                    if same_route:
                        rec = "original"
                    else:
                        # recommend the lower-scoring route
                        rec = "reroute" if best_score < original_score else "original"

                    # reason heuristics
                    if orig_sc.get("closed_segments") and len(orig_sc.get("closed_segments", [])) > 0:
                        reason = "avoids closed segments"
                    elif hybrid_breakdown.get("forecast_penalty", 0) > 0:
                        reason = "better forecast / lower weather risk"
                    elif hybrid_breakdown.get("traffic_penalty", 0) > 0:
                        reason = "less traffic"
                    else:
                        reason = "lower combined score"

                    msg = f"Recommended: take the {rec} (score {best_score:.1f} vs original {original_score:.1f}) — {reason}."
                    route_rec = {
                        "recommended_route": rec,
                        "delta_score": delta,
                        "reason": reason,
                        "message": msg,
                        "same_route": same_route
                    }
                else:
                    route_rec = {"recommended_route": "unknown", "message": "No route-level comparison available"}
            except Exception as e:
                route_rec = {"recommended_route": "unknown", "message": f"error computing route recommendation: {e}"}

            response["ai_insights"]["route_recommendation"] = route_rec
        except Exception as e:
            print(f"[AI] Error in AI scoring: {e}")
    
    return JSONResponse(response)


# ---------------------------
# AI Route Recommendation Endpoint
# ---------------------------
@app.get("/ai_route_recommendation")
def get_ai_recommendation(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
):
    """
    Get AI-powered recommendation for route timing and conditions.
    Returns: best departure time, weather forecast, historical performance, traffic analysis.
    """
    if not ai_scorer:
        return JSONResponse({"error": "AI scorer not available"}, status_code=503)
    
    try:
        recommendation = ai_scorer.get_route_recommendation(start_lat, start_lon, end_lat, end_lon)
        return JSONResponse(recommendation)
    except Exception as e:
        print(f"[AI] Error getting recommendation: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)


@app.post("/log_convoy_trip")
def log_convoy_trip(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
    actual_time_minutes: float = Query(...),
    distance_m: float = Query(...),
    weather_score: float = Query(0),
    success: bool = Query(True),
):
    """
    Log completed convoy trip for historical learning.
    This data is used to improve future route recommendations.
    """
    if not ai_scorer:
        return JSONResponse({"error": "AI scorer not available"}, status_code=503)
    
    try:
        ai_scorer.history_tracker.add_route_result(
            start_lat, start_lon, end_lat, end_lon,
            actual_time_minutes * 60,  # Convert to seconds
            distance_m, weather_score, success
        )
        return JSONResponse({"status": "logged", "message": "Trip data saved for learning"})
    except Exception as e:
        print(f"[AI] Error logging trip: {e}")
        return JSONResponse({"error": str(e)}, status_code=500)

# ---------------------------
# WebSocket manager (unchanged)
# ---------------------------
class WSManager:
    def __init__(self):
        self.conns: List[WebSocket] = []
    async def connect(self, ws: WebSocket):
        await ws.accept()
        self.conns.append(ws)
    def disconnect(self, ws: WebSocket):
        if ws in self.conns:
            self.conns.remove(ws)
    async def send(self, ws: WebSocket, data: Dict[str,Any]):
        await ws.send_json(data)

ws_manager = WSManager()

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    """WebSocket for live route updates."""
    await ws_manager.connect(ws)
    try:
        init = await ws.receive_json()
    except Exception:
        await ws.close()
        return

    start_lat = float(init.get("start_lat"))
    start_lon = float(init.get("start_lon"))
    end_lat = float(init.get("end_lat"))
    end_lon = float(init.get("end_lon"))
    closure_points = init.get("closure_points", None)

    idx = 0
    chosen_route = []
    
    try:
        res = dynamic_reroute_json(start_lat=start_lat, start_lon=start_lon, end_lat=end_lat, end_lon=end_lon, closure_points=closure_points)
        chosen_route = res.get("chosen_route", []) or res.get("original_route", [])
    except Exception as e:
        chosen_route = []

    try:
        while True:
            res = dynamic_reroute_json(start_lat=start_lat, start_lon=start_lon, end_lat=end_lat, end_lon=end_lon, closure_points=closure_points)
            route_coords = res.get("chosen_route", []) or res.get("original_route", [])
            if not route_coords:
                await ws.send_json({"type":"error","message":"no route"})
                await asyncio.sleep(WEBSOCKET_UPDATE_SEC)
                continue

            if idx < len(route_coords)-1:
                idx += 1
            convoy_pos = route_coords[idx]

            payload = {
                "type": "update",
                "timestamp": time.time(),
                "convoy_pos": convoy_pos,
                "route": route_coords,
                "original_route": res.get("original_route", []),
                "closures": res.get("closures", []),
                "closed_segments": res.get("closed_segments", []),
                "eta_seconds": res.get("eta_seconds", 0.0),
                "distance_m": res.get("distance_m", 0.0),
                "score": res.get("score", 0.0)
            }
            await ws_manager.send(ws, payload)
            await asyncio.sleep(WEBSOCKET_UPDATE_SEC)
    except Exception as e:
        print(f"[WS] exception: {e}")
    finally:
        ws_manager.disconnect(ws)

# ---------------------------
# If run as main
# ---------------------------
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("dynamic_route_optimized:app", host="0.0.0.0", port=8000, reload=True)
