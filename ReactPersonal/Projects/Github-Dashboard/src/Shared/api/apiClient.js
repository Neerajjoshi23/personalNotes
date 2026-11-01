// 1. Change this to the official GitHub API subdomain
const BASE_URL = "https://api.github.com";
const token = import.meta.env.VITE_GITHUB_TOKEN;
export async function apiClient(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;

  const defaultHeaders = {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    // 2. Add the API version header recommended by GitHub
    "X-GitHub-Api-Version": "2022-11-28",
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers: defaultHeaders });

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}
