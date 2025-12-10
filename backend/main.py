# main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import convoy_routes, route_visualization

app = FastAPI(
    title="SmartConvoy AI",
    description="Military Convoy Route Optimization System for Indian Army",
    version="1.0.0"
)

# CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(convoy_routes.router, prefix="/api/convoys", tags=["Convoy Management"])
app.include_router(route_visualization.router, prefix="/api/routes", tags=["Route Visualization"])

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
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=True)