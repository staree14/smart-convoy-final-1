import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Package, AlertCircle, GitMerge, X } from 'lucide-react'; // Added GitMerge, X icons

// --- Merge Suggestion Panel Component (Overlay) ---
// Defined locally since it's only used here.
const MergeSuggestionBox = ({ convoys, selectedA, setSelectedA, selectedB, setSelectedB, suggestMerge, merging, mergeResult, onClose }) => (
  <div className="bg-slate-800/95 border border-slate-700 rounded-lg p-4 backdrop-blur-sm">
    <div className='flex justify-between items-center mb-3'>
      <h3 className="text-white text-md font-bold flex items-center gap-2">
        <GitMerge className="w-5 h-5 text-blue-400" /> Merge Suggestion
      </h3>
      <button 
        onClick={onClose} 
        className="text-slate-400 hover:text-white transition-colors p-1"
        title="Close Panel"
      >
        <X className="w-5 h-5"/>
      </button>
    </div>
    
    <p className="text-slate-400 text-xs mb-3">Choose two convoys to evaluate merging.</p>

    <div className="space-y-2">
      <label className="text-slate-300 text-xs">Convoy A</label>
      <select
        value={selectedA || ''}
        onChange={(e) => setSelectedA(parseInt(e.target.value) || null)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
      >
        <option value="">Select convoy A</option>
        {convoys.map((c) => (
          <option key={`a-${c.id}`} value={c.id}>{c.convoy_name} ({c.id})</option>
        ))}
      </select>

      <label className="text-slate-300 text-xs">Convoy B</label>
      <select
        value={selectedB || ''}
        onChange={(e) => setSelectedB(parseInt(e.target.value) || null)}
        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm"
      >
        <option value="">Select convoy B</option>
        {convoys.map((c) => (
          <option key={`b-${c.id}`} value={c.id}>{c.convoy_name} ({c.id})</option>
        ))}
      </select>

      <button
        onClick={suggestMerge}
        disabled={!selectedA || !selectedB || merging || selectedA === selectedB}
        className="w-full mt-4 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-60 transition-colors"
      >
        {merging ? 'Checking...' : 'Suggest Merge'}
      </button>
    </div>

    {mergeResult && (
      <div className="mt-4 pt-3 border-t border-slate-700 text-sm">
        <p className={`font-semibold ${mergeResult.can_merge ? 'text-green-400' : 'text-yellow-400'}`}>{mergeResult.reason}</p>
        {mergeResult.can_merge && (
          <div className="text-slate-300 text-xs mt-2 space-y-1">
            <div>Scenario: <span className="text-white">{mergeResult.scenario}</span></div>
            <div>Extra Time: <span className="text-white">{mergeResult.extra_minutes} min</span></div>
            <div>Dest Distance: <span className="text-white">{mergeResult.dest_distance_km} km</span></div>
          </div>
        )}
      </div>
    )}
  </div>
);
// ------------------------------------------


export default function Dashboard() {
  const navigate = useNavigate();
  const [convoys, setConvoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMergePanel, setShowMergePanel] = useState(true);
  const [selectedConvoyIds, setSelectedConvoyIds] = useState(new Set());
  const [convoyRoutes, setConvoyRoutes] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState({});

  // Fetch convoys function (can be reused for refresh)
  const fetchConvoys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/convoys/list', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConvoys(data.convoys || []);
        console.log('Fetched convoys:', data.convoys);
      } else if (res.status === 401) {
        // Token expired or invalid, redirect to login
        localStorage.clear();
        navigate('/login');
      }
    } catch (err) {
      console.error('Error fetching convoys:', err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch convoys on mount and when component focuses
  useEffect(() => {
    fetchConvoys();

    // Refetch when user returns to tab/window
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConvoys();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  const totalVehicles = convoys.reduce((sum, c) => sum + (c.vehicle_count || 0), 0);
  const totalLoad = convoys.reduce((sum, c) => sum + (c.total_load_kg || 0), 0);

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'text-red-400 bg-red-500/10 border-red-500/20',
      high: 'text-orange-400 bg-orange-500/10 border-orange-500/20',
      medium: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20',
      low: 'text-green-400 bg-green-500/10 border-green-500/20',
    };
    return colors[priority] || colors.medium;
  };

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeLayers = useRef({});
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);
  const [merging, setMerging] = useState(false);

  // Route colors for different convoys
  const routeColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  // Map Initialization
  useEffect(() => {
    if (mapRef.current) return; // Prevent re-initialization

    try {
      const center = [20.5937, 78.9629]; // India
      mapRef.current = L.map('map', { preferCanvas: true }).setView(center, 5);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    } catch (err) {
      console.warn('Leaflet init failed:', err);
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Fetch route for a convoy
  const fetchConvoyRoute = async (convoyId) => {
    setLoadingRoutes(prev => ({ ...prev, [convoyId]: true }));
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}/route`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setConvoyRoutes(prev => ({
          ...prev,
          [convoyId]: data
        }));
      } else {
        console.error(`Failed to fetch route for convoy ${convoyId}`);
      }
    } catch (err) {
      console.error(`Error fetching route for convoy ${convoyId}:`, err);
    } finally {
      setLoadingRoutes(prev => ({ ...prev, [convoyId]: false }));
    }
  };

  // Handle checkbox toggle
  const handleConvoyCheckbox = (convoyId, isChecked) => {
    const newSelected = new Set(selectedConvoyIds);

    if (isChecked) {
      newSelected.add(convoyId);
      // Fetch route if not already fetched
      if (!convoyRoutes[convoyId]) {
        fetchConvoyRoute(convoyId);
      }
    } else {
      newSelected.delete(convoyId);
      // Remove route layer from map
      if (routeLayers.current[convoyId]) {
        mapRef.current?.removeLayer(routeLayers.current[convoyId]);
        delete routeLayers.current[convoyId];
      }
    }

    setSelectedConvoyIds(newSelected);
  };

  // Update map with selected convoy routes
  useEffect(() => {
    if (!mapRef.current) return;

    // Clear existing route layers for unselected convoys
    Object.keys(routeLayers.current).forEach(convoyId => {
      if (!selectedConvoyIds.has(parseInt(convoyId))) {
        mapRef.current.removeLayer(routeLayers.current[convoyId]);
        delete routeLayers.current[convoyId];
      }
    });

    // Add/update route layers for selected convoys
    selectedConvoyIds.forEach((convoyId, index) => {
      const routeData = convoyRoutes[convoyId];
      if (!routeData || !routeData.waypoints) return;

      // Remove old layer if exists
      if (routeLayers.current[convoyId]) {
        mapRef.current.removeLayer(routeLayers.current[convoyId]);
      }

      // Convert waypoints to coordinates
      const coordinates = routeData.waypoints.map(wp => [wp.lat, wp.lon]);

      // Get color for this route
      const color = routeColors[index % routeColors.length];

      // Create route layer
      const routeLayer = L.polyline(coordinates, {
        color: color,
        weight: 4,
        opacity: 0.7,
        lineCap: 'round',
      }).addTo(mapRef.current);

      // Add popup with convoy info
      const convoy = convoys.find(c => c.id === convoyId);
      if (convoy) {
        routeLayer.bindPopup(`
          <div style="font-family: sans-serif;">
            <b>${convoy.convoy_name}</b><br/>
            ${routeData.distance_m ? `Distance: ${(routeData.distance_m / 1000).toFixed(2)} km<br/>` : ''}
            ${routeData.eta_seconds ? `ETA: ${Math.round(routeData.eta_seconds / 60)} min` : ''}
          </div>
        `);
      }

      routeLayers.current[convoyId] = routeLayer;

      // Add start/end markers
      if (routeData.source) {
        L.marker([routeData.source.lat, routeData.source.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        }).addTo(mapRef.current).bindPopup(`Start: ${convoy?.convoy_name || 'Convoy'}`);
      }

      if (routeData.destination) {
        L.marker([routeData.destination.lat, routeData.destination.lon], {
          icon: L.icon({
            iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            shadowSize: [41, 41],
          }),
        }).addTo(mapRef.current).bindPopup(`End: ${convoy?.convoy_name || 'Convoy'}`);
      }
    });

    // Fit bounds if there are selected routes
    if (selectedConvoyIds.size > 0) {
      const bounds = L.latLngBounds();
      selectedConvoyIds.forEach(convoyId => {
        const routeData = convoyRoutes[convoyId];
        if (routeData?.waypoints) {
          routeData.waypoints.forEach(wp => bounds.extend([wp.lat, wp.lon]));
        }
      });
      if (bounds.isValid()) {
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }, [selectedConvoyIds, convoyRoutes, convoys]);

  // Suggest merge handler
  const suggestMerge = async () => {
    if (!selectedA || !selectedB || selectedA === selectedB) return;
    setMerging(true);
    setMergeResult(null);
    try {
      const payload = {
        convoy_a_id: selectedA,
        convoy_b_id: selectedB,
        max_extra_minutes: 30.0,
        same_dest_radius_km: 5.0
      };
      const res = await fetch('http://localhost:8000/api/convoys/suggest_merge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setMergeResult(data);
    } catch (err) {
      setMergeResult({ can_merge: false, reason: 'Request failed' });
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* NOTE: Navbar now needs the state setter to control the Merge Panel visibility 
        if you still want a button in the Navbar to open it. 
        If not, remove the prop. I'll include it for maximum flexibility.
      */}
      <Navbar setShowMergeSuggestion={setShowMergePanel} /> 

      {/* Header (Top of site) - CORRECTED FOR FULL WIDTH BACKGROUND */}
      <div className="w-full">
        <div className="w-full px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-0">Dashboard</h1>           
              
              <p className="text-slate-400">Manage and track your convoys</p>
            </div>
            <button
              onClick={() => navigate('/create-convoy')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              New Convoy
            </button>
          </div>
        </div>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <input className="..." />
          <input className="..." />
          <button className="..." />
        </div>

        {/* Stats Grid - CORRECTED FOR FULL WIDTH BACKGROUND */}
        <div className="w-full px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Active Convoys</p>
                  <p className="text-3xl font-bold text-white">{convoys.length}</p>
                </div>
                <MapPin className="w-8 h-8 text-blue-400 opacity-50" />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Vehicles</p>
                  <p className="text-3xl font-bold text-white">{totalVehicles}</p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400 opacity-50" />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-sm mb-2">Total Load</p>
                  <p className="text-3xl font-bold text-white">{totalLoad.toLocaleString()} kg</p>
                </div>
                <div className="max-w-6xl mx-auto px-6 py-12">
                  <input className="..." />
                  <input className="..." />
                  <button className="..." />
                </div>
            
                <Package className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 py-12">
        <input className="..." />
        <input className="..." />
        <button className="..." />
      </div>

      {/* Main content area: two-column layout (map left, controls & convoys right) */}
      <div className="w-full px-6 py-8">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Left: Map (slightly smaller on desktop) */}
          <div className="lg:w-2/3 w-full bg-slate-900 rounded-lg border border-slate-800">
            <div id="map" className="w-full h-[65vh] lg:h-[78vh] bg-slate-900 rounded-lg" />
          </div>

          {/* Right: Merge suggestion (top) and Active Convoys (middle) + summary (bottom) */}
          <div className="lg:w-1/3 w-full flex flex-col gap-6">
            {showMergePanel && (
              <div className="sticky top-20">
                <MergeSuggestionBox 
                  convoys={convoys}
                  selectedA={selectedA}
                  setSelectedA={setSelectedA}
                  selectedB={selectedB}
                  setSelectedB={setSelectedB}
                  suggestMerge={suggestMerge}
                  merging={merging}
                  mergeResult={mergeResult}
                  onClose={() => setShowMergePanel(false)}
                />
              </div>
            )}

            <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden flex-1">
              <div className="px-6 py-4 border-b border-slate-700 flex justify-between items-center">
                <h2 className="text-lg font-semibold text-white">Active Convoys</h2>
                <div className="flex items-center gap-3">
                  <span className="text-slate-400 text-sm">{convoys.length} total</span>
                  <button
                    onClick={fetchConvoys}
                    className="text-slate-400 hover:text-white text-sm"
                    title="Refresh convoys"
                  >
                    Refresh
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-700 max-h-[60vh] overflow-auto">
                {loading ? (
                  <div className="p-8 text-center text-slate-400">Loading convoys...</div>
                ) : convoys.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-slate-400 mb-4">No convoys yet</p>
                    <button
                      onClick={() => navigate('/create-convoy')}
                      className="text-blue-400 hover:text-blue-300 text-sm font-medium"
                    >
                      Create your first convoy →
                    </button>
                  </div>
                ) : (
                  convoys.map((convoy, index) => {
                    const isSelected = selectedConvoyIds.has(convoy.id);
                    const isLoadingRoute = loadingRoutes[convoy.id];
                    const routeColor = routeColors[index % routeColors.length];

                    return (
                      <div
                        key={convoy.id}
                        className="p-5 hover:bg-slate-700/50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-3 flex-1">
                            {/* Checkbox for route selection */}
                            <div className="flex items-start pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleConvoyCheckbox(convoy.id, e.target.checked);
                                }}
                                className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                                style={{ accentColor: routeColor }}
                                title="Show route on map"
                              />
                            </div>

                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => navigate(`/route/${convoy.id}`)}
                            >
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-white font-semibold text-base">{convoy.convoy_name}</h3>
                                {isLoadingRoute && (
                                  <span className="text-xs text-slate-400">Loading route...</span>
                                )}
                              </div>
                              <div className="bg-slate-900/50 rounded px-3 py-2 mb-2 border border-slate-700">
                                <div className="flex items-center gap-2 text-xs">
                                  <span className="text-green-400 font-medium">{convoy.source?.place || 'Source'}</span>
                                  <span className="text-slate-600">→</span>
                                  <span className="text-red-400 font-medium">{convoy.destination?.place || 'Destination'}</span>
                                </div>
                              </div>
                              <div className="flex gap-3 text-sm text-slate-400">
                                <span>🚚 {convoy.vehicle_count} vehicles</span>
                                <span>📦 {convoy.total_load_kg} kg</span>
                              </div>
                            </div>
                          </div>
                          <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getPriorityColor(convoy.priority)}`}>
                            {convoy.priority}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-white font-semibold mb-2">Convoy Summary</h3>
              <p className="text-slate-400 text-sm">Total Vehicles: <span className="text-white">{totalVehicles}</span></p>
              <p className="text-slate-400 text-sm">Total Load: <span className="text-white">{totalLoad.toLocaleString()} kg</span></p>
              <p className="text-slate-400 text-sm">Selected Routes: <span className="text-white">{selectedConvoyIds.size}</span></p>
            </div>

            {/* Route Legend */}
            {selectedConvoyIds.size > 0 && (
              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
                <h3 className="text-white font-semibold mb-3 text-sm">Route Legend</h3>
                <div className="space-y-2">
                  {Array.from(selectedConvoyIds).map((convoyId, index) => {
                    const convoy = convoys.find(c => c.id === convoyId);
                    const color = routeColors[index % routeColors.length];
                    return (
                      <div key={convoyId} className="flex items-center gap-2">
                        <div
                          className="w-8 h-1 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-slate-300 text-xs truncate flex-1">
                          {convoy?.convoy_name || `Convoy ${convoyId}`}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}