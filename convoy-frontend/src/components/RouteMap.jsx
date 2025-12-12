import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Circle, useMap } from 'react-leaflet';
import { AlertTriangle, Clock, Navigation } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import ConvoyMarker from './ConvoyMarker';

// Fix for default marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Helper component to fit bounds
function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [positions, map]);
  return null;
}

export default function RouteMap({ route }) {
  const [activeRoute, setActiveRoute] = useState(route?.route_coordinates || []);
  const [isRiskDetected, setIsRiskDetected] = useState(false);
  const [hasRerouted, setHasRerouted] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [paused, setPaused] = useState(false);

  // Derive data from props
  const start = route?.start_location && activeRoute.length ? activeRoute[0] : null;
  const end = route?.end_location && activeRoute.length ? activeRoute[activeRoute.length - 1] : null;
  const riskHits = route?.risk_hits || [];

  // Safe route from backend (if available) - we'll simulate switching to this
  // If backend didn't provide one, we can mock it or use the 'safe_route' prop if added
  // For now, let's assume route.safe_route exists or we fallback to original
  const safeRoute = route?.safe_route || route?.original_route || [];

  // Animation State
  const [convoyStatus, setConvoyStatus] = useState({
    index: 0,
    eta: 0,
    distanceRemaining: 0,
    position: null
  });

  useEffect(() => {
    // Reset state when route changes
    if (route?.route_coordinates) {
      console.log("[RouteMap] New route receive:", route);
      console.log("[RouteMap] Risk Hits:", route.risk_hits);
      setActiveRoute(route.route_coordinates);
      setHasRerouted(false);
      setIsRiskDetected(false);
      setShowRiskModal(false);
      setPaused(false);
    }
  }, [route]);

  const handleConvoyUpdate = (status) => {
    setConvoyStatus(status);

    // Dynamic Risk Detection Logic
    // If we haven't rerouted yet, and we are close to a risk zone
    if (!hasRerouted && riskHits.length > 0 && status.position) {
      const truckLat = status.position[0];
      const truckLon = status.position[1];

      // Check distance to nearest risk zone
      for (const risk of riskHits) {
        const dist = L.latLng(truckLat, truckLon).distanceTo(L.latLng(risk.lat, risk.lon));
        const triggerDist = (risk.radius * 1000 + 2000);

        // Console log every 100 updates to avoid spam, or finding a way to log less frequently
        // For now, let's log only if close
        if (dist < 20000) { // Log if within 20km
          console.log(`[RouteMap] Dist to ${risk.name}: ${Math.round(dist)}m (Trigger: ${triggerDist}m)`);
        }

        // Trigger if within 3km of the risk zone center (adjust as needed)
        // But only if we haven't already triggered
        if (dist < triggerDist && !showRiskModal && !isRiskDetected) {
          console.log("[RouteMap] TRIGGERING RISK ALERT!");
          // 2km buffer before entering zone
          setPaused(true);
          setIsRiskDetected(true);
          setShowRiskModal(true);
          break;
        }
      }
    }
  };

  const handleReroute = () => {
    setShowRiskModal(false);

    // Simulate calculation delay
    setTimeout(() => {
      setHasRerouted(true);
      setActiveRoute(safeRoute.length > 0 ? safeRoute : activeRoute); // Switch to safe route
      setPaused(false); // Resume
    }, 1500);
  };

  const handleIgnore = () => {
    setShowRiskModal(false);
    setPaused(false);
  };

  // Split route for coloring
  const traveledRoute = activeRoute.slice(0, convoyStatus.index + 2);
  const remainingRoute = activeRoute.slice(convoyStatus.index + 1);

  return (
    <div className="relative w-full h-[600px]">

      {/* MAP */}
      <MapContainer
        center={start || [28.6139, 77.209]}
        zoom={10}
        className="w-full h-full rounded-lg overflow-hidden z-0"
        scrollWheelZoom={true}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="© OpenStreetMap contributors"
        />

        {start && (
          <Marker position={start}>
            <Popup>Start</Popup>
          </Marker>
        )}

        {end && (
          <Marker position={end}>
            <Popup>End</Popup>
          </Marker>
        )}

        {/* Risk Zones - Only show if valid */}
        {riskHits.map((risk, idx) => (
          <Circle
            key={idx}
            center={[risk.lat, risk.lon]}
            radius={risk.radius * 1000}
            pathOptions={{
              color: hasRerouted ? 'gray' : 'red',
              fillColor: hasRerouted ? 'gray' : 'red',
              fillOpacity: 0.4
            }}
          >
            <Popup>
              <div className="text-center">
                <strong className={`${hasRerouted ? 'text-gray-600' : 'text-red-600'} block`}>
                  {hasRerouted ? 'AVOIDED ZONE' : '⚠️ HAZARD ZONE'}
                </strong>
                <span>{risk.name}</span>
              </div>
            </Popup>
          </Circle>
        ))}

        {/* Original Risky Route Ghost (Dotted Red) - Visible when rerouted or initially */}
        {!hasRerouted && route?.original_route && riskHits.length > 0 && (
          <Polyline
            positions={route.original_route}
            color="red"
            weight={4}
            opacity={0.3}
            dashArray="10, 10"
          />
        )}

        {/* Traveled Route (Gray) */}
        {traveledRoute.length > 1 && (
          <Polyline
            positions={traveledRoute}
            color="#94a3b8"
            weight={4}
            opacity={0.8}
          />
        )}

        {/* Remaining Route (Blue/Green) */}
        {remainingRoute.length > 1 && (
          <Polyline
            positions={remainingRoute}
            color={hasRerouted ? "#10b981" : "#3b82f6"} // Green if rerouted
            weight={5}
            opacity={1}
          />
        )}

        {/* Animated Convoy Marker */}
        {activeRoute.length > 1 && (
          <ConvoyMarker
            routeCoords={activeRoute}
            speed={60}
            paused={paused}
            onUpdate={handleConvoyUpdate}
          />
        )}

        <FitBounds positions={activeRoute} />

      </MapContainer>

      {/* RISK DETECTED MODAL */}
      {showRiskModal && (
        <div className="absolute inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-lg">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200 border-l-8 border-red-500">
            <div className="flex items-start gap-4 mb-4">
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Critical Risk Detected!</h2>
                <p className="text-gray-600 mt-1">
                  Convoy is approaching a high-risk zone: <span className="font-semibold text-red-600">{riskHits[0]?.name || 'Unknown Zone'}</span>.
                </p>
              </div>
            </div>

            <div className="bg-red-50 p-4 rounded-lg mb-6 text-sm text-red-800">
              <p className="font-semibold mb-1">Impact Analysis:</p>
              <ul className="list-disc pl-4 space-y-1">
                <li>Safety Score drops to 45% (Critical)</li>
                <li>High probability of delay (+2 hrs)</li>
                <li>Alternative Safe Route available</li>
              </ul>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleIgnore}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              >
                Ignore Risk
              </button>
              <button
                onClick={handleReroute}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-200 transition-all transform hover:scale-105 flex items-center gap-2"
              >
                <Navigation className="w-4 h-4" />
                Reroute to Safety
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Status Overlay */}
      <div className="absolute top-4 right-4 z-[9999] space-y-3 pointer-events-none">

        {/* Rerouted Success Toast */}
        {hasRerouted && (
          <div className="bg-green-100 border border-green-200 p-4 shadow-lg rounded-xl w-64 pointer-events-auto animate-in slide-in-from-right duration-500">
            <div className="flex items-center gap-2 mb-1">
              <div className="bg-green-500 rounded-full p-1">
                <Navigation className="w-3 h-3 text-white" />
              </div>
              <span className="font-bold text-green-800">Rerouted Successfully</span>
            </div>
            <p className="text-xs text-green-700">Convoy is now on the optimized safe path.</p>
          </div>
        )}

        {/* ETA Card */}
        <div className="bg-white/90 backdrop-blur p-4 shadow-lg rounded-xl w-64 pointer-events-auto border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
            <Navigation className="w-4 h-4 text-blue-600" />
            Live Tracking
          </h3>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 flex items-center gap-2">
                <Clock className="w-4 h-4" /> ETA
              </span>
              <span className="font-mono font-bold text-blue-600 text-lg">
                {convoyStatus.eta} min
              </span>
            </div>

            <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${hasRerouted ? 'bg-green-500' : 'bg-blue-600'}`}
                style={{ width: `${(convoyStatus.index / activeRoute.length) * 100}%` }}
              />
            </div>

            <div className="flex justify-between text-xs text-slate-500">
              <span>{convoyStatus.distanceRemaining} km remaining</span>
              <span>{Math.round((convoyStatus.index / activeRoute.length) * 100)}% complete</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
