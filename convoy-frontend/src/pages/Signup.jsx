import React, { useState } from "react";
import "../styles/Signup.css";
import { useNavigate, Link } from "react-router-dom";
import { Truck, ArrowRight } from "lucide-react";

export default function Signup() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!name || !email || !phoneNumber || !password) {
        setError("All fields are required for account creation.");
        setLoading(false);
        return;
      }

      // Call backend register endpoint
      const res = await fetch('http://localhost:8000/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone_number: phoneNumber,
          password
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Registration failed');
      }

      const data = await res.json();

      // Store user_id and access_token if returned
      if (data.user_id) {
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('user', JSON.stringify({ email, user_id: data.user_id }));
      }
      if (data.access_token) {
        localStorage.setItem('access_token', data.access_token);
      }

      // Redirect to dashboard (already logged in with token)
      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="signup-page">
      
      {/* Background Grid/Noise (CSS handles the appearance) */}
      <div className="background-grid" />

      {/* Signup Card Container */}
      <div className="signup-container">
        
        {/* Truck Icon/Logo Header - Floating above the card */}
        <div className="logo-header">
            <div className="logo-icon-wrapper">
                <Truck className="logo-icon" />
            </div>
        </div>

        {/* Form Card */}
        <div className="form-card">
          
          {/* Header Text (Convoy AI) */}
          <div className="header-text-wrapper"> 
            <h1 className="header-title">
              Convoy AI
            </h1>
            <p className="header-subtitle">Create your account</p> 
          </div>

          {error && (
            <div className="error-message-box">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="signup-form">

            {/* Full Name Field */}
            <div className="input-group">
              <label htmlFor="name">Full Name</label>
              <input
                id="name"
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Email Field */}
            <div className="input-group">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Phone Number Field */}
            <div className="input-group">
              <label htmlFor="phone">Phone Number</label>
              <input
                id="phone"
                type="tel"
                placeholder="Enter your phone number"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Password Field */}
            <div className="input-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field"
                required
              />
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="signup-button"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  <ArrowRight className="button-icon"/> Sign Up
                </>
              )}
            </button>
          </form>

          {/* Login Link */}
          <div className="login-link-wrapper">
            <p>
              Already have an account?{" "}
              <Link 
                to="/login" 
                className="login-link"
              >
                Login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
