# Smart Convoy - API Routes Documentation

## Overview
This document describes the API routes for convoy management. The routes use in-memory storage for now. Your backend teammate can replace the in-memory `convoys_db` dictionary with a real database connection.

## Key Feature
**Multiple vehicles per convoy**: When you create a convoy with the same `convoy_name`, vehicles are automatically added to the existing convoy instead of creating a new one.

---

## API Endpoints

### 1. Create Convoy (or Add Vehicles to Existing)
**Endpoint:** `POST /api/convoys/create`

**Behavior:**
- If `convoy_name` **doesn't exist**: Creates new convoy with vehicles
- If `convoy_name` **already exists**: Adds vehicles to existing convoy

**Request Body:**
```json
{
  "convoy_name": "Medical Supply Alpha",
  "source_lat": 28.6139,
  "source_lon": 77.2090,
  "destination_lat": 28.4595,
  "destination_lon": 77.0266,
  "priority": "high",
  "vehicles": [
    {
      "vehicle_type": "truck",
      "registration_number": "DL-01-AB-1234",
      "load_type": "medical",
      "load_weight_kg": 500,
      "capacity_kg": 1000,
      "driver_name": "Raj Kumar"
    }
  ]
}
```

**Note:** Vehicles automatically inherit `source_lat`, `source_lon`, `destination_lat`, and `destination_lon` from the convoy. You don't need to specify these for individual vehicles.

**Response (New Convoy):**
```json
{
  "status": "success",
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "vehicle_count": 1,
  "total_load_kg": 500,
  "priority": "high",
  "message": "Convoy 'Medical Supply Alpha' created successfully"
}
```

**Response (Adding to Existing):**
```json
{
  "status": "success",
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "vehicle_count": 3,
  "new_vehicles_added": 2,
  "total_load_kg": 1500,
  "priority": "high",
  "message": "Added 2 vehicle(s) to existing convoy 'Medical Supply Alpha'"
}
```

---

### 2. Add Single Vehicle to Convoy
**Endpoint:** `POST /api/convoys/add-vehicle/{convoy_name}`

**URL Parameter:**
- `convoy_name`: Name of the convoy (e.g., "Medical Supply Alpha")

**Request Body:**
```json
{
  "vehicle_type": "ambulance",
  "registration_number": "DL-01-AB-5678",
  "load_type": "medical",
  "load_weight_kg": 300,
  "capacity_kg": 800,
  "driver_name": "Amit Singh"
}
```

**Note:** Vehicle automatically inherits source/destination from the convoy.

**Response:**
```json
{
  "status": "success",
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "vehicle_count": 2,
  "total_load_kg": 800,
  "message": "Vehicle DL-01-AB-5678 added to convoy 'Medical Supply Alpha'"
}
```

---

### 3. List All Convoys
**Endpoint:** `GET /api/convoys/list`

**Response:**
```json
{
  "status": "success",
  "count": 2,
  "convoys": [
    {
      "id": 1,
      "convoy_name": "Medical Supply Alpha",
      "vehicle_count": 2,
      "total_load_kg": 800,
      "priority": "high",
      "source": {"lat": 28.6139, "lon": 77.2090},
      "destination": {"lat": 28.4595, "lon": 77.0266}
    },
    {
      "id": 2,
      "convoy_name": "Food Transport Beta",
      "vehicle_count": 1,
      "total_load_kg": 1000,
      "priority": "medium",
      "source": {"lat": 28.7041, "lon": 77.1025},
      "destination": {"lat": 28.5355, "lon": 77.3910}
    }
  ]
}
```

---

### 4. Get Specific Convoy
**Endpoint:** `GET /api/convoys/{convoy_id}`

**URL Parameter:**
- `convoy_id`: ID of the convoy (e.g., 1)

**Response:**
```json
{
  "status": "success",
  "convoy": {
    "id": 1,
    "convoy_name": "Medical Supply Alpha",
    "vehicle_count": 2,
    "total_load_kg": 800,
    "priority": "high",
    "source": {"lat": 28.6139, "lon": 77.2090},
    "destination": {"lat": 28.4595, "lon": 77.0266},
    "vehicles": [
      {
        "id": null,
        "registration": "DL-01-AB-1234",
        "type": "truck",
        "load_type": "medical",
        "load_kg": 500,
        "capacity_kg": 1000,
        "driver": "Raj Kumar",
        "status": "pending"
      },
      {
        "id": null,
        "registration": "DL-01-AB-5678",
        "type": "ambulance",
        "load_type": "medical",
        "load_kg": 300,
        "capacity_kg": 800,
        "driver": "Amit Singh",
        "status": "pending"
      }
    ]
  }
}
```

---

### 5. Delete Convoy
**Endpoint:** `DELETE /api/convoys/{convoy_id}`

**URL Parameter:**
- `convoy_id`: ID of the convoy (e.g., 1)

**Response:**
```json
{
  "status": "success",
  "message": "Convoy 'Medical Supply Alpha' deleted successfully"
}
```

---

### 6. Suggest Convoy Merge
**Endpoint:** `POST /api/convoys/suggest_merge`

**Request Body:**
```json
{
  "convoy_a": {
    "convoy_name": "Alpha",
    "source_lat": 28.6139,
    "source_lon": 77.2090,
    "destination_lat": 28.4595,
    "destination_lon": 77.0266,
    "priority": "high",
    "vehicles": [
      {
        "vehicle_type": "truck",
        "registration_number": "DL-01-AB-1234",
        "load_type": "medical",
        "load_weight_kg": 500,
        "capacity_kg": 1000
      }
    ]
  },
  "convoy_b": {
    "convoy_name": "Beta",
    "source_lat": 28.7041,
    "source_lon": 77.1025,
    "destination_lat": 28.4650,
    "destination_lon": 77.0300,
    "priority": "medium",
    "vehicles": [
      {
        "vehicle_type": "van",
        "registration_number": "DL-02-CD-5678",
        "load_type": "food",
        "load_weight_kg": 300,
        "capacity_kg": 600
      }
    ]
  },
  "max_extra_minutes": 30.0,
  "same_dest_radius_km": 5.0
}
```

**Response (Can Merge):**
```json
{
  "can_merge": true,
  "reason": "A_picks_B feasible with extra time 12.5 min",
  "scenario": "A_picks_B",
  "extra_minutes": 12.5,
  "dest_distance_km": 1.2,
  "fuel_savings_liters": 0.36,
  "convoy_a_spare_kg": 500,
  "convoy_b_spare_kg": 300
}
```

**Response (Cannot Merge):**
```json
{
  "can_merge": false,
  "reason": "Destinations too far apart (15.50 km) > threshold 5.0 km",
  "dest_distance_km": 15.5
}
```

---

## Data Models

### Vehicle Types
- `truck`
- `van`
- `armored_vehicle`
- `ambulance`

### Load Types
- `medical`
- `food`
- `weapons`
- `ammunition`
- `supplies`
- `fuel`
- `other`

### Priority Levels
- `critical`
- `high`
- `medium`
- `low`

### Vehicle Status
- `pending`
- `en_route`
- `arrived`
- `delayed`

---

## For Your Backend Teammate

### In-Memory Storage Location
File: `backend/routers/convoy_routes.py`

**Line 12-14:**
```python
# In-memory storage (your teammate will replace this with real database)
convoys_db: Dict[str, Convoy] = {}  # Key: convoy_name, Value: Convoy
convoy_id_counter = 0
```

### What to Replace
Your teammate should:
1. Replace `convoys_db` dictionary with database queries
2. Replace `convoy_id_counter` with auto-increment from database
3. Update all CRUD operations to use database sessions
4. Keep the logic for checking duplicate convoy names and vehicle registrations

### Key Logic to Preserve
- **Line 53-78**: Logic for adding vehicles to existing convoy by name
- **Line 57-63**: Duplicate vehicle registration check
- **Line 85-90**: Duplicate registration check within new convoy

---

## Testing

### Start Server
```bash
cd backend
python main.py
```

Server runs on: `http://localhost:8000`

### Test with curl

**Create first convoy:**
```bash
curl -X POST http://localhost:8000/api/convoys/create \
  -H "Content-Type: application/json" \
  -d '{
    "convoy_name": "Alpha",
    "source_lat": 28.6139,
    "source_lon": 77.2090,
    "destination_lat": 28.4595,
    "destination_lon": 77.0266,
    "priority": "high",
    "vehicles": [{
      "vehicle_type": "truck",
      "registration_number": "DL-01-AB-1234",
      "load_type": "medical",
      "load_weight_kg": 500,
      "capacity_kg": 1000,
      "driver_name": "Raj Kumar"
    }]
  }'
```

**Add more vehicles to same convoy:**
```bash
curl -X POST http://localhost:8000/api/convoys/create \
  -H "Content-Type: application/json" \
  -d '{
    "convoy_name": "Alpha",
    "source_lat": 28.6139,
    "source_lon": 77.2090,
    "destination_lat": 28.4595,
    "destination_lon": 77.0266,
    "priority": "high",
    "vehicles": [{
      "vehicle_type": "ambulance",
      "registration_number": "DL-01-AB-5678",
      "load_type": "medical",
      "load_weight_kg": 300,
      "capacity_kg": 800,
      "driver_name": "Amit Singh"
    }]
  }'
```

**List all convoys:**
```bash
curl http://localhost:8000/api/convoys/list
```

---

## Interactive API Documentation

FastAPI provides automatic interactive documentation:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

These allow you to test all endpoints directly from your browser!
