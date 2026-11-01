// components/RepositoryList.jsx
import React from "react";
import { motion } from "framer-motion";
import { Search, AlertCircle, RefreshCw } from "lucide-react";
import RepositoryCard from "./RepositoryCard";

export default function RepositoryList({
  repos,
  isLoading,
  isFetching,
  isError,
  error,
  debounceValue,
}) {
  // Premium Dark Skeleton Loader Grid
  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
        {[...Array(4)].map((_, idx) => (
          <div
            key={idx}
            className="h-[120px] p-4 bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-xl flex flex-col justify-between animate-pulse shadow-2xl"
          >
            <div className="space-y-2">
              <div className="h-4 bg-slate-900 rounded-md w-2/3 border border-slate-800/40" />
              <div className="h-3 bg-slate-900/60 rounded-md w-5/6 border border-slate-800/20" />
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-slate-900/60">
              <div className="h-5 bg-slate-900 rounded-md w-16 border border-slate-800/40" />
              <div className="h-3 bg-slate-900 rounded-md w-24 border border-slate-800/40" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Modern Dark Alert Banner
  if (isError) {
    return (
      <div className="rounded-xl bg-rose-950/30 p-4 border border-rose-900/50 flex items-start gap-3 shadow-2xl">
        <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-rose-200 tracking-tight">
            Search Error Encountered
          </h3>
          <p className="text-xs text-rose-400/90 mt-0.5 font-mono">
            {error?.message ||
              "Something went wrong while fetching repositories."}
          </p>
        </div>
      </div>
    );
  }

  // Dashboard Empty State Card
  if (debounceValue && repos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center text-center p-12 bg-slate-950/20 border border-dashed border-slate-800/60 rounded-xl shadow-inner">
        <div className="p-3 bg-slate-950/60 text-slate-500 rounded-full mb-3 border border-slate-800/60">
          <Search className="w-5 h-5 text-slate-400" />
        </div>
        <h3 className="text-sm font-semibold text-slate-200 tracking-tight">
          No results found
        </h3>
        <p className="text-xs text-slate-400 mt-1 max-w-xs leading-relaxed">
          We couldn't find any repositories matching{" "}
          <span className="font-mono text-slate-300 font-medium bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
            "{debounceValue}"
          </span>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Background Fetching Status Micro-Banner */}
      {isFetching && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="inline-flex items-center gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 bg-slate-950/60 px-2.5 py-1 rounded-md border border-slate-800 shadow-sm"
        >
          <RefreshCw className="w-3 h-3 animate-spin text-blue-400" />
          <span>Syncing index updates...</span>
        </motion.div>
      )}

      {/* Primary Repository Dashboard Responsive Grid View */}
      <motion.div
        variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
        initial="hidden"
        animate="visible"
        className="grid gap-4 sm:grid-cols-1 md:grid-cols-2"
      >
        {repos.map((repo) => (
          <motion.div
            key={repo.id}
            variants={{
              hidden: { opacity: 0, y: 12 },
              visible: {
                opacity: 1,
                y: 0,
                transition: { type: "spring", stiffness: 260, damping: 20 },
              },
            }}
          >
            <RepositoryCard repo={repo} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}
