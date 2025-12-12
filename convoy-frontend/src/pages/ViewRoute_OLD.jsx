import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RouteMap from '../components/RouteMap';
import { ArrowLeft, MapPin, Truck, Package, AlertCircle } from 'lucide-react';

export default function ViewRoute() {
  const navigate = useNavigate();
  const { convoyId } = useParams();
  const id = convoyId;
  const [convoy, setConvoy] = useState(null);
  const [route, setRoute] = useState(null);
  const [dangerPoints, setDangerPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Prepare route data for RouteMap - MUST be at top level before any returns
  const routeMapData = React.useMemo(() => {
    if (!route || !convoy) return null;
    return {
      route_coordinates: route.coordinates,
      start_location: [convoy.source_lat, convoy.source_lon],
      end_location: [convoy.destination_lat, convoy.destination_lon],
      risk_hits: dangerPoints.map(d => ({
        lat: d.lat,
        lon: d.lon,
        radius: d.radius_km || d.radius || 5,
        name: d.name,
        risk_level: d.risk_level
      })),
      original_route: route.coordinates,
      safe_route: route.safe_route
    };
  }, [route, convoy, dangerPoints]);

  useEffect(() => {
    const fetchConvoy = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/convoys/${id}`, {
          headers: token ? {
            'Authorization': `Bearer ${token}`
          } : {}
        });
        if (res.ok) {
          const data = await res.json();
          setConvoy(data.convoy);

          // Fetch route with risk detection using NEW endpoint
          if (data.convoy.source_lat && data.convoy.source_lon && data.convoy.destination_lat && data.convoy.destination_lon) {
            const routeRes = await fetch(
              `http://localhost:8000/api/safe-routing/dynamic_route_json?start_lat=${data.convoy.source_lat}&start_lon=${data.convoy.source_lon}&end_lat=${data.convoy.destination_lat}&end_lon=${data.convoy.destination_lon}`,
              {
                headers: token ? {
                  'Authorization': `Bearer ${token}`
                } : {}
              }
            );
            if (routeRes.ok) {
              const routeData = await routeRes.json();
              console.log('[ViewRoute] Route API Response:', routeData); // DEBUG LOG

              if (routeData.original_route && routeData.original_route.length > 0) {
                console.log('[ViewRoute] Setting route state with', routeData.original_route.length, 'coords');
                setRoute({
                  coordinates: routeData.original_route || [],
                  distance_km: (routeData.distance_m / 1000) || 0,
                  duration_minutes: (routeData.eta_seconds / 60) || 0,
                  checkpoints: [], // Endpoint doesn't return checkpoints yet, will be fetched below
                  departure_time: 'Now',
                  estimated_arrival: 'TBD',
                  safe_route: routeData.safe_route // Store safe route
                });

                // Set danger points from risk analysis
                if (routeData.danger_points) {
                  setDangerPoints(routeData.danger_points);
                  console.log('Danger points detected:', routeData.danger_points.length);
                }

                // Checkpoints fetch removed
              }
            }
          }
        } else {
          setError('Convoy not found');
        }
      } catch (err) {
        setError('Error loading convoy: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConvoy();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <p className="text-slate-400">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !convoy) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        <Navbar />
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 text-red-300 flex gap-4">
            <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">{error}</p>
              <button
                onClick={() => navigate('/history')}
                className="text-red-400 hover:text-red-200 text-sm mt-2 underline"
              >
                Back to History
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'text-red-400 bg-red-500/10 border-red-500/20',
      high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      low: 'text-green-400 bg-green-500/10 border-green-500/20',
    };
    return colors[priority] || colors.medium;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />

      <main className="max-w-7xl mx-auto px-6 py-12">
        {/* Back Button */}
        <button
          onClick={() => navigate('/history')}
          className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to History
        </button>

        {/* Convoy Header */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 mb-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{convoy.convoy_name}</h1>
              <p className="text-slate-400">Convoy ID: {convoy.id}</p>
            </div>
            <div className={`px-4 py-2 rounded-lg border text-sm font-medium ${getPriorityColor(convoy.priority)}`}>
              {convoy.priority.toUpperCase()}
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-blue-600/20 flex items-center justify-center text-blue-400">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Vehicles</p>
                <p className="text-2xl font-bold text-white">{convoy.vehicle_count}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center text-green-400">
                <Package className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Total Load</p>
                <p className="text-2xl font-bold text-white">{convoy.total_load_kg} kg</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-orange-600/20 flex items-center justify-center text-orange-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <p className="text-slate-400 text-sm">Route Status</p>
                <p className="text-2xl font-bold text-white">Active</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {routeMapData && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              Route Map (Risk Aware)
              {dangerPoints.length > 0 && (
                <span className="text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                  {dangerPoints.length} Risk Zone{dangerPoints.length !== 1 ? 's' : ''} Detected
                </span>
              )}
            </h2>
            <RouteMap route={routeMapData} />
          </div>
        )}

        {/* Route Optimization Summary */}
        {route && (
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6 mb-8">
            <h3 className="text-white font-bold text-xl mb-4 flex items-center gap-2">
              <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Route Optimization Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Direct Route */}
              <div className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                <div className="text-slate-400 text-sm font-medium mb-3">Direct Route (Baseline)</div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-slate-300">{(() => {
                      // Calculate straight-line distance using Haversine
                      const R = 6371; // Earth's radius in km
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = (R * c * 1.3).toFixed(1); // 1.3x for road factor
                      return directDistance;
                    })()} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Time:</span>
                    <span className="text-slate-300">{(() => {
                      const R = 6371;
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = R * c * 1.3;
                      const directTime = (directDistance / 50 * 60).toFixed(0); // 50 km/h avg speed
                      return directTime;
                    })()} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Fuel:</span>
                    <span className="text-slate-300">~{(() => {
                      const R = 6371;
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = R * c * 1.3;
                      const directFuel = (directDistance * 0.35).toFixed(1); // 0.35 L/km
                      return directFuel;
                    })()} L</span>
                  </div>
                </div>
              </div>

              {/* Optimized Route */}
              <div className="border border-green-600 rounded-lg p-4 bg-green-900/10">
                <div className="text-green-400 text-sm font-medium mb-3 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Optimized Route (AI-Powered)
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-green-400 font-medium">{route.distance_km.toFixed(1)} km
                      <span className="text-green-300 ml-2">
                        ({(() => {
                          const R = 6371;
                          const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                          const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                          const directDistance = R * c * 1.3;
                          const saved = directDistance - route.distance_km;
                          return saved > 0 ? `-${saved.toFixed(1)} km ✓` : '+0 km';
                        })()})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Time:</span>
                    <span className="text-green-400 font-medium">{route.duration_minutes.toFixed(0)} min
                      <span className="text-green-300 ml-2">
                        ({(() => {
                          const R = 6371;
                          const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                          const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                          const directDistance = R * c * 1.3;
                          const directTime = directDistance / 50 * 60;
                          const savedTime = directTime - route.duration_minutes;
                          return savedTime > 0 ? `-${savedTime.toFixed(0)} min ✓` : '+0 min';
                        })()})
                      </span>
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Est. Fuel:</span>
                    <span className="text-green-400 font-medium">~{(route.distance_km * 0.35).toFixed(1)} L
                      <span className="text-green-300 ml-2">
                        ({(() => {
                          const R = 6371;
                          const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                          const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                            Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                            Math.sin(dLon / 2) * Math.sin(dLon / 2);
                          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                          const directDistance = R * c * 1.3;
                          const directFuel = directDistance * 0.35;
                          const savedFuel = directFuel - (route.distance_km * 0.35);
                          const savedMoney = savedFuel * 150; // ₹150 per liter
                          return savedFuel > 0 ? `-${savedFuel.toFixed(1)}L = ₹${savedMoney.toFixed(0)} ✓` : '+0L';
                        })()})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Savings */}
            <div className="mt-6 p-4 bg-green-900/20 border border-green-700 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-green-400 font-bold text-lg">
                  ✓ Optimization Benefits:
                </span>
                <span className="text-green-300 text-sm">
                  {(() => {
                    const R = 6371;
                    const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                    const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                      Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                      Math.sin(dLon / 2) * Math.sin(dLon / 2);
                    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                    const directDistance = R * c * 1.3;
                    const savedPercent = ((directDistance - route.distance_km) / directDistance * 100);
                    return savedPercent > 0 ? `${savedPercent.toFixed(1)}% more efficient than direct route` : 'Optimal route selected';
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Route Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Route Details</h2>
            <div className="space-y-3 text-sm">
              {route && (
                <>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Distance:</span>
                    <span className="text-white font-medium">{route.distance_km} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Duration:</span>
                    <span className="text-white font-medium">{route.duration_minutes} min</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Departure:</span>
                    <span className="text-white font-medium">{route.departure_time}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Arrival:</span>
                    <span className="text-white font-medium">{route.estimated_arrival}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Coordinates</h2>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-slate-400 mb-1">Source</p>
                <p className="text-white font-mono text-xs">{convoy.source_lat?.toFixed(4)}, {convoy.source_lon?.toFixed(4)}</p>
              </div>
              <div>
                <p className="text-slate-400 mb-1">Destination</p>
                <p className="text-white font-mono text-xs">{convoy.destination_lat?.toFixed(4)}, {convoy.destination_lon?.toFixed(4)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Risk Zones List */}
        {dangerPoints.length > 0 && (
          <div className="bg-slate-800 rounded-lg border border-red-700/50 overflow-hidden mb-8">
            <div className="px-6 py-4 border-b border-red-700/50 bg-red-900/10">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Risk Zones Detected ({dangerPoints.length})
              </h2>
              <p className="text-sm text-red-300 mt-1">
                The route passes through or near the following risk zones. Exercise caution.
              </p>
            </div>

            <div className="divide-y divide-slate-700">
              {dangerPoints.map((danger, idx) => {
                const getRiskColor = (level) => {
                  if (level === 'high') return 'bg-red-600/20 text-red-400 border-red-500/30';
                  if (level === 'medium') return 'bg-orange-600/20 text-orange-400 border-orange-500/30';
                  return 'bg-yellow-600/20 text-yellow-400 border-yellow-500/30';
                };

                return (
                  <div key={danger.id || idx} className="p-6 hover:bg-slate-700/30 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="text-white font-semibold mb-1">⚠️ {danger.name}</h3>
                        <p className="text-slate-400 text-sm">Zone ID: {danger.id}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full border text-xs font-medium ${getRiskColor(danger.risk_level)}`}>
                        {danger.risk_level.toUpperCase()} RISK
                      </span>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-slate-400 mb-1">Distance from Route</p>
                        <p className="text-white font-medium">{danger.distance_from_route_km} km</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1">Zone Radius</p>
                        <p className="text-white font-medium">{danger.radius_km} km</p>
                      </div>
                      <div>
                        <p className="text-slate-400 mb-1">Coordinates</p>
                        <p className="text-white font-mono text-xs">{danger.lat.toFixed(4)}, {danger.lon.toFixed(4)}</p>
                      </div>
                    </div>

                    {danger.risk_level === 'high' && (
                      <div className="mt-3 p-3 bg-red-900/20 border border-red-700/30 rounded text-xs text-red-300">
                        <strong>⚠ High Risk Alert:</strong> Consider alternative routes or proceed with extreme caution.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Vehicles List */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-700">
            <h2 className="text-lg font-semibold text-white">Vehicles ({convoy.vehicles.length})</h2>
          </div>

          <div className="divide-y divide-slate-700">
            {convoy.vehicles.map((vehicle, idx) => (
              <div key={idx} className="p-6 hover:bg-slate-700/30 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-white font-semibold mb-1">{vehicle.registration}</h3>
                    <p className="text-slate-400 text-sm">Type: {vehicle.type}</p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-600/20 text-blue-400 text-xs font-medium">
                    {vehicle.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-slate-400 mb-1">Driver</p>
                    <p className="text-white font-medium">{vehicle.driver || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Load Type</p>
                    <p className="text-white font-medium">{vehicle.load_type}</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Load Weight</p>
                    <p className="text-white font-medium">{vehicle.load_kg} kg</p>
                  </div>
                  <div>
                    <p className="text-slate-400 mb-1">Capacity</p>
                    <p className="text-white font-medium">{vehicle.capacity_kg} kg</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
