// components/RepositoryOverview.jsx - PART 1
import React from "react";
import QueryStateHandler from "./QueryStateHandler.jsx";
import { motion } from "framer-motion";
import {
  Star,
  Eye,
  GitFork,
  AlertCircle,
  Shield,
  GitBranch,
  HardDrive,
  Archive,
  Calendar,
  RefreshCw,
  ArrowUpCircle,
  ExternalLink,
} from "lucide-react";

export default function RepositoryOverview({ query }) {
  // Stagger arrangement configurations for metric elements
  const metricsContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.06 },
    },
  };

  const metricItem = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 260, damping: 20 },
    },
  };

  return (
    <QueryStateHandler
      query={query}
      loadingText="Loading repository details..."
      errorText="Unable to load repository."
      emptyText="Repository not found."
    >
      {(repository) => (
        <motion.section
          initial={{ opacity: 0, scale: 0.99, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="relative bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col gap-6 overflow-hidden group"
        >
          {/* Internal Radial Flare Accent Overlay */}
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-blue-500/[0.03] rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute inset-0 border border-transparent group-hover:border-blue-500/10 rounded-3xl transition-all duration-500 pointer-events-none" />
          {/* 1. Header Section */}
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 border-b border-slate-900 pb-5 relative z-10">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold tracking-tight text-white bg-clip-text text-transparent bg-gradient-to-r from-white via-slate-200 to-slate-400 group-hover:text-blue-400 transition-colors duration-300">
                  {repository.name}
                </h1>
                <span className="text-sm font-normal text-slate-500 font-mono">
                  {repository.owner?.login} /
                </span>

                {/* Visibility Badge */}
                <span
                  className={`text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                    repository.visibility === "public"
                      ? "bg-emerald-950/30 text-emerald-400 border-emerald-500/20"
                      : "bg-slate-900 text-slate-400 border-slate-800"
                  }`}
                >
                  {repository.visibility}
                </span>

                {/* Archived Badge */}
                {repository.archived && (
                  <span className="bg-amber-950/30 text-amber-400 border border-amber-500/20 text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                    <Archive className="w-3 h-3" /> Archived
                  </span>
                )}
              </div>
              <p className="text-slate-400 text-sm leading-relaxed max-w-3xl">
                {repository.description ||
                  "No description available for this repository."}
              </p>
            </div>

            {/* Action Links with Premium Micro-Hover Shifts */}
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={repository.html_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200"
              >
                GitHub <ExternalLink className="w-3 h-3" />
              </a>
              {repository.homepage && (
                <a
                  href={repository.homepage}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 rounded-lg hover:-translate-y-0.5 transition-all duration-200"
                >
                  Homepage <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          </div>
          {/* 2. Repository Core Engagement Metrics with Spring Ripple Transitions */}
          <motion.div
            variants={metricsContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10"
          >
            {[
              {
                label: "Stars",
                value: repository.stargazers_count,
                icon: Star,
                color: "text-amber-400 bg-amber-950/40 border-amber-500/10",
              },
              {
                label: "Watchers",
                value: repository.watchers_count,
                icon: Eye,
                color: "text-blue-400 bg-blue-950/40 border-blue-500/10",
              },
              {
                label: "Forks",
                value: repository.forks_count,
                icon: GitFork,
                color: "text-purple-400 bg-purple-950/40 border-purple-500/10",
              },
              {
                label: "Open Issues",
                value: repository.open_issues_count,
                icon: AlertCircle,
                color: "text-rose-400 bg-rose-950/40 border-rose-500/10",
              },
            ].map((stat, i) => (
              <motion.div
                key={i}
                variants={metricItem}
                className="flex items-center gap-3 border border-slate-900/60 rounded-xl p-3.5 bg-slate-900/20 hover:border-slate-800/80 hover:bg-slate-900/40 transition-all duration-300 group/metric"
              >
                <div
                  className={`p-2 rounded-lg border ${stat.color} group-hover/metric:scale-105 transition-transform duration-300`}
                >
                  <stat.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-[10px] text-slate-500 font-mono uppercase tracking-wider">
                    {stat.label}
                  </div>
                  <div className="text-base font-bold text-slate-200 group-hover/metric:text-white transition-colors">
                    {stat.value?.toLocaleString()}
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
          {/* 3. Detailed Information Grid */}
          <dl className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 border-t border-slate-900 pt-5 relative z-10">
            {[
              {
                label: "Primary Language",
                value: repository.language,
                icon: Shield,
              },
              {
                label: "License",
                value: repository.license?.name,
                icon: Shield,
              },
              {
                label: "Default Branch",
                value: repository.default_branch,
                icon: GitBranch,
              },
              {
                label: "Disk Space Size",
                value: repository.size
                  ? `${(repository.size / 1024).toFixed(2)} MB`
                  : null,
                icon: HardDrive,
              },
              {
                label: "Project Created",
                value: formatDate(repository.created_at),
                icon: Calendar,
              },
              {
                label: "Metadata Updated",
                value: formatDate(repository.updated_at),
                icon: RefreshCw,
              },
              {
                label: "Last Active Push",
                value: formatDate(repository.pushed_at),
                icon: ArrowUpCircle,
              },
            ].map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col gap-1.5 border border-slate-900 p-3 rounded-xl bg-slate-950/20 hover:border-slate-800 hover:bg-slate-950/40 hover:-translate-y-0.5 transition-all duration-200 group/info"
              >
                <dt className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-wider flex items-center gap-1 group-hover/info:text-slate-500 transition-colors">
                  {item.label}
                </dt>
                <dd className="text-xs font-mono font-medium text-slate-300 truncate group-hover/info:text-slate-100 transition-colors">
                  {item.value || "N/A"}
                </dd>
              </div>
            ))}
          </dl>
          {/* 4. Topics Badge Container */}
          <div className="border-t border-slate-900 pt-5 relative z-10">
            <h3 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-wider mb-3">
              Repository Topics
            </h3>
            {repository.topics?.length ? (
              <ul className="flex flex-wrap gap-2">
                {repository.topics.map((topic) => (
                  <li
                    key={topic}
                    className="bg-slate-900/60 hover:bg-slate-800/80 text-slate-300 hover:text-white text-xs font-mono px-2.5 py-1 rounded-md border border-slate-800/60 hover:border-slate-700/80 transition-all duration-200 hover:-translate-y-0.5 cursor-default shadow-xs"
                  >
                    {topic}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs font-mono text-slate-600 italic">
                No telemetry topics assigned.
              </p>
            )}
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
