import React, { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";

function FitBounds({ positions }) {
  const map = useMap();
  useEffect(() => {
    if (positions && positions.length) {
      map.fitBounds(positions, { padding: [40, 40] });
    }
  }, [map, positions]);
  return null;
}

export default function RouteMap({ route }) {
  const coords = route?.route_coordinates || [];
  const start = coords.length ? coords[0] : null;
  const end = coords.length ? coords[coords.length - 1] : null;

  return (
    <div className="relative w-full h-[500px]">
      
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
            <Popup>{route?.start_location?.name || "Start"}</Popup>
          </Marker>
        )}

        {end && (
          <Marker position={end}>
            <Popup>{route?.end_location?.name || "End"}</Popup>
          </Marker>
        )}

        {coords.length > 1 && (
          <>
            <Polyline
              positions={coords}
              color="#667eea"
              weight={5}
              opacity={0.9}
            />
            <FitBounds positions={coords} />
          </>
        )}
      </MapContainer>

      {/* ⭐ FIXED — Overlay stays above the map always */}
      <div className="absolute top-4 right-4 z-[9999] bg-white p-4 shadow-lg rounded-xl w-64 pointer-events-auto">
        <h3 className="font-semibold text-gray-800 mb-2">
          Convoy Suggestions
        </h3>
        <p className="text-sm text-gray-600">Your content here...</p>
      </div>

    </div>
  );
}
