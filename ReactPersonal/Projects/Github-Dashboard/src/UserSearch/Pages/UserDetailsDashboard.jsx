import React from "react";
import { useParams } from "react-router-dom";
import { useEffect } from "react";
import useUserDetails from "../Hooks/useUserDetails";
import ProfileCard from "../components/ProfileCard";
import ReposList from "../components/ReposList";
import ConnectionsGrid from "../components/ConnectionsGrid";

export default function UserDetailsDashboard() {
  const { username } = useParams(); // Hooks into the reactive URL path router context cleanly
  useEffect(() => {
    if (username) {
      const currentHistory = JSON.parse(
        localStorage.getItem("recent_users") || "[]",
      );

      // Filter by looking at the property key matching standard arrays
      const filteredHistory = currentHistory.filter((item) =>
        typeof item === "object"
          ? item.username !== username
          : item !== username,
      );

      // Prepend the profile as a uniform tracking object architecture layer
      filteredHistory.unshift({ username });

      localStorage.setItem(
        "recent_users",
        JSON.stringify(filteredHistory.slice(0, 10)),
      );
    }
  }, [username]);

  const [profileQuery, reposQuery, followersQuery, followingQuery] =
    useUserDetails({ username });

  return (
    <div className="w-full py-4 relative">
      {/* Target Ellipse Lighting Flare - Layered specifically within the user workspace */}
      <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-[800px] h-[300px] bg-gradient-to-b from-indigo-500/10 via-blue-500/5 to-transparent rounded-full blur-[100px] pointer-events-none z-0" />

      {/* Main Structural Layout Matrix */}
      <div className="relative z-10 space-y-6">
        {/* Core Profile Identity Details - Placed in a premium dark glass plate inside component */}
        <div className="hover:-translate-y-0.5 transition-all duration-200">
          <ProfileCard query={profileQuery} />
        </div>

        {/* Operational Telemetry Analytics Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Repositories Analytics Column */}
          <div className="lg:col-span-1 hover:-translate-y-0.5 transition-all duration-200">
            <ReposList query={reposQuery} />
          </div>

          {/* Social Graph Connections Workspace Grid */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="hover:-translate-y-0.5 transition-all duration-200">
              <ConnectionsGrid
                query={followersQuery}
                title="Followers Registry"
                variant="followers"
              />
            </div>

            <div className="hover:-translate-y-0.5 transition-all duration-200">
              <ConnectionsGrid
                query={followingQuery}
                title="Following Registry"
                variant="following"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
