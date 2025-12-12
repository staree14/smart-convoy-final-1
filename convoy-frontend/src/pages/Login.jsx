import { useState } from "react";
import "../styles/Login.css";
import { useNavigate, Link } from "react-router-dom";
import { LogIn, Mail, Lock, Truck, ArrowRight, ChevronDown } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
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
          body: JSON.stringify({ email, password }),
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
          localStorage.setItem('user', JSON.stringify({ email, user_id: data.user_id }));
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
    <div className="login-page-wrapper">

      {/* Subtle Background Grid/Noise */}
      <div className="background-grid" />

      {/* Login Card Container - Centered and Spaced */}
      <div className="login-card-container">

        {/* Truck Icon/Logo Header - Floating above the card */}
        <div className="truck-icon-header">
          <div className="truck-icon-wrapper">
            <Truck className="truck-icon" />
          </div>
        </div>

        {/* Form Card - Dark, rounded, and glowing border */}
        <div className="form-card-base">
          
          {/* Header Text (Convoy AI) */}
          <div className="card-header-text">
            <button type="button" onClick={() => navigate('/dashboard')} className="header-button">
              <h1 className="header-title">
                Convoy <span className="header-title-blue">AI</span>
              </h1>
            </button>
            <p className="header-tagline"></p>
          </div>

          {error && (
            <div className="error-message-box">
              <svg xmlns="http://www.w3.org/2000/svg" className="error-icon" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">

            {/* Email Field Group */}
            <div className="form-group">
              <label className="input-label">
                <Mail className="input-icon" /> Email
              </label>

              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  required
                />
              </div>
            </div>

            {/* Password Field Group */}
            <div className="form-group">
              <label className="input-label">
                <Lock className="input-icon" /> Password
              </label>
              <div className="relative">
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
                  <ArrowRight className="login-button-icon" /> Log in 
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="signup-link-wrapper">
            <p className="signup-text">
              No account?{" "}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="signup-link-button"
              >
                Sign Up
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
