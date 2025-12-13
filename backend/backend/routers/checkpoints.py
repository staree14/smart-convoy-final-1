# routers/checkpoints.py
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import JSONResponse
from utils.auth_utils import get_current_user
from utils.helpers import haversine_km
from db_connection import get_connection
from typing import Optional, List
import math

router = APIRouter()


@router.get("/all")
def get_all_checkpoints(
    current_user: dict = Depends(get_current_user),
    status: Optional[str] = Query(None, description="Filter by status: operational, congested, closed, maintenance"),
    checkpoint_type: Optional[str] = Query(None, description="Filter by type: military, border, rest_stop, toll, fuel")
):
    """
    Get all checkpoints with optional filtering.
    Returns list of checkpoints for map display.
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Build query with optional filters
        query = "SELECT * FROM checkpoints WHERE 1=1"
        params = []

        if status:
            query += " AND status = %s"
            params.append(status)

        if checkpoint_type:
            query += " AND checkpoint_type = %s"
            params.append(checkpoint_type)

        query += " ORDER BY name;"

        cur.execute(query, params)
        checkpoints = cur.fetchall()

        # Convert datetime objects to strings for JSON serialization
        serializable_checkpoints = []
        for cp in checkpoints:
            cp_dict = dict(cp)
            # Convert any datetime objects to ISO format strings
            for key, value in cp_dict.items():
                if hasattr(value, 'isoformat'):  # Check if it's a datetime object
                    cp_dict[key] = value.isoformat()
            serializable_checkpoints.append(cp_dict)

        return JSONResponse({
            "status": "success",
            "count": len(serializable_checkpoints),
            "checkpoints": serializable_checkpoints
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/nearby")
def get_nearby_checkpoints(
    lat: float = Query(..., description="Latitude"),
    lon: float = Query(..., description="Longitude"),
    radius_km: float = Query(50, description="Search radius in kilometers"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get checkpoints within radius of a given location.
    Useful for showing checkpoints near convoy routes.
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        cur.execute("SELECT * FROM checkpoints;")
        all_checkpoints = cur.fetchall()

        # Filter checkpoints within radius
        nearby = []
        for cp in all_checkpoints:
            distance = haversine_km(lat, lon, cp["lat"], cp["lon"])
            if distance <= radius_km:
                checkpoint_data = dict(cp)
                # Convert datetime objects to strings
                for key, value in checkpoint_data.items():
                    if hasattr(value, 'isoformat'):
                        checkpoint_data[key] = value.isoformat()
                checkpoint_data["distance_km"] = round(distance, 2)
                nearby.append(checkpoint_data)

        # Sort by distance
        nearby.sort(key=lambda x: x["distance_km"])

        return JSONResponse({
            "status": "success",
            "count": len(nearby),
            "search_center": {"lat": lat, "lon": lon},
            "radius_km": radius_km,
            "checkpoints": nearby
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/route/{convoy_id}")
def get_route_checkpoints(
    convoy_id: int,
    max_distance_km: float = Query(10, description="Max distance from route in km"),
    current_user: dict = Depends(get_current_user)
):
    """
    Get checkpoints along a convoy's route.
    Returns checkpoints that are within max_distance_km of the route path.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Get convoy details
        cur.execute("""
            SELECT convoy_id, convoy_name, source_lat, source_lon,
                   destination_lat, destination_lon, created_by
            FROM convoys
            WHERE convoy_id = %s;
        """, (convoy_id,))
        convoy = cur.fetchone()

        if not convoy:
            raise HTTPException(status_code=404, detail="Convoy not found")

        # Verify ownership
        if convoy["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get route waypoints
        cur.execute("""
            SELECT waypoints
            FROM routes
            WHERE convoy_id = %s
            LIMIT 1;
        """, (convoy_id,))
        route = cur.fetchone()

        if not route or not route["waypoints"]:
            # No route yet - return checkpoints near source and destination
            cur.execute("SELECT * FROM checkpoints;")
            all_checkpoints = cur.fetchall()

            nearby_checkpoints = []
            for cp in all_checkpoints:
                dist_to_source = haversine_km(convoy["source_lat"], convoy["source_lon"], cp["lat"], cp["lon"])
                dist_to_dest = haversine_km(convoy["destination_lat"], convoy["destination_lon"], cp["lat"], cp["lon"])

                if dist_to_source <= max_distance_km or dist_to_dest <= max_distance_km:
                    checkpoint_data = dict(cp)
                    # Convert datetime objects to strings
                    for key, value in checkpoint_data.items():
                        if hasattr(value, 'isoformat'):
                            checkpoint_data[key] = value.isoformat()
                    checkpoint_data["distance_to_route_km"] = min(dist_to_source, dist_to_dest)
                    checkpoint_data["checkpoint_order"] = None
                    nearby_checkpoints.append(checkpoint_data)

            return JSONResponse({
                "status": "success",
                "convoy_id": convoy_id,
                "convoy_name": convoy["convoy_name"],
                "count": len(nearby_checkpoints),
                "checkpoints": nearby_checkpoints,
                "message": "Route not calculated yet - showing checkpoints near endpoints"
            })

        # Parse waypoints (format: [[lat,lon], [lat,lon], ...])
        waypoints = route["waypoints"]

        # Get all checkpoints
        cur.execute("SELECT * FROM checkpoints;")
        all_checkpoints = cur.fetchall()

        # Find checkpoints near the route
        route_checkpoints = []
        for cp in all_checkpoints:
            # Calculate minimum distance to any route segment
            min_distance = float('inf')

            for i in range(len(waypoints) - 1):
                # Distance to each route segment
                p1_lat, p1_lon = waypoints[i]
                p2_lat, p2_lon = waypoints[i + 1]

                # Simplified: distance to midpoint of segment
                mid_lat = (p1_lat + p2_lat) / 2
                mid_lon = (p1_lon + p2_lon) / 2
                dist = haversine_km(mid_lat, mid_lon, cp["lat"], cp["lon"])

                if dist < min_distance:
                    min_distance = dist

            if min_distance <= max_distance_km:
                checkpoint_data = dict(cp)
                # Convert datetime objects to strings
                for key, value in checkpoint_data.items():
                    if hasattr(value, 'isoformat'):
                        checkpoint_data[key] = value.isoformat()
                checkpoint_data["distance_to_route_km"] = round(min_distance, 2)

                # Estimate checkpoint order along route
                checkpoint_data["checkpoint_order"] = None  # TODO: calculate actual order
                route_checkpoints.append(checkpoint_data)

        # Sort by distance to route
        route_checkpoints.sort(key=lambda x: x["distance_to_route_km"])

        return JSONResponse({
            "status": "success",
            "convoy_id": convoy_id,
            "convoy_name": convoy["convoy_name"],
            "count": len(route_checkpoints),
            "checkpoints": route_checkpoints
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/{checkpoint_id}")
def get_checkpoint_details(
    checkpoint_id: int,
    current_user: dict = Depends(get_current_user)
):
    """
    Get detailed information about a specific checkpoint.
    """
    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        cur.execute("""
            SELECT * FROM checkpoints
            WHERE checkpoint_id = %s;
        """, (checkpoint_id,))
        checkpoint = cur.fetchone()

        if not checkpoint:
            raise HTTPException(status_code=404, detail="Checkpoint not found")

        # Get recent events at this checkpoint
        cur.execute("""
            SELECT ce.*, c.convoy_name
            FROM checkpoint_events ce
            JOIN convoys c ON ce.convoy_id = c.convoy_id
            WHERE ce.checkpoint_id = %s
            ORDER BY ce.created_at DESC
            LIMIT 10;
        """, (checkpoint_id,))
        recent_events = cur.fetchall()

        return JSONResponse({
            "status": "success",
            "checkpoint": checkpoint,
            "recent_events": recent_events,
            "event_count": len(recent_events)
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.post("/{checkpoint_id}/update-status")
def update_checkpoint_status(
    checkpoint_id: int,
    status: str = Query(..., description="New status: operational, congested, closed, maintenance"),
    current_user: dict = Depends(get_current_user)
):
    """
    Update checkpoint status (admin/operator function).
    """
    valid_statuses = ["operational", "congested", "closed", "maintenance"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        cur.execute("""
            UPDATE checkpoints
            SET status = %s
            WHERE checkpoint_id = %s
            RETURNING *;
        """, (status, checkpoint_id))

        updated = cur.fetchone()
        if not updated:
            raise HTTPException(status_code=404, detail="Checkpoint not found")

        conn.commit()

        return JSONResponse({
            "status": "success",
            "message": f"Checkpoint status updated to '{status}'",
            "checkpoint": updated
        })

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
