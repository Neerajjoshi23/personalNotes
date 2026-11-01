// pages/RepoDetails.jsx
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import useRepositoryDetails from "../Hooks/useRepositoryDetails";
import RepositoryOverview from "../components/RepositoryOverview.jsx";
import RepositoryContributors from "../components/RepositoryContributors.jsx";
import RepositoryIssues from "../components/RepositoryIssues.jsx";
import RepositoryPullRequests from "../components/RepositoryPullRequests.jsx";
import RepositoryCommits from "../components/RepositoryCommits.jsx";
import RepositoryLanguages from "../components/RepositoryLanguages.jsx";
import RepositoryReleases from "../components/RepositoryReleases.jsx";

export default function RepoDetails() {
  const { owner, repo } = useParams();
  useEffect(() => {
    if (repo && owner) {
      const currentHistory = JSON.parse(
        localStorage.getItem("recent_repos") || "[]",
      );

      // Filter out the item if it already exists to avoid duplication
      const updatedHistory = currentHistory.filter(
        (item) => !(item.name === repo && item.owner === owner),
      );

      // Prepend the new entry to the front of the array
      updatedHistory.unshift({ name: repo, owner });

      localStorage.setItem(
        "recent_repos",
        JSON.stringify(updatedHistory.slice(0, 10)),
      );
    }
  }, [repo, owner]);

  const [
    repository,
    contributors,
    issues,
    pulls,
    commits,
    languages,
    releases,
  ] = useRepositoryDetails(owner, repo);

  return (
    /* 🎨 DARK MESH WALLPAPER BACKGROUND FRAME */
    <main className="min-h-screen bg-slate-900 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.2),rgba(255,255,255,0))] py-8 antialiased text-slate-100 selection:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 flex flex-col gap-6">
        {/* 1. Full-Width Premium Top Header Section */}
        <RepositoryOverview query={repository} />

        {/* 2. Responsive Dashboard Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          {/* Left Sidebar Column (Languages Breakdown) */}
          <div className="lg:col-span-1 flex flex-col gap-6 lg:sticky lg:top-6">
            <RepositoryLanguages query={languages} />
          </div>

          {/* Right Main Grid Section (Metrics, Timelines & Contributors) */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Tracking Rows: Issues and PRs side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <RepositoryIssues query={issues} />
              <RepositoryPullRequests query={pulls} />
            </div>

            {/* Commit Log History Timeline */}
            <RepositoryCommits query={commits} />

            {/* Meta Logs: Contributors and Releases side-by-side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <RepositoryContributors query={contributors} />
              <RepositoryReleases query={releases} />
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
