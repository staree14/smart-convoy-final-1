# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import convoy_routes, route_visualization
from auth import auth
import geocode_router

app = FastAPI(
    title="SmartConvoy AI (SARATHI)",
    description="Military Convoy Route Optimization System for Indian Army",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(convoy_routes.router, prefix="/api/convoys", tags=["Convoy Management"])
app.include_router(route_visualization.router, prefix="/api/routes", tags=["Route Visualization"])
app.include_router(geocode_router.router, prefix="/api/geocode", tags=["Geocoding"])

@app.get("/")
def root():
    return {
        "message": "SmartConvoy AI (SARATHI) - Military Convoy Optimization System",
        "version": "1.0.0",
        "status": "operational",
        "features": [
            "Multi-convoy coordination",
            "Dynamic route optimization",
            "Risk zone avoidance",
            "Merge recommendations",
            "Real-time ETA prediction"
        ]
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "service": "SmartConvoy AI"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
