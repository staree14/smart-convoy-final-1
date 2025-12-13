import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Navbar.css';

export default function Navbar() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }
  const displayName = user?.service_no || user?.username || user?.email || 'User';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="navbar-container">
      <div className="navbar-content">
        {/* Left: Brand */}
        <div className="flex items-center">
          <Link to="/" className="navbar-brand">Smart Convoy AI</Link>
        </div>

        {/* Right: Navigation links */}
        <div className="navbar-links">
          <Link to="/dashboard" className="navbar-link">Dashboard</Link>
          <Link to="/create-convoy" className="navbar-link">Create Convoy</Link>
          <Link to="/history" className="navbar-link">History</Link>

          {/* Profile name (non-clickable) */}
          <span className="navbar-user-badge">{displayName}</span>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="navbar-logout-btn"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}