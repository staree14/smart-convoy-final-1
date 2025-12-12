import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Plus, Trash2, Send } from 'lucide-react';
import '../styles/createConvoy.css';

const VEHICLE_TYPES = ['truck', 'van', 'jeep', 'ambulance', 'tanker'];
const LOAD_TYPES = ['medical', 'supplies', 'ammunition', 'fuel', 'personnel'];
const PRIORITIES = ['low', 'medium', 'high', 'critical'];

export default function CreateConvoy() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Convoy Info - Support both place names and coordinates
  const [convoyName, setConvoyName] = useState('');
  const [priority, setPriority] = useState('medium');
  const [sourcePlace, setSourcePlace] = useState('');
  const [sourceLat, setSourceLat] = useState('');
  const [sourceLon, setSourceLon] = useState('');
  const [destPlace, setDestPlace] = useState('');
  const [destLat, setDestLat] = useState('');
  const [destLon, setDestLon] = useState('');
  const [geocodingMessage, setGeocodingMessage] = useState('');

  // Vehicles
  const [vehicles, setVehicles] = useState([
    {
      id: 1,
      vehicleType: 'truck',
      registrationNumber: '',
      driverName: '',
      loadType: 'medical',
      loadWeight: '',
      capacity: '',
      sourceLat: '',
      sourceLon: '',
      destLat: '',
      destLon: '',
    }
  ]);

  const addVehicle = () => {
    setVehicles([
      ...vehicles,
      {
        id: Math.max(...vehicles.map(v => v.id), 0) + 1,
        vehicleType: 'truck',
        registrationNumber: '',
        driverName: '',
        loadType: 'medical',
        loadWeight: '',
        capacity: '',
        sourceLat: '',
        sourceLon: '',
        destLat: '',
        destLon: '',
      }
    ]);
  };

  const removeVehicle = (id) => {
    if (vehicles.length > 1) {
      setVehicles(vehicles.filter(v => v.id !== id));
    }
  };

  const updateVehicle = (id, field, value) => {
    setVehicles(vehicles.map(v =>
      v.id === id ? { ...v, [field]: value } : v
    ));
  };

  // Backend handles geocoding via Nominatim.
  // Just send place names and backend will geocode them automatically.

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setGeocodingMessage('');
    setLoading(true);

    try {
      // Validate required fields
      if (!convoyName) {
        setError('Please fill in convoy name');
        setLoading(false);
        return;
      }

      // Validate place names are provided (backend will geocode them)
      if (!sourcePlace || !destPlace) {
        setError('Please enter both source and destination place names (e.g., "New Delhi, India"). Coordinates are not needed.');
        setLoading(false);
        return;
      }

      if (vehicles.some(v => !v.registrationNumber || !v.driverName || !v.loadWeight || !v.capacity)) {
        setError('Please fill in all vehicle details');
        setLoading(false);
        return;
      }

      // Build payload with place names only.
      // Backend will geocode the place names and store lat/lon.
      const payload = {
        convoy_name: convoyName,
        source_place: sourcePlace,
        destination_place: destPlace,
        priority: priority.toLowerCase(),
        vehicles: vehicles.map(v => ({
          vehicle_type: v.vehicleType.toLowerCase(),
          registration_number: v.registrationNumber,
          load_type: v.loadType.toLowerCase(),
          load_weight_kg: parseFloat(v.loadWeight),
          capacity_kg: parseFloat(v.capacity),
          driver_name: v.driverName,
        }))
      };

      // POST to backend
      const token = localStorage.getItem('access_token');
      const res = await fetch('http://localhost:8000/api/convoys/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || `Backend error: ${res.status}`);
      }

      const data = await res.json();
      setSuccess(`Convoy created successfully!`);

      // Reset form and redirect
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (err) {
      console.error('Create convoy error:', err);
      setError(err.message || 'Failed to create convoy. Make sure backend is running on port 8000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-convoy-container">
      <Navbar />

      <main className="create-convoy-main">
        <div className="create-convoy-header-wrapper">
          {/* Header */}
          <div className="create-convoy-header">
            <h1 className="create-convoy-title">Create Convoy</h1>
            <p className="create-convoy-subtitle">Set up a new military convoy with vehicles and route information</p>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="message-box message-error">
              {error}
            </div>
          )}
          {success && (
            <div className="message-box message-success">
              {success}
            </div>
          )}
          {geocodingMessage && (
            <div className="message-box message-info">
              ⏳ {geocodingMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className="create-convoy-form">

            {/* Convoy Information Section */}
            <div className="form-section">
              <h2 className="section-title">
                <span className="section-step-number">1</span>
                Convoy Information
              </h2>

              <div className="form-grid-2">
                {/* Convoy Name */}
                <div className="form-group">
                  <label className="form-label">Convoy Name <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., Medical Supply Alpha"
                    value={convoyName}
                    onChange={(e) => setConvoyName(e.target.value)}
                    className="form-input"
                    required
                  />
                </div>

                {/* Priority */}
                <div className="form-group">
                  <label className="form-label">Priority Level</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="form-select"
                  >
                    {PRIORITIES.map(p => (
                      <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Source Place Name */}
                <div className="form-group">
                  <label className="form-label">Source Location <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., New Delhi, India or Delhi, India"
                    value={sourcePlace}
                    onChange={(e) => setSourcePlace(e.target.value)}
                    className="form-input"
                  />
                  <p className="form-hint">💡 Use full place name (city, country) for better accuracy</p>
                </div>

                {/* Destination Place Name */}
                <div className="form-group">
                  <label className="form-label">Destination Location <span className="required-asterisk">*</span></label>
                  <input
                    type="text"
                    placeholder="e.g., Gurgaon, India or Mumbai, India"
                    value={destPlace}
                    onChange={(e) => setDestPlace(e.target.value)}
                    className="form-input"
                  />
                  <p className="form-hint">💡 Use full place name (city, country) for better accuracy</p>
                </div>
              </div>
            </div>

            {/* Vehicles Section */}
            <div className="form-section">
              <div className="vehicle-section-header">
                <h2 className="section-title" style={{ marginBottom: 0 }}>
                  <span className="section-step-number">2</span>
                  Vehicles ({vehicles.length})
                </h2>

                <button
                  type="button"
                  onClick={addVehicle}
                  className="btn-add-vehicle"
                >
                  <Plus size={20} />
                  Add Vehicle
                </button>
              </div>

              <div className="vehicle-list">
                {vehicles.map((vehicle, idx) => (
                  <div key={vehicle.id} className="vehicle-card">
                    <div className="vehicle-card-header">
                      <h3 className="vehicle-title">Vehicle {idx + 1}</h3>
                      {vehicles.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeVehicle(vehicle.id)}
                          className="btn-remove-vehicle"
                          title="Remove vehicle"
                        >
                          <Trash2 size={20} />
                        </button>
                      )}
                    </div>

                    <div className="vehicle-grid">
                      {/* Vehicle Type */}
                      <div>
                        <label className="sm-label">Type *</label>
                        <select
                          value={vehicle.vehicleType}
                          onChange={(e) => updateVehicle(vehicle.id, 'vehicleType', e.target.value)}
                          className="sm-select"
                        >
                          {VEHICLE_TYPES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Registration Number */}
                      <div>
                        <label className="sm-label">Registration *</label>
                        <input
                          type="text"
                          placeholder="e.g., DL-01-AB-1234"
                          value={vehicle.registrationNumber}
                          onChange={(e) => updateVehicle(vehicle.id, 'registrationNumber', e.target.value)}
                          className="sm-input"
                        />
                      </div>

                      {/* Driver Name */}
                      <div>
                        <label className="sm-label">Driver Name *</label>
                        <input
                          type="text"
                          placeholder="e.g., Raj Kumar"
                          value={vehicle.driverName}
                          onChange={(e) => updateVehicle(vehicle.id, 'driverName', e.target.value)}
                          className="sm-input"
                        />
                      </div>

                      {/* Load Type */}
                      <div>
                        <label className="sm-label">Load Type *</label>
                        <select
                          value={vehicle.loadType}
                          onChange={(e) => updateVehicle(vehicle.id, 'loadType', e.target.value)}
                          className="sm-select"
                        >
                          {LOAD_TYPES.map(t => (
                            <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                          ))}
                        </select>
                      </div>

                      {/* Load Weight */}
                      <div>
                        <label className="sm-label">Load Weight (kg) *</label>
                        <input
                          type="number"
                          placeholder="e.g., 500"
                          value={vehicle.loadWeight}
                          onChange={(e) => updateVehicle(vehicle.id, 'loadWeight', e.target.value)}
                          className="sm-input"
                        />
                      </div>

                      {/* Capacity */}
                      <div>
                        <label className="sm-label">Capacity (kg) *</label>
                        <input
                          type="number"
                          placeholder="e.g., 1000"
                          value={vehicle.capacity}
                          onChange={(e) => updateVehicle(vehicle.id, 'capacity', e.target.value)}
                          className="sm-input"
                        />
                      </div>

                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="submit"
                disabled={loading}
                className="btn-create"
              >
                {loading ? 'Creating...' : (
                  <>
                    <Send size={20} />
                    Create Convoy
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn-cancel"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
