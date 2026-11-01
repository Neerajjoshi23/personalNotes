// components/RepositoryReleases.jsx
import React from "react";
import QueryStateHandler from "./QueryStateHandler";
import { motion } from "framer-motion";
import { Tag } from "lucide-react";

export default function RepositoryReleases({ query }) {
  // Stagger configurations for clean release feed rollouts
  const listContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const listItem = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 240, damping: 20 },
    },
  };

  return (
    <QueryStateHandler
      query={query}
      loadingText="Loading releases..."
      errorText="Unable to load releases."
      emptyText="No releases found."
    >
      {(releases) => (
        <motion.section
          initial={{ opacity: 0, scale: 0.99, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-2xl p-6 shadow-2xl shadow-slate-950/50"
        >
          {/* Header Layout Container */}
          <div className="flex items-center justify-between mb-4 border-b border-slate-900 pb-3">
            <h2 className="text-xs font-mono font-bold tracking-wider text-slate-400 uppercase flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-400" />
              <span>Releases</span>
            </h2>
            <span className="bg-emerald-950/40 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/20">
              {releases.length}
            </span>
          </div>

          {/* Releases List Viewport Container with Tech Scrollbar styling */}
          <div className="max-h-60 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
            <motion.ul
              variants={listContainer}
              initial="hidden"
              animate="visible"
              className="divide-y divide-slate-900"
            >
              {releases.map((release) => (
                <motion.li
                  key={release.id}
                  variants={listItem}
                  className="py-3 first:pt-2.5 last:pb-0 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-4 group hover:-translate-y-0.5 transition-transform duration-200"
                >
                  {/* Release Name / Tag */}
                  <strong className="text-xs font-mono font-bold text-slate-300 group-hover:text-emerald-400 transition-colors truncate max-w-[70%]">
                    {release.name || release.tag_name}
                  </strong>

                  {/* Published Date Stamp */}
                  <p className="text-[10px] font-mono text-slate-500 group-hover:text-slate-400 transition-colors whitespace-nowrap">
                    {release.published_at
                      ? formatDate(release.published_at)
                      : "Not published"}
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

function formatDate(date) {
  if (!date) return "N/A";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium" }).format(
    new Date(date),
  );
}
