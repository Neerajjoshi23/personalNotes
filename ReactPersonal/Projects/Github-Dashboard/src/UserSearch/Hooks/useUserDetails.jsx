import { useQueries } from "@tanstack/react-query";
import { fetchUserDetails, fetchUserSubData } from "../api/user";
export default function useUserDetails({ username }) {
  const Queries = useQueries({
    queries: [
      {
        queryKey: ["user", username],
        queryFn: () => fetchUserDetails(username),
        enabled: Boolean(username),
      },
      {
        queryKey: ["user", username, "repos"],
        queryFn: () => fetchUserSubData(username, "repos"),
        enabled: Boolean(username),
      },
      {
        queryKey: ["user", username, "followers"],
        queryFn: () => fetchUserSubData(username, "followers"),
        enabled: Boolean(username),
      },
      {
        queryKey: ["user", username, "following"],
        queryFn: () => fetchUserSubData(username, "following"),
        enabled: Boolean(username),
      },
    ],
  });
  return Queries;
}
