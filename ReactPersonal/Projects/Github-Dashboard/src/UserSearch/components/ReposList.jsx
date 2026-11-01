import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import { motion } from "framer-motion";
import QueryStateWrapper from "./QueryStateWrapper";

export default function ReposList({ query }) {
  const navigate = useNavigate();
  const { username } = useParams();
  const repos = query.data || [];

  // Master container framing configurations
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05, // 👈 Triggers individual child transitions one by one
      },
    },
  };

  // Individual repository item sliding properties
  const itemVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
  };

  return (
    <div className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-5 shadow-2xl flex flex-col h-[420px]">
      {/* Title Layout Section */}
      <div className="flex items-center justify-between mb-5 border-b border-slate-900 pb-3">
        <h3 className="text-[11px] font-mono font-semibold tracking-wider text-slate-400 uppercase">
          Repositories
        </h3>
        <span className="text-[10px] font-mono bg-slate-900 px-2 py-0.5 rounded border border-slate-800 text-indigo-400 font-bold">
          {repos.length} NODES
        </span>
      </div>

      {/* Styled Custom Scrollbar Viewport */}
      <div className="flex-1 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
        <QueryStateWrapper
          query={query}
          emptyMessage="ZERO_PUBLIC_REPOS"
          isEmpty={repos.length === 0}
        >
          {/* Framer Motion List Wrapper */}
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="space-y-2.5"
          >
            {repos.map((repo) => (
              <motion.div
                key={repo.id}
                variants={itemVariants}
                onClick={() =>
                  navigate(`/search/repo/${repo.name}/${username}`)
                }
                className="group/item p-4 bg-slate-900/20 border border-slate-800/50 rounded-xl hover:border-indigo-500/40 hover:bg-slate-950/60 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col gap-2 shadow-xs hover:shadow-[0_4px_12px_rgba(99,102,241,0.08)]"
              >
                {/* Header Information Element inside Item */}
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs font-semibold text-slate-200 group-hover/item:text-indigo-400 transition-colors truncate">
                    {repo.name}
                  </span>
                  {repo.language && (
                    <span className="text-[9px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
                      {repo.language}
                    </span>
                  )}
                </div>

                {/* Subtext Description Block */}
                {repo.description && (
                  <p className="text-[11px] text-slate-400 leading-normal line-clamp-2 group-hover/item:text-slate-300 transition-colors">
                    {repo.description}
                  </p>
                )}
              </motion.div>
            ))}
          </motion.div>
        </QueryStateWrapper>
      </div>
    </div>
  );
}
