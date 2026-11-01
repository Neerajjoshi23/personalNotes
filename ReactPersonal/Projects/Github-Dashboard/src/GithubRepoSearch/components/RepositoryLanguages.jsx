// components/RepositoryLanguages.jsx
import React from "react";
import QueryStateHandler from "./QueryStateHandler";
import { motion } from "framer-motion";
import { Code2 } from "lucide-react";

export default function RepositoryLanguages({ query }) {
  // Stagger configurations for language metrics
  const listContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 },
    },
  };

  const listItem = {
    hidden: { opacity: 0, x: -8 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { type: "spring", stiffness: 200, damping: 20 },
    },
  };

  return (
    <QueryStateHandler query={query} loadingText="Loading languages...">
      {(languages) => {
        const totalBytes = Object.values(languages).reduce((a, b) => a + b, 0);

        return (
          <motion.section
            initial={{ opacity: 0, scale: 0.99, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50"
          >
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase mb-5 flex items-center gap-2">
              <Code2 className="w-4 h-4 text-slate-500" />
              <span>Languages</span>
            </h2>

            <motion.ul
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="space-y-4"
            >
              {Object.entries(languages).map(([language, bytes]) => {
                const percentage =
                  totalBytes > 0 ? ((bytes / totalBytes) * 100).toFixed(1) : 0;

                return (
                  <motion.li
                    key={language}
                    variants={listItem}
                    className="flex flex-col gap-2 group"
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <span className="font-semibold text-slate-300 group-hover:text-blue-400 transition-colors">
                        {language}
                      </span>
                      <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                        {percentage}%
                      </span>
                    </div>

                    {/* Premium Progress Track Fill Indicator */}
                    <div className="w-full bg-slate-900 rounded-full h-1.5 overflow-hidden border border-slate-800/40 relative">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{
                          duration: 0.8,
                          ease: [0.25, 1, 0.5, 1],
                          delay: 0.1,
                        }}
                        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-1.5 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.4)] group-hover:from-blue-400 group-hover:to-indigo-400 transition-colors"
                      />
                    </div>
                  </motion.li>
                );
              })}
            </motion.ul>
          </motion.section>
        );
      }}
    </QueryStateHandler>
  );
}
