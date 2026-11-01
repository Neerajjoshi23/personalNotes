// components/RepositoryContributors.jsx
import React from "react";
import QueryStateHandler from "./QueryStateHandler";
import { motion } from "framer-motion";
import { Users } from "lucide-react";

export default function RepositoryContributors({ query }) {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.97 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 240, damping: 20 },
    },
  };

  return (
    <QueryStateHandler query={query} loadingText="Loading contributors...">
      {(contributors) => (
        <motion.section
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50"
        >
          <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-4 flex items-center gap-2 border-b border-slate-900 pb-3">
            <Users className="w-4 h-4 text-slate-500" />
            <span>Contributors</span>
          </h2>

          <motion.ul
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-2.5"
          >
            {contributors.map((contributor) => (
              <motion.li
                key={contributor.id}
                variants={itemVariants}
                className="text-xs font-mono font-semibold text-slate-300 bg-slate-900/30 hover:bg-slate-950/60 border border-slate-800/50 hover:border-slate-700 rounded-xl px-3 py-2.5 truncate hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer shadow-xs"
              >
                {contributor.login}
              </motion.li>
            ))}
          </motion.ul>
        </motion.section>
      )}
    </QueryStateHandler>
  );
}
