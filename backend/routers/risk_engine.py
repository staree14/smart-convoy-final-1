# risk_engine.py

import math

def haversine_km(lat1, lon1, lat2, lon2):
    R = 6371
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (math.sin(dlat/2)**2 +
         math.cos(math.radians(lat1)) *
         math.cos(math.radians(lat2)) *
         math.sin(dlon/2)**2)
    return R * 2 * math.asin(math.sqrt(a))


def compute_risk_penalty(lat, lon, risk_zones):
    """
    Returns penalty if (lat, lon) falls inside any risk zone.
    risk_zones = list of dict (loaded from CSV)
    """
    for zone in risk_zones:
        dist = haversine_km(lat, lon, zone["lat"], zone["lon"])
        if dist <= zone["radius_km"]:
            level = zone["level"]
            if level == "high":
                return 1000
            if level == "medium":
                return 500
            if level == "low":
                return 200
    return 0