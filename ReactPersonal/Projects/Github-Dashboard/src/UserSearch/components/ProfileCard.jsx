import React from "react";
import { motion } from "framer-motion";
import QueryStateWrapper from "./QueryStateWrapper";

export default function ProfileCard({ query }) {
  const user = query.data;

  // Animation layout variants for sub-elements
  const textVariant = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" },
    },
  };

  return (
    <QueryStateWrapper
      query={query}
      emptyMessage="PROFILE_NOT_FOUND"
      isEmpty={!user}
    >
      {/* Framer Motion Entry Card Component */}
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="group relative bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50 overflow-hidden"
      >
        {/* Modern Interactive Sweep Line Border Overlay */}
        <div className="absolute inset-0 border border-transparent group-hover:border-indigo-500/20 rounded-2xl transition-all duration-500 pointer-events-none" />

        {/* Dynamic Inner Glass Reflection Layer */}
        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/0 via-indigo-500/[0.02] to-purple-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        {/* Subtle Internal Flare Accent */}
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-indigo-500/5 rounded-full blur-[60px] pointer-events-none" />

        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center relative z-10">
          {/* Hexagonal Glass-style Image Container with Scale Physics */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.15,
              type: "spring",
              stiffness: 200,
              damping: 15,
            }}
            className="relative p-1 bg-slate-900 border border-slate-800 rounded-2xl group-hover:border-indigo-500/30 group-hover:shadow-[0_0_20px_rgba(99,102,241,0.15)] transition-all duration-300"
          >
            <img
              src={user?.avatar_url}
              alt={user?.login}
              className="w-20 h-20 rounded-xl object-cover grayscale-[15%] group-hover:grayscale-0 transition-all duration-500"
            />
          </motion.div>

          {/* Staggered Content Animation Container */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={{
              visible: { transition: { staggerChildren: 0.08 } },
            }}
            className="space-y-2 flex-1 w-full min-w-0"
          >
            {/* Username Core Identification Label */}
            <motion.div
              variants={textVariant}
              className="flex items-baseline gap-2 flex-wrap"
            >
              <h2 className="text-xl font-bold text-slate-100 tracking-tight group-hover:text-indigo-400 transition-colors duration-300">
                {user?.name || user?.login}
              </h2>
              <span className="text-xs font-mono text-slate-500">
                @{user?.login}
              </span>
            </motion.div>

            {/* Profile Biography Narrative Layout */}
            {user?.bio && (
              <motion.p
                variants={textVariant}
                className="text-xs text-slate-400 leading-relaxed max-w-2xl"
              >
                {user.bio}
              </motion.p>
            )}

            {/* Matrix Data Points Layout Block */}
            <motion.div
              variants={textVariant}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 text-[11px] font-mono text-slate-400 border-t border-slate-900"
            >
              <div className="group/item">
                <span className="text-slate-600 block text-[9px] uppercase tracking-wider group-hover/item:text-slate-500 transition-colors">
                  Corporate
                </span>{" "}
                <span className="truncate block text-slate-300 group-hover/item:text-slate-100 transition-colors">
                  {user?.company || "N/A"}
                </span>
              </div>
              <div className="group/item">
                <span className="text-slate-600 block text-[9px] uppercase tracking-wider group-hover/item:text-slate-500 transition-colors">
                  Coordinates
                </span>{" "}
                <span className="truncate block text-slate-300 group-hover/item:text-slate-100 transition-colors">
                  {user?.location || "N/A"}
                </span>
              </div>
              <div className="group/item">
                <span className="text-slate-600 block text-[9px] uppercase tracking-wider group-hover/item:text-slate-500 transition-colors">
                  Platform Repos
                </span>{" "}
                <span className="font-bold text-indigo-400 group-hover/item:text-indigo-300 transition-colors">
                  {user?.public_repos || 0}
                </span>
              </div>
              <div className="group/item">
                <span className="text-slate-600 block text-[9px] uppercase tracking-wider group-hover/item:text-slate-500 transition-colors">
                  Endpoint URL
                </span>
                {user?.blog ? (
                  <a
                    href={user.blog}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 hover:underline truncate block transition-all"
                  >
                    Link ↗
                  </a>
                ) : (
                  <span className="text-slate-500 block">N/A</span>
                )}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </motion.div>
    </QueryStateWrapper>
  );
}
