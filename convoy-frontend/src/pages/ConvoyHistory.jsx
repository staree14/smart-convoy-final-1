import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Filter, Plus, Trash2, ChevronDown, ChevronUp, Truck, User, Package } from 'lucide-react';
import '../styles/convoyHistory.css';
import '../styles/createConvoy.css'; // Reusing some form styles for the modal

const VEHICLE_TYPES = ['truck', 'van', 'jeep', 'ambulance', 'tanker'];
const LOAD_TYPES = ['medical', 'supplies', 'ammunition', 'fuel', 'personnel'];

export default function ConvoyHistory() {
  const navigate = useNavigate();
  const [convoys, setConvoys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showAddVehicleModal, setShowAddVehicleModal] = useState(false);
  const [selectedConvoy, setSelectedConvoy] = useState(null);
  const [vehicleForm, setVehicleForm] = useState({
    vehicleType: 'truck',
    registrationNumber: '',
    driverName: '',
    loadType: 'medical',
    loadWeight: '',
    capacity: ''
  });
  const [addingVehicle, setAddingVehicle] = useState(false);
  const [vehicleError, setVehicleError] = useState('');
  const [vehicleSuccess, setVehicleSuccess] = useState('');
  const [deleteConfirmModal, setDeleteConfirmModal] = useState(false);
  const [convoyToDelete, setConvoyToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [expandedConvoys, setExpandedConvoys] = useState(new Set());
  const [convoyVehicles, setConvoyVehicles] = useState({});
  const [loadingVehicles, setLoadingVehicles] = useState({});

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
      }
    } catch (err) {
      console.error('Error fetching convoys:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchConvoyVehicles = async (convoyId) => {
    if (convoyVehicles[convoyId]) {
      return; // Already fetched
    }

    setLoadingVehicles(prev => ({ ...prev, [convoyId]: true }));
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        setConvoyVehicles(prev => ({
          ...prev,
          [convoyId]: data.convoy?.vehicles || []
        }));
      }
    } catch (err) {
      console.error('Error fetching vehicles:', err);
    } finally {
      setLoadingVehicles(prev => ({ ...prev, [convoyId]: false }));
    }
  };

  const toggleConvoyExpand = (convoyId) => {
    const newExpanded = new Set(expandedConvoys);
    if (newExpanded.has(convoyId)) {
      newExpanded.delete(convoyId);
    } else {
      newExpanded.add(convoyId);
      fetchConvoyVehicles(convoyId);
    }
    setExpandedConvoys(newExpanded);
  };

  const getVehicleStatusColor = (status) => {
    const colors = {
      idle: 'status-idle',
      en_route: 'status-en_route',
      at_checkpoint: 'status-at_checkpoint',
      completed: 'status-completed',
      breakdown: 'status-breakdown',
    };
    return colors[status] || 'status-idle';
  };

  useEffect(() => {
    fetchConvoys();
  }, []);

  const priorities = ['all', 'critical', 'high', 'medium', 'low'];

  const filtered = filter === 'all'
    ? convoys
    : convoys.filter(c => c.priority === filter);

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'priority-critical',
      high: 'priority-high',
      medium: 'priority-medium',
      low: 'priority-low',
    };
    return colors[priority] || 'priority-medium';
  };

  const openAddVehicleModal = (convoy, e) => {
    e.stopPropagation();
    setSelectedConvoy(convoy);
    setShowAddVehicleModal(true);
    setVehicleError('');
    setVehicleSuccess('');
    setVehicleForm({
      vehicleType: 'truck',
      registrationNumber: '',
      driverName: '',
      loadType: 'medical',
      loadWeight: '',
      capacity: ''
    });
  };

  const handleAddVehicle = async (e) => {
    e.preventDefault();
    setVehicleError('');
    setVehicleSuccess('');

    if (!vehicleForm.registrationNumber || !vehicleForm.driverName || !vehicleForm.loadWeight || !vehicleForm.capacity) {
      setVehicleError('Please fill in all vehicle details');
      return;
    }

    setAddingVehicle(true);

    try {
      const token = localStorage.getItem('access_token');
      const payload = {
        vehicle_type: vehicleForm.vehicleType.toLowerCase(),
        registration_number: vehicleForm.registrationNumber,
        load_type: vehicleForm.loadType.toLowerCase(),
        load_weight_kg: parseFloat(vehicleForm.loadWeight),
        capacity_kg: parseFloat(vehicleForm.capacity),
        driver_name: vehicleForm.driverName,
        current_status: 'pending'
      };

      const res = await fetch(`http://localhost:8000/api/convoys/add-vehicle/${selectedConvoy.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${res.status}`);
      }

      const data = await res.json();
      setVehicleSuccess(`Vehicle ${vehicleForm.registrationNumber} added successfully!`);

      setTimeout(() => {
        setShowAddVehicleModal(false);
        fetchConvoys();
      }, 1500);
    } catch (err) {
      console.error('Add vehicle error:', err);
      setVehicleError(err.message || 'Failed to add vehicle');
    } finally {
      setAddingVehicle(false);
    }
  };

  const openDeleteConfirmModal = (convoy, e) => {
    e.stopPropagation();
    setConvoyToDelete(convoy);
    setDeleteConfirmModal(true);
  };

  const handleDeleteConvoy = async () => {
    if (!convoyToDelete) return;

    setDeleting(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`http://localhost:8000/api/convoys/${convoyToDelete.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Error: ${res.status}`);
      }

      setDeleteConfirmModal(false);
      setConvoyToDelete(null);
      fetchConvoys();
    } catch (err) {
      console.error('Delete convoy error:', err);
      alert(err.message || 'Failed to delete convoy');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="history-container">
      <Navbar />

      <main className="history-main">
        {/* Header */}
        <div className="history-header">
          <h1 className="history-title">Convoy History</h1>
          <p className="history-subtitle">View and manage all convoys</p>
        </div>

        {/* Filters */}
        <div className="filters-container">
          {priorities.map((p) => (
            <button
              key={p}
              onClick={() => setFilter(p)}
              className={`filter-btn ${filter === p ? 'filter-btn-active' : 'filter-btn-inactive'
                }`}
            >
              {p.charAt(0).toUpperCase() + p.slice(1)}
            </button>
          ))}
        </div>

        {/* Convoys Grid */}
        <div className="convoys-grid">
          {loading ? (
            <div className="history-loading">
              Loading convoys...
            </div>
          ) : filtered.length === 0 ? (
            <div className="history-empty">
              <p className="history-empty-text">No convoys found</p>
              <button
                onClick={() => navigate('/create-convoy')}
                className="create-first-convoy-btn"
              >
                Create your first convoy →
              </button>
            </div>
          ) : (
            filtered.map((convoy) => {
              const isExpanded = expandedConvoys.has(convoy.id);
              const vehicles = convoyVehicles[convoy.id] || [];
              const isLoadingVehicles = loadingVehicles[convoy.id];

              return (
                <div
                  key={convoy.id}
                  className="convoy-card"
                >
                  <div className="convoy-card-content">
                    <div className="convoy-card-header">
                      <button
                        onClick={() => navigate(`/route/${convoy.id}`)}
                        className="convoy-name-btn"
                        type="button"
                      >
                        {convoy.convoy_name}
                      </button>
                      <div className={`priority-badge ${getPriorityColor(convoy.priority)}`}>
                        {convoy.priority}
                      </div>
                    </div>

                    <div className="convoy-details">
                      <div className="route-info-box">
                        <div className="route-label">Route</div>
                        <div className="route-places">
                          <span className="place-source">{convoy.source?.place || 'Source'}</span>
                          <span className="place-arrow">→</span>
                          <span className="place-dest">{convoy.destination?.place || 'Destination'}</span>
                        </div>
                      </div>

                      <div className="detail-row">
                        <span>Vehicles:</span>
                        <span className="detail-value">{convoy.vehicle_count}</span>
                      </div>
                      <div className="detail-row">
                        <span>Total Load:</span>
                        <span className="detail-value">{convoy.total_load_kg} kg</span>
                      </div>
                      <div className="detail-row">
                        <span>Convoy ID:</span>
                        <span className="detail-value">#{convoy.id}</span>
                      </div>
                    </div>

                    {/* Vehicle Details Toggle */}
                    {convoy.vehicle_count > 0 && (
                      <button
                        onClick={() => toggleConvoyExpand(convoy.id)}
                        className="toggle-vehicles-btn"
                      >
                        {isExpanded ? (
                          <>
                            <ChevronUp size={16} />
                            Hide Vehicle Details
                          </>
                        ) : (
                          <>
                            <ChevronDown size={16} />
                            Show Vehicle Details ({convoy.vehicle_count})
                          </>
                        )}
                      </button>
                    )}

                    <div className="card-actions">
                      <button
                        onClick={(e) => openAddVehicleModal(convoy, e)}
                        className="btn-add-vehicle-small"
                      >
                        <Plus size={16} />
                        Add Vehicle
                      </button>
                      <button
                        onClick={(e) => openDeleteConfirmModal(convoy, e)}
                        className="btn-delete-convoy-small"
                        title="Delete convoy"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Expandable Vehicle Details */}
                  {isExpanded && (
                    <div className="expanded-vehicles">
                      <h4 className="expanded-title">
                        <Truck size={16} />
                        Vehicle Details
                      </h4>

                      {isLoadingVehicles ? (
                        <div className="history-loading">Loading vehicles...</div>
                      ) : vehicles.length === 0 ? (
                        <div className="history-empty-text">No vehicles found</div>
                      ) : (
                        <div className="vehicles-list-container">
                          {vehicles.map((vehicle, idx) => (
                            <div
                              key={idx}
                              className="vehicle-item"
                            >
                              <div className="vehicle-header-row">
                                <div className="vehicle-id-group">
                                  <Truck size={16} color="#60a5fa" />
                                  <span className="registration-text">{vehicle.registration}</span>
                                </div>
                                <div className={`status-badge ${getVehicleStatusColor(vehicle.status)}`}>
                                  {vehicle.status.replace('_', ' ').toUpperCase()}
                                </div>
                              </div>

                              <div className="vehicle-stats-grid">
                                <div className="stat-item">
                                  <User className="stat-item-icon" />
                                  <span>Driver: <span className="stat-val">{vehicle.driver}</span></span>
                                </div>
                                <div className="stat-item">
                                  <Truck className="stat-item-icon" />
                                  <span>Type: <span className="stat-val stat-val-cap">{vehicle.type}</span></span>
                                </div>
                                <div className="stat-item">
                                  <Package className="stat-item-icon" />
                                  <span>Load: <span className="stat-val stat-val-cap">{vehicle.load_type}</span></span>
                                </div>
                                <div className="stat-item">
                                  <span>Weight: <span className="stat-val">{vehicle.load_kg}/{vehicle.capacity_kg} kg</span></span>
                                </div>
                              </div>

                              {/* Load Progress Bar */}
                              <div className="load-progress-container">
                                <div className="progress-track">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${Math.min(100, (vehicle.load_kg / vehicle.capacity_kg) * 100)}%` }}
                                  />
                                </div>
                                <div className="progress-text">
                                  {((vehicle.load_kg / vehicle.capacity_kg) * 100).toFixed(1)}% capacity
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Add Vehicle Modal */}
      {showAddVehicleModal && selectedConvoy && (
        <div className="modal-overlay" onClick={() => setShowAddVehicleModal(false)}>
          <div className="modal-content-large" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-title-group">
                <h2>Add Vehicle to Convoy</h2>
                <div className="convoy-info-mini">
                  <div style={{ marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 500, color: 'white' }}>{selectedConvoy.convoy_name}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#4ade80' }}>{selectedConvoy.source?.place}</span>
                    <span style={{ color: '#475569' }}>→</span>
                    <span style={{ color: '#f87171' }}>{selectedConvoy.destination?.place}</span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setShowAddVehicleModal(false)}
                className="close-modal-btn"
              >
                <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleAddVehicle} className="modal-form">
              {vehicleError && (
                <div className="message-box message-error">
                  {vehicleError}
                </div>
              )}
              {vehicleSuccess && (
                <div className="message-box message-success">
                  {vehicleSuccess}
                </div>
              )}

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Vehicle Type *</label>
                  <select
                    value={vehicleForm.vehicleType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, vehicleType: e.target.value })}
                    className="form-select"
                  >
                    {VEHICLE_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Registration Number *</label>
                  <input
                    type="text"
                    placeholder="e.g., DL-01-AB-1234"
                    value={vehicleForm.registrationNumber}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, registrationNumber: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Driver Name *</label>
                  <input
                    type="text"
                    placeholder="e.g., Raj Kumar"
                    value={vehicleForm.driverName}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, driverName: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Load Type *</label>
                  <select
                    value={vehicleForm.loadType}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, loadType: e.target.value })}
                    className="form-select"
                  >
                    {LOAD_TYPES.map(t => (
                      <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Load Weight (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 500"
                    value={vehicleForm.loadWeight}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, loadWeight: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Capacity (kg) *</label>
                  <input
                    type="number"
                    placeholder="e.g., 1000"
                    value={vehicleForm.capacity}
                    onChange={(e) => setVehicleForm({ ...vehicleForm, capacity: e.target.value })}
                    className="form-input"
                    required
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={addingVehicle}
                  className="btn-create"
                >
                  {addingVehicle ? 'Adding...' : (
                    <>
                      <Plus size={20} />
                      Add Vehicle
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddVehicleModal(false)}
                  className="btn-cancel"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmModal && convoyToDelete && (
        <div className="modal-overlay" onClick={() => setDeleteConfirmModal(false)}>
          <div className="modal-content-small" onClick={e => e.stopPropagation()}>
            <div className="delete-header">
              <div className="delete-icon-circle">
                <Trash2 className="delete-icon" />
              </div>
              <div className="delete-title">
                <h2>Delete Convoy</h2>
                <p>This action cannot be undone</p>
              </div>
            </div>

            <div className="convoy-summary-box">
              <p style={{ color: 'white', fontWeight: 500, marginBottom: '0.5rem' }}>{convoyToDelete.convoy_name}</p>
              <div style={{ fontSize: '0.875rem', color: '#94a3b8', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Convoy ID:</span>
                  <span style={{ color: 'white' }}>#{convoyToDelete.id}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Vehicles:</span>
                  <span style={{ color: 'white' }}>{convoyToDelete.vehicle_count}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Total Load:</span>
                  <span style={{ color: 'white' }}>{convoyToDelete.total_load_kg} kg</span>
                </div>
              </div>
            </div>

            <p className="delete-warning-text">
              Are you sure you want to delete this convoy? All associated vehicles and route data will be permanently removed.
            </p>

            <div className="modal-actions">
              <button
                onClick={handleDeleteConvoy}
                disabled={deleting}
                className="btn-confirm-delete"
              >
                {deleting ? (
                  'Deleting...'
                ) : (
                  <>
                    <Trash2 size={16} />
                    Delete Convoy
                  </>
                )}
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmModal(false);
                  setConvoyToDelete(null);
                }}
                disabled={deleting}
                className="modal-cancel-btn"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
