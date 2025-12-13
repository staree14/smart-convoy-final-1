# routers/risk_zones.py
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from utils.auth_utils import get_current_user
from core.risk_zone_manager import get_risk_manager
from typing import List

router = APIRouter()


@router.get("/all")
def get_all_risk_zones(current_user: dict = Depends(get_current_user)):
    """
    Get all risk zones for map display.
    Returns list of risk zones with their locations and risk levels.
    """
    try:
        risk_manager = get_risk_manager()
        zones = risk_manager.get_all_zones()

        return JSONResponse({
            "status": "success",
            "count": len(zones),
            "zones": zones
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{zone_id}")
def get_risk_zone(zone_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get details of a specific risk zone.
    """
    try:
        risk_manager = get_risk_manager()
        zone = risk_manager.get_zone_by_id(zone_id)

        if not zone:
            raise HTTPException(status_code=404, detail="Risk zone not found")

        return JSONResponse({
            "status": "success",
            "zone": zone.to_dict()
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/check_point")
def check_point_risk(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    current_user: dict = Depends(get_current_user)
):
    """
    Check if a specific point falls within any risk zone.
    Returns the risk penalty and zone information.
    """
    try:
        risk_manager = get_risk_manager()
        penalty = risk_manager.compute_risk_penalty(lat, lon)

        # Find which zone(s) the point is in
        zones_at_point = []
        for zone in risk_manager.risk_zones:
            dist = risk_manager.haversine_distance(lat, lon, zone.center_lat, zone.center_lon)
            if dist <= zone.radius_km:
                zones_at_point.append({
                    **zone.to_dict(),
                    "distance_from_center_km": round(dist, 2)
                })

        return JSONResponse({
            "status": "success",
            "lat": lat,
            "lon": lon,
            "risk_penalty": penalty,
            "in_risk_zone": penalty > 0,
            "zones": zones_at_point
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze_route")
def analyze_route_risks(
    route: List[List[float]],  # [[lat, lon], [lat, lon], ...]
    buffer_km: float = Query(1.0, description="Buffer distance in km"),
    current_user: dict = Depends(get_current_user)
):
    """
    Analyze a route for risk zone intersections.

    Request body should be a list of [lat, lon] coordinates.
    Returns all risk zones the route passes through or near.
    """
    try:
        if not route or len(route) < 2:
            raise HTTPException(status_code=400, detail="Route must have at least 2 points")

        # Convert to list of tuples
        route_coords = [(point[0], point[1]) for point in route]

        risk_manager = get_risk_manager()
        risk_analysis = risk_manager.detect_route_risks(route_coords, buffer_km=buffer_km)

        return JSONResponse({
            "status": "success",
            **risk_analysis
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
