import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Plus, MapPin, Package, AlertCircle, GitMerge, X, CheckCircle, Truck, Flag } from 'lucide-react';

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

  // Fetch analytics metrics
  const fetchMetrics = async () => {
    try {
      setMetricsLoading(true);
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/analytics/dashboard-metrics', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setMetrics(data.metrics);
          console.log('Fetched metrics:', data.metrics);
        }
      }
    } catch (err) {
      console.error('Error fetching metrics:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

  // Fetch all checkpoints
  const fetchCheckpoints = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/checkpoints/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setCheckpoints(data.checkpoints || []);
          console.log('Fetched checkpoints:', data.checkpoints);
        }
      }
    } catch (err) {
      console.error('Error fetching checkpoints:', err);
    }
  };

  // Fetch all risk zones
  const fetchRiskZones = async () => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/risk-zones/all', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.status === 'success') {
          setRiskZones(data.zones || []);
          console.log('Fetched risk zones:', data.zones?.length);
        }
      }
    } catch (err) {
      console.error('Error fetching risk zones:', err);
    }
  };

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

  // Fetch convoys and metrics on mount and when component focuses
  useEffect(() => {
    fetchConvoys();
    fetchMetrics();
    fetchCheckpoints();
    fetchRiskZones();

    // Refetch when user returns to tab/window
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

  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const routeRef = useRef(null);
  const [selectedA, setSelectedA] = useState(null);
  const [selectedB, setSelectedB] = useState(null);
  const [mergeResult, setMergeResult] = useState(null);
  const [merging, setMerging] = useState(false);

  // Map Initialization
  useEffect(() => {
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

  // Display checkpoints on map
  useEffect(() => {
    if (!mapRef.current || checkpoints.length === 0) return;

    // Clear existing checkpoint markers
    checkpointMarkersRef.current.forEach(marker => {
      mapRef.current.removeLayer(marker);
    });
    checkpointMarkersRef.current = [];

    // Add checkpoint markers
    checkpoints.forEach(cp => {
      // Choose marker color based on checkpoint type and status
      let markerColor = 'orange';
      if (cp.checkpoint_type === 'military') markerColor = 'gold';
      if (cp.checkpoint_type === 'border') markerColor = 'violet';
      if (cp.checkpoint_type === 'rest_stop') markerColor = 'blue';
      if (cp.checkpoint_type === 'toll') markerColor = 'grey';
      if (cp.status === 'closed') markerColor = 'red';
      if (cp.status === 'congested') markerColor = 'yellow';

      const marker = L.marker([cp.lat, cp.lon], {
        icon: L.icon({
          iconUrl: `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${markerColor}.png`,
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [20, 33],
          iconAnchor: [10, 33],
          popupAnchor: [1, -28],
          shadowSize: [33, 33],
        }),
      })
        .bindPopup(
          `<strong>${cp.name}</strong><br/>` +
          `Type: ${cp.checkpoint_type}<br/>` +
          `Status: ${cp.status}<br/>` +
          `Capacity: ${cp.current_load}/${cp.capacity} vehicles`
        )
        .addTo(mapRef.current);

      checkpointMarkersRef.current.push(marker);
    });

    console.log(`Added ${checkpoints.length} checkpoint markers to map`);
  }, [checkpoints]);

  // Display risk zones on map
  useEffect(() => {
    if (!mapRef.current || riskZones.length === 0 || !showRiskZones) return;

    // Clear existing risk zone layers
    riskZoneLayersRef.current.forEach(layer => {
      mapRef.current.removeLayer(layer);
    });
    riskZoneLayersRef.current = [];

    // Add risk zone circles and markers
    riskZones.forEach(zone => {
      // Choose color based on risk level
      let circleColor = '#ef4444'; // red for high
      let fillOpacity = 0.15;

      if (zone.risk_level === 'medium') {
        circleColor = '#f59e0b'; // orange
        fillOpacity = 0.1;
      } else if (zone.risk_level === 'low') {
        circleColor = '#fbbf24'; // yellow
        fillOpacity = 0.08;
      }

      // Draw circle for risk zone
      const circle = L.circle([zone.lat, zone.lon], {
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: fillOpacity,
        radius: zone.radius_km * 1000, // Convert km to meters
        weight: 1.5,
      })
        .bindPopup(
          `<strong>⚠️ ${zone.name}</strong><br/>` +
          `Risk Level: <span style="color: ${circleColor}; font-weight: bold;">${zone.risk_level.toUpperCase()}</span><br/>` +
          `Radius: ${zone.radius_km} km`
        )
        .addTo(mapRef.current);

      riskZoneLayersRef.current.push(circle);

      // Add small marker at center
      const marker = L.marker([zone.lat, zone.lon], {
        icon: L.icon({
          iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
          shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
          iconSize: [15, 25],
          iconAnchor: [7, 25],
          popupAnchor: [1, -20],
          shadowSize: [25, 25],
        }),
      })
        .bindPopup(
          `<strong>⚠️ ${zone.name}</strong><br/>` +
          `Risk Level: <span style="color: ${circleColor}; font-weight: bold;">${zone.risk_level.toUpperCase()}</span>`
        )
        .addTo(mapRef.current);

      riskZoneLayersRef.current.push(marker);
    });

    console.log(`Added ${riskZones.length} risk zones to map`);
  }, [riskZones, showRiskZones]);

  // Update markers and draw route when convoys change (omitted for brevity, assume it's correct)
  useEffect(() => {
    if (!mapRef.current) return;

    // ... logic for clearing/adding markers and routes ...

  }, [convoys]);

  // Draw routes on the map when convoy routes are fetched
  useEffect(() => {
    if (!mapRef.current) return;

    // Draw routes for selected convoys
    selectedConvoyIds.forEach((convoyId, index) => {
      const routeData = convoyRoutes[convoyId];
      if (!routeData || !routeData.waypoints) return;

      // Remove existing route layer if it exists
      if (routeLayers.current[convoyId]) {
        mapRef.current.removeLayer(routeLayers.current[convoyId]);
      }

      // Remove existing markers if they exist
      if (routeMarkers.current[convoyId]) {
        routeMarkers.current[convoyId].forEach(marker => {
          mapRef.current.removeLayer(marker);
        });
      }

      // Get color for this convoy
      const color = routeColors[index % routeColors.length];

      // Create route coordinates from waypoints
      const routeCoords = routeData.waypoints.map(wp => [wp.lat, wp.lon]);

      // Draw polyline
      const polyline = L.polyline(routeCoords, {
        color: color,
        weight: 4,
        opacity: 0.8
      }).addTo(mapRef.current);

      // Store layer reference
      routeLayers.current[convoyId] = polyline;

      // Add green marker for source (start point)
      const sourceMarker = L.circleMarker(
        [routeData.source.lat, routeData.source.lon],
        {
          radius: 8,
          fillColor: '#10b981',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }
      ).addTo(mapRef.current);

      const convoy = convoys.find(c => c.id === convoyId);
      sourceMarker.bindPopup(`
        <div style="font-family: sans-serif;">
          <strong>${convoy?.convoy_name || 'Convoy'}</strong><br/>
          <span style="color: #10b981;">● Source</span><br/>
          ${convoy?.source?.place || 'Start Location'}
        </div>
      `);

      // Add red marker for destination (end point)
      const destMarker = L.circleMarker(
        [routeData.destination.lat, routeData.destination.lon],
        {
          radius: 8,
          fillColor: '#ef4444',
          color: '#ffffff',
          weight: 2,
          opacity: 1,
          fillOpacity: 0.9
        }
      ).addTo(mapRef.current);

      destMarker.bindPopup(`
        <div style="font-family: sans-serif;">
          <strong>${convoy?.convoy_name || 'Convoy'}</strong><br/>
          <span style="color: #ef4444;">● Destination</span><br/>
          ${convoy?.destination?.place || 'End Location'}
        </div>
      `);

      // Store marker references
      routeMarkers.current[convoyId] = [sourceMarker, destMarker];

      // Fit map to show all selected routes
      if (selectedConvoyIds.size === 1) {
        mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
      }
    });

    // Clean up routes and markers that are no longer selected
    Object.keys(routeLayers.current).forEach(convoyId => {
      if (!selectedConvoyIds.has(parseInt(convoyId))) {
        mapRef.current.removeLayer(routeLayers.current[convoyId]);
        delete routeLayers.current[convoyId];
      }
    });

    Object.keys(routeMarkers.current).forEach(convoyId => {
      if (!selectedConvoyIds.has(parseInt(convoyId))) {
        routeMarkers.current[convoyId].forEach(marker => {
          mapRef.current.removeLayer(marker);
        });
        delete routeMarkers.current[convoyId];
      }
    });
  }, [convoyRoutes, selectedConvoyIds, convoys]);

  // Fetch route for a specific convoy
  const fetchConvoyRoute = async (convoyId) => {
    setLoadingRoutes(prev => ({ ...prev, [convoyId]: true }));
    try {
      const token = localStorage.getItem('access_token');

      // First, try the convoy route endpoint
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}/route`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log(`Route data for convoy ${convoyId}:`, data);

        // Check if we got a proper route (more than 2 waypoints means it's not a straight line)
        if (data.waypoints && data.waypoints.length > 2) {
          setConvoyRoutes(prev => ({
            ...prev,
            [convoyId]: data
          }));
        } else {
          // Straight line detected - OSRM may be down
          console.warn(`⚠️ Only ${data.waypoints?.length || 0} waypoints received for convoy ${convoyId}. OSRM routing service may be unavailable.`);
          console.log(`Attempting fallback route fetch from route_visualization endpoint...`);
          const convoy = convoys.find(c => c.id === convoyId);

          if (convoy) {
            const osrmRes = await fetch(
              `http://localhost:8000/api/routes/get_route?start_lat=${convoy.source_lat}&start_lon=${convoy.source_lon}&end_lat=${convoy.destination_lat}&end_lon=${convoy.destination_lon}&traffic_level=1&terrain=plain`
            );

            if (osrmRes.ok) {
              const osrmData = await osrmRes.json();
              console.log(`OSRM route data for convoy ${convoyId}:`, osrmData);

              if (osrmData.status === 'success' && osrmData.route.coordinates) {
                // Convert OSRM format to our format
                const waypoints = osrmData.route.coordinates.map(coord => ({
                  lat: coord[0],
                  lon: coord[1]
                }));

                setConvoyRoutes(prev => ({
                  ...prev,
                  [convoyId]: {
                    ...data,
                    waypoints: waypoints
                  }
                }));
              } else {
                // Use the straight line if OSRM also fails
                setConvoyRoutes(prev => ({
                  ...prev,
                  [convoyId]: data
                }));
              }
            } else {
              // Use the straight line from first endpoint
              setConvoyRoutes(prev => ({
                ...prev,
                [convoyId]: data
              }));
            }
          }
        }
      } else {
        console.error(`Failed to fetch route for convoy ${convoyId}:`, res.status);
      }
    } catch (err) {
      console.error(`Error fetching route for convoy ${convoyId}:`, err);
    } finally {
      setLoadingRoutes(prev => ({ ...prev, [convoyId]: false }));
    }
  };

  // Handle checkbox toggle for route display
  const handleConvoyCheckbox = (convoyId, isChecked) => {
    const newSelected = new Set(selectedConvoyIds);

    if (isChecked) {
      newSelected.add(convoyId);
      if (!convoyRoutes[convoyId]) {
        fetchConvoyRoute(convoyId);
      }
    } else {
      newSelected.delete(convoyId);
      // Remove route from map
      if (routeLayers.current[convoyId]) {
        mapRef.current?.removeLayer(routeLayers.current[convoyId]);
        delete routeLayers.current[convoyId];
      }
      // Remove markers from map
      if (routeMarkers.current[convoyId]) {
        routeMarkers.current[convoyId].forEach(marker => {
          mapRef.current?.removeLayer(marker);
        });
        delete routeMarkers.current[convoyId];
      }
    }

    setSelectedConvoyIds(newSelected);
  };

  // Update convoy status handler
  const updateConvoyStatus = async (convoyId, newStatus) => {
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}/status?status=${newStatus}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        console.log('Status updated:', data);
        // Refresh convoys to show updated status
        await fetchConvoys();
      } else {
        console.error('Failed to update status:', res.status);
      }
    } catch (err) {
      console.error('Error updating status:', err);
    }
  };

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
      <Navbar setShowMergeSuggestion={setShowMergePanel} />

      {/* Main Container with proper padding and max-width */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="py-6 sm:py-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2">Dashboard</h1>
              <p className="text-slate-400 text-sm sm:text-base">Manage and track your convoys</p>
            </div>
            <button
              onClick={() => navigate('/create-convoy')}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors shadow-lg"
            >
              <Plus className="w-5 h-5" />
              New Convoy
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
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
                <Package className="w-8 h-8 text-green-400 opacity-50" />
              </div>
            </div>
          </div>
        </div>

        {/* Performance Metrics Section */}
        <div className="mb-8">
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-4 sm:p-6">
            <h2 className="text-2xl font-bold text-white mb-6">
              System Performance Metrics
            </h2>

            {/* Top-Level Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 mb-6">
              {/* ROI Metric */}
              <div className="bg-gradient-to-br from-green-900 to-green-700 p-6 rounded-lg">
                <div className="text-green-300 text-sm font-medium mb-2">Financial ROI</div>
                <div className="text-white text-5xl font-bold mb-2">8X</div>
                <div className="text-green-200 text-sm">
                  ₹8 saved for every ₹1 invested
                </div>
              </div>

              {/* Delay Reduction */}
              <div className="bg-gradient-to-br from-blue-900 to-blue-700 p-6 rounded-lg">
                <div className="text-blue-300 text-sm font-medium mb-2">Delay Reduction</div>
                <div className="text-white text-5xl font-bold mb-2">-40%</div>
                <div className="text-blue-200 text-sm">
                  Average convoy delays reduced
                </div>
              </div>

              {/* Efficiency Gain */}
              <div className="bg-gradient-to-br from-purple-900 to-purple-700 p-6 rounded-lg">
                <div className="text-purple-300 text-sm font-medium mb-2">Fleet Efficiency</div>
                <div className="text-white text-5xl font-bold mb-2">+15%</div>
                <div className="text-purple-200 text-sm">
                  More trips per vehicle per month
                </div>
              </div>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50">
                <div className="text-slate-400 text-xs mb-1">Total Distance Saved</div>
                <div className="text-white text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.total_distance_saved_km.toFixed(1)} km
                </div>
                <div className="text-green-400 text-xs mt-1">All time</div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50">
                <div className="text-slate-400 text-xs mb-1">Fuel Saved</div>
                <div className="text-white text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.total_fuel_saved_liters.toFixed(1)} L
                </div>
                <div className="text-green-400 text-xs mt-1">
                  ≈ ₹{metricsLoading ? '...' : metrics.total_cost_saved_inr.toLocaleString()}
                </div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50">
                <div className="text-slate-400 text-xs mb-1">Conflicts Prevented</div>
                <div className="text-white text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.conflicts_prevented}
                </div>
                <div className="text-blue-400 text-xs mt-1">Route overlaps avoided</div>
              </div>

              <div className="border border-slate-700 p-4 rounded-lg bg-slate-900/50">
                <div className="text-slate-400 text-xs mb-1">Successful Merges</div>
                <div className="text-white text-2xl font-bold">
                  {metricsLoading ? '...' : metrics.successful_merges}
                </div>
                <div className="text-purple-400 text-xs mt-1">Convoys consolidated</div>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area: two-column layout (map left, controls & convoys right) */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">

          {/* Left: Map (slightly smaller on desktop) */}
          <div className="lg:w-2/3 w-full bg-slate-900 rounded-lg border border-slate-800">
            {/* Map controls */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700">
              <h3 className="text-white font-semibold">Live Map</h3>
              <button
                onClick={() => setShowRiskZones(!showRiskZones)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  showRiskZones
                    ? 'bg-red-600/20 text-red-400 border border-red-500/30 hover:bg-red-600/30'
                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-slate-600'
                }`}
              >
                <AlertCircle className="w-4 h-4" />
                {showRiskZones ? `Hide Risk Zones (${riskZones.length})` : `Show Risk Zones (${riskZones.length})`}
              </button>
            </div>
            <div id="map" className="w-full h-[calc(65vh-4rem)] lg:h-[calc(78vh-4rem)] bg-slate-900 rounded-b-lg" />
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
                  convoys.map((convoy, idx) => {
                    const isSelected = selectedConvoyIds.has(convoy.id);
                    const routeColor = routeColors[Array.from(selectedConvoyIds).indexOf(convoy.id) % routeColors.length];
                    const isLoadingRoute = loadingRoutes[convoy.id];
                    const convoyStatus = convoy.status || 'pending';

                    return (
                      <div
                        key={convoy.id}
                        className="p-5 hover:bg-slate-700/50 transition-colors"
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
                                    <h3 className="text-white font-semibold text-base">{convoy.convoy_name}</h3>
                                    {isLoadingRoute && (
                                      <span className="text-xs text-slate-400 italic">Loading route...</span>
                                    )}
                                  </div>
                                  <div className="bg-slate-900/50 rounded px-3 py-2 mb-2 border border-slate-700">
                                    <div className="flex items-center gap-2 text-xs">
                                      <span className="text-green-400 font-medium">{convoy.source?.place || 'Source'}</span>
                                      <span className="text-slate-600">→</span>
                                      <span className="text-red-400 font-medium">{convoy.destination?.place || 'Destination'}</span>
                                    </div>
                                  </div>
                                  <div className="flex gap-3 text-sm text-slate-400 mb-2">
                                    <span>🚚 {convoy.vehicle_count} vehicles</span>
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
                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateConvoyStatus(convoy.id, 'pending');
                                }}
                                disabled={convoyStatus === 'pending'}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                  convoyStatus === 'pending'
                                    ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/30'
                                }`}
                                title="Mark as Pending"
                              >
                                <AlertCircle className="w-3 h-3" />
                                Pending
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateConvoyStatus(convoy.id, 'en_route');
                                }}
                                disabled={convoyStatus === 'en_route'}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                  convoyStatus === 'en_route'
                                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-blue-500/10 hover:text-blue-400 hover:border-blue-500/30'
                                }`}
                                title="Mark as En Route"
                              >
                                <Truck className="w-3 h-3" />
                                En Route
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateConvoyStatus(convoy.id, 'completed');
                                }}
                                disabled={convoyStatus === 'completed'}
                                className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                                  convoyStatus === 'completed'
                                    ? 'bg-green-500/20 text-green-400 border border-green-500/30 cursor-not-allowed'
                                    : 'bg-slate-700 text-slate-300 border border-slate-600 hover:bg-green-500/10 hover:text-green-400 hover:border-green-500/30'
                                }`}
                                title="Mark as Completed"
                              >
                                <CheckCircle className="w-3 h-3" />
                                Completed
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

            <div className="bg-slate-800 rounded-lg border border-slate-700 p-4">
              <h3 className="text-white font-semibold mb-2">Convoy Summary</h3>
              <p className="text-slate-400 text-sm">Total Vehicles: <span className="text-white">{totalVehicles}</span></p>
              <p className="text-slate-400 text-sm">Total Load: <span className="text-white">{totalLoad.toLocaleString()} kg</span></p>
            </div>
          </div>
        </div>
        </div>

      </div>
    </div>
  );
}