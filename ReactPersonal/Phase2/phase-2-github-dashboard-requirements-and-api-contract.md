# GitHub Developer Dashboard — Requirements & API Contract

## 1. Project Goal

Build a GitHub Developer Dashboard to consolidate React Phase 2.

The application lets a user discover GitHub repositories and users, inspect repository information, save favorites, view recently visited repositories, and compare repositories.

This document contains only:
- Product requirements
- Required data
- GitHub API contracts

It intentionally does **not** prescribe React architecture, folders, components, hooks, state management, or implementation.

---

# 2. Requirements

## Repository Search

The user can:
- Search GitHub repositories by keyword.
- Use GitHub search qualifiers.
- Browse results.
- Paginate results.
- Open a repository.

Each result shows:
- Repository name
- Owner
- Description
- Primary language
- Stars
- Forks
- Open issues
- GitHub URL

Handle loading, empty, and error states.

## Repository Details

Show:
- Repository name
- Full name
- Owner
- Description
- GitHub URL
- Homepage
- Primary language
- Stars
- Watchers
- Forks
- Open issues
- Topics
- License
- Default branch
- Repository size
- Created date
- Updated date
- Last push date
- Archived status
- Visibility

Additional information:
- Contributors
- Issues
- Pull requests
- Commits
- Languages
- Releases

## User Search

The user can:
- Search GitHub users.
- Browse results.
- Open a user profile.

Each result shows:
- Username
- Avatar
- GitHub profile URL
- Account type

## User Details

Show:
- Username
- Avatar
- Name
- Bio
- Company
- Location
- Blog
- Followers
- Following
- Public repositories
- Public gists
- GitHub profile URL
- Account creation date

Also show the user's public repositories.

## Favorites

The user can:
- Add a repository to favorites.
- Remove a repository from favorites.
- View all favorites.

## Recently Viewed

Maintain recently viewed repositories.

Requirements:
- Opening a repository adds it.
- Opening an existing repository moves it to the most recent position.
- No duplicates.
- Fixed maximum size.

Suggested maximum: 10.

## Repository Comparison

Allow two repositories to be compared.

Show:
- Repository name
- Owner
- Stars
- Forks
- Watchers
- Open issues
- Primary language
- Size
- Created date
- Updated date
- Archived status

## General

Handle:
- Loading
- Empty results
- API errors
- Invalid/non-existent repositories
- Invalid/non-existent users
- GitHub rate-limit failures

Initial version does not require GitHub authentication.

---

# 3. GitHub REST API

Base URL:

`https://api.github.com`

Official documentation:

`https://docs.github.com/en/rest`

---

## Repository Search

### Endpoint

`GET /search/repositories`

### Example

`GET /search/repositories?q=react`

### Query parameters

`q`, `sort`, `order`, `page`, `per_page`

### Example queries

`q=react`

`q=react+language:javascript`

`q=react+stars:>10000`

`q=machine-learning+language:python`

### Response

```json
{
  "total_count": 0,
  "incomplete_results": false,
  "items": []
}
```

### Useful repository fields

`id`, `name`, `full_name`, `owner`, `html_url`, `description`, `language`, `stargazers_count`, `watchers_count`, `forks_count`, `open_issues_count`, `topics`, `license`, `default_branch`, `created_at`, `updated_at`, `pushed_at`, `size`, `archived`, `fork`, `visibility`

---

## Repository Details

### Endpoint

`GET /repos/{owner}/{repo}`

### Example

`GET /repos/facebook/react`

### Useful fields

`id`, `name`, `full_name`, `owner`, `html_url`, `description`, `homepage`, `language`, `languages_url`, `stargazers_count`, `watchers_count`, `forks_count`, `open_issues_count`, `topics`, `license`, `default_branch`, `created_at`, `updated_at`, `pushed_at`, `size`, `archived`, `fork`, `visibility`

---

## Contributors

### Endpoint

`GET /repos/{owner}/{repo}/contributors`

### Example

`GET /repos/facebook/react/contributors`

### Useful fields

`login`, `id`, `avatar_url`, `html_url`, `contributions`, `type`

### Query parameters

`page`, `per_page`

---

## Issues

### Endpoint

`GET /repos/{owner}/{repo}/issues`

### Query parameters

`state`, `sort`, `direction`, `labels`, `page`, `per_page`

### State values

`open`, `closed`, `all`

### Useful fields

`id`, `number`, `title`, `user`, `state`, `html_url`, `labels`, `created_at`, `updated_at`, `closed_at`, `comments`, `pull_request`

Note: GitHub's Issues API can return pull requests too. An item containing a `pull_request` field represents a pull request.

---

## Pull Requests

### Endpoint

`GET /repos/{owner}/{repo}/pulls`

### Query parameters

`state`, `sort`, `direction`, `page`, `per_page`

### State values

`open`, `closed`, `all`

### Useful fields

`id`, `number`, `title`, `user`, `state`, `html_url`, `created_at`, `updated_at`, `closed_at`, `merged_at`, `draft`

---

## Commits

### Endpoint

`GET /repos/{owner}/{repo}/commits`

### Query parameters

`sha`, `path`, `author`, `committer`, `since`, `until`, `page`, `per_page`

### Useful fields

`sha`, `html_url`, `commit`, `author`, `committer`

---

## Languages

### Endpoint

`GET /repos/{owner}/{repo}/languages`

### Example

`GET /repos/facebook/react/languages`

### Response

```json
{
  "JavaScript": 123456,
  "TypeScript": 98765,
  "HTML": 12345
}
```

Values represent detected code bytes for each language.

---

## Releases

### Endpoint

`GET /repos/{owner}/{repo}/releases`

### Useful fields

`id`, `tag_name`, `name`, `body`, `html_url`, `author`, `created_at`, `published_at`, `draft`, `prerelease`

---

## Topics

Topics are included in the repository response.

Dedicated endpoint:

`GET /repos/{owner}/{repo}/topics`

Useful response field:

`names`

---

## User Search

### Endpoint

`GET /search/users`

### Example

`GET /search/users?q=torvalds`

### Query parameters

`q`, `sort`, `order`, `page`, `per_page`

### Response

```json
{
  "total_count": 0,
  "incomplete_results": false,
  "items": []
}
```

### Useful fields

`login`, `id`, `avatar_url`, `html_url`, `type`

---

## User Details

### Endpoint

`GET /users/{username}`

### Example

`GET /users/torvalds`

### Useful fields

`login`, `id`, `avatar_url`, `html_url`, `name`, `company`, `blog`, `location`, `email`, `bio`, `twitter_username`, `public_repos`, `public_gists`, `followers`, `following`, `created_at`, `updated_at`

Some fields may be unavailable depending on the user and authentication context.

---

## User Repositories

### Endpoint

`GET /users/{username}/repos`

### Query parameters

`type`, `sort`, `direction`, `page`, `per_page`

---

## User Followers

### Endpoint

`GET /users/{username}/followers`

---

## User Following

### Endpoint

`GET /users/{username}/following`

---

# 4. Pagination

GitHub REST endpoints commonly support:

`page`

`per_page`

Example:

`GET /search/repositories?q=react&page=2&per_page=20`

GitHub also provides pagination information through HTTP response headers.

---

# 5. Errors

The application should account for:

- `401` — Unauthorized
- `403` — Forbidden / rate-limit-related responses
- `404` — Resource not found
- `422` — Validation/unprocessable request
- `429` — Too many requests, where applicable
- `5xx` — GitHub server errors

Use GitHub's current documentation as the source of truth for exact error and rate-limit behavior.

---

# 6. Completion Criteria

The user can:

- Search repositories.
- Browse repository results.
- View repository details.
- View contributors.
- View issues.
- View pull requests.
- View commits.
- View languages.
- View releases.
- Search users.
- View user profiles.
- View user repositories.
- Favorite repositories.
- View favorites.
- View recently viewed repositories.
- Compare two repositories.
- Paginate list results.
- Understand loading, empty, and error states.

The implementation is intentionally left completely open.
