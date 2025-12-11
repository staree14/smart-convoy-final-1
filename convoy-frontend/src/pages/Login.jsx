import { useState } from "react";
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
    <div className="min-h-screen bg-[#070912] flex items-center justify-center px-4 py-16 text-white font-sans">
      
      {/* Subtle Background Grid/Noise */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#0f111a_1px,transparent_1px),linear-gradient(to_bottom,#0f111a_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-5 pointer-events-none -z-10" />

      {/* Login Card Container - Centered and Spaced */}
      <div className="relative w-full max-w-xs px-4">
        
        {/* Truck Icon/Logo Header - Floating above the card */}
        <div className="absolute -top-12 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-12 rounded-lg bg-white/10 border-2 border-white/20 flex items-center justify-center backdrop-blur-md">
                <Truck className="w-8 h-8 text-white" />
            </div>
        </div>

        {/* Form Card - Dark, rounded, and glowing border */}
        <div className="bg-[#10131d] rounded-2xl border border-blue-500/30 p-10 pt-16 shadow-2xl shadow-black/50 overflow-hidden 
              relative z-10 before:content-[''] before:absolute before:inset-0 before:border-2 before:border-blue-500/50 before:rounded-2xl before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300">
          
          {/* Header Text (Convoy AI) */}
          <div className="text-left mb-12"> 
            <button type="button" onClick={() => navigate('/dashboard')} className="text-left w-full">
              <h1 className="text-4xl font-semibold tracking-tight mb-1">
                Convoy <span className="text-blue-400">AI</span>
              </h1>
            </button>
            <p className="text-slate-400 text-base h-5"></p> 
          </div>

          {error && (
            <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">

            {/* Email Field Group */}
            <div>
              <label className="block text-base font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Mail className="w-5 h-5 text-slate-400"/> Email
              </label>

              <div className="relative">
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Password Field Group */}
            <div>
              <label className="block text-base font-medium text-slate-300 mb-2 flex items-center gap-2">
                <Lock className="w-5 h-5 text-slate-400"/> Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-[#1e232e] border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                  required
                />
              </div>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 mt-12 bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 disabled:opacity-50 text-white font-semibold text-lg rounded-lg shadow-xl shadow-blue-500/40 transition-all duration-200 flex items-center justify-center gap-2 relative z-20"
            >
              {loading ? (
                "Authenticating..."
              ) : (
                <>
                  <ArrowRight className="w-5 h-5"/> Log in to Convoy
                </>
              )}
            </button>
          </form>

          {/* Sign Up Link */}
          <div className="text-center mt-6">
            <p className="text-slate-300 text-sm">
              No account?{" "}
              <button
                type="button"
                onClick={() => navigate('/signup')}
                className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors duration-200 cursor-pointer relative z-20"
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