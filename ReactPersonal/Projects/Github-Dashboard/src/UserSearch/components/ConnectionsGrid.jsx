import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import QueryStateWrapper from "./QueryStateWrapper";

export default function ConnectionsGrid({ query, title, variant }) {
  const navigate = useNavigate();
  const accounts = query.data || [];

  // Grid container entry orchestrator layout config
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.04, // 👈 Quick staggered ripple for dense grid arrays
      },
    },
  };

  // Profile network cell animation metrics
  const itemVariants = {
    hidden: { opacity: 0, scale: 0.96, y: 8 },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: { type: "spring", stiffness: 300, damping: 22 },
    },
  };

  return (
    <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5 shadow-2xl flex flex-col h-[420px]">
      {/* Dynamic Header Assembly Bar */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-900 pb-3">
        <h3 className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
          {title}
        </h3>
        <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-emerald-400 font-bold">
          {accounts.length} SIGS
        </span>
      </div>

      {/* Styled Grid Content Layout Viewport */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <QueryStateWrapper
          query={query}
          emptyMessage={
            variant === "followers" ? "NO_FOLLOWERS" : "NO_FOLLOWING"
          }
          isEmpty={accounts.length === 0}
        >
          {/* Framer Motion Grid Panel Frame Wrapper */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {accounts.map((account) => (
              <motion.div
                key={account.id}
                variants={itemVariants}
                onClick={() => navigate(`/dashboard/users/${account.login}`)}
                className="group/node p-3 bg-slate-900/20 border border-slate-800/50 rounded-xl flex items-center gap-3 hover:border-emerald-500/30 hover:bg-slate-950/70 hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs hover:shadow-[0_4px_12px_rgba(16,185,129,0.06)]"
              >
                {/* Node Profile Avatar Layout Block */}
                <img
                  src={account.avatar_url}
                  alt={account.login}
                  className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-800 group-hover/node:border-emerald-500/40 transition-colors object-cover"
                />

                {/* Identity Metadata Strings Wrapper */}
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-mono font-medium text-slate-200 group-hover/node:text-emerald-400 transition-colors truncate block">
                    {account.login}
                  </span>
                  <span className="text-[9px] font-mono text-slate-500 block uppercase tracking-wider group-hover/node:text-slate-400 transition-colors">
                    {account.type}
                  </span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </QueryStateWrapper>
      </div>
    </div>
  );
}
