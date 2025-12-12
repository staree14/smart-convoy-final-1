"""
Dynamic Route with Risk Zones Detection

This backend:
1. Loads risk_zones.csv (center_lat, center_lon, radius_km, risk_level)
2. Fetches primary route from OSRM
3. Detects intersections between the route and risk zones
4. Returns danger_points (lat/lon of risk zone centers that the route passes through)
5. Frontend visualizes danger_points as warning markers
"""

import os
import csv
import math
import requests
from typing import List, Tuple, Dict, Any
from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

OSRM_URL = os.getenv("OSRM_URL", "http://router.project-osrm.org/route/v1/driving")

app = FastAPI(title="Dynamic Route with Risk Zones")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =====================================
# Risk Zones Loader
# =====================================

class RiskZone:
    def __init__(self, zone_id: str, name: str, center_lat: float, center_lon: float, 
                 radius_km: float, risk_level: str):
        self.zone_id = zone_id
        self.name = name
        self.center_lat = center_lat
        self.center_lon = center_lon
        self.radius_km = radius_km
        self.risk_level = risk_level

RISK_ZONES: List[RiskZone] = []

def load_risk_zones(filepath: str = "risk_zones.csv") -> List[RiskZone]:
    """Load risk zones from CSV file."""
    zones = []
    if not os.path.exists(filepath):
        print(f"[RISK] {filepath} not found")
        return zones
    
    try:
        with open(filepath, newline='', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                try:
                    zone = RiskZone(
                        zone_id=row.get('riskzone_id', ''),
                        name=row.get('name', ''),
                        center_lat=float(row.get('center_lat', 0)),
                        center_lon=float(row.get('center_lon', 0)),
                        radius_km=float(row.get('radius_km', 5)),
                        risk_level=row.get('risk_level', 'low').lower()
                    )
                    zones.append(zone)
                except Exception as e:
                    print(f"[RISK] Error parsing row {row}: {e}")
        print(f"[RISK] Loaded {len(zones)} risk zones")
    except Exception as e:
        print(f"[RISK] Error loading {filepath}: {e}")
    
    return zones

# Load at startup
RISK_ZONES = load_risk_zones()

# =====================================
# Utility Functions
# =====================================

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate distance between two points in kilometers."""
    R = 6371.0  # Earth radius in km
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)
    
    a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
    return R * c

def point_to_line_distance(point_lat: float, point_lon: float, 
                           line_lat1: float, line_lon1: float,
                           line_lat2: float, line_lon2: float) -> float:
    """
    Calculate perpendicular distance from a point to a line segment.
    Returns distance in kilometers.
    """
    # Convert to radians
    p_lat, p_lon = math.radians(point_lat), math.radians(point_lon)
    a_lat, a_lon = math.radians(line_lat1), math.radians(line_lon1)
    b_lat, b_lon = math.radians(line_lat2), math.radians(line_lon2)
    
    # Using haversine formula for great circle distance
    # For simplicity, use Euclidean approximation for small distances
    # (convert lat/lon to approximate x/y at the equator)
    R = 6371.0
    
    # Use average latitude of the segment as the reference for projection
    avg_lat = (a_lat + b_lat) / 2
    cos_lat = math.cos(avg_lat)
    
    p_x = R * p_lon * cos_lat
    p_y = R * p_lat
    
    a_x = R * a_lon * cos_lat
    a_y = R * a_lat
    
    b_x = R * b_lon * cos_lat
    b_y = R * b_lat
    
    # Point to line segment distance
    dx = b_x - a_x
    dy = b_y - a_y
    
    if dx == 0 and dy == 0:
        return haversine_distance(point_lat, point_lon, line_lat1, line_lon1)
    
    t = max(0, min(1, ((p_x - a_x) * dx + (p_y - a_y) * dy) / (dx*dx + dy*dy)))
    
    closest_x = a_x + t * dx
    closest_y = a_y + t * dy
    
    dist_sq = (p_x - closest_x)**2 + (p_y - closest_y)**2
    return math.sqrt(dist_sq)  # Already in km

def detect_risk_intersections(route_coords: List[Tuple[float, float]]) -> Dict[str, Any]:
    """
    Detect which risk zones the route passes through.
    Returns: {danger_points: [...], risk_summary: [...]}
    """
    danger_points = []
    risk_summary = {}
    
    for zone in RISK_ZONES:
        # Check if any segment of the route passes near this zone
        min_distance = float('inf')
        
        for i in range(len(route_coords) - 1):
            lat1, lon1 = route_coords[i]
            lat2, lon2 = route_coords[i + 1]
            
            # Distance from zone center to line segment
            dist = point_to_line_distance(zone.center_lat, zone.center_lon,
                                         lat1, lon1, lat2, lon2)
            min_distance = min(min_distance, dist)
        
        # If route passes through or near the risk zone
        if min_distance <= zone.radius_km + 1:  # 1km buffer
            danger_points.append({
                "id": zone.zone_id,
                "name": zone.name,
                "lat": zone.center_lat,
                "lon": zone.center_lon,
                "risk_level": zone.risk_level,
                "distance_km": round(min_distance, 2)
            })
            risk_summary[zone.zone_id] = {
                "name": zone.name,
                "risk_level": zone.risk_level,
                "min_distance_km": round(min_distance, 2)
            }
    
    return {
        "danger_points": danger_points,
        "risk_summary": risk_summary,
        "total_dangers": len(danger_points)
    }

# =====================================
# OSRM Integration
# =====================================

# =====================================
# OSRM Integration
# =====================================

def fetch_routes_with_alternatives(start_lat: float, start_lon: float, 
                                  end_lat: float, end_lon: float) -> List[Dict[str, Any]]:
    """Fetch primary and alternative routes from OSRM."""
    coords = f"{start_lon},{start_lat};{end_lon},{end_lat}"
    params = {"overview": "full", "geometries": "geojson", "alternatives": "true"}
    
    try:
        # Try Primary OSRM
        return _query_osrm_multi(OSRM_URL, coords, params)
    except Exception as e:
        print(f"[WARN] Primary OSRM failed: {e}")
        
    try:
        # Try Backup OSRM
        backup_url = "https://routing.openstreetmap.de/routed-car/route/v1/driving"
        return _query_osrm_multi(backup_url, coords, params)
    except Exception as e:
        print(f"[WARN] Backup OSRM failed: {e}")

    # Fallback: Straight line
    return [{
        "coords": [[start_lat, start_lon], [end_lat, end_lon]],
        "distance": haversine_distance(start_lat, start_lon, end_lat, end_lon) * 1000,
        "duration": 0.0
    }]

def _query_osrm_multi(base_url: str, coords: str, params: Dict) -> List[Dict[str, Any]]:
    """Helper to query OSRM and return list of routes."""
    url = f"{base_url}/{coords}"
    r = requests.get(url, params=params, timeout=5)
    r.raise_for_status()
    js = r.json()
    routes = js.get("routes", [])
    
    if not routes:
        raise Exception("no_routes")
    
    parsed_routes = []
    for route in routes:
        geom = route.get("geometry", {})
        coords_lonlat = geom.get("coordinates", [])
        # Convert to [lat, lon]
        coords_latlon = [[float(p[1]), float(p[0])] for p in coords_lonlat]
        
        parsed_routes.append({
            "coords": coords_latlon,
            "distance": route.get("distance", 0.0),
            "duration": route.get("duration", 0.0)
        })
        
    return parsed_routes

# =====================================
# API Endpoints
# =====================================

@app.get("/dynamic_route_json")
def dynamic_route_json(
    start_lat: float = Query(...),
    start_lon: float = Query(...),
    end_lat: float = Query(...),
    end_lon: float = Query(...),
):
    """
    Compute dynamic route and detect risk zone intersections.
    Returns original_route (fastest) and safe_route (if original is risky).
    """
    
    # Fetch OSRM routes (including alternatives)
    routes = fetch_routes_with_alternatives(start_lat, start_lon, end_lat, end_lon)
    
    if not routes:
        return JSONResponse({"error": "No routes found"}, status_code=502)
    
    # The first route is always the "primary" (fastest) route from OSRM
    primary_route = routes[0]
    primary_risk = detect_risk_intersections(primary_route["coords"])
    
    response = {
        "original_route": primary_route["coords"],
        "distance_m": primary_route["distance"],
        "eta_seconds": primary_route["duration"],
        "danger_points": primary_risk.get("danger_points", []),
        "risk_summary": primary_risk.get("risk_summary", {}),
        "total_dangers": primary_risk.get("total_dangers", 0),
        "safe_route": None,
        "safe_route_info": None
    }
    
    # If primary route has risks, look for a safer alternative
    if primary_risk["total_dangers"] > 0:
        print(f"[RISK] Primary route has {primary_risk['total_dangers']} dangers. Checking {len(routes)-1} alternatives...")
        
        best_safe_route = None
        min_dangers = primary_risk["total_dangers"]
        
        for i, route in enumerate(routes[1:]):
            risk_info = detect_risk_intersections(route["coords"])
            dangers = risk_info["total_dangers"]
            
            print(f"[RISK] Alternative {i+1}: {dangers} dangers")
            
            # We want a route with 0 dangers, or at least fewer than primary
            if dangers < min_dangers:
                min_dangers = dangers
                best_safe_route = route
                
                # If we found a perfectly safe route, stop searching
                if dangers == 0:
                    break
        
        if best_safe_route:
            print("[RISK] Found a safer route!")
            response["safe_route"] = best_safe_route["coords"]
            response["safe_route_info"] = {
                "distance_m": best_safe_route["distance"],
                "eta_seconds": best_safe_route["duration"],
                "dangers_avoided": primary_risk["total_dangers"] - min_dangers
            }
            
    return JSONResponse(response)

@app.get("/risk_zones")
def get_risk_zones():
    """Return all risk zones for reference."""
    zones = [
        {
            "id": z.zone_id,
            "name": z.name,
            "lat": z.center_lat,
            "lon": z.center_lon,
            "radius_km": z.radius_km,
            "risk_level": z.risk_level
        }
        for z in RISK_ZONES
    ]
    return JSONResponse({
        "total_zones": len(zones),
        "zones": zones
    })

@app.get("/health")
def health_check():
    """Health check endpoint."""
    return JSONResponse({
        "status": "ok",
        "risk_zones_loaded": len(RISK_ZONES)
    })

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("dynamic_route_with_risk:app", host="127.0.0.1", port=8000, reload=True)
