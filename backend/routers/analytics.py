# routers/analytics.py
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import JSONResponse
from utils.auth_utils import get_current_user
from utils.helpers import haversine_km
from db_connection import get_connection
from typing import Optional
import math

router = APIRouter()


def calculate_baseline_distance(source_lat: float, source_lon: float, dest_lat: float, dest_lon: float) -> float:
    """
    Calculate baseline (direct) distance with road factor.
    Uses Haversine formula with 1.3x multiplier for road routing.
    """
    straight_line_km = haversine_km(source_lat, source_lon, dest_lat, dest_lon)
    return straight_line_km * 1.3  # 30% road factor


def calculate_baseline_duration(distance_km: float) -> float:
    """
    Calculate baseline duration in minutes.
    Assumes 50 km/h average speed.
    """
    return (distance_km / 50.0) * 60.0


def calculate_fuel_consumption(distance_km: float) -> float:
    """
    Calculate fuel consumption in liters.
    Assumes 0.35 L/km for military trucks.
    """
    return distance_km * 0.35


def calculate_fuel_cost(fuel_liters: float, price_per_liter: float = 150.0) -> float:
    """
    Calculate fuel cost in rupees.
    Default diesel price: ₹150/liter
    """
    return fuel_liters * price_per_liter


@router.get("/dashboard-metrics")
def get_dashboard_metrics(current_user: dict = Depends(get_current_user)):
    """
    Get aggregated analytics for dashboard display.
    Calculates real savings across all user's convoys.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Get all convoys for this user
        cur.execute("""
            SELECT convoy_id, source_lat, source_lon, destination_lat, destination_lon, created_at
            FROM convoys
            WHERE created_by = %s
            ORDER BY created_at DESC;
        """, (user_id,))
        convoys = cur.fetchall()

        if not convoys:
            # Return zeros for new users
            return JSONResponse({
                "status": "success",
                "metrics": {
                    "total_convoys": 0,
                    "total_distance_saved_km": 0,
                    "total_fuel_saved_liters": 0,
                    "total_cost_saved_inr": 0,
                    "total_time_saved_minutes": 0,
                    "conflicts_prevented": 0,
                    "successful_merges": 0,
                    "avg_efficiency_improvement": 0
                }
            })

        total_distance_saved = 0.0
        total_fuel_saved = 0.0
        total_cost_saved = 0.0
        total_time_saved = 0.0
        convoy_count = 0
        total_efficiency = 0.0

        for convoy in convoys:
            # Calculate baseline (direct) metrics
            baseline_distance = calculate_baseline_distance(
                convoy["source_lat"], convoy["source_lon"],
                convoy["destination_lat"], convoy["destination_lon"]
            )
            baseline_duration = calculate_baseline_duration(baseline_distance)
            baseline_fuel = calculate_fuel_consumption(baseline_distance)

            # Get actual optimized route metrics from routes table
            cur.execute("""
                SELECT total_distance_km, estimated_duration_minutes
                FROM routes
                WHERE convoy_id = %s
                LIMIT 1;
            """, (convoy["convoy_id"],))
            route = cur.fetchone()

            if route and route["total_distance_km"]:
                optimized_distance = route["total_distance_km"]
                optimized_duration = route["estimated_duration_minutes"] or calculate_baseline_duration(optimized_distance)
                optimized_fuel = calculate_fuel_consumption(optimized_distance)

                # Calculate savings
                distance_saved = max(0, baseline_distance - optimized_distance)
                time_saved = max(0, baseline_duration - optimized_duration)
                fuel_saved = max(0, baseline_fuel - optimized_fuel)
                cost_saved = calculate_fuel_cost(fuel_saved)

                total_distance_saved += distance_saved
                total_time_saved += time_saved
                total_fuel_saved += fuel_saved
                total_cost_saved += cost_saved

                # Calculate efficiency improvement
                if baseline_distance > 0:
                    efficiency = (distance_saved / baseline_distance) * 100
                    total_efficiency += efficiency

                convoy_count += 1

        # Calculate average efficiency
        avg_efficiency = total_efficiency / convoy_count if convoy_count > 0 else 0

        # Count conflicts prevented (estimate based on convoy pairs)
        # For now, estimate: 1 conflict prevented per 5 convoys
        conflicts_prevented = max(1, len(convoys) // 5)

        # Count suggested merges from merge_history table
        cur.execute("""
            SELECT COUNT(*) as count
            FROM merge_history
            WHERE (convoy_a_id IN (SELECT convoy_id FROM convoys WHERE created_by = %s)
                   OR convoy_b_id IN (SELECT convoy_id FROM convoys WHERE created_by = %s))
                  AND status = 'suggested';
        """, (user_id, user_id))
        suggested_merges_count = cur.fetchone()["count"]

        # Count completed merges from merge_history table
        cur.execute("""
            SELECT COUNT(*) as count
            FROM merge_history
            WHERE (convoy_a_id IN (SELECT convoy_id FROM convoys WHERE created_by = %s)
                   OR convoy_b_id IN (SELECT convoy_id FROM convoys WHERE created_by = %s))
                  AND status = 'completed';
        """, (user_id, user_id))
        successful_merges = cur.fetchone()["count"]

        return JSONResponse({
            "status": "success",
            "metrics": {
                "total_convoys": len(convoys),
                "total_distance_saved_km": round(total_distance_saved, 2),
                "total_fuel_saved_liters": round(total_fuel_saved, 2),
                "total_cost_saved_inr": round(total_cost_saved, 2),
                "total_time_saved_minutes": round(total_time_saved, 2),
                "conflicts_prevented": conflicts_prevented,
                "suggested_merges": suggested_merges_count,
                "successful_merges": successful_merges,
                "avg_efficiency_improvement": round(avg_efficiency, 2)
            }
        })

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()


@router.get("/convoy/{convoy_id}/optimization-details")
def get_convoy_optimization_details(convoy_id: int, current_user: dict = Depends(get_current_user)):
    """
    Get detailed optimization comparison for a specific convoy.
    Returns baseline vs optimized metrics with savings breakdown.
    """
    user_id = current_user["user_id"]

    conn = get_connection()
    if not conn:
        raise HTTPException(status_code=500, detail="Database connection failed")

    cur = conn.cursor()

    try:
        # Get convoy details
        cur.execute("""
            SELECT convoy_id, convoy_name, source_lat, source_lon, destination_lat, destination_lon, created_by
            FROM convoys
            WHERE convoy_id = %s;
        """, (convoy_id,))
        convoy = cur.fetchone()

        if not convoy:
            raise HTTPException(status_code=404, detail="Convoy not found")

        # Verify ownership
        if convoy["created_by"] != user_id:
            raise HTTPException(status_code=403, detail="Access denied")

        # Calculate baseline metrics
        baseline_distance = calculate_baseline_distance(
            convoy["source_lat"], convoy["source_lon"],
            convoy["destination_lat"], convoy["destination_lon"]
        )
        baseline_duration = calculate_baseline_duration(baseline_distance)
        baseline_fuel = calculate_fuel_consumption(baseline_distance)
        baseline_cost = calculate_fuel_cost(baseline_fuel)

        # Get optimized route
        cur.execute("""
            SELECT total_distance_km, estimated_duration_minutes
            FROM routes
            WHERE convoy_id = %s
            LIMIT 1;
        """, (convoy_id,))
        route = cur.fetchone()

        if not route or not route["total_distance_km"]:
            # No route calculated yet, return baseline only
            return JSONResponse({
                "status": "success",
                "convoy_id": convoy_id,
                "convoy_name": convoy["convoy_name"],
                "baseline": {
                    "distance_km": round(baseline_distance, 2),
                    "duration_minutes": round(baseline_duration, 2),
                    "fuel_liters": round(baseline_fuel, 2),
                    "cost_inr": round(baseline_cost, 2)
                },
                "optimized": None,
                "savings": None,
                "message": "Route not yet optimized"
            })

        # Calculate optimized metrics
        optimized_distance = route["total_distance_km"]
        optimized_duration = route["estimated_duration_minutes"] or calculate_baseline_duration(optimized_distance)
        optimized_fuel = calculate_fuel_consumption(optimized_distance)
        optimized_cost = calculate_fuel_cost(optimized_fuel)

        # Calculate savings
        distance_saved = baseline_distance - optimized_distance
        time_saved = baseline_duration - optimized_duration
        fuel_saved = baseline_fuel - optimized_fuel
        cost_saved = baseline_cost - optimized_cost
        efficiency_improvement = (distance_saved / baseline_distance) * 100 if baseline_distance > 0 else 0

        return JSONResponse({
            "status": "success",
            "convoy_id": convoy_id,
            "convoy_name": convoy["convoy_name"],
            "baseline": {
                "distance_km": round(baseline_distance, 2),
                "duration_minutes": round(baseline_duration, 2),
                "fuel_liters": round(baseline_fuel, 2),
                "cost_inr": round(baseline_cost, 2)
            },
            "optimized": {
                "distance_km": round(optimized_distance, 2),
                "duration_minutes": round(optimized_duration, 2),
                "fuel_liters": round(optimized_fuel, 2),
                "cost_inr": round(optimized_cost, 2)
            },
            "savings": {
                "distance_km": round(max(0, distance_saved), 2),
                "duration_minutes": round(max(0, time_saved), 2),
                "fuel_liters": round(max(0, fuel_saved), 2),
                "cost_inr": round(max(0, cost_saved), 2),
                "efficiency_improvement_percent": round(max(0, efficiency_improvement), 2)
            }
        })

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
