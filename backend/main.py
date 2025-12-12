# main.py
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from routers import convoy_routes, route_visualization, analytics, checkpoints, vehicle_status, risk_zones
from auth import auth
import geocode_router

app = FastAPI(
    title="SmartConvoy AI (SARATHI)",
    description="Military Convoy Route Optimization System for Indian Army",
    version="1.0.0"
)

# Custom middleware to handle OPTIONS requests before CORS
@app.middleware("http")
async def handle_options(request: Request, call_next):
    if request.method == "OPTIONS":
        return JSONResponse(
            content={"status": "ok"},
            headers={
                "Access-Control-Allow-Origin": request.headers.get("origin", "*"),
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "*",
                "Access-Control-Allow-Credentials": "true",
            },
        )
    response = await call_next(request)
    return response

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Include routers
app.include_router(auth.router, prefix="/api/auth", tags=["Authentication"])
app.include_router(convoy_routes.router, prefix="/api/convoys", tags=["Convoy Management"])
app.include_router(route_visualization.router, prefix="/api/routes", tags=["Route Visualization"])
app.include_router(geocode_router.router, prefix="/api/geocode", tags=["Geocoding"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["Analytics"])
app.include_router(checkpoints.router, prefix="/api/checkpoints", tags=["Checkpoints"])
app.include_router(vehicle_status.router, prefix="/api/vehicles", tags=["Vehicle Status"])
app.include_router(risk_zones.router, prefix="/api/risk-zones", tags=["Risk Zones"])

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
