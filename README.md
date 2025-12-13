# SmartConvoy AI (SARATHI)

> "Where every convoy moves with intelligence, not intuition"

A comprehensive military convoy management and optimization system designed for the Indian Army. **SARATHI** (Sanskrit: "charioteer") provides AI-powered route planning, risk zone avoidance, real-time tracking, and intelligent convoy coordination.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![React](https://img.shields.io/badge/react-19.0-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.109-teal.svg)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-12+-blue.svg)

---

## Table of Contents

- [Overview](#overview)
- [Key Features](#key-features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Installation](#installation)
- [Configuration](#configuration)
- [Usage Guide](#usage-guide)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Advanced Features](#advanced-features)
- [Contributing](#contributing)
- [Team](#team)

---

## Overview

SmartConvoy AI (SARATHI) solves critical challenges in military convoy operations:

- **Problem**: Inefficient routes, fuel waste, security risks, lack of real-time coordination
- **Solution**: AI-powered optimization with safety-first routing, risk zone detection, and intelligent merge suggestions
- **Impact**: 10-30% distance savings, significant fuel cost reduction, enhanced safety through risk avoidance

### Why SARATHI?

- **Military-Specific**: Built for Indian Army convoy operations
- **Risk-Aware**: Dynamic risk zone detection with automatic safe route alternatives
- **AI-Powered**: Google Gemini chat assistant for tactical support
- **Cost-Transparent**: Shows exact savings (₹, liters, km) per convoy
- **Full-Stack**: Production-ready system, not just a prototype
- **Pre-loaded Data**: 32 strategic checkpoints across India

---

## Key Features

### 1. Intelligent Route Optimization
- **OSRM Integration**: Open Source Routing Machine for optimized routes
- **Geocoding**: Automatic place name to coordinate conversion (Nominatim)
- **Multi-Route Analysis**: Primary and alternative route comparison
- **Distance & Duration**: Accurate ETA predictions with baseline comparisons

### 2. Risk-Aware Routing (Unique!)
- **Dynamic Risk Detection**: Real-time analysis of routes against risk zones
- **Safe Alternatives**: Automatically suggests safer routes when risks detected
- **Visual Comparison**: Side-by-side display of original vs safe routes
- **Risk Zones Database**: Pre-loaded risk areas with severity levels (low/medium/high)
- **Geometric Algorithms**: Point-to-line segment distance calculations for precision

### 3. AI Chat Assistant (Sarathi)
- **Google Gemini Integration**: Advanced AI for convoy operations support
- **Military Context**: Tactical language and professional military terminology
- **Real-Time Assistance**: Route planning, risk assessment, status updates
- **Floating Interface**: Always accessible from any page

### 4. Convoy Management
- **Create Convoys**: Multi-vehicle convoy creation with priorities
- **Add Vehicles**: Add to existing convoys without recreation
- **Priority Levels**: Critical, High, Medium, Low
- **Status Tracking**: Real-time convoy and vehicle status
- **User Isolation**: Each user sees only their convoys (JWT-based)

### 5. Intelligent Convoy Merging
- **Merge Analysis**: Analyzes two convoys for consolidation potential
- **Smart Calculations**:
  - Destination proximity detection (configurable radius)
  - Available capacity analysis (by vehicle type and load)
  - Route detour time estimation
  - Fuel savings calculation (₹ and liters)
- **Multiple Scenarios**: Suggests best merge options

### 6. Analytics Dashboard
- **Real-Time Metrics**:
  - Total distance saved (km)
  - Fuel saved (liters)
  - Cost saved (₹)
  - Conflicts prevented
  - Successful merges
  - Average efficiency improvement (%)
- **Baseline Comparison**: Optimized routes vs direct routes
- **Cost Model**: 0.35 L/km fuel consumption, ₹150/L diesel price

### 7. Strategic Checkpoint Network
- **32 Pre-loaded Checkpoints** across India:
  - Military bases (Delhi Cantonment, Bangalore Command, etc.)
  - Border posts (Jammu, Guwahati, Jaisalmer, etc.)
  - Rest stops (Chandigarh, Patna, Coimbatore, etc.)
  - Strategic locations (Leh, Port Blair, Tezpur Air Base, etc.)
- **Checkpoint Features**:
  - Capacity tracking (100-250 per checkpoint)
  - Current load monitoring
  - Status: operational, congested, closed, maintenance
  - Interactive dashboard map display

### 8. Vehicle Management
- **Vehicle Types**: Truck, Van, Jeep, Ambulance, Tanker
- **Load Types**: Medical, Supplies, Ammunition, Fuel, Personnel
- **Validation**: Load weight cannot exceed capacity
- **Status Tracking**: Per-vehicle status updates
- **Driver Information**: Name, registration, load details

### 9. Security & Authentication
- **Service Number Login**: Military personnel authentication
- **Dual-Table Verification**: Service registry + user accounts
- **JWT Tokens**: 12-hour expiration, secure token handling
- **Password Security**: bcrypt hashing with salt
- **Protected Routes**: Frontend and backend route protection
- **CORS Configured**: Secure cross-origin requests

### 10. Interactive Mapping
- **Leaflet.js Integration**: High-performance map rendering
- **Multiple Layers**:
  - Convoy markers (color-coded by priority)
  - Checkpoint markers (categorized by type)
  - Risk zone circles (red warnings)
  - Route polylines (blue/green for original/safe)
- **Interactive Controls**: Zoom, pan, click for details

---

## Tech Stack

### Backend
| Technology | Version | Purpose |
|------------|---------|---------|
| FastAPI | 0.109 | High-performance web framework |
| Python | 3.8+ | Primary language |
| PostgreSQL | 12+ | Relational database |
| JWT | 3.3.0 | Authentication tokens |
| bcrypt | 4.1.2 | Password hashing |
| OSRM | API | Route optimization |
| Nominatim | API | Geocoding |
| Google Gemini | 0.3.2 | AI chat assistant |
| Pandas | 2.2.0 | Data processing |
| NumPy | 1.26.3 | Numerical computations |
| scikit-learn | 1.4.0 | ML/ETA prediction |
| Folium | 0.15.1 | Map visualization |
| Requests | 2.31.0 | HTTP client |

### Frontend
| Technology | Version | Purpose |
|------------|---------|---------|
| React | 19.0 | UI framework |
| Vite | Latest | Build tool & dev server |
| React Router | 6.x | Client-side routing |
| Leaflet.js | Latest | Interactive maps |
| React-Leaflet | Latest | React bindings for Leaflet |
| Lucide React | Latest | Icon library |
| Material UI Icons | Latest | Additional icons |
| Custom CSS | N/A | Styling (no Tailwind) |

### Database Schema
**6 Main Tables**:
1. **users**: User authentication and profiles
2. **convoys**: Convoy master data (source, destination, priority)
3. **vehicles**: Vehicle details linked to convoys
4. **routes**: Optimized route waypoints and metrics (JSONB)
5. **checkpoints**: Strategic locations across India (32 pre-loaded)
6. **merge_history**: Convoy merge suggestions and analytics

**Additional Tables**:
- **service_registry**: Military personnel verification database
- **risk_zones**: Risk area definitions (optional, can use CSV)

---

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 16+
- PostgreSQL 12+
- Git

### Installation (5 Minutes)

```bash
# 1. Clone repository
git clone https://github.com/yourusername/smart-convoy-final.git
cd smart-convoy-final

# 2. Backend setup
cd backend
python -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
pip install -r requirements.txt

# 3. Database setup
psql -U postgres
CREATE DATABASE convoy_db;
\q
psql -U postgres -d convoy_db -f database_schema.sql

# 4. Configure environment
cp .env.example .env
# Edit .env with your database credentials and JWT secret

# 5. Start backend
uvicorn main:app --reload --host 0.0.0.0 --port 8000

# 6. Frontend setup (new terminal)
cd ../convoy-frontend
npm install
npm run dev
```

**Access the application**:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

---

## Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/smart-convoy-final.git
cd smart-convoy-final
```

### Step 2: Backend Setup

#### Install Python Dependencies

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# macOS/Linux:
source .venv/bin/activate
# Windows:
.venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt
```

#### Database Setup

**Option 1: PostgreSQL (Recommended)**

```bash
# Create database
psql -U postgres
CREATE DATABASE convoy_db;
\q

# Run schema
psql -U postgres -d convoy_db -f database_schema.sql
```

**Option 2: Detailed Setup**

See [POSTGRES_SETUP_GUIDE.md](POSTGRES_SETUP_GUIDE.md) for comprehensive instructions including:
- User creation
- Permission management
- Troubleshooting
- Data verification

#### Load Pre-populated Data

The schema automatically loads:
- 32 strategic checkpoints across India
- Service registry entries for demo users

### Step 3: Frontend Setup

```bash
cd convoy-frontend
npm install
```

---

## Configuration

### Backend Environment Variables

Create `.env` file in `backend/` directory:

```env
# Database Configuration
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=convoy_db
DATABASE_USER=postgres
DATABASE_PASSWORD=your_password_here

# JWT Authentication
SECRET_KEY=your-super-secret-jwt-key-minimum-32-characters
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=720  # 12 hours

# Server Configuration
HOST=0.0.0.0
PORT=8000

# Google Gemini API (for chat assistant)
GEMINI_API_KEY=your-gemini-api-key-here

# OSRM Server (Optional - uses public server by default)
OSRM_SERVER=http://router.project-osrm.org
```

**Generate Secure JWT Secret**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### Frontend Configuration

The frontend automatically connects to `http://localhost:8000`. To change:

1. Update API base URLs in:
   - `convoy-frontend/src/pages/CreateConvoy.jsx`
   - `convoy-frontend/src/pages/Dashboard.jsx`
   - `convoy-frontend/src/pages/ConvoyHistory.jsx`
   - `convoy-frontend/src/pages/ViewRoute.jsx`
   - `convoy-frontend/src/components/ChatAssistant.jsx`

2. Or set environment variable:
```bash
# In convoy-frontend/.env
VITE_API_BASE_URL=http://your-backend-url:8000
```

---

## Usage Guide

### 1. Authentication

**Login with Service Number**:
- Navigate to http://localhost:5173
- Click "Login"
- Enter service number (e.g., `SN001`) and password
- JWT token stored in localStorage (12-hour expiration)

**Demo Users** (pre-loaded):
- Service: `SN001`, Password: `password123`
- Service: `SN002`, Password: `password123`

### 2. Dashboard Overview

The dashboard is your command center:

**Analytics Card** (top):
- Total distance saved
- Fuel saved (liters)
- Cost saved (₹)
- Conflicts prevented
- Successful merges
- Average efficiency improvement

**Interactive Map** (center):
- 32 checkpoints (color-coded by type)
- Active convoy markers
- Click checkpoints for details (capacity, status, type)
- Click convoys for quick info

**Merge Suggestion Panel** (overlay):
- Click "Suggest Merge"
- Select Convoy A and Convoy B
- View analysis results (fuel savings, detour time, capacity)

**AI Chat Assistant** (bottom-right):
- Floating chat button
- Ask about convoy status, routes, risks
- Military-focused responses

### 3. Create Convoy

**Step-by-Step**:

1. Click "New Convoy" or navigate to `/create-convoy`

2. **Enter Convoy Details**:
   - Convoy Name: "Medical Supply Alpha"
   - Priority: Critical/High/Medium/Low
   - Source: "New Delhi, India" (or lat,lon)
   - Destination: "Mumbai, India" (or lat,lon)

3. **Add Vehicles** (minimum 1):
   - Vehicle Type: truck, van, jeep, ambulance, tanker
   - Registration: DL-01-AB-1234
   - Driver Name: Raj Kumar
   - Load Type: medical, supplies, ammunition, fuel, personnel
   - Load Weight: 500 kg
   - Capacity: 1000 kg (must be ≥ load weight)

4. **Submit**:
   - Backend geocodes locations (1 sec rate limit)
   - Creates convoy and vehicles
   - Generates optimized route
   - Redirects to convoy history

**Tips**:
- Use place names (autocomplete coming soon)
- Load cannot exceed capacity (validated)
- Add multiple vehicles before submitting
- Critical priority convoys highlighted in red

### 4. View Convoy Route

**Access**: Click convoy name in history or navigate to `/route/:convoyId`

**What You'll See**:

**Map Visualization**:
- Blue polyline: Original optimized route
- Green polyline: Safe alternative route (if risks detected)
- Red markers: Risk zone centers (with radius circles)
- Green marker: Start point
- Red marker: End point
- Interactive: zoom, pan, click

**Route Metrics**:
- Distance (km)
- Estimated Duration (minutes)
- Departure Time
- Estimated Arrival Time
- Risk Status: "Safe" or "Risks Detected - Alternative Suggested"

**Vehicle List**:
- All vehicles in convoy
- Driver, registration, load details
- Current status per vehicle

**Risk Zones** (if detected):
- Zone name
- Risk level (low/medium/high)
- Distance from route
- Coordinates

### 5. Add Vehicle to Existing Convoy

**No need to recreate convoys!**

1. Go to "Convoy History"
2. Find your convoy
3. Click "Add Vehicle" button
4. Fill in vehicle details (same as create convoy)
5. Submit

**Use Cases**:
- Additional supplies needed
- Replacement vehicle
- Convoy expansion

### 6. Convoy Merge Suggestions

**How It Works**:

1. From dashboard, click "Suggest Merge"
2. Select two convoys from dropdowns
3. Click "Analyze Merge"

**Analysis Includes**:
- **Destination Proximity**: Are destinations close? (5 km default)
- **Capacity Available**: Can convoy A absorb convoy B's vehicles?
- **Detour Time**: How much extra time to pick up convoy B?
- **Fuel Savings**: ₹ and liters saved by combining

**Merge Scenarios**:
- Best case: Same destination, spare capacity, minimal detour
- Partial merge: Some vehicles can be absorbed
- Not recommended: Incompatible routes or full capacity

### 7. Analytics Deep Dive

**How Savings Are Calculated**:

**Baseline Metrics** (what you would have used):
- Direct distance: Haversine formula × 1.3 (road factor)
- Speed: 50 km/h average
- Fuel: 0.35 L/km (military truck standard)
- Diesel: ₹150/L

**Optimized Metrics** (what SARATHI provides):
- OSRM route distance (actual roads)
- OSRM duration (traffic, road conditions)
- Same fuel rate: 0.35 L/km
- Same diesel price: ₹150/L

**Savings**:
- Distance saved = Baseline - Optimized
- Fuel saved = Distance saved × 0.35 L/km
- Cost saved = Fuel saved × ₹150
- Time saved = Baseline time - Optimized time
- Efficiency = (Distance saved / Baseline) × 100%

**Dashboard Aggregates**: Sums across ALL convoys for user

---

## API Documentation

### Base URL
```
http://localhost:8000/api
```

### Authentication

All protected endpoints require JWT token in header:
```
Authorization: Bearer <your_jwt_token>
```

### Endpoints Summary

#### Authentication (`/api/auth`)

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "service_number": "SN001",
  "password": "password123"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user_id": 1,
  "service_number": "SN001",
  "name": "John Doe",
  "rank": "Captain"
}
```

#### Convoy Management (`/api/convoys`)

**Create Convoy with Vehicles**
```http
POST /api/convoys/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "convoy_name": "Medical Supply Alpha",
  "source_place": "New Delhi, India",
  "destination_place": "Mumbai, India",
  "priority": "critical",
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

Response:
{
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "source_lat": 28.6139,
  "source_lon": 77.2090,
  "destination_lat": 19.0760,
  "destination_lon": 72.8777,
  "priority": "critical",
  "status": "pending",
  "created_at": "2025-12-13T10:30:00",
  "vehicles": [...]
}
```

**List User's Convoys**
```http
GET /api/convoys/list
Authorization: Bearer <token>

Response:
[
  {
    "convoy_id": 1,
    "convoy_name": "Medical Supply Alpha",
    "source_place": "New Delhi, India",
    "destination_place": "Mumbai, India",
    "priority": "critical",
    "status": "pending",
    "created_at": "2025-12-13T10:30:00",
    "vehicle_count": 3
  }
]
```

**Get Convoy Details**
```http
GET /api/convoys/{convoy_id}
Authorization: Bearer <token>

Response:
{
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "source_lat": 28.6139,
  "source_lon": 77.2090,
  "destination_lat": 19.0760,
  "destination_lon": 72.8777,
  "priority": "critical",
  "status": "pending",
  "vehicles": [
    {
      "vehicle_id": 1,
      "vehicle_type": "truck",
      "registration_number": "DL-01-AB-1234",
      "driver_name": "Raj Kumar",
      "load_type": "medical",
      "load_weight_kg": 500,
      "capacity_kg": 1000,
      "current_status": "pending"
    }
  ]
}
```

**Add Vehicle to Existing Convoy**
```http
POST /api/convoys/add-vehicle/{convoy_id}
Authorization: Bearer <token>
Content-Type: application/json

{
  "vehicle_type": "van",
  "registration_number": "DL-02-CD-5678",
  "load_type": "supplies",
  "load_weight_kg": 300,
  "capacity_kg": 800,
  "driver_name": "Amit Singh"
}

Response:
{
  "vehicle_id": 2,
  "message": "Vehicle added successfully"
}
```

**Suggest Convoy Merge**
```http
POST /api/convoys/suggest_merge
Content-Type: application/json

{
  "convoy_a_id": 1,
  "convoy_b_id": 2,
  "max_extra_minutes": 30.0,
  "same_dest_radius_km": 5.0
}

Response:
{
  "can_merge": true,
  "reason": "Convoys have same destination and sufficient capacity",
  "destination_distance_km": 2.5,
  "detour_time_minutes": 15.0,
  "available_capacity_kg": 500,
  "required_capacity_kg": 300,
  "fuel_savings_liters": 12.5,
  "cost_savings_inr": 1875.0,
  "scenarios": [
    {
      "scenario": "Full merge of convoy B into convoy A",
      "vehicles_transferred": 2,
      "new_total_vehicles": 5
    }
  ]
}
```

**Delete Convoy**
```http
DELETE /api/convoys/{convoy_id}
Authorization: Bearer <token>

Response:
{
  "message": "Convoy deleted successfully"
}
```

**Update Convoy Status**
```http
PATCH /api/convoys/{convoy_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_transit"
}

Response:
{
  "convoy_id": 1,
  "status": "in_transit",
  "updated_at": "2025-12-13T11:00:00"
}
```

#### Analytics (`/api/analytics`)

**Dashboard Metrics**
```http
GET /api/analytics/dashboard-metrics
Authorization: Bearer <token>

Response:
{
  "total_convoys": 5,
  "total_distance_saved_km": 125.5,
  "total_fuel_saved_liters": 43.925,
  "total_cost_saved_inr": 6588.75,
  "conflicts_prevented": 2,
  "successful_merges": 1,
  "average_efficiency_improvement_percent": 22.5
}
```

**Single Convoy Optimization Details**
```http
GET /api/analytics/convoy/{convoy_id}/optimization-details
Authorization: Bearer <token>

Response:
{
  "convoy_id": 1,
  "convoy_name": "Medical Supply Alpha",
  "baseline": {
    "distance_km": 1425.0,
    "duration_minutes": 1710.0,
    "fuel_liters": 498.75,
    "cost_inr": 74812.5
  },
  "optimized": {
    "distance_km": 1380.0,
    "duration_minutes": 1560.0,
    "fuel_liters": 483.0,
    "cost_inr": 72450.0
  },
  "savings": {
    "distance_km": 45.0,
    "duration_minutes": 150.0,
    "fuel_liters": 15.75,
    "cost_inr": 2362.5,
    "efficiency_improvement_percent": 3.16
  }
}
```

#### Checkpoints (`/api/checkpoints`)

**Get All Checkpoints**
```http
GET /api/checkpoints/all
Optional Query Params: ?type=military&status=operational

Response:
[
  {
    "checkpoint_id": 1,
    "name": "Delhi Cantonment",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "type": "military",
    "capacity": 200,
    "current_load": 45,
    "status": "operational",
    "facilities": ["fuel", "medical", "rest"]
  }
]
```

**Get Nearby Checkpoints**
```http
GET /api/checkpoints/nearby?lat=28.6139&lon=77.2090&radius_km=50

Response:
[
  {
    "checkpoint_id": 1,
    "name": "Delhi Cantonment",
    "distance_km": 2.5,
    "type": "military",
    "status": "operational"
  }
]
```

#### Risk Zones (`/api/risk-zones`)

**Get All Risk Zones**
```http
GET /api/risk-zones/all

Response:
[
  {
    "zone_id": 1,
    "name": "Kashmir Border Region",
    "center_lat": 34.0837,
    "center_lon": 74.7973,
    "radius_km": 50.0,
    "risk_level": "high"
  }
]
```

**Check Point Risk**
```http
POST /api/risk-zones/check_point
Content-Type: application/json

{
  "latitude": 34.0837,
  "longitude": 74.7973
}

Response:
{
  "is_risky": true,
  "zones": [
    {
      "zone_id": 1,
      "name": "Kashmir Border Region",
      "distance_km": 5.2,
      "risk_level": "high"
    }
  ]
}
```

**Analyze Route for Risks**
```http
POST /api/risk-zones/analyze_route
Content-Type: application/json

{
  "waypoints": [
    {"lat": 28.6139, "lon": 77.2090},
    {"lat": 29.0, "lon": 77.5},
    {"lat": 30.0, "lon": 78.0}
  ]
}

Response:
{
  "has_risks": true,
  "risk_zones_detected": [
    {
      "zone_id": 2,
      "name": "Conflict Zone Alpha",
      "risk_level": "medium",
      "segment_index": 1
    }
  ],
  "recommendation": "Alternative route suggested"
}
```

#### Safe Routing (`/api/safe-routing`)

**Get Dynamic Route with Risk Detection**
```http
GET /api/safe-routing/dynamic_route_json?convoy_id=1

Response:
{
  "convoy_id": 1,
  "source": {"lat": 28.6139, "lon": 77.2090, "name": "New Delhi"},
  "destination": {"lat": 19.0760, "lon": 72.8777, "name": "Mumbai"},
  "primary_route": {
    "distance_km": 1380.0,
    "duration_minutes": 1560.0,
    "waypoints": [...],
    "has_risks": true,
    "risk_zones": [...]
  },
  "safe_alternative": {
    "distance_km": 1420.0,
    "duration_minutes": 1620.0,
    "waypoints": [...],
    "has_risks": false,
    "extra_distance_km": 40.0,
    "extra_time_minutes": 60.0
  },
  "recommendation": "Use safe alternative route to avoid high-risk zones"
}
```

#### Chat Assistant (`/api/chat`)

**Chat with Sarathi AI**
```http
POST /api/chat
Content-Type: application/json

{
  "message": "What's the status of convoy Medical Supply Alpha?"
}

Response:
{
  "response": "Jai Hind! Convoy 'Medical Supply Alpha' is currently in 'pending' status. The convoy has 3 vehicles and is scheduled for deployment from New Delhi to Mumbai. The optimized route is 1380 km with an estimated duration of 26 hours. Risk analysis shows one medium-risk zone along the primary route; a safe alternative has been calculated. How else may I assist you?",
  "timestamp": "2025-12-13T11:30:00"
}
```

#### Vehicle Status (`/api/vehicles`)

**Update Vehicle Status**
```http
PATCH /api/vehicles/{vehicle_id}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "in_transit"
}

Response:
{
  "vehicle_id": 1,
  "status": "in_transit",
  "updated_at": "2025-12-13T12:00:00"
}
```

**Get Convoy Vehicles**
```http
GET /api/vehicles/convoy/{convoy_id}/vehicles
Authorization: Bearer <token>

Response:
[
  {
    "vehicle_id": 1,
    "vehicle_type": "truck",
    "registration_number": "DL-01-AB-1234",
    "driver_name": "Raj Kumar",
    "current_status": "in_transit",
    "load_type": "medical",
    "load_weight_kg": 500,
    "capacity_kg": 1000
  }
]
```

### Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request (validation error) |
| 401 | Unauthorized (invalid/missing token) |
| 403 | Forbidden (not convoy owner) |
| 404 | Not Found |
| 500 | Internal Server Error |

### Error Response Format

```json
{
  "detail": "Error message here",
  "error_code": "CONVOY_NOT_FOUND",
  "timestamp": "2025-12-13T12:00:00"
}
```

---

## Project Structure

```
smart-convoy-final/
├── backend/                          # FastAPI Backend
│   ├── main.py                       # Application entry point
│   ├── requirements.txt              # Python dependencies
│   ├── database_schema.sql           # Complete database schema
│   │
│   ├── auth/
│   │   └── auth.py                   # Authentication routes
│   │
│   ├── models/
│   │   ├── convoy.py                 # Convoy & vehicle models
│   │   └── user.py                   # User model
│   │
│   ├── routers/
│   │   ├── convoy_routes.py          # Convoy CRUD operations
│   │   ├── route_visualization.py    # Route generation
│   │   ├── analytics.py              # Analytics & metrics
│   │   ├── checkpoints.py            # Checkpoint management
│   │   ├── chat.py                   # AI chat assistant
│   │   ├── dynamic_route_with_risk.py # Risk-aware routing
│   │   ├── risk_zones.py             # Risk zone management
│   │   └── vehicle_status.py         # Vehicle status updates
│   │
│   ├── utils/
│   │   ├── auth_utils.py             # JWT utilities
│   │   └── antigravity_hasher.py     # Password hashing (bcrypt)
│   │
│   ├── core/
│   │   └── risk_zone_manager.py      # Risk detection algorithms
│   │
│   └── .env                          # Environment variables (create from .env.example)
│
├── convoy-frontend/                  # React Frontend
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Home.jsx              # Landing page
│   │   │   ├── Login.jsx             # Authentication
│   │   │   ├── Dashboard.jsx         # Main command center
│   │   │   ├── CreateConvoy.jsx      # Convoy creation form
│   │   │   ├── ConvoyHistory.jsx     # Convoy list & add vehicle
│   │   │   └── ViewRoute.jsx         # Route visualization
│   │   │
│   │   ├── components/
│   │   │   ├── Navbar.jsx            # Navigation bar
│   │   │   ├── ProtectedRoute.jsx    # Route protection HOC
│   │   │   ├── ConvoyMap.jsx         # Dashboard map
│   │   │   ├── RouteMap.jsx          # Route display with risk zones
│   │   │   ├── ChatAssistant.jsx     # AI chat interface
│   │   │   └── ConvoyMarker.jsx      # Custom map markers
│   │   │
│   │   ├── styles/
│   │   │   ├── dashboard.css         # Dashboard styles
│   │   │   ├── login.css             # Auth styles
│   │   │   ├── createConvoy.css      # Form styles
│   │   │   ├── convoyHistory.css     # List styles
│   │   │   ├── viewRoute.css         # Route map styles
│   │   │   ├── ChatAssistant.css     # Chat widget styles
│   │   │   └── Navbar.css            # Navigation styles
│   │   │
│   │   ├── App.jsx                   # Main app component
│   │   └── main.jsx                  # Entry point
│   │
│   ├── package.json                  # Node dependencies
│   ├── vite.config.js                # Vite configuration
│   └── index.html                    # HTML template
│
├── database_schema.sql               # Main schema file
├── README.md                         # This file
├── QUICK_START.md                    # Quick start guide
├── DEPLOYMENT_GUIDE.md               # Production deployment
├── POSTGRES_SETUP_GUIDE.md           # Database setup guide
└── .gitignore                        # Git ignore rules
```

---

## Advanced Features

### 1. Risk Zone Detection Algorithm

**How It Works**:

1. **Data Source**: Loads from `risk_zones` table or `risk_zones.csv`
   ```csv
   zone_id,name,center_lat,center_lon,radius_km,risk_level
   1,Kashmir Border,34.0837,74.7973,50.0,high
   ```

2. **Point-to-Line Segment Distance**:
   - Route broken into segments (waypoint to waypoint)
   - For each risk zone, calculate minimum distance to any segment
   - Uses Haversine formula for spherical distance
   - Projection formula for perpendicular distance

3. **Detection Logic**:
   ```python
   danger_buffer = risk_zone.radius_km + 1.0  # km
   if min_distance <= danger_buffer:
       # Risk detected!
   ```

4. **Safe Alternative**:
   - Requests alternative route from OSRM
   - Re-analyzes for risks
   - Compares: distance, time, safety

### 2. Baseline Calculation Methodology

**Assumptions** (Military Standards):
- Average speed: 50 km/h (conservative for convoy operations)
- Fuel consumption: 0.35 L/km (military truck average)
- Diesel price: ₹150/L (Indian market rate)
- Road factor: 1.3× (straight-line distance to account for roads)

**Formula**:
```python
baseline_distance = haversine(source, destination) * 1.3
baseline_duration = (baseline_distance / 50) * 60  # minutes
baseline_fuel = baseline_distance * 0.35  # liters
baseline_cost = baseline_fuel * 150  # rupees
```

**Why 1.3×?**
- Roads are not straight lines
- Empirical studies show ~30% increase for road routes
- Conservative estimate (OSRM may find better)

### 3. Merge Recommendation Engine

**Inputs**:
- Convoy A data (destination, vehicles, capacity)
- Convoy B data (destination, vehicles, capacity)
- Max acceptable detour time (default: 30 min)
- Same destination radius (default: 5 km)

**Analysis Steps**:

1. **Destination Proximity**:
   ```python
   distance = haversine(dest_a, dest_b)
   same_dest = distance <= same_dest_radius_km
   ```

2. **Capacity Check**:
   ```python
   convoy_a_available = sum(vehicle.capacity_kg - vehicle.load_kg)
   convoy_b_required = sum(vehicle.load_kg)
   can_fit = convoy_a_available >= convoy_b_required
   ```

3. **Detour Calculation**:
   ```python
   # Route: convoy_a_source → convoy_b_source → destination
   detour_route = osrm_route(a_source, b_source, destination)
   original_route = osrm_route(a_source, destination)
   detour_time = detour_route.duration - original_route.duration
   acceptable = detour_time <= max_extra_minutes
   ```

4. **Fuel Savings**:
   ```python
   # Convoy B no longer needs to travel
   distance_saved = convoy_b.route.distance_km
   fuel_saved = distance_saved * 0.35  # L
   cost_saved = fuel_saved * 150  # ₹
   ```

5. **Decision**:
   - Same destination + capacity + acceptable detour = **RECOMMEND MERGE**
   - Same destination + NO capacity = **Suggest partial merge**
   - Different destination + high detour = **DO NOT MERGE**

### 4. Checkpoint Capacity Management

**Pre-loaded Checkpoints** (32 total):

| Region | Count | Examples |
|--------|-------|----------|
| North | 8 | Delhi Cantonment, Jammu, Chandigarh |
| South | 7 | Bangalore Command, Chennai Port, Kochi |
| East | 6 | Kolkata Command, Guwahati, Tezpur Air Base |
| West | 6 | Mumbai Naval Base, Jaisalmer, Ahmedabad |
| Central | 3 | Nagpur, Bhopal, Raipur |
| Special | 2 | Leh (high altitude), Port Blair (island) |

**Features**:
- Capacity: 100-250 vehicles per checkpoint
- Current load tracking (updates with convoy assignments)
- Status: operational, congested (>80% capacity), closed, maintenance
- Facilities: fuel, medical, rest, repair

**API Queries**:
```python
# Get operational checkpoints within 100km of route
checkpoints = get_nearby_checkpoints(
    lat=convoy.current_lat,
    lon=convoy.current_lon,
    radius_km=100,
    status="operational"
)
```

### 5. AI Chat Assistant (Sarathi)

**Powered by Google Gemini 1.5**

**System Prompt** (highlights):
```
You are SARATHI, an AI assistant for the Indian Army's SmartConvoy system.
- Greet with "Jai Hind!"
- Use professional military terminology
- Prioritize safety and efficiency
- Provide tactical insights for convoy operations
- Knowledge areas: route planning, risk assessment, vehicle management
```

**Context Awareness**:
- Has access to convoy database (via API calls)
- Can query real-time convoy status
- Provides risk zone information
- Suggests merge opportunities
- Answers ETA and route questions

**Example Interactions**:
```
User: "What's the fastest route to Bangalore?"
Sarathi: "Jai Hind! To provide the optimal route, I need your current
          location. The SmartConvoy system uses OSRM routing with risk
          zone detection. Once you create a convoy with Bangalore as
          destination, I'll calculate the safest and fastest path."

User: "Show me high-risk zones"
Sarathi: "Jai Hind! Currently, we have 5 high-risk zones in the system:
          1. Kashmir Border Region (50km radius)
          2. Conflict Zone Alpha (30km radius)
          [lists all]
          All convoy routes automatically avoid these zones or suggest
          safe alternatives."
```

---

## Contributing

We welcome contributions! Please follow these guidelines:

### Getting Started

1. **Fork the repository**
2. **Create a feature branch**:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Make your changes**
4. **Test thoroughly**:
   ```bash
   # Backend tests
   cd backend
   pytest

   # Frontend build
   cd convoy-frontend
   npm run build
   ```
5. **Commit with clear messages**:
   ```bash
   git commit -m "Add: Checkpoint filtering by region"
   ```
6. **Push to your fork**:
   ```bash
   git push origin feature/amazing-feature
   ```
7. **Open a Pull Request**

### Code Standards

**Backend (Python)**:
- Follow PEP 8
- Use type hints
- Document functions with docstrings
- Handle errors gracefully
- Add tests for new features

**Frontend (React)**:
- Use functional components and hooks
- Prop validation with PropTypes (optional)
- Clean, readable JSX
- CSS follows existing patterns
- Mobile-responsive design

### Areas for Contribution

**High Priority**:
- [ ] Unit tests for backend routes
- [ ] Integration tests for API
- [ ] Frontend component tests
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] Mobile app (React Native)

**Features**:
- [ ] Real-time vehicle tracking (GPS integration)
- [ ] Weather API integration for route planning
- [ ] SMS/Email notifications for convoy updates
- [ ] Multi-language support (Hindi, regional)
- [ ] Offline mode with sync
- [ ] Advanced analytics dashboard
- [ ] Checkpoint booking system
- [ ] Fuel station integration

**Optimizations**:
- [ ] Redis caching for routes
- [ ] WebSocket for real-time updates
- [ ] Database query optimization
- [ ] Frontend lazy loading
- [ ] Image/asset optimization

---

## Team

**SmartConvoy AI (SARATHI)** is developed by:

- **Sreeya Chand** - Full-Stack Development, Architecture
- **Samyukthaa M** - Backend Development, Database Design
- **Prapti** - Frontend Development, UI/UX
- **Aniksha Anithan** - AI Integration, Analytics

**Team Delusion** - Made with dedication for the Indian Army

---

## License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2025 Team Delusion

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Acknowledgments

### Technologies & Services
- **OpenStreetMap** - Map data and Nominatim geocoding
- **OSRM (Open Source Routing Machine)** - Route optimization engine
- **Leaflet.js** - Open-source interactive maps
- **Google Gemini** - AI chat assistant capabilities
- **FastAPI** - Modern Python web framework
- **React** - UI component library
- **PostgreSQL** - Robust relational database

### Inspiration
- Indian Army logistics operations
- Military convoy management challenges
- Need for cost-effective, safe route optimization

### Special Thanks
- Project Osrm contributors
- FastAPI community
- React and Vite teams
- Open-source community

---

## Support & Contact

### Documentation
- **Quick Start**: [QUICK_START.md](QUICK_START.md)
- **Deployment**: [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)
- **Database Setup**: [POSTGRES_SETUP_GUIDE.md](POSTGRES_SETUP_GUIDE.md)
- **API Routes**: [API_ROUTES.md](backend/API_ROUTES.md)

### Get Help
- **Issues**: [GitHub Issues](https://github.com/yourusername/smart-convoy-final/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/smart-convoy-final/discussions)
- **Email**: smartconvoy.sarathi@gmail.com (replace with actual)

### Reporting Bugs
Please include:
1. Environment (OS, Python version, Node version)
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots (if applicable)
5. Relevant logs

### Feature Requests
We're always improving! Submit feature requests via GitHub Issues with:
1. Use case description
2. Expected functionality
3. Alternative solutions considered
4. Mockups/diagrams (if applicable)

---

## Roadmap

### Version 1.0 (Current)
- ✅ Core convoy management
- ✅ Risk-aware routing
- ✅ AI chat assistant
- ✅ Analytics dashboard
- ✅ Checkpoint network

### Version 1.1 (Q1 2026)
- [ ] Real-time GPS tracking
- [ ] Mobile app (Android/iOS)
- [ ] Weather integration
- [ ] Email/SMS notifications

### Version 2.0 (Q2 2026)
- [ ] Multi-tenant support (different army units)
- [ ] Advanced predictive analytics
- [ ] Machine learning route optimization
- [ ] Offline mode with sync
- [ ] Checkpoint booking system

### Version 3.0 (Future)
- [ ] Integration with military logistics systems
- [ ] Drone surveillance integration
- [ ] Advanced threat intelligence
- [ ] Multi-language support
- [ ] Voice commands (Alexa/Google Assistant)

---

## FAQ

**Q: Can I use this for civilian logistics?**
A: Absolutely! While designed for military use, SARATHI works for any convoy/fleet operations.

**Q: Does this require internet?**
A: Currently yes, for geocoding and OSRM routing. Offline mode is planned for v2.0.

**Q: How accurate is the risk detection?**
A: Risk zones are manually defined. Accuracy depends on the quality of risk zone data provided.

**Q: Can I self-host OSRM?**
A: Yes! Set `OSRM_SERVER` in `.env` to your own OSRM instance for better performance.

**Q: What's the maximum convoy size?**
A: No hard limit. Tested with up to 50 vehicles per convoy.

**Q: Is real-time tracking supported?**
A: Not in v1.0, but planned for v1.1 with GPS integration.

**Q: Can I customize fuel/cost rates?**
A: Currently hardcoded. Configuration support coming in v1.1.

**Q: How do I backup the database?**
A: Use `pg_dump`:
```bash
pg_dump -U postgres convoy_db > backup_$(date +%Y%m%d).sql
```

**Q: Is there a demo site?**
A: Contact us for demo access: smartconvoy.sarathi@gmail.com

---

## Statistics

- **Backend**: ~3,500 lines of Python code
- **Frontend**: ~2,000 lines of React/JSX code
- **Database**: 6 main tables, 2 support tables
- **API Endpoints**: 30+ REST endpoints
- **Checkpoints**: 32 pre-loaded across India
- **Supported Vehicle Types**: 5 (truck, van, jeep, ambulance, tanker)
- **Load Types**: 5 (medical, supplies, ammunition, fuel, personnel)
- **Priority Levels**: 4 (critical, high, medium, low)
- **Risk Levels**: 3 (low, medium, high)

---

**Made with ❤️ for efficient and safe convoy operations**

**JAI HIND! 🇮🇳**
