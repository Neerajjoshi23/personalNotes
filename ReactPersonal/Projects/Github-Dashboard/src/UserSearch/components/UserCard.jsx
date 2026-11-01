import React from "react";
import { useNavigate } from "react-router-dom"; // 👈 Import the hook

export default function UserCard({ user }) {
  const navigate = useNavigate(); // 👈 Initialize navigation controller

  const handleCardClick = (e) => {
    // Stop routing if the user explicitly clicked the external link button
    if (e.target.closest("a")) return;

    // Navigate to the user details dashboard route
    // Adjust this path format to match your project's routing structure
    navigate(`/dashboard/users/${user.login}`);

    // OR if you are using query parameters instead of URL paths:
    // navigate(`?username=${user.login}`);
  };

  return (
    <div
      onClick={handleCardClick}
      className="group bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-xl p-5 hover:border-slate-700/80 hover:-translate-y-0.5 hover:bg-slate-950/60 active:scale-[0.99] transition-all duration-300 flex items-center justify-between shadow-lg shadow-slate-950/20 cursor-pointer"
    >
      <div className="flex items-center gap-4">
        {/* Profile Avatar Frame Overlay */}
        <div className="relative w-12 h-12 rounded-xl overflow-hidden border border-slate-800 group-hover:border-slate-700/80 transition-colors">
          <img
            src={user.avatar_url}
            alt={user.login}
            className="w-full h-full object-cover grayscale-[20%] group-hover:grayscale-0 transition-all duration-300"
          />
        </div>

        {/* Identity Metatag Labels */}
        <div className="space-y-1">
          <h4 className="font-medium text-slate-200 group-hover:text-indigo-400 transition-colors truncate max-w-[140px]">
            {user.login}
          </h4>
          <span className="inline-block text-[10px] font-mono tracking-wider uppercase px-1.5 py-0.5 rounded bg-slate-900 text-slate-400 border border-slate-800/80">
            {user.type}
          </span>
        </div>
      </div>

      {/* Explicit GitHub Redirection Anchor Link */}
      <a
        href={user.html_url}
        target="_blank"
        rel="noreferrer"
        className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-all duration-200 text-xs font-mono relative z-10"
      >
        Profile ↗
      </a>
    </div>
  );
}
