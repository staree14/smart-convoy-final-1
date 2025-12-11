import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import ConvoyMap from '../components/ConvoyMap';
import { ArrowLeft, MapPin, Truck, Package, AlertCircle } from 'lucide-react';

export default function ViewRoute() {
  const navigate = useNavigate();
  const { convoyId } = useParams();
  const id = convoyId;
  const [convoy, setConvoy] = useState(null);
  const [route, setRoute] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

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

          // Fetch optimized route
          if (data.convoy.source_lat && data.convoy.source_lon && data.convoy.destination_lat && data.convoy.destination_lon) {
            const routeRes = await fetch(
              `http://localhost:8000/api/routes/get_route?start_lat=${data.convoy.source_lat}&start_lon=${data.convoy.source_lon}&end_lat=${data.convoy.destination_lat}&end_lon=${data.convoy.destination_lon}&traffic_level=1&terrain=plain`
            );
            if (routeRes.ok) {
              const routeData = await routeRes.json();
              if (routeData.status === 'success') {
                setRoute(routeData.route);
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
        {route && (
          <div className="mb-8">
            <h2 className="text-lg font-semibold text-white mb-4">Route Map</h2>
            <ConvoyMap
              route={route.coordinates || []}
              startPoint={{ lat: convoy.source_lat, lon: convoy.source_lon }}
              endPoint={{ lat: convoy.destination_lat, lon: convoy.destination_lon }}
              checkpoints={route.checkpoints || []}
            />
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
