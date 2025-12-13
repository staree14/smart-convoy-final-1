"""
Risk Zone Manager for SmartConvoy AI
Handles loading, detecting, and avoiding risk zones along convoy routes.
"""

import os
import csv
import math
from typing import List, Dict, Any, Tuple, Optional
from dataclasses import dataclass

@dataclass
class RiskZone:
    """Represents a geographic risk zone"""
    zone_id: str
    name: str
    center_lat: float
    center_lon: float
    radius_km: float
    risk_level: str  # low, medium, high

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.zone_id,
            "name": self.name,
            "lat": self.center_lat,
            "lon": self.center_lon,
            "radius_km": self.radius_km,
            "risk_level": self.risk_level
        }


class RiskZoneManager:
    """Manages risk zones and detects route intersections"""

    def __init__(self, csv_filepath: str = "risk_zones.csv"):
        self.risk_zones: List[RiskZone] = []
        self.csv_filepath = csv_filepath
        self.load_risk_zones()

    def load_risk_zones(self) -> None:
        """Load risk zones from CSV file"""
        # Check multiple possible locations
        possible_paths = [
            self.csv_filepath,
            os.path.join(os.path.dirname(__file__), "..", self.csv_filepath),
            os.path.join(os.path.dirname(__file__), "..", "routers", self.csv_filepath),
            os.path.join(os.path.dirname(__file__), "..", "..", self.csv_filepath),
        ]

        filepath = None
        for path in possible_paths:
            if os.path.exists(path):
                filepath = path
                break

        if not filepath:
            print(f"[RISK] Warning: {self.csv_filepath} not found in any location")
            return

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
                        self.risk_zones.append(zone)
                    except Exception as e:
                        print(f"[RISK] Error parsing row {row}: {e}")

            print(f"[RISK] Successfully loaded {len(self.risk_zones)} risk zones from {filepath}")
        except Exception as e:
            print(f"[RISK] Error loading {filepath}: {e}")

    def get_all_zones(self) -> List[Dict[str, Any]]:
        """Return all risk zones as dictionaries"""
        return [zone.to_dict() for zone in self.risk_zones]

    @staticmethod
    def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
        """Calculate distance between two points in kilometers"""
        R = 6371.0  # Earth radius in km
        phi1 = math.radians(lat1)
        phi2 = math.radians(lat2)
        dphi = math.radians(lat2 - lat1)
        dlambda = math.radians(lon2 - lon1)

        a = math.sin(dphi/2)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c

    @staticmethod
    def point_to_line_distance(point_lat: float, point_lon: float,
                               line_lat1: float, line_lon1: float,
                               line_lat2: float, line_lon2: float) -> float:
        """
        Calculate perpendicular distance from a point to a line segment.
        Returns distance in kilometers.
        """
        R = 6371.0

        # Convert to radians
        p_lat, p_lon = math.radians(point_lat), math.radians(point_lon)
        a_lat, a_lon = math.radians(line_lat1), math.radians(line_lon1)
        b_lat, b_lon = math.radians(line_lat2), math.radians(line_lon2)

        # Use average latitude for projection
        avg_lat = (a_lat + b_lat) / 2
        cos_lat = math.cos(avg_lat)

        # Convert to approximate Cartesian coordinates
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
            return RiskZoneManager.haversine_distance(point_lat, point_lon, line_lat1, line_lon1)

        t = max(0, min(1, ((p_x - a_x) * dx + (p_y - a_y) * dy) / (dx*dx + dy*dy)))

        closest_x = a_x + t * dx
        closest_y = a_y + t * dy

        dist_sq = (p_x - closest_x)**2 + (p_y - closest_y)**2
        return math.sqrt(dist_sq)

    def detect_route_risks(self, route_coords: List[Tuple[float, float]],
                          buffer_km: float = 1.0) -> Dict[str, Any]:
        """
        Detect which risk zones the route passes through.

        Args:
            route_coords: List of (lat, lon) tuples representing the route
            buffer_km: Additional buffer distance in km (default 1km)

        Returns:
            Dictionary with danger_points, risk_summary, and total_dangers
        """
        danger_points = []
        risk_summary = {}

        for zone in self.risk_zones:
            min_distance = float('inf')

            # Check distance to each segment of the route
            for i in range(len(route_coords) - 1):
                lat1, lon1 = route_coords[i]
                lat2, lon2 = route_coords[i + 1]

                dist = self.point_to_line_distance(
                    zone.center_lat, zone.center_lon,
                    lat1, lon1, lat2, lon2
                )
                min_distance = min(min_distance, dist)

            # If route passes through or near the risk zone
            if min_distance <= zone.radius_km + buffer_km:
                danger_points.append({
                    "id": zone.zone_id,
                    "name": zone.name,
                    "lat": zone.center_lat,
                    "lon": zone.center_lon,
                    "risk_level": zone.risk_level,
                    "radius_km": zone.radius_km,
                    "distance_from_route_km": round(min_distance, 2)
                })
                risk_summary[zone.zone_id] = {
                    "name": zone.name,
                    "risk_level": zone.risk_level,
                    "min_distance_km": round(min_distance, 2)
                }

        # Sort by risk level (high first) then by distance
        risk_order = {"high": 0, "medium": 1, "low": 2}
        danger_points.sort(key=lambda x: (risk_order.get(x["risk_level"], 3), x["distance_from_route_km"]))

        return {
            "danger_points": danger_points,
            "risk_summary": risk_summary,
            "total_dangers": len(danger_points),
            "high_risk_count": sum(1 for d in danger_points if d["risk_level"] == "high"),
            "medium_risk_count": sum(1 for d in danger_points if d["risk_level"] == "medium"),
            "low_risk_count": sum(1 for d in danger_points if d["risk_level"] == "low")
        }

    def compute_risk_penalty(self, lat: float, lon: float) -> float:
        """
        Calculate risk penalty for a specific point.
        Higher penalty for points inside high-risk zones.
        """
        for zone in self.risk_zones:
            dist = self.haversine_distance(lat, lon, zone.center_lat, zone.center_lon)
            if dist <= zone.radius_km:
                if zone.risk_level == "high":
                    return 1000.0
                elif zone.risk_level == "medium":
                    return 500.0
                elif zone.risk_level == "low":
                    return 200.0
        return 0.0

    def get_zone_by_id(self, zone_id: str) -> Optional[RiskZone]:
        """Get a specific risk zone by ID"""
        for zone in self.risk_zones:
            if zone.zone_id == zone_id:
                return zone
        return None


# Global instance
_risk_manager = None

def get_risk_manager() -> RiskZoneManager:
    """Get or create the global RiskZoneManager instance"""
    global _risk_manager
    if _risk_manager is None:
        _risk_manager = RiskZoneManager()
    return _risk_manager
