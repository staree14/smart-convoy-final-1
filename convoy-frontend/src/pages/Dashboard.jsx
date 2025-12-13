import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Package, AlertCircle, GitMerge, X, CheckCircle, Truck, Flag } from 'lucide-react';
import '../styles/dashboard.css';
import ChatAssistant from '../components/ChatAssistant';

// --- Merge Suggestion Panel Component (Overlay) ---
const MergeSuggestionBox = ({ convoys, selectedA, setSelectedA, selectedB, setSelectedB, suggestMerge, merging, mergeResult, onClose }) => (
  <div className="merge-suggestion-container">
    <div className='merge-header'>
      <h3 className="merge-title">
        <GitMerge className="w-5 h-5 text-blue-400" /> Merge Suggestion
      </h3>
      <button
        onClick={onClose}
        className="close-panel-btn"
        title="Close Panel"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    <p className="merge-desc">Choose two convoys to evaluate merging.</p>

    <div className="space-y-3">
      <div className="merge-form-group">
        <label className="merge-label">Convoy A</label>
        <select
          value={selectedA || ''}
          onChange={(e) => setSelectedA(parseInt(e.target.value) || null)}
          className="merge-select"
        >
          <option value="">Select convoy A</option>
          {convoys.map((c) => (
            <option key={`a-${c.id}`} value={c.id}>{c.convoy_name} ({c.id})</option>
          ))}
        </select>
      </div>

      <div className="merge-form-group">
        <label className="merge-label">Convoy B</label>
        <select
          value={selectedB || ''}
          onChange={(e) => setSelectedB(parseInt(e.target.value) || null)}
          className="merge-select"
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
        className="suggest-btn"
      >
        {merging ? 'Checking...' : 'Suggest Merge'}
      </button>
    </div>

    {mergeResult && (
      <div className="merge-result">
        <p className={`font-semibold ${mergeResult.can_merge ? 'merge-result-success' : 'merge-result-fail'}`}>{mergeResult.reason}</p>
        {mergeResult.can_merge && (
          <div className="merge-details">
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
      critical: 'priority-critical',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return colors[priority] || 'priority-medium';
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'status-pending-badge',
      en_route: 'status-route-badge',
      completed: 'status-done-badge',
      cancelled: 'status-cancelled-badge',
    };
    return colors[status] || 'status-pending-badge';
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
    <div className="dashboard-container">
      <Navbar setShowMergeSuggestion={setShowMergePanel} />
      {/* Main Container with proper padding and max-width */}
      <div className="dashboard-main">

        {/* Header Section */}
        <div className="dashboard-header">
          <div className="header-content">
            <div>
              <h1 className="dashboard-title">Dashboard</h1>
              <p className="dashboard-subtitle">Manage and track your convoys in real-time</p>
            </div>
            <button
              onClick={() => navigate('/create-convoy')}
              className="new-convoy-btn"
            >
              <Plus className="w-5 h-5" />
              <span className="btn-text-desktop">New Convoy</span>
              <span className="btn-text-mobile">New</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Active Convoys</p>
                <p className="stat-value">{convoys.length}</p>
              </div>
              <MapPin className="stat-icon stat-icon-blue" />
            </div>
          </div>

          <div className="stat-card">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Total Vehicles</p>
                <p className="stat-value">{totalVehicles}</p>
              </div>
              <AlertCircle className="stat-icon stat-icon-orange" />
            </div>
          </div>

          <div className="stat-card stat-card-wide">
            <div className="stat-card-content">
              <div>
                <p className="stat-label">Total Load</p>
                <p className="stat-value">{totalLoad.toLocaleString()} kg</p>
              </div>
              <Package className="stat-icon stat-icon-green" />
            </div>
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="metrics-section">
          <div className="metrics-container">
            <h2 className="metrics-title">
              System Performance Metrics
            </h2>

            {/* Top-Level Metrics */}
            <div className="top-metrics-grid">
              {/* ROI Metric */}
              <div className="metric-card-highlight metric-roi">
                <div className="metric-highlight-label label-roi">Financial ROI</div>
                <div className="metric-highlight-value">8X</div>
                <div className="metric-highlight-subtext subtext-roi">
                  ₹8 saved for every ₹1 invested
                </div>
              </div>

              {/* Delay Reduction */}
              <div className="metric-card-highlight metric-delay">
                <div className="metric-highlight-label label-delay">Delay Reduction</div>
                <div className="metric-highlight-value">-40%</div>
                <div className="metric-highlight-subtext subtext-delay">
                  Average convoy delays reduced
                </div>
              </div>

              {/* Efficiency Gain */}
              <div className="metric-card-highlight metric-efficiency metric-card-wide">
                <div className="metric-highlight-label label-efficiency">Fleet Efficiency</div>
                <div className="metric-highlight-value">+15%</div>
                <div className="metric-highlight-subtext subtext-efficiency">
                  More trips per vehicle per month
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="detailed-stats-grid">
              <div className="detailed-stat-item">
                <div className="detailed-stat-label">Total Distance Saved</div>
                <div className="detailed-stat-value">
                  {metricsLoading ? '...' : metrics.total_distance_saved_km.toFixed(1)} km
                </div>
                <div className="detailed-stat-sub sub-green">All time</div>
              </div>

              <div className="detailed-stat-item">
                <div className="detailed-stat-label">Fuel Saved</div>
                <div className="detailed-stat-value">
                  {metricsLoading ? '...' : metrics.total_fuel_saved_liters.toFixed(1)} L
                </div>
                <div className="detailed-stat-sub sub-green">
                  ≈ ₹{metricsLoading ? '...' : metrics.total_cost_saved_inr.toLocaleString()}
                </div>
              </div>

              <div className="detailed-stat-item">
                <div className="detailed-stat-label">Conflicts Prevented</div>
                <div className="detailed-stat-value">
                  {metricsLoading ? '...' : metrics.conflicts_prevented}
                </div>
                <div className="detailed-stat-sub sub-blue">Route overlaps avoided</div>
              </div>

              <div className="detailed-stat-item">
                <div className="detailed-stat-label">Successful Merges</div>
                <div className="detailed-stat-value">
                  {metricsLoading ? '...' : metrics.successful_merges}
                </div>
                <div className="detailed-stat-sub sub-purple">Convoys consolidated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area: two-column layout (map left, controls & convoys right) */}
        <div className="main-content-area">
          <div className="content-flex-container">

            {/* Left: Map (slightly smaller on desktop) */}
            <div className="left-panel-map">
              <div className="map-card">
                {/* Map controls */}
                <div className="map-header">
                  <h3 className="map-title">Live Map</h3>
                  <button
                    onClick={() => setShowRiskZones(!showRiskZones)}
                    className={`toggle-risk-btn ${showRiskZones ? 'toggle-risk-active' : 'toggle-risk-inactive'}`}
                  >
                    <AlertCircle className="w-4 h-4" />
                    <span className="btn-text-desktop">{showRiskZones ? `Hide Risk Zones (${riskZones.length})` : `Show Risk Zones (${riskZones.length})`}</span>
                    <span className="btn-text-mobile">{showRiskZones ? 'Hide Zones' : 'Show Zones'}</span>
                  </button>
                </div>
                <div id="map" className="map-display" />
              </div>
            </div>

            {/* Right: Merge suggestion (top) and Active Convoys (middle) + summary (bottom) */}
            <div className="right-panel-controls">
              {showMergePanel && (
                <div className="merge-box-sticky">
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

              <div className="active-convoys-card">
                <div className="active-convoys-header">
                  <h2 className="active-convoys-title">Active Convoys</h2>
                  <div className="refresh-group">
                    <span className="convoy-count">{convoys.length} total</span>
                    <button
                      onClick={fetchConvoys}
                      className="refresh-btn"
                      title="Refresh convoys"
                    >
                      Refresh
                    </button>
                  </div>
                </div>

                <div className="convoys-list">
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
                          className="convoy-list-item"
                        >
                          <div className="convoy-item-inner">
                            {/* Checkbox for route display */}
                            <div className="route-checkbox-container">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={(e) => {
                                  e.stopPropagation();
                                  handleConvoyCheckbox(convoy.id, e.target.checked);
                                }}
                                className="route-checkbox"
                                style={{ accentColor: isSelected ? routeColor : undefined }}
                                title="Show route on map"
                                disabled={isLoadingRoute}
                              />
                            </div>

                            {/* Convoy info - clickable to view details */}
                            <div className="convoy-info-block">
                              <div
                                onClick={() => navigate(`/route/${convoy.id}`)}
                                className="cursor-pointer mb-3"
                              >
                                <div className="convoy-header-row">
                                  <div className="convoy-name-group">
                                    <div className="convoy-name-row">
                                      <h3 className="convoy-name-text">{convoy.convoy_name}</h3>
                                      {isLoadingRoute && (
                                        <span className="loading-text">Loading...</span>
                                      )}
                                    </div>
                                    <div className="route-box">
                                      <div className="route-text">
                                        <span className="place-source-sm">{convoy.source?.place || 'Source'}</span>
                                        <span className="text-slate-600">→</span>
                                        <span className="place-dest-sm">{convoy.destination?.place || 'Destination'}</span>
                                      </div>
                                    </div>
                                    <div className="convoy-metrics-row">
                                      <span>🚚 {convoy.vehicle_count}</span>
                                      <span>📦 {convoy.total_load_kg} kg</span>
                                    </div>
                                    {/* Status Badge */}
                                    <div className="status-badge-row">
                                      <div className={`current-status-badge ${getStatusColor(convoyStatus)}`}>
                                        {getStatusIcon(convoyStatus)}
                                        <span className="capitalize">{convoyStatus.replace('_', ' ')}</span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`priority-badge-sm ${getPriorityColor(convoy.priority)}`}>
                                    {convoy.priority}
                                  </div>
                                </div>
                              </div>

                              {/* Status Change Buttons */}
                              <div className="status-actions-grid">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'pending');
                                  }}
                                  disabled={convoyStatus === 'pending'}
                                  className={`status-action-btn ${convoyStatus === 'pending'
                                    ? 'status-btn-pending-active'
                                    : 'status-btn-pending-inactive'
                                    }`}
                                  title="Mark as Pending"
                                >
                                  <AlertCircle className="w-3 h-3" />
                                  <span className="btn-text-desktop">Pending</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'en_route');
                                  }}
                                  disabled={convoyStatus === 'en_route'}
                                  className={`status-action-btn ${convoyStatus === 'en_route'
                                    ? 'status-btn-route-active'
                                    : 'status-btn-route-inactive'
                                    }`}
                                  title="Mark as En Route"
                                >
                                  <Truck className="w-3 h-3" />
                                  <span className="btn-text-desktop">Route</span>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    updateConvoyStatus(convoy.id, 'completed');
                                  }}
                                  disabled={convoyStatus === 'completed'}
                                  className={`status-action-btn ${convoyStatus === 'completed'
                                    ? 'status-btn-done-active'
                                    : 'status-btn-done-inactive'
                                    }`}
                                  title="Mark as Completed"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  <span className="btn-text-desktop">Done</span>
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
                <div className="legend-box">
                  <h3 className="legend-title">Route Legend</h3>
                  <div className="space-y-2">
                    {Array.from(selectedConvoyIds).map((convoyId, index) => {
                      const convoy = convoys.find(c => c.id === convoyId);
                      const color = routeColors[index % routeColors.length];
                      return (
                        <div key={convoyId} className="legend-item">
                          <div
                            className="legend-color-bar"
                            style={{ backgroundColor: color }}
                          />
                          <span className="legend-text">
                            {convoy?.convoy_name || `Convoy ${convoyId}`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="summary-box">
                <h3 className="summary-title">Convoy Summary</h3>
                <div className="space-y-2">
                  <p className="text-slate-400 text-xs sm:text-sm">Total Vehicles: <span className="text-white font-medium">{totalVehicles}</span></p>
                  <p className="text-slate-400 text-xs sm:text-sm">Total Load: <span className="text-white font-medium">{totalLoad.toLocaleString()} kg</span></p>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
      <ChatAssistant />
    </div>
  );
}
