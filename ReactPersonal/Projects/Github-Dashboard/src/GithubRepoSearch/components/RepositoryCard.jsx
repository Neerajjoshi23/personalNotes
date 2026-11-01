// components/RepositoryCard.jsx
import { useNavigate } from "react-router-dom";
import { Star, GitFork } from "lucide-react";

function RepositoryCard({ repo }) {
  const navigate = useNavigate();

  const repoOwner = repo?.owner?.login;
  const repoName = repo?.name;

  const handleCardClick = () => {
    if (repoName && repoOwner) {
      navigate(`/search/repo/${repoName}/${repoOwner}`);
    }
  };

  return (
    <div
      onClick={handleCardClick}
      className="w-full h-[120px] bg-slate-950/40 backdrop-blur-xl border border-slate-800/60 rounded-xl p-4 flex flex-col justify-between shadow-2xl hover:shadow-[0_8px_30px_rgb(0,0,0,0.5)] hover:border-blue-500/40 hover:bg-slate-900/60 hover:-translate-y-0.5 transition-all duration-300 ease-out cursor-pointer group select-none"
    >
      <div className="flex flex-col gap-1 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          {/* Repo Title Target Link */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              window.open(repo.html_url, "_blank", "noopener,noreferrer");
            }}
            className="text-sm font-bold text-slate-100 group-hover:text-blue-400 transition-colors truncate block relative z-10 tracking-tight text-left cursor-pointer"
          >
            {repoName}
          </button>

          {/* Owner Handle Subtitle */}
          {repoOwner && (
            <span className="text-[10px] font-mono font-bold text-slate-400 bg-slate-900/80 px-1.5 py-0.5 rounded border border-slate-800 max-w-[40%] truncate group-hover:text-slate-200 transition-colors">
              {repoOwner}
            </span>
          )}
        </div>

        {/* Description Block */}
        <p className="text-xs leading-relaxed text-slate-400 line-clamp-1 mt-1 group-hover:text-slate-300 transition-colors text-left">
          {repo.description || "No project overview description provided."}
        </p>
      </div>

      {/* Lower Details Info Panel Bar */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 border-t border-slate-900/60 pt-2">
        <span className="bg-slate-900/60 text-slate-400 px-2 py-0.5 rounded-md border border-slate-800/40 group-hover:text-slate-300 group-hover:border-slate-700 transition-all duration-300">
          {repo.language || "Unknown"}
        </span>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 group-hover:text-amber-400 transition-colors">
            <Star className="w-3.5 h-3.5 stroke-[2]" />
            {repo.stargazers_count?.toLocaleString() || 0}
          </span>
          <span className="flex items-center gap-1 group-hover:text-purple-400 transition-colors">
            <GitFork className="w-3.5 h-3.5 stroke-[2]" />
            {repo.forks_count?.toLocaleString() || 0}
          </span>
        </div>
      </div>
    </div>
  );
}

export default RepositoryCard;
