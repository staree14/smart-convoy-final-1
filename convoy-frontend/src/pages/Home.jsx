import React from "react";
import { useNavigate } from "react-router-dom";
import { Truck, Map, ShieldCheck, Activity, TrendingUp, Clock, Gauge, Users, Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Home() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();

  return (
    <div className={`relative min-h-screen w-full flex flex-col ${
      theme === 'dark'
        ? 'bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white'
        : 'bg-gradient-to-br from-slate-50 via-white to-slate-100 text-slate-900'
    } overflow-hidden selection:bg-blue-500/30`}>

      {/* BACKGROUND EFFECTS */}
      <div className={`absolute inset-0 ${
        theme === 'dark'
          ? 'bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)]'
          : 'bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)]'
      } bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none`} />

      {/* Top Glow - Military Blue/Navy */}
      <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] ${
        theme === 'dark' ? 'bg-blue-900/20' : 'bg-blue-600/10'
      } blur-[120px] rounded-full pointer-events-none`} />

      {/* NAVBAR - FIXED TO FULL WIDTH */}
      <nav className={`fixed top-0 w-full z-50 border-b ${
        theme === 'dark'
          ? 'border-slate-800/50 bg-slate-950/80'
          : 'border-slate-200 bg-white/80'
      } backdrop-blur-xl`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center px-8 py-4">
          {/* Logo Section */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className={`relative w-12 h-12 rounded-xl ${
              theme === 'dark'
                ? 'bg-gradient-to-br from-blue-700 via-blue-800 to-slate-800'
                : 'bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800'
            } flex items-center justify-center border ${
              theme === 'dark' ? 'border-blue-700/30' : 'border-blue-600/20'
            } shadow-2xl shadow-blue-900/50`}>
              <Truck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className={`text-2xl font-bold tracking-tight ${
                theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
              }`}>
                Smart Convoy<span className="text-blue-600">AI</span>
              </span>
              <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                Where Strategy Meets Movement
              </p>
            </div>
          </div>

          {/* Theme Toggle & Login */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-lg ${
                theme === 'dark'
                  ? 'bg-slate-800 hover:bg-slate-700 text-yellow-400'
                  : 'bg-slate-100 hover:bg-slate-200 text-blue-600'
              } transition-all duration-300 border ${
                theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
              }`}
              title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => navigate("/login")}
              className={`px-6 py-2.5 rounded-lg font-semibold transition-all duration-300 ${
                theme === 'dark'
                  ? 'bg-blue-700 hover:bg-blue-600 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              } shadow-lg hover:shadow-xl`}
            >
              Login
            </button>
          </div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="relative z-10 flex-grow flex flex-col items-center justify-center px-6 pt-40 pb-24">

        {/* HERO BADGE */}
        <div className={`mb-8 inline-flex items-center gap-3 rounded-full border px-5 py-2.5 ${
          theme === 'dark'
            ? 'border-blue-700/40 bg-blue-900/20 text-blue-300'
            : 'border-blue-600/30 bg-blue-50 text-blue-700'
        } backdrop-blur-md shadow-lg`}>
          <span className={`flex h-2.5 w-2.5 rounded-full ${
            theme === 'dark' ? 'bg-blue-500' : 'bg-blue-600'
          } animate-pulse`} />
          <span className="text-sm font-semibold tracking-wide">AI-Powered Military Convoy Management</span>
        </div>

        {/* HERO HEADING */}
        <h1 className={`max-w-6xl text-6xl md:text-8xl font-black tracking-tight leading-[1.15] mb-10 text-center ${
          theme === 'dark'
            ? 'text-transparent bg-clip-text bg-gradient-to-b from-white via-slate-100 to-slate-400'
            : 'text-transparent bg-clip-text bg-gradient-to-b from-slate-900 via-slate-800 to-slate-600'
        }`}>
          Smart Convoy AI
          <br />
          <span className={`bg-clip-text text-transparent ${
            theme === 'dark'
              ? 'bg-gradient-to-r from-blue-400 via-blue-600 to-blue-800'
              : 'bg-gradient-to-r from-blue-600 via-blue-700 to-blue-900'
          }`}>
            Where Strategy Meets Movement
          </span>
        </h1>

        {/* TAGLINE */}
        <p className={`text-xl md:text-2xl ${
          theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
        } max-w-4xl mx-auto mb-14 leading-relaxed font-medium text-center`}>
          Centralized AI-powered command & control system for military convoy management with real-time optimization and dynamic re-routing.
        </p>

        {/* CTA BUTTONS */}
        <div className="flex flex-wrap gap-6 justify-center mb-28">
          <button
            onClick={() => navigate("/signup")}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 shadow-2xl ${
              theme === 'dark'
                ? 'bg-blue-700 hover:bg-blue-600 text-white shadow-blue-900/50'
                : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-600/30'
            } hover:scale-105 hover:shadow-3xl`}
          >
            Get Started Free
          </button>
          <button
            onClick={() => navigate("/login")}
            className={`px-8 py-4 rounded-xl font-bold text-lg transition-all duration-300 border-2 ${
              theme === 'dark'
                ? 'border-slate-700 bg-slate-800/50 hover:bg-slate-700 text-white'
                : 'border-slate-300 bg-white hover:bg-slate-50 text-slate-900'
            } hover:scale-105`}
          >
            View Demo
          </button>
        </div>

        {/* IMPACT STATS - From Image */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-6xl mx-auto w-full mb-24">
          {[
            { value: "8X", label: "Financial ROI", sublabel: "Reduced logistics costs", icon: <TrendingUp className="w-5 h-5" />, color: "red" },
            { value: "-40%", label: "Delay Reduction", sublabel: "Optimized routing", icon: <Clock className="w-5 h-5" />, color: "orange" },
            { value: "+15%", label: "Efficiency", sublabel: "Smart consolidation", icon: <Gauge className="w-5 h-5" />, color: "green" },
            { value: "1.5X", label: "Faster Response", sublabel: "Streamlined deployment", icon: <Activity className="w-5 h-5" />, color: "purple" },
          ].map((stat, idx) => {
            const colorClasses = {
              red: theme === 'dark' ? 'from-red-900/40 to-red-950/40 border-red-800/30 text-red-400' : 'from-red-50 to-red-100 border-red-300/50 text-red-700',
              orange: theme === 'dark' ? 'from-orange-900/40 to-orange-950/40 border-orange-800/30 text-orange-400' : 'from-orange-50 to-orange-100 border-orange-300/50 text-orange-700',
              green: theme === 'dark' ? 'from-emerald-900/40 to-emerald-950/40 border-emerald-800/30 text-emerald-400' : 'from-emerald-50 to-emerald-100 border-emerald-300/50 text-emerald-700',
              purple: theme === 'dark' ? 'from-purple-900/40 to-purple-950/40 border-purple-800/30 text-purple-400' : 'from-purple-50 to-purple-100 border-purple-300/50 text-purple-700',
            };

            return (
              <div
                key={idx}
                className={`relative p-6 rounded-2xl bg-gradient-to-br border backdrop-blur-sm ${colorClasses[stat.color]} hover:scale-105 transition-transform duration-300`}
              >
                <div className="flex items-center gap-2 mb-2">
                  {stat.icon}
                  <p className={`text-xs font-semibold uppercase tracking-wider ${
                    theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                  }`}>{stat.label}</p>
                </div>
                <p className={`text-4xl font-black mb-1 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>{stat.value}</p>
                <p className={`text-xs ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
                  {stat.sublabel}
                </p>
              </div>
            );
          })}
        </div>

        {/* CORE FEATURES */}
        <div className="max-w-7xl mx-auto w-full mb-28">
          <h2 className={`text-4xl md:text-5xl font-bold text-center mb-6 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Smart Convoy Management Features
          </h2>
          <p className={`text-center text-lg ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          } mb-20 max-w-3xl mx-auto leading-relaxed`}>
            Comprehensive suite of AI-powered tools designed for military logistics excellence
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-4">
            {[
              {
                title: "AI Route Planning",
                desc: "Optimal paths based on terrain, weather, traffic, and threat assessment using ML algorithms.",
                icon: <Map className="w-7 h-7 text-blue-500" />,
                color: "blue"
              },
              {
                title: "Real-time Coordination",
                desc: "Live tracking to avoid overlaps with simultaneous multi-convoy coordination.",
                icon: <Users className="w-7 h-7 text-emerald-500" />,
                color: "emerald"
              },
              {
                title: "Risk Zone Detection",
                desc: "Identify danger areas in real-time and automatically trigger dynamic re-routing.",
                icon: <ShieldCheck className="w-7 h-7 text-red-500" />,
                color: "red"
              },
              {
                title: "Predictive Analytics",
                desc: "Forecast delays and proactively suggest re-routing based on historical data.",
                icon: <Activity className="w-7 h-7 text-purple-500" />,
                color: "purple"
              },
              {
                title: "Load Consolidation",
                desc: "Merge shipments intelligently to reduce fleet size and operational costs.",
                icon: <Truck className="w-7 h-7 text-orange-500" />,
                color: "orange"
              },
              {
                title: "Efficient Logistics",
                desc: "Lower costs and improved effectiveness through optimized resource allocation.",
                icon: <TrendingUp className="w-7 h-7 text-cyan-500" />,
                color: "cyan"
              },
            ].map((feature, idx) => (
              <div
                key={idx}
                className={`group relative p-8 rounded-2xl border backdrop-blur-sm transition-all duration-300 hover:-translate-y-2 ${
                  theme === 'dark'
                    ? 'bg-slate-900/60 border-slate-800 hover:border-blue-700/50 hover:shadow-2xl hover:shadow-blue-900/20'
                    : 'bg-white border-slate-200 hover:border-blue-500/50 hover:shadow-2xl hover:shadow-blue-500/10'
                }`}
              >
                <div className={`mb-5 p-4 rounded-xl inline-block ${
                  theme === 'dark' ? 'bg-slate-800 group-hover:bg-slate-700' : 'bg-slate-100 group-hover:bg-slate-200'
                } transition-colors border ${
                  theme === 'dark' ? 'border-slate-700' : 'border-slate-300'
                } shadow-lg`}>
                  {feature.icon}
                </div>
                <h3 className={`text-xl font-bold mb-3 ${
                  theme === 'dark' ? 'text-slate-100' : 'text-slate-900'
                }`}>{feature.title}</h3>
                <p className={`leading-relaxed ${
                  theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
                }`}>{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* USE CASES */}
        <div className="max-w-7xl mx-auto w-full mb-28 px-4">
          <h2 className={`text-4xl md:text-5xl font-bold text-center mb-20 ${
            theme === 'dark' ? 'text-white' : 'text-slate-900'
          }`}>
            Mission-Critical Use Cases
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[
              {
                title: "Peacetime Logistics",
                desc: "Efficient supply movement without disrupting civilians",
                icon: "🕊️",
              },
              {
                title: "Rapid Deployment",
                desc: "Quick troop movement with minimal detection",
                icon: "⚡",
              },
              {
                title: "Emergency Response",
                desc: "Quick rerouting during threats or blockages",
                icon: "🚨",
              },
              {
                title: "Training Operations",
                desc: "Coordinate multiple units across terrains",
                icon: "🎯",
              },
            ].map((useCase, idx) => (
              <div
                key={idx}
                className={`p-8 rounded-xl border ${
                  theme === 'dark'
                    ? 'bg-slate-900/40 border-slate-800 hover:bg-slate-800/60'
                    : 'bg-white border-slate-200 hover:bg-slate-50'
                } transition-all duration-300 hover:scale-[1.02]`}
              >
                <div className="text-4xl mb-4">{useCase.icon}</div>
                <h3 className={`text-xl font-bold mb-2 ${
                  theme === 'dark' ? 'text-white' : 'text-slate-900'
                }`}>{useCase.title}</h3>
                <p className={theme === 'dark' ? 'text-slate-400' : 'text-slate-600'}>
                  {useCase.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <footer className={`relative w-full py-10 border-t ${
        theme === 'dark'
          ? 'border-slate-800 bg-slate-950/90'
          : 'border-slate-200 bg-white'
      } backdrop-blur-sm`}>
        <div className="max-w-7xl mx-auto px-8 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <h2 className={`text-lg font-bold ${
              theme === 'dark' ? 'text-slate-200' : 'text-slate-900'
            }`}>Smart Convoy AI</h2>
            <p className={`text-sm ${theme === 'dark' ? 'text-slate-500' : 'text-slate-600'}`}>
              © 2024 Logistics Security Systems. All rights reserved.
            </p>
          </div>

          <div className={`flex gap-8 text-sm ${
            theme === 'dark' ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <a href="#" className={`transition-colors ${
              theme === 'dark' ? 'hover:text-blue-400' : 'hover:text-blue-600'
            }`}>Privacy</a>
            <a href="#" className={`transition-colors ${
              theme === 'dark' ? 'hover:text-blue-400' : 'hover:text-blue-600'
            }`}>Terms</a>
            <a href="#" className={`transition-colors ${
              theme === 'dark' ? 'hover:text-blue-400' : 'hover:text-blue-600'
            }`}>Support</a>
            <a href="#" className={`transition-colors ${
              theme === 'dark' ? 'hover:text-blue-400' : 'hover:text-blue-600'
            }`}>Documentation</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
