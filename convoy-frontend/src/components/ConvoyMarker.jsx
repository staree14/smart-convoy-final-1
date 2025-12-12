
import React, { useEffect, useState, useRef } from 'react';
import { Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { getBearing, interpolatePosition, getDistance, calculateRouteDistance } from '../utils/animationUtils';
import { Truck } from 'lucide-react';
// Create a custom DivIcon using pure HTML string for performance
const createTruckIcon = (rotation) => {
    // Pure HTML string to avoid ReactDOMServer.renderToString overhead in animation loop
    const iconHtml = `
        <div style="
            transform: rotate(${rotation}deg);
            transition: transform 0.1s linear;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 40px;
            height: 40px;
            background: #2563eb;
            border-radius: 50%;
            border: 2px solid white;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        ">
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="white"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
            >
                <path d="M5 18H3c-.6 0-1-.4-1-1V9c0-.6.4-1 1-1h2" />
                <path d="M10 21V5H5v16h5z" />
                <path d="M15 21V9h-5v12h5z" />
                <path d="M20 21h-5" />
                <path d="M15 5h3.5a2.5 2.5 0 0 1 2.5 2.5V21" />
            </svg>
        </div>
    `;

    return L.divIcon({
        html: iconHtml,
        className: 'custom-truck-icon',
        iconSize: [40, 40],
        iconAnchor: [20, 20],
        popupAnchor: [0, -20]
    });
};

export default function ConvoyMarker({ routeCoords, speed = 50, paused = false, onUpdate }) {
    const [position, setPosition] = useState(routeCoords[0]);
    const [rotation, setRotation] = useState(0);
    const requestRef = useRef();
    const startTimeRef = useRef();
    const currentIndexRef = useRef(0);
    const map = useMap();

    // Calculate total distance for ETA
    const totalDistance = useRef(calculateRouteDistance(routeCoords));

    useEffect(() => {
        if (!routeCoords || routeCoords.length < 2) return;

        // Reset if route changes significantly (start new animation)
        // But if we just switched route (rerouted) we might want to continue or reset?
        // Ideally we reset index if route changes completely. 
        // For simplicity, let's reset if the first point is different.

        const animate = (time) => {
            if (paused) {
                // Update start time so that when we resume, we don't jump forward
                startTimeRef.current = time;
                requestRef.current = requestAnimationFrame(animate);
                return;
            }

            if (!startTimeRef.current) startTimeRef.current = time;

            // Speed factor (meters per millisecond)
            // 50 km/h = ~13.8 m/s = ~0.0138 m/ms
            // Let's speed it up for demo purposes (e.g., 100x real time)
            const speedFactor = speed * 10;

            // Move to next segment if needed
            let idx = currentIndexRef.current;
            if (idx >= routeCoords.length - 1) {
                // Reached end, loop or stop? Let's stop.
                onUpdate && onUpdate({
                    position: routeCoords[routeCoords.length - 1],
                    index: routeCoords.length - 1,
                    eta: 0,
                    distanceRemaining: 0
                });
                return;
            }

            const start = routeCoords[idx];
            const end = routeCoords[idx + 1];
            const segmentDist = getDistance(start, end);

            // Time to cover this segment
            const segmentDuration = (segmentDist / (speed / 3.6)) * 1000 / 100; // Scaled duration

            const elapsed = time - startTimeRef.current;
            let progress = elapsed / segmentDuration;

            if (progress >= 1) {
                currentIndexRef.current = idx + 1;
                startTimeRef.current = time; // Reset for next segment
                progress = 0;
            }

            const newPos = interpolatePosition(start, end, progress);
            const bearing = getBearing(start[0], start[1], end[0], end[1]);

            setPosition(newPos);
            setRotation(bearing);

            // Calculate remaining stats
            // Approximate remaining distance
            let distRemaining = getDistance(newPos, end);
            for (let i = idx + 1; i < routeCoords.length - 1; i++) {
                distRemaining += getDistance(routeCoords[i], routeCoords[i + 1]);
            }

            // ETA in minutes (assuming constant speed)
            const etaMinutes = (distRemaining / (speed / 3.6)) / 60;

            if (onUpdate) {
                onUpdate({
                    position: newPos,
                    index: idx,
                    eta: Math.ceil(etaMinutes),
                    distanceRemaining: (distRemaining / 1000).toFixed(1)
                });
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(requestRef.current);
    }, [routeCoords, speed]);

    return (
        <Marker position={position} icon={createTruckIcon(rotation)}>
            <Popup>
                <div className="text-center">
                    <strong className="block text-blue-600">Convoy Leader</strong>
                    <span className="text-xs text-gray-500">Moving at {speed} km/h</span>
                </div>
            </Popup>
        </Marker>
    );
}
