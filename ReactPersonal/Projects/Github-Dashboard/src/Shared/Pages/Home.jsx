import { Link } from "react-router-dom";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Folder, User } from "lucide-react";

function Home() {
  const [recentRepos, setRecentRepos] = useState([]);
  const [recentUsers, setRecentUsers] = useState([]);

  // Load history from localStorage when the landing page mounts
  useEffect(() => {
    const storedRepos = JSON.parse(
      localStorage.getItem("recent_repos") || "[]",
    );
    const storedUsers = JSON.parse(
      localStorage.getItem("recent_users") || "[]",
    );

    // Slice to keep only the latest 4 items for layout balance
    setRecentRepos(storedRepos.slice(0, 4));
    setRecentUsers(storedUsers.slice(0, 4));
  }, []);

  // Animation variants for the structural history deck blocks
  const containerVariants = {
    hidden: { opacity: 0, y: 15 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, delay: 0.2, staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, scale: 0.95 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: { type: "spring", stiffness: 200, damping: 18 },
    },
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] gap-10">
      {/* 1. Core Hero Callout Sheet Container */}
      <div className="text-center bg-slate-950/40 backdrop-blur-xl p-8 md:p-12 rounded-2xl border border-slate-800/60 max-w-2xl w-full shadow-2xl relative group">
        <div className="absolute inset-0 border border-transparent group-hover:border-blue-500/10 rounded-2xl transition-all duration-500 pointer-events-none" />

        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4 bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400">
          Welcome to GitScope
        </h1>

        <p className="text-sm md:text-base text-slate-400 mb-8 leading-relaxed max-w-md mx-auto">
          A premium developer engine designed to search, track, and monitor
          GitHub repositories and profiles seamlessly.
        </p>

        {/* Core Entry Routing Triggers */}
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Link
            to="/search/repo"
            className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium px-6 py-3 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm tracking-wide"
          >
            Search Repositories &rarr;
          </Link>
          <Link
            to="/search/user"
            className="inline-block bg-slate-900 border border-slate-800 hover:bg-slate-850 hover:border-slate-700 text-slate-300 font-medium px-6 py-3 rounded-lg shadow-lg hover:-translate-y-0.5 transition-all duration-200 text-sm tracking-wide"
          >
            Search Profiles &rarr;
          </Link>
        </div>
      </div>

      {/* 2. Persistent Telemetry History Dock Section */}
      {(recentRepos.length > 0 || recentUsers.length > 0) && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          {/* Recent Repositories Grid Column */}
          <div className="bg-slate-950/20 backdrop-blur-md border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              <Clock className="w-3.5 h-3.5 text-blue-400" />
              <span>Recently Tracked Nodes</span>
            </div>

            {recentRepos.length === 0 ? (
              <p className="text-xs font-mono text-slate-600 italic py-2">
                No workspace history recorded.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentRepos.map((repo, i) => (
                  <motion.div key={i} variants={itemVariants}>
                    <Link
                      to={`/search/repo/${repo.name}/${repo.owner}`}
                      className="flex items-center gap-2.5 p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl hover:border-blue-500/30 hover:bg-slate-950/60 hover:-translate-y-0.5 transition-all duration-200 group/node text-left min-w-0"
                    >
                      <Folder className="w-4 h-4 text-slate-500 shrink-0 group-hover/node:text-blue-400 transition-colors" />
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-semibold text-slate-200 group-hover/node:text-blue-400 transition-colors truncate block">
                          {repo.name}
                        </span>
                        <span className="text-[9px] font-mono text-slate-500 truncate block">
                          {repo.owner}
                        </span>
                      </div>
                    </Link>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {/* Recent User Profiles Grid Column */}
          {/* Recent User Profiles Grid Column */}
          <div className="bg-slate-950/20 backdrop-blur-md border border-slate-900 rounded-2xl p-5 flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 text-xs font-mono font-bold uppercase tracking-wider text-slate-400 border-b border-slate-900 pb-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>Recently Audited Handles</span>
            </div>

            {recentUsers.length === 0 ? (
              <p className="text-xs font-mono text-slate-600 italic py-2">
                No terminal profiles recorded.
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {recentUsers.map((userObj, i) => {
                  // Safe extraction guard check to handle both string and object storage types safely
                  const nameString =
                    typeof userObj === "object" ? userObj?.username : userObj;

                  if (!nameString) return null;

                  return (
                    <motion.div key={i} variants={itemVariants}>
                      <Link
                        to={`/dashboard/users/${nameString}`}
                        className="flex items-center gap-2.5 p-3 bg-slate-900/30 border border-slate-800/50 rounded-xl hover:border-emerald-500/30 hover:bg-slate-950/60 hover:-translate-y-0.5 transition-all duration-200 group/node text-left min-w-0"
                      >
                        <User className="w-4 h-4 text-slate-500 shrink-0 group-hover/node:text-emerald-400 transition-colors" />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-mono font-medium text-slate-200 group-hover/node:text-emerald-400 transition-colors truncate block">
                            @{nameString}
                          </span>
                          <span className="text-[9px] font-mono text-slate-600 uppercase tracking-wide block">
                            Developer Node
                          </span>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default Home;
