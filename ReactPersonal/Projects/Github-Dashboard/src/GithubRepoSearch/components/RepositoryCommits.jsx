// components/RepositoryCommits.jsx
import React from "react";
import QueryStateHandler from "./QueryStateHandler";
import { motion } from "framer-motion";
import { GitCommit } from "lucide-react";

export default function RepositoryCommits({ query }) {
  // Stagger arrangement configurations for timeline feeds
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 220, damping: 18 },
    },
  };

  return (
    <QueryStateHandler query={query} loadingText="Loading commits...">
      {(commits) => (
        <motion.section
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50"
        >
          {/* Header Layout */}
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-5 flex items-center gap-2 border-b border-slate-900 pb-3">
            <GitCommit className="w-4 h-4 text-slate-500" />
            <span>Recent Commits</span>
          </h2>

          {/* Premium Developer Timeline Pipeline */}
          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="relative border-l border-slate-900 ml-2.5 space-y-5"
          >
            {commits.slice(0, 5).map((commit) => (
              <motion.li
                key={commit.sha}
                variants={itemVariants}
                className="relative pl-6 group hover:-translate-y-0.5 transition-transform duration-200"
              >
                {/* Timeline Node Tracking Ring */}
                <div className="absolute -left-[4.5px] top-1.5 w-2 h-2 rounded-full bg-slate-800 border border-slate-700 group-hover:bg-blue-500 group-hover:border-blue-400 shadow-[0_0_8px_rgba(59,130,246,0)] group-hover:shadow-[0_0_8px_rgba(59,130,246,0.6)] transition-all duration-300" />

                <div className="flex flex-col sm:flex-row sm:items-baseline gap-2.5">
                  {/* Technical SHA Identifier Badge */}
                  <code className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800/85 shrink-0 select-all group-hover:text-blue-400 group-hover:border-blue-500/30 transition-colors duration-200">
                    {commit.sha.slice(0, 7)}
                  </code>

                  {/* Commit Message Label */}
                  <p className="text-sm text-slate-300 font-medium line-clamp-1 group-hover:text-white transition-colors duration-200 leading-normal">
                    {commit.commit?.message}
                  </p>
                </div>
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}
    </QueryStateHandler>
  );
}
