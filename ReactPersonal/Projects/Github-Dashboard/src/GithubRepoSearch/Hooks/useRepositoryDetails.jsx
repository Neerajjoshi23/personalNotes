// Hooks/useRepositoryDetails.js

import { useQueries, useQuery } from "@tanstack/react-query";
import {
  fetchRepositoryDetails,
  fetchRepositorySubData,
} from "../api/repository";

function useRepositoryDetails(owner, repo) {
  const Queries = useQueries({
    queries: [
      {
        queryKey: ["repository", owner, repo],
        queryFn: () => fetchRepositoryDetails(owner, repo),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "contributors"],
        queryFn: () => fetchRepositorySubData(owner, repo, "contributors"),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "issues"],
        queryFn: () => fetchRepositorySubData(owner, repo, "issues"),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "pulls"],
        queryFn: () => fetchRepositorySubData(owner, repo, "pulls"),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "commits"],
        queryFn: () => fetchRepositorySubData(owner, repo, "commits"),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "languages"],
        queryFn: () => fetchRepositorySubData(owner, repo, "languages"),
        enabled: Boolean(owner && repo),
      },
      {
        queryKey: ["repository", owner, repo, "releases"],
        queryFn: () => fetchRepositorySubData(owner, repo, "releases"),
        enabled: Boolean(owner && repo),
      },
    ],
  });
  return Queries;
}

export default useRepositoryDetails;
