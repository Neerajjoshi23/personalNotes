# GitScope — GitHub Explorer Dashboard

A React + Vite dashboard for exploring GitHub repositories and users, built on top of the public GitHub REST API. State management, data fetching, and pagination/virtualization logic were hand-written; visual styling was assisted by AI (Tailwind classes, layout polish).

## Features

- **Repository search** — debounced search across GitHub repositories with sort options (best match, stars, forks, recently updated).
- **Two browsing modes** — toggle between classic page-by-page pagination and infinite virtualized scrolling for repo results.
- **Repository details** — single page aggregating overview, languages, contributors, issues, pull requests, commits, and releases for a repo.
- **User search** — debounced user search with paginated results.
- **User dashboard** — profile card plus repos, followers, and following, all fetched in parallel.
- **Recent history** — last 10 viewed repos/users persisted to `localStorage`.
- **Keyboard shortcut** — `Cmd/Ctrl + K` focuses the active search bar.

## Tech Stack

- React 19 + React Router 7
- TanStack Query 5 (`useQuery`, `useInfiniteQuery`, `useQueries`)
- Tailwind CSS 4
- Framer Motion (route transition animations)
- Vite 8

## Architecture

```
src/
├── GithubRepoSearch/   # Repo search + repo details feature module
│   ├── api/            # fetchSearchedRepostory, fetchRepositoryDetails, fetchRepositorySubData
│   ├── Hooks/          # useRepositoryDetails (useQueries fan-out), useDebounce
│   ├── components/     # RepositoryList, VirtualRepositoryList, RepositoryCard, ...
│   └── Pages/          # GitHubRepoSearch.jsx, RepoDetails.jsx
├── UserSearch/         # User search + user dashboard feature module
│   ├── api/            # fetchSearchedUsers, fetchUserDetails, fetchUserSubData
│   ├── Hooks/          # useUserDetails (useQueries fan-out), useDebounce
│   ├── components/     # UserCard, ProfileCard, ReposList, ConnectionsGrid, ...
│   └── Pages/          # UserSearchPage.jsx, UserDetailsDashboard.jsx
└── Shared/             # apiClient, SearchBar, Home, NotFound
```

Each feature module (`GithubRepoSearch`, `UserSearch`) is self-contained with its own `api/`, `Hooks/`, `components/`, and `Pages/` — a lightweight feature-folder structure rather than a global `hooks/` or `services/` layer.

### Data fetching

- `Shared/api/apiClient.js` wraps `fetch` with GitHub's auth header, `Accept` header, and API version header, and throws on non-OK responses.
- Detail pages (`RepoDetails`, `UserDetailsDashboard`) fan out several related endpoints in parallel with `useQueries` rather than waterfalling sequential requests.
- Search pages debounce the raw input (500ms via `useDebounce`) before it becomes part of the TanStack Query key, so typing doesn't fire a request per keystroke.
- The repo search page runs two mutually-exclusive TanStack Query hooks (`useQuery` for pagination, `useInfiniteQuery` for infinite scroll) gated by an `enabled` flag, and normalizes both into one `currentRepos` shape for rendering.

### Virtualization

`VirtualRepositoryList` implements manual list virtualization (no external virtualization library): it tracks `scrollTop`, computes a visible index range with a small buffer, renders only that slice absolutely-positioned inside a full-height spacer `div`, and triggers `fetchNextPage` once the rendered window nears the end of the loaded data.

## Getting Started

```bash
npm install
```

Create a `.env` file in the project root:

```
VITE_GITHUB_TOKEN=your_github_personal_access_token
```

A token isn't strictly required for GitHub's public read endpoints, but without one you'll hit the unauthenticated rate limit (60 requests/hour) very quickly.

```bash
npm run dev       # start dev server
npm run build     # production build
npm run lint      # eslint
npm run preview   # preview production build
```
