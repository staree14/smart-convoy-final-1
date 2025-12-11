import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Map, ShieldCheck, Activity } from "lucide-react";

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="relative min-h-screen w-full flex flex-col bg-slate-950 text-white overflow-hidden selection:bg-blue-500/30">
      
      {/* BACKGROUND EFFECTS */}
      {/* Grid Pattern covering entire screen */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
      
      {/* Top Blue Glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-600/20 blur-[100px] rounded-full pointer-events-none" />

      {/* NAVBAR - FIXED TO FULL WIDTH */}
      <nav className="fixed top-0 w-full z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-md">
        <div className="w-full flex justify-between items-center px-8 py-5"> 
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="relative w-10 h-10 rounded-lg bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center border border-white/10 shadow-xl">
              <Truck className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-100">
              Convoy<span className="text-blue-500">AI</span>
            </span>
          </div>
          
          {/* Login Section - Pushed to far right */}
          <button
            onClick={() => navigate("/login")}
            className="text-sm font-medium text-slate-300 hover:text-white transition-colors duration-200 px-4 py-2 hover:bg-white/5 rounded-lg"
          >
            Login
          </button>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center text-center px-6 pt-40 pb-20">

        {/* HERO BADGE - Simplified */}
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-sm text-blue-300 backdrop-blur-sm">
          <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
          AI-Powered Convoy Suite
        </div>

        {/* HERO HEADING */}
        <h1 className="max-w-5xl text-5xl md:text-7xl font-extrabold tracking-tight leading-tight mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-slate-400 drop-shadow-sm">
          Smart Convoy AI <br />
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-500">
            Smart Convoy AI
          </span>
        </h1>

        {/* DESCRIPTION - Added mb-32 for large gap */}
        <p className="text-lg md:text-xl text-slate-400 max-w-3xl mx-auto mb-32 leading-relaxed">
          Smart route planning, real-time monitoring, and military-grade security for every convoy.
        </p>
        <div className="max-w-6xl mx-auto px-6 py-12">
          <input className="..." />
          <input className="..." />
          <button className="..." />
        </div>

        {/* FEATURE CARDS - NO BUTTONS ABOVE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-7xl mx-auto w-full px-4">
          {[
            {
              title: "AI Route Optimization",
              desc: "Smart path planning based on traffic, terrain, and risk levels.",
              icon: <Map className="w-6 h-6 text-blue-400" />,
            },
            {
              title: "Real-time Telemetry",
              desc: "Live tracking of speed, fuel, biometrics, and convoy status.",
              icon: <Activity className="w-6 h-6 text-emerald-400" />,
            },
            {
              title: "Fleet Command",
              desc: "Unified dashboard with encrypted communication field.",
              icon: <ShieldCheck className="w-6 h-6 text-purple-400" />,
            },
          ].map((feature, idx) => (
            <div
              key={idx}
              className="group relative p-8 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-blue-500/50 transition-all duration-300 hover:-translate-y-1"
            >
              {/* Card Hover Glow */}
              <div className="absolute inset-0 bg-blue-500/5 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              
              <div className="relative flex flex-col items-center text-center">
                <div className="mb-5 p-3 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors border border-slate-700 shadow-lg">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-100 mb-3">{feature.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm md:text-base">{feature.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* FOOTER */}
      <footer className="relative w-full py-8 border-t border-slate-800 bg-slate-950/80">
        <div className="w-full px-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="text-center md:text-left">
            <h2 className="text-base font-bold text-slate-200">Convoy AI</h2>
            <p className="text-slate-500 text-xs">© 2024 Logistics Security Systems.</p>
          </div>
          
          <div className="flex gap-6 text-sm text-slate-400">
            <a href="#" className="hover:text-blue-400 transition">Privacy</a>
            <a href="#" className="hover:text-blue-400 transition">Terms</a>
            <a href="#" className="hover:text-blue-400 transition">Support</a>
          </div>
        </div>
      </footer>
    </div>
  );
}