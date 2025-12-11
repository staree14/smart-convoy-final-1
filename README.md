# 🚚 Smart Convoy Management System

A full-stack web application for managing military/logistics convoys with real-time route optimization, vehicle tracking, and convoy merging suggestions.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Python](https://img.shields.io/badge/python-3.8+-green.svg)
![React](https://img.shields.io/badge/react-18.0+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-teal.svg)

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Configuration](#configuration)
- [Running the Application](#running-the-application)
- [API Documentation](#api-documentation)
- [Project Structure](#project-structure)
- [Usage Guide](#usage-guide)
- [Contributing](#contributing)
- [License](#license)

## ✨ Features

### Convoy Management
- ✅ Create and manage multiple convoys with detailed information
- ✅ Add vehicles to existing convoys without re-entering convoy details
- ✅ Real-time convoy tracking and status updates
- ✅ Priority-based convoy organization (Critical, High, Medium, Low)
- ✅ Source and destination route visualization

### Vehicle Management
- ✅ Add, edit, and remove vehicles from convoys
- ✅ Track vehicle details: type, registration, driver, load capacity
- ✅ Support for multiple vehicle types (Truck, Van, Jeep, Ambulance, Tanker)
- ✅ Load type categorization (Medical, Supplies, Ammunition, Fuel, Personnel)

### Route Optimization
- ✅ Automatic geocoding of location names using Nominatim
- ✅ OSRM-based route calculation and optimization
- ✅ Visual route display on interactive maps
- ✅ Distance and duration estimation

### Smart Features
- ✅ **Convoy Merge Suggestions**: Intelligent algorithm to suggest merging convoys based on:
  - Destination proximity
  - Available capacity
  - Route detour analysis
  - Fuel savings calculation
- ✅ Interactive dashboard with convoy statistics
- ✅ Real-time convoy filtering by priority
- ✅ Responsive design for mobile and desktop

### Security
- ✅ JWT-based authentication and authorization
- ✅ Password hashing with bcrypt
- ✅ Protected API endpoints
- ✅ User-specific convoy data

## 🛠️ Tech Stack

### Backend
- **Framework**: FastAPI (Python)
- **Database**: PostgreSQL
- **Authentication**: JWT (JSON Web Tokens)
- **Password Hashing**: bcrypt
- **Geocoding**: Nominatim API
- **Routing**: OSRM (Open Source Routing Machine)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite
- **Routing**: React Router v6
- **Styling**: Tailwind CSS
- **Maps**: Leaflet.js
- **Icons**: Lucide React
- **HTTP Client**: Fetch API

## 📦 Prerequisites

Before you begin, ensure you have the following installed:

- **Python**: 3.8 or higher
- **Node.js**: 16.x or higher
- **npm**: 8.x or higher
- **PostgreSQL**: 12 or higher
- **Git**: For version control

## 🚀 Installation

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/smart-convoy-final.git
cd smart-convoy-final
```

### 2. Backend Setup

#### Install Python Dependencies

```bash
cd backend
python -m venv .venv

# Activate virtual environment
# On macOS/Linux:
source .venv/bin/activate
# On Windows:
.venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn psycopg2-binary python-jose passlib bcrypt python-multipart requests pydantic
```

#### Database Setup

1. **Create PostgreSQL Database**:
```bash
psql -U postgres
CREATE DATABASE convoy_db;
\q
```

2. **Run Schema**:
```bash
psql -U postgres -d convoy_db -f schema.sql
```

Or refer to [POSTGRES_SETUP_GUIDE.md](POSTGRES_SETUP_GUIDE.md) for detailed instructions.

### 3. Frontend Setup

```bash
cd convoy-frontend
npm install
```

## ⚙️ Configuration

### Backend Configuration

Create a `.env` file in the `backend` directory:

```env
# Database
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/convoy_db

# JWT Secret (generate a secure random string)
SECRET_KEY=your-super-secret-key-here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

# Server
HOST=0.0.0.0
PORT=8000
```

### Frontend Configuration

The frontend is configured to connect to `http://localhost:8000` by default. If your backend runs on a different port, update the API URLs in the frontend source files.

## 🎮 Running the Application

### Start Backend Server

```bash
cd backend
source .venv/bin/activate  # Activate virtual environment
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

The backend will be available at: `http://localhost:8000`

API documentation: `http://localhost:8000/docs`

### Start Frontend Development Server

```bash
cd convoy-frontend
npm run dev
```

The frontend will be available at: `http://localhost:5173`

## 📚 API Documentation

### Authentication Endpoints

#### Register User
```http
POST /api/auth/signup
Content-Type: application/json

{
  "username": "john_doe",
  "email": "john@example.com",
  "password": "secure_password"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/x-www-form-urlencoded

username=john_doe&password=secure_password
```

### Convoy Endpoints

#### Create Convoy
```http
POST /api/convoys/create
Authorization: Bearer <token>
Content-Type: application/json

{
  "convoy_name": "Medical Supply Alpha",
  "source_place": "New Delhi, India",
  "destination_place": "Mumbai, India",
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

#### List Convoys
```http
GET /api/convoys/list
Authorization: Bearer <token>
```

#### Get Convoy Details
```http
GET /api/convoys/{convoy_id}
Authorization: Bearer <token>
```

#### Add Vehicle to Existing Convoy
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
  "driver_name": "Amit Singh",
  "current_status": "pending"
}
```

#### Suggest Convoy Merge
```http
POST /api/convoys/suggest_merge
Content-Type: application/json

{
  "convoy_a_id": 1,
  "convoy_b_id": 2,
  "max_extra_minutes": 30.0,
  "same_dest_radius_km": 5.0
}
```

## 📁 Project Structure

```
smart-convoy-final/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── db_connection.py        # Database connection handler
│   ├── schema.sql             # Database schema
│   ├── auth/
│   │   └── auth.py            # Authentication routes
│   ├── models/
│   │   ├── convoy.py          # Convoy and vehicle models
│   │   └── user.py            # User model
│   ├── routers/
│   │   └── convoy_routes.py   # Convoy API endpoints
│   └── utils/
│       ├── auth_utils.py      # JWT utilities
│       └── hashing.py         # Password hashing
│
├── convoy-frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Dashboard.jsx       # Main dashboard
│   │   │   ├── CreateConvoy.jsx    # Create convoy form
│   │   │   ├── ConvoyHistory.jsx   # Convoy list with add vehicle
│   │   │   ├── ViewRoute.jsx       # Route visualization
│   │   │   ├── Login.jsx           # Login page
│   │   │   └── Signup.jsx          # Registration page
│   │   ├── components/
│   │   │   ├── Navbar.jsx          # Navigation bar
│   │   │   ├── Sidebar.jsx         # Sidebar navigation
│   │   │   ├── ConvoyMap.jsx       # Map component
│   │   │   └── RouteMap.jsx        # Route display
│   │   ├── App.jsx                 # Main app component
│   │   └── main.jsx                # Entry point
│   ├── package.json
│   └── vite.config.js
│
├── .gitignore
├── README.md
└── POSTGRES_SETUP_GUIDE.md
```

## 📖 Usage Guide

### 1. Register and Login
- Navigate to the signup page
- Create an account with username, email, and password
- Login with your credentials

### 2. Create a Convoy
- Click "New Convoy" from the dashboard
- Enter convoy name and priority
- Add source and destination (e.g., "New Delhi, India")
- Add vehicle details (registration, driver, load, capacity)
- Click "Create Convoy"

### 3. Add Vehicles to Existing Convoy
- Go to "Convoy History" page
- Find your convoy in the list
- See the route displayed: Source → Destination
- Click "Add Vehicle" button
- Fill in vehicle details
- Submit to add the vehicle

### 4. View Convoy Routes
- Click on any convoy name to view its route
- Interactive map shows the optimized route
- View all vehicle details and load information

### 5. Merge Suggestions
- From the dashboard, use the Merge Suggestion panel
- Select two convoys (Convoy A and Convoy B)
- Click "Suggest Merge"
- System analyzes:
  - Destination proximity
  - Available capacity
  - Route detour time
  - Fuel savings potential

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 👥 Authors

- Your Name - Initial work

## 🙏 Acknowledgments

- OpenStreetMap for map data
- OSRM for routing engine
- Nominatim for geocoding services
- Leaflet.js for map visualization
- FastAPI community
- React community

## 📧 Support

For support, email your-email@example.com or open an issue on GitHub.

---

**Made with ❤️ for efficient convoy management**
