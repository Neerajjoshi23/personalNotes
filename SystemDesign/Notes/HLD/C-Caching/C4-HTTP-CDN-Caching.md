# C4 · HTTP/CDN caching: make the browser and edge do the work

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** URL shortener (#1), News feed (#4), Dropbox / Google Drive (#5), YouTube / Netflix (#6), Instagram (#11), frontend system design questions

---

## Why this topic matters

Backend caching usually means Redis. Frontend and media-heavy system design usually means **HTTP caching + CDN**. If you set headers correctly, the browser and edge serve most bytes without your app servers doing anything. If you set them wrong, users see stale HTML, private data leaks through shared caches, or every refresh re-downloads hashed JavaScript.

| Asset | Good default |
|---|---|
| HTML document | cache briefly or revalidate; do not make it immutable |
| Hashed JS/CSS | `Cache-Control: public, max-age=31536000, immutable` |
| Images/media with content hash | long cache + CDN |
| User-specific API | `private, no-cache` or `no-store` depending sensitivity |
| Public API response | `s-maxage` for CDN + short browser cache/revalidation |

**Interview line:** "I separate deployable HTML from content-hashed assets: HTML revalidates so users discover new builds; hashed JS/CSS is immutable and can live in browser/CDN caches for a year."

---

## Part 1: HTTP caching vocabulary

HTTP caching is controlled by response headers. A cache can be the browser, a corporate proxy, a CDN POP, a regional edge cache, or a service worker.

```
Browser cache -> CDN edge POP -> regional edge/origin shield -> origin
       hit             hit                  hit                 DB/app
```

### Fresh vs stale

A cached response is **fresh** until its freshness lifetime ends. Fresh responses can be served without asking the origin. A **stale** response needs revalidation or must be refetched.

`Cache-Control: max-age=300` means "fresh for 300 seconds from the response time" for the cache that receives it.

### Browser/private cache vs shared cache

- **Private cache:** one user's browser cache.
- **Shared cache:** CDN/proxy cache used by many users.

This distinction drives security. A personalized dashboard must not be stored in a shared cache. Static JS can be shared by everyone.

### Important Cache-Control directives

| Directive | Meaning | Interview use |
|---|---|---|
| `public` | any cache may store | static public assets |
| `private` | browser may store; shared caches should not | user-specific but not ultra-sensitive responses |
| `max-age=60` | browser freshness lifetime | short client-side caching |
| `s-maxage=600` | shared-cache freshness lifetime; overrides `max-age` for shared caches | CDN caches public API longer than browser |
| `no-cache` | may store, but must revalidate before reuse | HTML or APIs needing freshness check |
| `no-store` | do not store at all | banking, tokens, highly sensitive pages |
| `must-revalidate` | once stale, cannot serve without successful validation | stricter correctness |
| `immutable` | content will not change while fresh | hashed assets |
| `stale-while-revalidate=30` | serve stale briefly while refreshing in background | latency-friendly public content |

The confusing one is `no-cache`: it does **not** mean "do not store." It means "store, but ask the origin before using."

**Interview line:** "`no-store` is for sensitive data; `no-cache` is for data that can be stored but must be revalidated."

---

## Part 2: validation with ETag and Last-Modified

Revalidation lets the client ask, "Is my cached copy still valid?" If yes, the server returns `304 Not Modified` with no body.

### ETag

An `ETag` is a validator, often a content hash or version.

```http
HTTP/1.1 200 OK
ETag: "profile-42-v18"
Cache-Control: private, no-cache
```

Next request:

```http
GET /api/profile
If-None-Match: "profile-42-v18"
```

If unchanged:

```http
HTTP/1.1 304 Not Modified
```

ETag is more precise than timestamps. It works well for API responses and static assets.

### Last-Modified

`Last-Modified` + `If-Modified-Since` uses timestamps. It is easy but less precise: clocks and one-second granularity can be awkward.

Use `ETag` when you can. `Last-Modified` is still common for files.

### Strong vs weak ETags

A strong ETag means byte-for-byte identity. A weak ETag (`W/"..."`) means semantically equivalent enough for caching but not byte-identical. Most interviews do not require this, but knowing the idea helps if someone asks about compression or generated pages.

---

## Part 3: Vary, cache keys and correctness

A cache key is not just the URL. It may include host, path, query params, selected headers, cookies, method, protocol and device-related dimensions. If you forget a dimension, one user's response can be served to another user.

### `Vary`

`Vary` tells caches which request headers change the response.

```http
Vary: Accept-Encoding
```

This is common because gzip/br/compression changes bytes. Other examples:

```http
Vary: Accept-Language
Vary: Origin
```

Be careful with `Vary: Cookie` or `Vary: User-Agent`; it can explode cache cardinality and destroy hit ratio.

### CDN cache keys

CDNs let you configure which query strings, headers and cookies are part of the cache key. This is where many real bugs happen.

Bad:

```text
/feed?userId=42 cached without userId/cookie in key -> leak user 42's feed
```

Good:

```text
Public asset: key = host + path
Public API:   key = host + path + selected query params + Accept-Encoding
Private API:  do not store in shared cache
```

For frontend system design, always say what makes a response vary: locale, auth state, AB test, device class, query params.

---

## Part 4: CDN behavior

A CDN is a distributed shared cache close to users. CloudFront's basic flow is:

1. DNS routes the viewer to a nearby edge POP.
2. Edge checks its cache.
3. On miss, edge fetches from origin or regional edge/origin shield.
4. It streams bytes back to the user and stores the object for later.

```
User
  |
  v
Nearest edge POP -- miss --> regional edge / origin shield -- miss --> origin
  | hit                         | hit                         |
  v                             v                             v
fast response               fewer origin hits              app/S3
```

### Origin shield / regional edge cache

Without a shield, many POPs can miss and hit origin independently. A regional layer collapses misses: POPs fetch from a larger shared cache before going to origin. This is the CDN version of request coalescing.

Use it for media, large images, downloads and public pages with global traffic.

### Invalidation and versioned filenames

There are two ways to remove stale CDN content:

- **Invalidation/purge:** tell CDN to evict `/app.js`.
- **Versioned filenames:** deploy `/app.9f3a1c.js`; old file can live forever.

Prefer versioned filenames for static build assets. Use invalidation for emergency changes or non-versioned URLs like `/index.html`.

```
Bad:  /app.js with max-age=1 year
Good: /app.9f3a1c.js with max-age=1 year, immutable
```

### Signed URLs

Signed URLs let a CDN serve private-ish content without sending every byte through your app server. The app authenticates the user, issues a URL with expiry/signature, and the CDN verifies it.

Use for:

- private video downloads;
- paid course media;
- recording files in a meeting product;
- temporary access to user uploads.

Do not put secrets in the path/query beyond the signed token, and keep expiry appropriate to risk.

---

## Part 5: what a frontend engineer should set

### HTML

HTML points to the current JS/CSS bundle. It should not be cached forever because then users can get stuck on an old app shell.

Typical:

```http
Cache-Control: no-cache
ETag: "html-build-2026-09-30"
```

This allows the browser to store HTML but revalidate before reuse. Some apps use `max-age=0, must-revalidate`. If the HTML is highly personalized/sensitive, use `private, no-cache` or `no-store`.

### Hashed JS/CSS

Build output should include content hashes:

```text
main.8d31f2.js
styles.a91bd0.css
```

Headers:

```http
Cache-Control: public, max-age=31536000, immutable
```

Because the filename changes when content changes, a one-year cache is safe. This is one of the highest-leverage frontend performance wins.

### Images and fonts

If versioned or content-addressed:

```http
Cache-Control: public, max-age=31536000, immutable
```

If user-uploaded at stable URLs and may be replaced:

```http
Cache-Control: public, max-age=3600, stale-while-revalidate=86400
```

For avatars, a version query or path is better: `/avatar/u42?v=18`.

### APIs

For authenticated user-specific APIs:

```http
Cache-Control: private, no-cache
ETag: "user-42-feed-v99"
```

For sensitive data:

```http
Cache-Control: no-store
```

For public APIs:

```http
Cache-Control: public, max-age=30, s-maxage=300, stale-while-revalidate=60
```

That means browsers consider it fresh briefly, while the CDN can serve it longer.

### Service workers

A service worker can implement app-specific caching, but it also adds another cache layer to debug. In frontend system design, mention it for offline support and predictable asset caching, not as a replacement for correct HTTP headers.

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| SPA/Next HTML shell | `no-cache` + ETag | users discover new builds but avoid full body download |
| Hashed JS/CSS | `public, max-age=31536000, immutable` | content hash makes it safe |
| Product images | CDN + long cache if versioned | heavy bytes belong at edge |
| User avatar at stable URL | version URL or short TTL | users expect updates |
| Public feed/trending API | CDN with `s-maxage` + `stale-while-revalidate` | absorbs traffic spikes |
| Authenticated dashboard API | `private, no-cache` | browser may store; shared caches must not |
| Payment/bank/token response | `no-store` | avoid writing to disk/shared caches |
| Paid video/download | signed CDN URL | edge serves bytes while app controls access |
| Emergency bad asset | CDN invalidation | purge non-versioned/bad content |

### Common interview traps

- Saying `no-cache` when you mean `no-store`.
- Caching HTML for a year and trapping users on old bundle references.
- Forgetting `Vary` / cache-key dimensions and leaking personalized responses.
- Adding `Vary: Cookie` everywhere and destroying CDN hit ratio.
- Relying only on purge for deploys instead of hashed filenames.
- Caching authenticated APIs in a shared CDN without explicit `private`/cache-key controls.

---

## Self-test (answer out loud first, then open)

<details><summary>1. What is the difference between <code>no-cache</code> and <code>no-store</code>?</summary>

`no-cache` may store the response but must revalidate before reuse. `no-store` means do not store the response at all. Use `no-store` for highly sensitive data; use `no-cache` for HTML or user-specific data that can be stored but needs freshness validation.
</details>

<details><summary>2. Why should hashed JS/CSS use a one-year immutable cache?</summary>

The filename changes when content changes, so the old URL always identifies the old content. That makes long caching safe and avoids repeat downloads. HTML should revalidate because it points to the latest hashed assets.
</details>

<details><summary>3. How does ETag revalidation save bandwidth?</summary>

The client sends `If-None-Match` with its cached ETag. If the resource is unchanged, the server returns `304 Not Modified` without the body, so the browser reuses its cached body.
</details>

<details><summary>4. What does <code>s-maxage</code> do?</summary>

It sets freshness lifetime for shared caches such as CDNs and overrides `max-age` for those shared caches. It lets you cache longer at the edge than in the browser.
</details>

<details><summary>5. What is <code>Vary</code>, and how can it hurt?</summary>

`Vary` tells caches which request headers affect the response. It prevents serving the wrong variant, but high-cardinality headers like `Cookie` or `User-Agent` can explode cache keys and kill hit ratio.
</details>

<details><summary>6. CDN invalidation vs versioned filenames: which is better for JS deploys?</summary>

Versioned filenames are better. `app.hash.js` can be cached forever because new content gets a new URL. Invalidation is useful for emergencies or non-versioned resources like `/index.html`, but it is slower and operationally noisier.
</details>

<details><summary>7. How would you cache an authenticated profile API?</summary>

Usually `Cache-Control: private, no-cache` plus ETag. The browser may store it but must revalidate; shared caches should not store it. For highly sensitive data, use `no-store`.
</details>

<details><summary>8. In a video system, why use signed CDN URLs?</summary>

The app can authorize the user and issue a temporary signed URL, while the CDN serves the heavy video bytes from edge locations. This keeps origin/app load low while preserving access control.
</details>

---

## My notes (write from memory after reading)

- 
- 
- 

**One thing I'd have got wrong before reading this:**

---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| [MDN: HTTP caching](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Caching) | Exact headings: Types of caches, Private caches, Shared cache, Heuristic caching, Fresh and stale based on age, Expires or max-age, Vary, Validation, If-Modified-Since, ETag/If-None-Match, Force Revalidation | ~35 min |
| [CloudFront: How CloudFront delivers content](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/HowCloudFrontWorks.html) | Exact headings: How CloudFront delivers content to your users, How CloudFront works with regional edge caches | ~15 min |
| [CloudFront: Control the cache key with a policy](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/controlling-the-cache-key.html) | Cache key configuration: query strings, headers and cookies | ~10 min |
| [CloudFront: Invalidate files](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation.html) | Exact headings: Invalidate files to remove content, Choose between invalidating files and using versioned file names | ~10 min |
| [CloudFront: Signed URLs](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-signed-urls.html) | Exact headings: Use signed URLs, How signed URLs work, Decide how long signed URLs are valid | ~10 min |
| [CloudFront: Origin Shield](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/origin-shield.html) | Exact headings: Use Amazon CloudFront Origin Shield, Use cases for Origin Shield, Enable Origin Shield | optional |

**Connects to:** [C1 Cache patterns](C1-Cache-Patterns.md) · [C3 Eviction + failure modes](C3-Eviction-Failure-Modes.md) · [F1 Object storage + presigned URLs](../F-Blobs-Fanout/F1-Object-Storage-Presigned-URLs.md) · [F2 Video pipeline](../F-Blobs-Fanout/F2-Video-Pipeline.md) · [FE5 Performance](../../../../ReactPersonal/Info/frontend-system-design/FE5-Performance.md)
