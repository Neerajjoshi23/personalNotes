// Shared/Pages/NotFound.jsx
import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertTriangle, Home, Terminal } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] px-4 text-center">
      {/* 🔮 FROSTED GLASS ERROR BOX SHEET */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 18 }}
        className="relative bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-8 md:p-12 max-w-md w-full shadow-2xl overflow-hidden group"
      >
        {/* Shimmer Light Reflection Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-red-500/[0.02] to-transparent -translate-x-full group-hover:animate-[shimmer_2s_infinite] pointer-events-none rounded-3xl" />

        {/* Glowing Alert Node Badge */}
        <div className="inline-flex p-3 bg-rose-950/40 border border-rose-500/20 text-rose-400 rounded-2xl mb-5 shadow-inner">
          <AlertTriangle className="w-6 h-6 animate-pulse" />
        </div>

        <h1 className="text-5xl font-extrabold font-mono tracking-tighter text-white mb-2">
          404
        </h1>

        <h2 className="text-base font-bold text-slate-200 tracking-tight mb-3">
          NODE_NOT_FOUND
        </h2>

        <p className="text-xs text-slate-400 leading-relaxed mb-8 max-w-xs mx-auto">
          The routing path index you are attempting to audit does not exist or
          has been shifted across the gateway server network.
        </p>

        {/* Action Gateways Row */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/"
            className="inline-flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-5 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider font-mono font-bold"
          >
            <Home className="w-3.5 h-3.5" /> Return Home
          </Link>
          <button
            onClick={() => window.history.back()}
            className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-medium px-5 py-2.5 rounded-xl shadow-lg hover:-translate-y-0.5 transition-all text-xs uppercase tracking-wider font-mono font-bold"
          >
            <Terminal className="w-3.5 h-3.5" /> Previous Node
          </button>
        </div>
      </motion.div>
    </div>
  );
}
