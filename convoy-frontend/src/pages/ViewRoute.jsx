import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RouteMap from '../components/RouteMap';
import { ArrowLeft, MapPin, Truck, Package, AlertCircle } from 'lucide-react';

export default function ViewRoute() {
  const navigate = useNavigate();
  const { convoyId } = useParams();
  const [convoy, setConvoy] = useState(null);
  const [route, setRoute] = useState(null);
  const [dangerPoints, setDangerPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchConvoy = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}`, {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        });
        
        if (res.ok) {
          const data = await res.json();
          setConvoy(data.convoy);

          // Fetch route if coordinates exist
          if (data.convoy.source_lat && data.convoy.destination_lat) {
            const routeRes = await fetch(
              `http://localhost:8000/api/safe-routing/dynamic_route_json?start_lat=${data.convoy.source_lat}&start_lon=${data.convoy.source_lon}&end_lat=${data.convoy.destination_lat}&end_lon=${data.convoy.destination_lon}`,
              { headers: token ? { 'Authorization': `Bearer ${token}` } : {} }
            );
            
            if (routeRes.ok) {
              const routeData = await routeRes.json();
              setRoute({
                coordinates: routeData.original_route || [],
                distance_km: (routeData.distance_m / 1000) || 0,
                duration_minutes: (routeData.eta_seconds / 60) || 0,
                safe_route: routeData.safe_route || []
              });
              setDangerPoints(routeData.danger_points || []);
            }
          }
        } else {
          setError('Convoy not found');
        }
      } catch (err) {
        console.error('Error:', err);
        setError('Error loading convoy: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchConvoy();
  }, [convoyId]);

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
              <button onClick={() => navigate('/history')} className="text-red-400 hover:text-red-200 text-sm mt-2 underline">
                Back to History
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 py-12">
        <button onClick={() => navigate('/history')} className="flex items-center gap-2 text-slate-400 hover:text-white mb-6 transition-colors">
          <ArrowLeft className="w-5 h-5" />
          Back to History
        </button>

        {/* Convoy Header */}
        <div className="bg-slate-800 rounded-lg border border-slate-700 p-8 mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">{convoy.convoy_name}</h1>
          <p className="text-slate-400">Convoy ID: {convoy.id}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
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
                <p className="text-slate-400 text-sm">Distance</p>
                <p className="text-2xl font-bold text-white">{route ? route.distance_km.toFixed(1) : '...'} km</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {route && route.coordinates && route.coordinates.length > 0 && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              Route Map
              {dangerPoints.length > 0 && (
                <span className="text-sm text-red-400 bg-red-500/10 px-3 py-1 rounded-full border border-red-500/30">
                  {dangerPoints.length} Risk Zone{dangerPoints.length !== 1 ? 's' : ''} Detected
                </span>
              )}
            </h2>
            <RouteMap
              route={{
                route_coordinates: route.coordinates,
                start_location: [convoy.source_lat, convoy.source_lon],
                end_location: [convoy.destination_lat, convoy.destination_lon],
                risk_hits: dangerPoints.map(d => ({
                  lat: d.lat,
                  lon: d.lon,
                  radius: d.radius_km || 5,
                  name: d.name,
                  risk_level: d.risk_level
                })),
                original_route: route.coordinates,
                safe_route: route.safe_route
              }}
            />
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
