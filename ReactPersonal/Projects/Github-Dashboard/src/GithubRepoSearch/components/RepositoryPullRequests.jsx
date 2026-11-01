// components/RepositoryPullRequests.jsx
import React from "react";
import QueryStateHandler from "./QueryStateHandler";
import { motion } from "framer-motion";
import { GitPullRequest } from "lucide-react";

export default function RepositoryPullRequests({ query }) {
  // Stagger arrangement configurations for dense lists
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 220, damping: 18 },
    },
  };

  return (
    <QueryStateHandler query={query} loadingText="Loading pull requests...">
      {(pulls) => (
        <motion.section
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50"
        >
          {/* Header Layout Section */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-purple-400" />
              <span>Pull Requests</span>
            </h2>
            <span className="bg-purple-950/40 text-purple-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-purple-500/20">
              {pulls.length}
            </span>
          </div>

          {/* Styled Viewport Container with Tech Scrollbar */}
          <div className="max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <motion.ul
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="divide-y divide-slate-900"
            >
              {pulls.map((pull) => (
                <motion.li
                  key={pull.id}
                  variants={itemVariants}
                  className="py-2.5 first:pt-0 last:pb-0 flex gap-2.5 group"
                >
                  {/* PR Number Telemetry String */}
                  <span className="text-xs font-mono text-slate-600 group-hover:text-purple-500/60 transition-colors mt-0.5 shrink-0">
                    #{pull.number}
                  </span>

                  {/* Content Label Element */}
                  <p className="text-sm text-slate-300 font-medium line-clamp-2 group-hover:text-purple-450 transition-colors cursor-default leading-normal">
                    {pull.title}
                  </p>
                </motion.li>
              ))}
            </motion.ul>
          </div>
        </motion.section>
      )}
    </QueryStateHandler>
  );
}
