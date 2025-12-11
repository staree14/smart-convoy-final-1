import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

export default function ConvoyMap({ route, startPoint, endPoint, checkpoints = [] }) {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);

  useEffect(() => {
    if (!mapContainer.current) return;

    // Initialize map centered on start point
    const mapCenter = startPoint
      ? [startPoint.lat, startPoint.lon]
      : [28.6139, 77.209]; // Default: Delhi

    if (!mapRef.current) {
      mapRef.current = L.map(mapContainer.current).setView(mapCenter, 11);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    // Clear existing layers (except tiles)
    mapRef.current.eachLayer((layer) => {
      if (layer instanceof L.Marker || layer instanceof L.Polyline) {
        mapRef.current.removeLayer(layer);
      }
    });

    // Add start marker (green)
    if (startPoint) {
      const startMarker = L.marker([startPoint.lat, startPoint.lon], {
        icon: L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .bindPopup('Start Point')
        .addTo(mapRef.current);
    }

    // Add end marker (red)
    if (endPoint) {
      const endMarker = L.marker([endPoint.lat, endPoint.lon], {
        icon: L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [25, 41],
          iconAnchor: [12, 41],
          popupAnchor: [1, -34],
          shadowSize: [41, 41],
        }),
      })
        .bindPopup('End Point')
        .addTo(mapRef.current);
    }

    // Add route polyline (blue)
    if (route && route.length > 0) {
      L.polyline(route, {
        color: '#3b82f6',
        weight: 3,
        opacity: 0.8,
        lineCap: 'round',
      }).addTo(mapRef.current);
    }

    // Add checkpoints (orange markers)
    if (checkpoints && checkpoints.length > 0) {
      checkpoints.forEach((cp, idx) => {
        const cpMarker = L.marker([cp.lat, cp.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        })
          .bindPopup(
            `Checkpoint ${cp.checkpoint_id}<br/>ETA: ${cp.estimated_arrival}<br/>Time from start: ${cp.time_from_start_minutes} min`
          )
          .addTo(mapRef.current);
      });
    }

    // Fit bounds to show all markers
    if ((startPoint || endPoint || checkpoints.length > 0) && mapRef.current) {
      const bounds = L.latLngBounds();
      if (startPoint) bounds.extend([startPoint.lat, startPoint.lon]);
      if (endPoint) bounds.extend([endPoint.lat, endPoint.lon]);
      if (checkpoints && checkpoints.length > 0) {
        checkpoints.forEach((cp) => bounds.extend([cp.lat, cp.lon]));
      }
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }

    return () => {
      // Cleanup on unmount
    };
  }, [route, startPoint, endPoint, checkpoints]);

  return (
    <div
      ref={mapContainer}
      className="w-full h-80 md:h-96 bg-slate-900 rounded-lg border border-slate-700 overflow-hidden"
    />
  );
}
