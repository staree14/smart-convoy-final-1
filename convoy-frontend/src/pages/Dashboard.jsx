import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Package, AlertCircle, GitMerge, X, CheckCircle, Truck, Flag } from 'lucide-react';

// --- Merge Suggestion Panel Component (Overlay) ---
const MergeSuggestionBox = ({ convoys, selectedA, setSelectedA, selectedB, setSelectedB, suggestMerge, merging, mergeResult, onClose }) => (
  <div className="bg-slate-800/95 border border-slate-700 rounded-lg p-4 sm:p-5 backdrop-blur-sm">
    <div className='flex justify-between items-center mb-4'>
      <h3 className="text-white text-base sm:text-lg font-bold flex items-center gap-2">
        <GitMerge className="w-5 h-5 text-blue-400" /> Merge Suggestion
      </h3>
      <button
        onClick={onClose}
        className="text-slate-400 hover:text-white transition-colors p-1"
        title="Close Panel"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <p className="text-slate-400 text-xs sm:text-sm mb-4">Choose two convoys to evaluate merging.</p>

    <div className="space-y-3">
      <div>
        <label className="text-slate-300 text-xs sm:text-sm mb-1.5 block">Convoy A</label>
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
      </div>

      <div>
        <label className="text-slate-300 text-xs sm:text-sm mb-1.5 block">Convoy B</label>
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
      </div>

      <button
        onClick={suggestMerge}
        disabled={!selectedA || !selectedB || merging || selectedA === selectedB}
        className="w-full mt-2 px-3 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md disabled:opacity-60 transition-colors"
      >
        {merging ? 'Checking...' : 'Suggest Merge'}
      </button>
    </div>

    {mergeResult && (
      <div className="mt-4 pt-4 border-t border-slate-700 text-sm">
        <p className={`font-semibold ${mergeResult.can_merge ? 'text-green-400' : 'text-yellow-400'}`}>{mergeResult.reason}</p>
        {mergeResult.can_merge && (
          <div className="text-slate-300 text-xs sm:text-sm mt-3 space-y-1.5">
            <div>Scenario: <span className="text-white">{mergeResult.scenario}</span></div>
            <div>Extra Time: <span className="text-white">{mergeResult.extra_minutes} min</span></div>
            <div>Dest Distance: <span className="text-white">{mergeResult.dest_distance_km} km</span></div>
          </div>
        )}
      </div>
    )}
  </div>
);

export default function Dashboard() {
  const navigate = useNavigate();
  const [convoys, setConvoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showMergePanel, setShowMergePanel] = useState(true);

  // Analytics state
  const [metrics, setMetrics] = useState({
    total_distance_saved_km: 0,
    total_fuel_saved_liters: 0,
    total_cost_saved_inr: 0,
    conflicts_prevented: 0,
    successful_merges: 0
  });
  const [metricsLoading, setMetricsLoading] = useState(true);

  // Checkpoints state
  const [checkpoints, setCheckpoints] = useState([]);
  const checkpointMarkersRef = useRef([]);

  // Risk zones state
  const [riskZones, setRiskZones] = useState([]);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const riskZoneLayersRef = useRef([]);

  // Route visualization state
  const [selectedConvoyIds, setSelectedConvoyIds] = useState(new Set());
  const [convoyRoutes, setConvoyRoutes] = useState({});
  const [loadingRoutes, setLoadingRoutes] = useState({});
  const routeLayers = useRef({});
  const routeMarkers = useRef({});
  const routeColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899'];

  const mapRef = useRef(null);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);
  const [merging, setMerging] = useState(false);

  // Fetch functions
  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/analytics/dashboard-metrics', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setMetrics(data.metrics);
      }
    } catch (err) {
      console.error('Error fetching metrics', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  const fetchCheckpoints = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/checkpoints/all', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setCheckpoints(data.checkpoints || []);
      }
    } catch (err) {
      console.error('Error fetching checkpoints', err);
    }
  };

  const fetchRiskZones = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/safe-routing/risk_zones');
      if (res.ok) {
        const data = await res.json();
        setRiskZones(data.zones || []);
      }
    } catch (err) {
      console.error('Error fetching risk zones', err);
    }
  };

  const fetchConvoys = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/convoys/list', {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setConvoys(data.convoys || []);
      } else if (res.status === 401) {
        localStorage.clear();
        navigate('/login');
      }
    } catch (err) {
      console.error('Error fetching convoys', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConvoyRoute = async (convoyId) => {
    // 1. Find convoy to get coordinates
    const convoy = convoys.find(c => c.id === convoyId);
    if (!convoy || !convoy.source || !convoy.destination) return;

    // 2. Prevent duplicate fetch
    if (loadingRoutes[convoyId] || convoyRoutes[convoyId]) return;

    setLoadingRoutes(prev => ({ ...prev, [convoyId]: true }));

    try {
      const token = localStorage.getItem('access_token');
      const url = `http://localhost:8000/api/safe-routing/dynamic_route_json?start_lat=${convoy.source.lat}&start_lon=${convoy.source.lon}&end_lat=${convoy.destination.lat}&end_lon=${convoy.destination.lon}`;

      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (res.ok) {
        const data = await res.json();
        const routeCoords = data.original_route; // List of [lat, lon]

        if (routeCoords && routeCoords.length > 0) {
          // Transform to expected format for the drawing useEffect
          const waypoints = routeCoords.map(p => ({ lat: p[0], lon: p[1] }));
          setConvoyRoutes(prev => ({
            ...prev,
            [convoyId]: {
              waypoints,
              source: convoy.source,
              destination: convoy.destination
            }
          }));
        }
      }
    } catch (err) {
      console.error('Error fetching route for convoy', convoyId, err);
    } finally {
      setLoadingRoutes(prev => ({ ...prev, [convoyId]: false }));
    }
  };

  const updateConvoyStatus = async (convoyId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`http://localhost:8000/api/convoys/${convoyId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      fetchConvoys(); // Refresh list
    } catch (err) {
      console.error('Error updating status', err);
    }
  };

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
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/convoys/suggest_merge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
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

  // Initial Data Fetch
  useEffect(() => {
    fetchConvoys();
    fetchMetrics();
    fetchCheckpoints();
    fetchRiskZones();

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchConvoys();
        fetchMetrics();
        fetchCheckpoints();
        fetchRiskZones();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // Map Initialization
  useEffect(() => {
    try {
      const center = [20.5937, 78.9629]; // India
      if (!mapRef.current) {
        mapRef.current = L.map('map', { preferCanvas: true }).setView(center, 5);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors',
          maxZoom: 19,
        }).addTo(mapRef.current);
      }
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

  // Map: Draw Checkpoints
  useEffect(() => {
    if (!mapRef.current || checkpoints.length === 0) return;

    checkpointMarkersRef.current.forEach(marker => mapRef.current.removeLayer(marker));
    checkpointMarkersRef.current = [];

    checkpoints.forEach(cp => {
      let markerColor = 'orange';
      if (cp.checkpoint_type === 'military') markerColor = 'gold';
      if (cp.checkpoint_type === 'border') markerColor = 'violet';
      if (cp.checkpoint_type === 'rest_stop') markerColor = 'blue';
      if (cp.status === 'closed') markerColor = 'red';

      const marker = L.marker([cp.lat, cp.lon], {
        icon: L.icon({
          iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [20, 33],
          iconAnchor: [10, 33],
          popupAnchor: [1, -28],
          shadowSize: [33, 33],
        }),
      }).bindPopup(`<strong>${cp.name}</strong><br/>Type: ${cp.checkpoint_type}<br/>Status: ${cp.status}`);

      marker.addTo(mapRef.current);
      checkpointMarkersRef.current.push(marker);
    });
  }, [checkpoints]);

  // Map: Draw Risk Zones
  useEffect(() => {
    if (!mapRef.current || riskZones.length === 0 || !showRiskZones) return;

    riskZoneLayersRef.current.forEach(layer => mapRef.current.removeLayer(layer));
    riskZoneLayersRef.current = [];

    riskZones.forEach(zone => {
      let circleColor = '#ef4444';
      if (zone.risk_level === 'medium') circleColor = '#f59e0b';
      if (zone.risk_level === 'low') circleColor = '#fbbf24';

      const circle = L.circle([zone.lat, zone.lon], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        radius: zone.radius_km * 1000,
        weight: 1.5,
      }).addTo(mapRef.current);

      riskZoneLayersRef.current.push(circle);
    });
  }, [riskZones, showRiskZones]);

  // Map: Draw Routes
  useEffect(() => {
    if (!mapRef.current) return;

    selectedConvoyIds.forEach((convoyId, index) => {
      const routeData = convoyRoutes[convoyId];
      if (!routeData || !routeData.waypoints) return;

      if (routeLayers.current[convoyId]) mapRef.current.removeLayer(routeLayers.current[convoyId]);
      if (routeMarkers.current[convoyId]) routeMarkers.current[convoyId].forEach(m => mapRef.current.removeLayer(m));

      const color = routeColors[index % routeColors.length];
      const routeCoords = routeData.waypoints.map(wp => [wp.lat, wp.lon]);

      const polyline = L.polyline(routeCoords, { color, weight: 4, opacity: 0.8 }).addTo(mapRef.current);
      routeLayers.current[convoyId] = polyline;

      const sourceMarker = L.circleMarker([routeData.source.lat, routeData.source.lon], {
        radius: 8, fillColor: '#10b981', color: '#fff', fillOpacity: 1
      }).bindPopup(`Source: ${routeData.source.place}`).addTo(mapRef.current);

      const destMarker = L.circleMarker([routeData.destination.lat, routeData.destination.lon], {
        radius: 8, fillColor: '#ef4444', color: '#fff', fillOpacity: 1
      }).bindPopup(`Dest: ${routeData.destination.place}`).addTo(mapRef.current);

      routeMarkers.current[convoyId] = [sourceMarker, destMarker];

      if (selectedConvoyIds.size === 1) mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    });

    // Cleanup unselected
    Object.keys(routeLayers.current).forEach(convoyId => {
      if (!selectedConvoyIds.has(parseInt(convoyId))) {
        mapRef.current.removeLayer(routeLayers.current[convoyId]);
        delete routeLayers.current[convoyId];
      }
    });

    Object.keys(routeMarkers.current).forEach(convoyId => {
      if (!selectedConvoyIds.has(parseInt(convoyId))) {
        routeMarkers.current[convoyId].forEach(m => mapRef.current.removeLayer(m));
        delete routeMarkers.current[convoyId];
      }
    });
  }, [convoyRoutes, selectedConvoyIds]);

  const handleConvoyCheckbox = (convoyId, isChecked) => {
    const newSelected = new Set(selectedConvoyIds);
    if (isChecked) {
      newSelected.add(convoyId);
      if (!convoyRoutes[convoyId]) fetchConvoyRoute(convoyId);
    } else {
      newSelected.delete(convoyId);
    }
    setSelectedConvoyIds(newSelected);
  };

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

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/30',
      en_route: 'text-blue-400 bg-blue-500/10 border-blue-500/30',
      completed: 'text-green-400 bg-green-500/10 border-green-500/30',
      cancelled: 'text-red-400 bg-red-500/10 border-red-500/30',
    };
    return colors[status] || colors.pending;
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: <AlertCircle className="w-3 h-3" />,
      en_route: <Truck className="w-3 h-3" />,
      completed: <CheckCircle className="w-3 h-3" />,
      cancelled: <X className="w-3 h-3" />,
    };
    return icons[status] || icons.pending;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar setShowMergeSuggestion={setShowMergePanel} />
      {/* Main Container with proper padding and max-width */}
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">

        {/* Header Section */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400 text-sm sm:text-base">Manage and track your convoys in real-time</p>
            </div>
            <button
              onClick={() => navigate('/create-convoy')}
              className="flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg hover:shadow-xl"
            >
              <Plus className="w-5 h-5" />
              <span className="hidden sm:inline">New Convoy</span>
              <span className="sm:hidden">New</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-6 sm:mb-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 sm:p-6 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm mb-2">Active Convoys</p>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{convoys.length}</p>
                </div>
                <MapPin className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 opacity-50" />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 sm:p-6 hover:bg-slate-800/80 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm mb-2">Total Vehicles</p>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{totalVehicles}</p>
                </div>
                <AlertCircle className="w-8 h-8 sm:w-10 sm:h-10 text-orange-400 opacity-50" />
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-5 sm:p-6 hover:bg-slate-800/80 transition-colors sm:col-span-2 lg:col-span-1">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs sm:text-sm mb-2">Total Load</p>
                  <p className="text-3xl sm:text-4xl font-bold text-white">{totalLoad.toLocaleString()} kg</p>
                </div>
                <Package className="w-8 h-8 sm:w-10 sm:h-10 text-green-400 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6 lg:p-8">
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-6">
              System Performance Metrics
            </h2>

            {/* Top-Level Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* ROI Metric */}
              <div className="bg-gradient-to-br from-green-900 to-green-700 p-5 sm:p-6 lg:p-7 rounded-lg shadow-lg">
                <div className="text-green-300 text-xs sm:text-sm font-medium mb-2">Financial ROI</div>
                <div className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">8X</div>
                <div className="text-green-200 text-xs sm:text-sm">
                  ₹8 saved for every ₹1 invested
                </div>
              </div>

              {/* Delay Reduction */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-5 sm:p-6 lg:p-7 rounded-lg shadow-lg">
                <div className="text-blue-300 text-xs sm:text-sm font-medium mb-2">Delay Reduction</div>
                <div className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">-40%</div>
                <div className="text-blue-200 text-xs sm:text-sm">
                  Average convoy delays reduced
                </div>
              </div>

              {/* Efficiency Gain */}
              <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-5 sm:p-6 lg:p-7 rounded-lg shadow-lg sm:col-span-2 lg:col-span-1">
                <div className="text-purple-300 text-xs sm:text-sm font-medium mb-2">Fleet Efficiency</div>
                <div className="text-white text-4xl sm:text-5xl lg:text-6xl font-bold mb-2">+15%</div>
                <div className="text-purple-200 text-xs sm:text-sm">
                  More trips per vehicle per month
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
                <div className="text-slate-400 text-xs mb-1">Total Distance Saved</div>
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.total_distance_saved_km.toFixed(1)} km
                </div>
                <div className="text-green-400 text-xs mt-1">All time</div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
                <div className="text-slate-400 text-xs mb-1">Fuel Saved</div>
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.total_fuel_saved_liters.toFixed(1)} L
                </div>
                <div className="text-green-400 text-xs mt-1">
                  ≈ ₹{metricsLoading ? '...' : metrics.total_cost_saved_inr.toLocaleString()}
                </div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
                <div className="text-slate-400 text-xs mb-1">Conflicts Prevented</div>
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.conflicts_prevented}
                </div>
                <div className="text-blue-400 text-xs mt-1">Route overlaps avoided</div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50 hover:bg-slate-900/80 transition-colors">
                <div className="text-slate-400 text-xs mb-1">Successful Merges</div>
                <div className="text-white text-xl sm:text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.successful_merges}
                </div>
                <div className="text-purple-400 text-xs mt-1">Convoys consolidated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area: two-column layout (map left, controls & convoys right) */}
        <div className="mb-6 sm:mb-8">
          <div className="flex flex-col lg:flex-row gap-6 sm:gap-8">

            {/* Left: Map (slightly smaller on desktop) */}
            <div className="lg:w-2/3 w-full bg-slate-900 rounded-lg border border-slate-800 shadow-xl overflow-hidden">
              {/* Map controls */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border-b border-slate-700 bg-slate-800/50">
                <h3 className="text-white font-semibold text-base sm:text-lg">Live Map</h3>
                <button
                  onClick={() => setShowRiskZones(!showRiskZones)}
                  className={`flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${showRiskZones
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                    }`}
                >
                  <AlertCircle className="w-4 h-4" />
                  <span className="hidden sm:inline">{showRiskZones ? `Hide Risk Zones (${riskZones.length})` : `Show Risk Zones (${riskZones.length})`}</span>
                  <span className="sm:hidden">{showRiskZones ? 'Hide Zones' : 'Show Zones'}</span>
                </button>
              </div>
              <div id="map" className="w-full h-[400px] sm:h-[500px] lg:h-[600px] bg-slate-900" />
            </div>

            {/* Right: Merge suggestion (top) and Active Convoys (middle) + summary (bottom) */}
            <div className="lg:w-1/3 w-full flex flex-col gap-6">
              {showMergePanel && (
                <div className="lg:sticky lg:top-20">
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

              <div className="bg-slate-800 rounded-lg border border-slate-700 overflow-hidden shadow-xl flex-1">
                <div className="px-4 sm:px-6 py-4 border-b border-slate-700 flex justify-between items-center bg-slate-800/80">
                  <h2 className="text-base sm:text-lg font-semibold text-white">Active Convoys</h2>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-400 text-xs sm:text-sm">{convoys.length} total</span>
                    <button
                      onClick={fetchConvoys}
                      className="text-slate-400 hover:text-white text-xs sm:text-sm transition-colors"
                      title="Refresh convoys"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="divide-y divide-slate-700 max-h-[600px] overflow-auto">
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
                    convoys.map((convoy, idx) => {
                      const isSelected = selectedConvoyIds.has(convoy.id);
                      const routeColor = routeColors[Array.from(selectedConvoyIds).indexOf(convoy.id) % routeColors.length];
                      const isLoadingRoute = loadingRoutes[convoy.id];
                      const convoyStatus = convoy.status || 'pending';

                      return (
                        <div
                          key={convoy.id}
                          className="p-4 sm:p-5 hover:bg-slate-700/50 transition-colors"
                        >
                          <div className="flex gap-3 items-start mb-3">
                            {/* Checkbox for route display */}
                            <div className="pt-1">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleConvoyCheckbox(convoy.id, e.target.checked);
                                }}
                                className="w-4 h-4 rounded border-slate-600 text-blue-600 focus:ring-blue-500 focus:ring-offset-slate-800 cursor-pointer"
                                style={{ accentColor: isSelected ? routeColor : undefined }}
                                title="Show route on map"
                                disabled={isLoadingRoute}
                              />
                            </div>

                            {/* Convoy info - clickable to view details */}
                            <div className="flex-1">
                              <div
                                onClick={() => navigate(`/route/${convoy.id}`)}
                                className="cursor-pointer mb-3"
                              >
                                <div className="flex justify-between items-start mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h3 className="text-white font-semibold text-sm sm:text-base">{convoy.convoy_name}</h3>
                                      {isLoadingRoute && (
                                        <span className="text-xs text-slate-400 italic">Loading...</span>
                                      )}
                                    </div>
                                    <div className="bg-slate-900/50 rounded px-3 py-2 mb-2 border border-slate-700">
                                      <div className="flex items-center gap-2 text-xs">
                                        <span className="text-green-400 font-medium truncate">{convoy.source?.place || 'Source'}</span>
                                        <span className="text-slate-600">→</span>
                                        <span className="text-red-400 font-medium truncate">{convoy.destination?.place || 'Destination'}</span>
                                      </div>
                                    </div>
                                    <div className="flex gap-3 text-xs sm:text-sm text-slate-400 mb-2">
                                      <span>🚚 {convoy.vehicle_count}</span>
                                      <span>📦 {convoy.total_load_kg} kg</span>
                                    </div>
                                    {/* Status Badge */}
                                    <div className="flex items-center gap-2">
                                      <div className={`px-2 py-1 rounded-full border text-xs font-medium flex items-center gap-1 ${getStatusColor(convoyStatus)}`}>
                                        {getStatusIcon(convoyStatus)}
                                        <span className="capitalize">{convoyStatus.replace('_', ' ')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`px-2 py-1 rounded-full border text-xs font-medium ${getPriorityColor(convoy.priority)}`}>
                                    {convoy.priority}
                                  </div>
                                </div>
                              </div>

                              {/* Status Change Buttons */}
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'pending');
                                  }}
                                  disabled={convoyStatus === 'pending'}
                                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${convoyStatus === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/30'
                                    }`}
                                  title="Mark as Pending"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Pending</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'en_route');
                                  }}
                                  disabled={convoyStatus === 'en_route'}
                                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${convoyStatus === 'en_route'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'
                                    }`}
                                  title="Mark as En Route"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span className="hidden sm:inline">Route</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'completed');
                                  }}
                                  disabled={convoyStatus === 'completed'}
                                  className={`px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${convoyStatus === 'completed'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                                    }`}
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="hidden sm:inline">Done</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Route Legend - only show when routes are selected */}
              {selectedConvoyIds.size > 0 && (
                <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-5 shadow-lg">
                  <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">Route Legend</h3>
                  <div className="space-y-2">
                    {Array.from(selectedConvoyIds).map((convoyId, index) => {
                      const convoy = convoys.find(c => c.id === convoyId);
                      const color = routeColors[index % routeColors.length];
                      return (
                        <div key={convoyId} className="flex items-center gap-2 sm:gap-3">
                          <div
                            className="w-8 sm:w-10 h-1 rounded-full flex-shrink-0"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-slate-300 text-xs sm:text-sm truncate flex-1">
                            {convoy?.convoy_name || `Convoy ${convoyId}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-5 shadow-lg">
                <h3 className="text-white font-semibold mb-3 text-sm sm:text-base">Convoy Summary</h3>
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs sm:text-sm">Total Vehicles: <span className="text-white font-medium">{totalVehicles}</span></p>
                  <p className="text-slate-400 text-xs sm:text-sm">Total Load: <span className="text-white font-medium">{totalLoad.toLocaleString()} kg</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
