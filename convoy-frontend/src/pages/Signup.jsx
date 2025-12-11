import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { User, Lock, Phone, Truck, ArrowRight, LogIn, Mail } from "lucide-react";

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
    // **FIXED**: Ensures the component takes up full height and centers content
    <div className="min-h-screen bg-[#070912] flex items-center justify-center px-4 py-16 text-white font-sans">
      
      {/* Subtle Background Grid/Noise */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f111a_1px,transparent_1px),linear-gradient(to_bottom,#0f111a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-5 pointer-events-none" />

      {/* Signup Card Container - Centered and Spaced */}
      <div className="relative w-full max-w-sm px-4">
        
        {/* Truck Icon/Logo Header - Floating above the card */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-12 rounded-lg bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-md">
                <Truck className="w-8 h-8 text-white" />
            </div>
        </div>

        {/* Form Card - Dark, rounded, and glowing border */}
        <div className="bg-[#10131d] rounded-2xl border border-blue-500/30 p-10 pt-16 shadow-2xl shadow-black/50 overflow-hidden">
          
          {/* Header Text (Convoy AI) */}
          <div className="text-center mb-10"> 
            <h1 className="text-2xl font-semibold tracking-tight text-white mb-1">
              Convoy AI
            </h1>
            <p className="text-slate-400 text-sm">Create your account</p> 
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">

            {/* Name Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Phone Number Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +1 555 555 5555"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                placeholder="Create a password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                required
              />
            </div>

            {/* Sign Up Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 mt-8 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-lg rounded-lg shadow-lg shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                "Creating Account..."
              ) : (
                <>
                  <ArrowRight className="w-5 h-5"/> Sign Up
                </>
              )}
            </button>
          </form>

          {/* Login Link - Clickable to transport to /login */}
          <div className="text-center mt-4">
            <p className="text-slate-400 text-sm">
              Already have an account?{" "}
              {/* This Link component is what makes it clickable and transports to /login */}
              <Link 
                to="/login" 
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors duration-200"
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