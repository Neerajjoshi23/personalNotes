import { apiClient } from "../../Shared/api/apiClient";

export async function fetchSearchedRepostory(
  query,
  page = 1,
  sortBy = "",
  perPage = 10,
) {
  try {
    let endpoint = `/search/repositories?q=${encodeURIComponent(query)}&page=${page}&per_page=${perPage}`;
    // Conditionally apply sorting parameters if selected
    if (sortBy) {
      endpoint += `&sort=${sortBy}&order=desc`;
    }
    return await apiClient(endpoint);
  } catch (e) {
    console.error(
      "something went wrong while calling the fetchSearchedRepostory API: " +
        e.message,
    );

    // Optional: Re-throw the error so React Query knows the request failed
    throw e;
  }
}
export async function fetchRepositoryDetails(owner, repo) {
  try {
    const endpoint = `/repos/${owner}/${repo}`;
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
export async function fetchRepositorySubData(owner, repo, subPath) {
  try {
    // subPath examples: 'contributors', 'languages', 'releases', 'issues', 'pulls'
    const endpoint = `/repos/${owner}/${repo}/${subPath}`;
    return await apiClient(endpoint);
  } catch (e) {
    console.error(
      `Error resolving subPath metadata [${subPath}]: ` + e.message,
    );
    throw e;
  }
}
