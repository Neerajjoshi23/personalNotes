import { apiClient } from "../../Shared/api/apiClient";

export async function fetchSearchedUsers(query, page = 1, perPage = 10) {
  try {
    const endpoint = `/search/users?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    return await apiClient(endpoint);
  } catch (e) {
    console.error(
      "something went wrong while calling the fetchSearchedUsers API: " +
        e.message,
    );

    // Optional: Re-throw the error so React Query knows the request failed
    throw e;
  }
}
export async function fetchUserDetails(username) {
  try {
    const endpoint = `/users/${username}`;
    return await apiClient(endpoint);
  } catch (e) {
    console.error(
      "something went wrong while calling the fetchRepositoryDetails API: " +
        e.message,
    );

    // Optional: Re-throw the error so React Query knows the request failed
    throw e;
  }
}
// Dynamic Sub-Endpoint Adapter Layer for Array Bundles
export async function fetchUserSubData(username, subPath) {
  try {
    // subPath examples: 'contributors', 'languages', 'releases', 'issues', 'pulls'
    const endpoint = `/users/${username}/${subPath}`;
    return await apiClient(endpoint);
  } catch (e) {
    console.error(
      `Error resolving subPath metadata [${subPath}]: ` + e.message,
    );
    throw e;
  }
}
