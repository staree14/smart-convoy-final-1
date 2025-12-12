import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import RouteMap from '../components/RouteMap';
import { ArrowLeft, MapPin, Truck, Package, AlertCircle } from 'lucide-react';
import '../styles/viewRoute.css';

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
                safe_route: routeData.safe_route || [],
                departure_time: 'Now',
                estimated_arrival: 'TBD'
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
      <div className="loading-container">
        <Navbar />
        <main className="loading-main">
          <p className="loading-text">Loading...</p>
        </main>
      </div>
    );
  }

  if (error || !convoy) {
    return (
      <div className="loading-container">
        <Navbar />
        <main className="loading-main">
          <div className="error-box">
            <AlertCircle className="error-icon" />
            <div>
              <p className="error-title">{error}</p>
              <button onClick={() => navigate('/history')} className="error-back-btn">
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
      critical: 'priority-critical', // Defined in css if needed or use previous strategy
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    // Re-using classes defined elsewhere or here if specific
    // For viewRoute, let's inject these helper classes into viewRoute.css or assume global utility if we had one.
    // Given previous pattern, I'll return Tailwind-like strings mapped to CSS classes in the file
    // Actually, let's stick to the extracted CSS classes approach.
    // I need to add these specific utility classes to viewRoute.css or map them here.
    // Let's assume standard names based on the color scheme

    // Mapping to what I wrote in CSS:
    const map = {
      critical: 'bg-red-500/10 text-red-400 border-red-500/20', // These are tailwind still? No, I should use classes.
      // I'll use the style attribute or specific classes. 
      // Let's update the getPriorityColor to return the class name I defined or appropriate style.
      // In viewRoute.css I didn't explicitly define priority-high etc. 
      // I'll inline the style or use the generic classes I created.
      // Wait, I see "priority-badge-lg" in css but not the color variants.
      // I'll update the CSS file to include these or use inline styles for dynamic colors if easier, 
      // but the goal is to remove tailwind.
      // I will use specific classes and ensure they are in the CSS.
    };
    // Actually, I can just return the class names like 'priority-critical', 'priority-high' and add them to CSS.
    return `priority-${priority}`;
  };

  return (
    <div className="view-route-container">
      <Navbar />
      <main className="view-route-main">
        <button onClick={() => navigate('/history')} className="back-nav-btn">
          <ArrowLeft className="back-icon" />
          Back to History
        </button>

        {/* Convoy Header */}
        <div className="convoy-header-card">
          <div className="convoy-header-top">
            <div>
              <h1 className="convoy-title">{convoy.convoy_name}</h1>
              <p className="convoy-id">Convoy ID: {convoy.id}</p>
            </div>
            <div className={`priority-badge-lg ${getPriorityColor(convoy.priority)}`}>
              {convoy.priority.toUpperCase()}
            </div>
          </div>

          <div className="convoy-stats-grid">
            <div className="convoy-stat-item">
              <div className="stat-icon-box icon-box-blue">
                <Truck className="stat-icon-lg" />
              </div>
              <div>
                <p className="stat-label-lg">Vehicles</p>
                <p className="stat-value-lg">{convoy.vehicle_count}</p>
              </div>
            </div>
            <div className="convoy-stat-item">
              <div className="stat-icon-box icon-box-green">
                <Package className="stat-icon-lg" />
              </div>
              <div>
                <p className="stat-label-lg">Total Load</p>
                <p className="stat-value-lg">{convoy.total_load_kg} kg</p>
              </div>
            </div>
            <div className="convoy-stat-item">
              <div className="stat-icon-box icon-box-orange">
                <MapPin className="stat-icon-lg" />
              </div>
              <div>
                <p className="stat-label-lg">Distance</p>
                <p className="stat-value-lg">{route ? route.distance_km.toFixed(1) : '...'} km</p>
              </div>
            </div>
          </div>
        </div>

        {/* Map Section */}
        {route && route.coordinates && route.coordinates.length > 0 && (
          <div className="map-section">
            <h2 className="map-section-title">
              Route Map
              {dangerPoints.length > 0 && (
                <span className="risk-count-badge">
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

        {/* Route Optimization Summary */}
        {route && (
          <div className="optimization-card">
            <h3 className="optimization-title">
              <svg className="optimization-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Route Optimization Summary
            </h3>

            <div className="optimization-grid">
              {/* Direct Route */}
              <div className="route-comparison-card comparison-card-direct">
                <div className="comparison-title comparison-title-direct">Direct Route (Baseline)</div>
                <div className="comparison-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Distance:</span>
                    <span className="metric-value-direct">{(() => {
                      const R = 6371;
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = (R * c * 1.3).toFixed(1);
                      return directDistance;
                    })()} km</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Est. Time:</span>
                    <span className="metric-value-direct">{(() => {
                      const R = 6371;
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = R * c * 1.3;
                      const directTime = (directDistance / 50 * 60).toFixed(0);
                      return directTime;
                    })()} min</span>
                  </div>
                  <div className="metric-row">
                    <span className="metric-label">Est. Fuel:</span>
                    <span className="metric-value-direct">~{(() => {
                      const R = 6371;
                      const dLat = (convoy.destination_lat - convoy.source_lat) * Math.PI / 180;
                      const dLon = (convoy.destination_lon - convoy.source_lon) * Math.PI / 180;
                      const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                        Math.cos(convoy.source_lat * Math.PI / 180) * Math.cos(convoy.destination_lat * Math.PI / 180) *
                        Math.sin(dLon / 2) * Math.sin(dLon / 2);
                      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                      const directDistance = R * c * 1.3;
                      const directFuel = (directDistance * 0.35).toFixed(1);
                      return directFuel;
                    })()} L</span>
                  </div>
                </div>
              </div>

              {/* Optimized Route */}
              <div className="route-comparison-card comparison-card-optimized">
                <div className="comparison-title comparison-title-optimized">
                  <svg className="comparison-icon" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Optimized Route (AI-Powered)
                </div>
                <div className="comparison-metrics">
                  <div className="metric-row">
                    <span className="metric-label">Distance:</span>
                    <span className="metric-value-optimized">{route.distance_km.toFixed(1)} km
                      <span className="metric-saved">
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
                  <div className="metric-row">
                    <span className="metric-label">Est. Time:</span>
                    <span className="metric-value-optimized">{route.duration_minutes.toFixed(0)} min
                      <span className="metric-saved">
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
                  <div className="metric-row">
                    <span className="metric-label">Est. Fuel:</span>
                    <span className="metric-value-optimized">~{(route.distance_km * 0.35).toFixed(1)} L
                      <span className="metric-saved">
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
                          const savedMoney = savedFuel * 150;
                          return savedFuel > 0 ? `-${savedFuel.toFixed(1)}L = ₹${savedMoney.toFixed(0)} ✓` : '+0L';
                        })()})
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Overall Savings */}
            <div className="savings-banner">
              <div className="savings-content">
                <span className="savings-label">
                  ✓ Optimization Benefits:
                </span>
                <span className="savings-value">
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

        {/* Route Details & Coordinates */}
        {route && (
          <div className="details-coords-grid">
            <div className="info-card">
              <h2 className="info-card-title">Route Details</h2>
              <div className="info-list">
                <div className="info-row">
                  <span className="metric-label">Distance:</span>
                  <span className="metric-value-optimized" style={{ color: 'white' }}>{route.distance_km.toFixed(1)} km</span>
                </div>
                <div className="info-row">
                  <span className="metric-label">Duration:</span>
                  <span className="metric-value-optimized" style={{ color: 'white' }}>{route.duration_minutes.toFixed(0)} min</span>
                </div>
                <div className="info-row">
                  <span className="metric-label">Departure:</span>
                  <span className="metric-value-optimized" style={{ color: 'white' }}>{route.departure_time}</span>
                </div>
                <div className="info-row">
                  <span className="metric-label">Arrival:</span>
                  <span className="metric-value-optimized" style={{ color: 'white' }}>{route.estimated_arrival}</span>
                </div>
              </div>
            </div>

            <div className="info-card">
              <h2 className="info-card-title">Coordinates</h2>
              <div className="info-list">
                <div className="coord-item">
                  <p className="coord-label">Source</p>
                  <p className="coord-value">{convoy.source_lat?.toFixed(4)}, {convoy.source_lon?.toFixed(4)}</p>
                </div>
                <div>
                  <p className="coord-label">Destination</p>
                  <p className="coord-value">{convoy.destination_lat?.toFixed(4)}, {convoy.destination_lon?.toFixed(4)}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Zones Detected */}
        {dangerPoints.length > 0 && (
          <div className="risk-zones-card">
            <div className="risk-zones-header">
              <h2 className="risk-zones-title">
                <AlertCircle className="w-5 h-5 text-red-400" />
                Risk Zones Detected ({dangerPoints.length})
              </h2>
              <p className="risk-zones-subtitle">
                The route passes through or near the following risk zones. Exercise caution.
              </p>
            </div>

            <div className="risk-list-container">
              {dangerPoints.map((danger, idx) => {
                const getRiskColor = (level) => {
                  if (level === 'high') return 'priority-critical';
                  if (level === 'medium') return 'priority-high';
                  return 'priority-medium';
                };

                return (
                  <div key={danger.id || idx} className="risk-item">
                    <div className="risk-item-header">
                      <div>
                        <h3 className="risk-name">⚠️ {danger.name}</h3>
                        <p className="stat-label-lg">Zone ID: {danger.id}</p>
                      </div>
                      <span className={`priority-badge-sm ${getRiskColor(danger.risk_level)}`}>
                        {danger.risk_level.toUpperCase()} RISK
                      </span>
                    </div>

                    <div className="risk-stats-grid">
                      <div>
                        <p className="stat-label-lg mb-1">Distance from Route</p>
                        <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{danger.distance_km} km</p>
                      </div>
                      <div>
                        <p className="stat-label-lg mb-1">Zone Radius</p>
                        <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{danger.radius_km} km</p>
                      </div>
                      <div>
                        <p className="stat-label-lg mb-1">Coordinates</p>
                        <p className="coord-value">{danger.lat.toFixed(4)}, {danger.lon.toFixed(4)}</p>
                      </div>
                    </div>

                    {danger.risk_level === 'high' && (
                      <div className="risk-alert-box">
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
        <div className="vehicles-card">
          <div className="vehicles-header">
            <h2 className="vehicles-title">Vehicles ({convoy.vehicles.length})</h2>
          </div>
          <div className="vehicle-list-container">
            {convoy.vehicles.map((vehicle, idx) => (
              <div key={idx} className="vehicle-item">
                <div className="vehicle-item-header">
                  <div>
                    <h3 className="vehicle-reg">{vehicle.registration}</h3>
                    <p className="stat-label-lg">Type: {vehicle.type}</p>
                  </div>
                  <span className="vehicle-status-badge">
                    {vehicle.status}
                  </span>
                </div>
                <div className="vehicle-stats-grid">
                  <div>
                    <p className="stat-label-lg mb-1">Driver</p>
                    <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{vehicle.driver || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="stat-label-lg mb-1">Load Type</p>
                    <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{vehicle.load_type}</p>
                  </div>
                  <div>
                    <p className="stat-label-lg mb-1">Load Weight</p>
                    <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{vehicle.load_kg} kg</p>
                  </div>
                  <div>
                    <p className="stat-label-lg mb-1">Capacity</p>
                    <p className="stat-value-lg" style={{ fontSize: '1rem' }}>{vehicle.capacity_kg} kg</p>
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
