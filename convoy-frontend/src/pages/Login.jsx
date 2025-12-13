import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Lock, Truck, ArrowRight, Shield } from "lucide-react";
import "../styles/Login.css";

export default function Login() {
  const navigate = useNavigate();
  const [serviceNo, setServiceNo] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    // Call backend auth endpoint
    (async () => {
      try {
        const res = await fetch('http://localhost:8000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ service_no: serviceNo, password }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          setError(err.detail || 'Invalid credentials');
          return;
        }
        const data = await res.json();
        // store user_id and access_token
        if (data.user_id) {
          localStorage.setItem('user_id', data.user_id);
          localStorage.setItem('user', JSON.stringify({ service_no: serviceNo, user_id: data.user_id }));
        }
        if (data.access_token) {
          localStorage.setItem('access_token', data.access_token);
        }
        navigate('/dashboard');
      } catch (err) {
        console.error('Login error', err);
        setError('Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }

  return (
    <div className="login-container">
      {/* Subtle Background Grid/Noise */}
      <div className="login-bg-grid" />

      {/* Login Card Container */}
      <div className="login-content-wrapper">

        {/* Truck Icon/Logo Header */}
        <div className="truck-icon-wrapper">
          <div className="truck-icon-container">
            <Truck className="truck-icon" />
          </div>
        </div>

        {/* Form Card */}
        <div className="login-card">

          {/* Header Text */}
          <div className="login-header">
            <button type="button" onClick={() => navigate('/dashboard')} className="login-title-btn">
              <h1 className="login-title">
                Convoy <span className="highlight-text">AI</span>
              </h1>
            </button>
            <p className="text-slate-400 text-base h-5"></p>
          </div>

          {error && (
            <div className="login-error">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            {/* Service No Field Group */}
            <div className="input-group">
              <label className="input-label">
                <Shield className="input-icon" /> Service Number
              </label>

              <div className="input-wrapper">
                <input
                  type="text"
                  placeholder="Enter Service Number (e.g. IC123456)"
                  value={serviceNo}
                  onChange={(e) => setServiceNo(e.target.value.toUpperCase())}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Password Field Group */}
            <div className="input-group">
              <label className="input-label">
                <Lock className="input-icon" /> Password
              </label>
              <div className="input-wrapper">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="login-button"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <ArrowRight className="w-5 h-5" /> Log in to Convoy
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link Removed - Registration is now internal via Service Registry */}
          <div className="signup-section">
            <p className="signup-text">
              Restricted Access. Authorized Personnel Only.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
