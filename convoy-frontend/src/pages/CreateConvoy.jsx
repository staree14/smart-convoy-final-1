import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { Plus, Trash2, Send } from 'lucide-react';

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
  <div className="max-w-6xl mx-auto px-6 py-12">
    <input className="..." />
    <input className="..." />
    <button className="..." />
  </div>

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <Navbar />
      <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
        <input className="p-0.5 rounded w-full outline-none" />
        <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
      </div>

      <main className="w-full px-6 py-12">
        <div className="flex flex-col items-center">
        {/* Header */}
        <div className="mb-8 w-full max-w-4xl">
          <h1 className="text-4xl font-bold text-white mb-2">Create Convoy</h1>
          <p className="text-slate-400">Set up a new military convoy with vehicles and route information</p>
        </div>
        <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
          <input className="p-0.5 rounded w-full outline-none" />
          <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm w-full max-w-4xl">
            {error}
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-green-300 text-sm w-full max-w-4xl">
            {success}
          </div>
        )}
        {geocodingMessage && (
          <div className="mb-6 p-4 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-300 text-sm w-full max-w-4xl">
            ⏳ {geocodingMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8 w-full max-w-4xl">

          {/* Convoy Information Section */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">1</span>
              Convoy Information
            </h2>
            <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
              <input className="p-0.5 rounded w-full outline-none" />
              <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Convoy Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Convoy Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Medical Supply Alpha"
                  value={convoyName}
                  onChange={(e) => setConvoyName(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                  required
                />
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Priority Level</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  {PRIORITIES.map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </div>

              {/* Source Place Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Source Location <span className="text-blue-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., New Delhi, India or Delhi, India"
                  value={sourcePlace}
                  onChange={(e) => setSourcePlace(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">💡 Use full place name (city, country) for better accuracy</p>
              </div>

              {/* Destination Place Name */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Destination Location <span className="text-blue-400">*</span></label>
                <input
                  type="text"
                  placeholder="e.g., Gurgaon, India or Mumbai, India"
                  value={destPlace}
                  onChange={(e) => setDestPlace(e.target.value)}
                  className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500"
                />
                <p className="text-xs text-slate-400 mt-1">💡 Use full place name (city, country) for better accuracy</p>
              </div>
            </div>
            <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
              <input className="p-0.5 rounded w-full outline-none" />
              <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
</div>

          </div>
          <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
            <input className="p-0.5 rounded w-full outline-none" />
            <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
          </div>

          <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
            <input className="p-0.5 rounded w-full outline-none" />
            <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
          </div>

          {/* Vehicles Section */}
          <div className="bg-slate-800 rounded-lg border border-slate-700 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-blue-600 flex items-center justify-center text-sm">2</span>
                Vehicles ({vehicles.length})
              </h2>

              <button
                type="button"
                onClick={addVehicle}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Vehicle
              </button>
            </div>
            <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
              <input className="p-0.5 rounded w-full outline-none" />
              <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
            </div>

            <div className="space-y-6">
              {vehicles.map((vehicle, idx) => (
                <div key={vehicle.id} className="border border-slate-700 rounded-lg p-4 bg-slate-900/50">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-md font-semibold text-white">Vehicle {idx + 1}</h3>
                    {vehicles.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeVehicle(vehicle.id)}
                        className="p-2 text-red-400 hover:text-red-300 transition-colors"
                        title="Remove vehicle"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {/* Vehicle Type */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Type *</label>
                      <select
                        value={vehicle.vehicleType}
                        onChange={(e) => updateVehicle(vehicle.id, 'vehicleType', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {VEHICLE_TYPES.map(t => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Registration Number */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Registration *</label>
                      <input
                        type="text"
                        placeholder="e.g., DL-01-AB-1234"
                        value={vehicle.registrationNumber}
                        onChange={(e) => updateVehicle(vehicle.id, 'registrationNumber', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Driver Name */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Driver Name *</label>
                      <input
                        type="text"
                        placeholder="e.g., Raj Kumar"
                        value={vehicle.driverName}
                        onChange={(e) => updateVehicle(vehicle.id, 'driverName', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Load Type */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Load Type *</label>
                      <select
                        value={vehicle.loadType}
                        onChange={(e) => updateVehicle(vehicle.id, 'loadType', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                      >
                        {LOAD_TYPES.map(t => (
                          <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                        ))}
                      </select>
                    </div>

                    {/* Load Weight */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Load Weight (kg) *</label>
                      <input
                        type="number"
                        placeholder="e.g., 500"
                        value={vehicle.loadWeight}
                        onChange={(e) => updateVehicle(vehicle.id, 'loadWeight', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Capacity */}
                    <div>
                      <label className="block text-xs font-medium text-slate-400 mb-1">Capacity (kg) *</label>
                      <input
                        type="number"
                        placeholder="e.g., 1000"
                        value={vehicle.capacity}
                        onChange={(e) => updateVehicle(vehicle.id, 'capacity', e.target.value)}
                        className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
                      <input className="p-0.5 rounded w-full outline-none" />
                      <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
                    </div>

                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="max-w-6xl mx-auto px-1 py-1 space-y-0">
            <input className="p-0.5 rounded w-full outline-none" />
            <button className="px-2 py-0.5 bg-blue-600 text-white rounded" />
          </div>

          {/* Submit Button */}
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold rounded-lg shadow-xl shadow-blue-500/40 transition-all duration-200"
            >
              {loading ? 'Creating...' : (
                <>
                  <Send className="w-5 h-5" />
                  Create Convoy
                </>
              )}
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-colors"
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