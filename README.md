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


### 8. Vehicle Management
- **Vehicle Types**: Truck, Van, Jeep, Ambulance, Tanker
- **Load Types**: Medical, Supplies, Ammunition, Fuel, Personnel
- **Validation**: Load weight cannot exceed capacity
- **Status Tracking**: Per-vehicle status updates
- **Driver Information**: Name, registration, load details


### 9. Interactive Mapping
- **Leaflet.js Integration**: High-performance map rendering
- **Multiple Layers**:
  - Convoy markers (color-coded by priority)
  - Checkpoint markers (categorized by type)
  - Risk zone circles (red warnings)
  - Route polylines (blue/green for original/safe)
- **Interactive Controls**: Zoom, pan, click for details

---

## Tech Stack

**Backend**: FastAPI, Python, PostgreSQL, JWT
**Frontend**: React, Vite, Leaflet.js
**APIs**: OSRM (routing), Nominatim (geocoding)

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


---

## Team

**SmartConvoy AI (SARATHI)** is developed by:

- **Sreeya Chand** - Backend Development, Architecture
- **Samyukthaa M** - Backend Development, AI Integration
- **Prapti** - Database Development and Design
- **Aniksha Anithan** - Frontend Development, UI/UX, Analytics

**Team Delusion** 

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


