# routers/vehicle_status.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from utils.auth_utils import get_current_user
from db_connection import get_connection

router = APIRouter()


@router.patch("/convoy/{convoy_id}/vehicles/status")
def update_convoy_vehicles_status(
    convoy_id: int,
    new_status: str,
    current_user: dict = Depends(get_current_user)
):
    """
    Update the status of all vehicles in a convoy.
    Statuses: idle, en_route, at_checkpoint, completed, breakdown
    """
    user_id = current_user["user_id"]

    valid_statuses = ["idle", "en_route", "at_checkpoint", "completed", "breakdown"]
    if new_status not in valid_statuses:
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
            SELECT created_by FROM convoys
            WHERE convoy_id = %s;
        """, (convoy_id,))
        convoy = cur.fetchone()

        if not convoy:
            raise HTTPException(status_code=404, detail="Convoy not found")

        if convoy["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update all vehicles in the convoy
        cur.execute("""
            UPDATE vehicles
            SET current_status = %s
            WHERE convoy_id = %s
            RETURNING vehicle_id, registration, current_status;
        """, (new_status, convoy_id))

        updated_vehicles = cur.fetchall()
        conn.commit()

        return JSONResponse({
            "status": "success",
            "message": f"Updated {len(updated_vehicles)} vehicles to '{new_status}' status",
            "convoy_id": convoy_id,
            "new_status": new_status,
            "updated_count": len(updated_vehicles)
        })

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
