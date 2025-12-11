import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  let user = null;
  try {
    user = JSON.parse(localStorage.getItem('user') || 'null');
  } catch (e) {
    user = null;
  }
  const displayName = user?.username || user?.email || 'User';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <nav className="w-full bg-slate-900 border-b border-slate-800">
      <div className="w-full px-6 py-3 flex items-center justify-between">
        {/* Left: Brand */}
        <div className="flex items-center">
          <Link to="/" className="text-white font-bold text-lg">Smart Convoy</Link>
        </div>

        {/* Right: Navigation links */}
        <div className="flex items-center gap-6">
          <Link to="/dashboard" className="text-slate-300 hover:text-white text-sm">Dashboard</Link>
          <Link to="/create-convoy" className="text-slate-300 hover:text-white text-sm">Create Convoy</Link>
          <Link to="/history" className="text-slate-300 hover:text-white text-sm">History</Link>

          {/* Profile name (non-clickable) */}
          <span className="text-slate-300 text-sm opacity-90">{displayName}</span>

          {/* Logout button */}
          <button
            onClick={handleLogout}
            className="text-sm px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}