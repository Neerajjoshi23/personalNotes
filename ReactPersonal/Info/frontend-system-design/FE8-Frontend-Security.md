# FE8 · Frontend Security: browser defenses, sharp edges and interview trade-offs

> **Status:** [ ] Read the blog · [ ] Read the sources · [ ] Self-test passed · **Date:** ___
> **Used in:** Every FE question, especially E-commerce checkout, Chat (#3), Google Docs / DrawBoard (#12), Photo sharing / Instagram (#11), Video streaming (#6), Adobe Connect meeting/recording UI

---

## Why this topic matters

Frontend security is not "the backend's job". The browser is where untrusted data, user credentials, third-party scripts, iframes, device permissions and real-time content meet. A secure backend can still be compromised by a frontend that renders unsafe HTML, stores tokens in the wrong place, accepts any `postMessage`, or ships a malicious dependency.

Use your existing security roadmap as the deeper track: [security-learning-path.md](<C:\Users\neerajj\ReactPersonal\security-learning-path.md>). This note does not replace it; it gives the frontend-system-design answer shape.

| Threat | Frontend design question |
|---|---|
| XSS | Can attacker-controlled content execute in our origin? |
| CSRF | Can another site cause state-changing requests using the user's cookies? |
| Token theft | If JS is compromised, what can it steal or replay? |
| Clickjacking | Can another site frame our UI and trick clicks? |
| CORS mistakes | Are we exposing readable cross-origin responses to the wrong origins? |
| Supply chain | Can a dependency or CDN script become code execution in our origin? |
| Iframes/messages | Do embedded apps have least privilege and verified message origins? |

**Interview line:** "I start with trust boundaries: untrusted content entering React, credentials crossing browser/server, third-party code running in our origin, and cross-origin embedding. Then I layer framework escaping, sanitization, CSP, cookie attributes, CSRF defense and dependency controls."

---

## Part 1: XSS is code execution in your origin

Cross-site scripting means attacker-controlled data becomes executable JavaScript in your origin. Once that happens, the attacker can read same-origin data available to JS, perform actions as the user, call APIs, scrape DOM state, and pivot to other browser APIs.

### Three delivery mechanisms

| Type | Where payload lives | Example |
|---|---|---|
| **Reflected XSS** | Request/URL, immediately reflected in response | `/search?q=<script>...` rendered unsafely. |
| **Stored XSS** | Database/content store | Malicious meeting title or chat message rendered for every viewer. |
| **DOM-based XSS** | Client-side JS transforms source to sink | `location.hash` assigned to `innerHTML`. |

The defense depends on the **sink**, not just the input. The same string may be safe as text content and unsafe inside HTML, JS, CSS or URL context.

### React helps, but only for the common path

React escapes text interpolations by default:

```tsx
function ChatMessage({ text }: { text: string }) {
  return <p>{text}</p>; // rendered as text, not HTML
}
```

If `text = '<img src=x onerror=alert(1)>'`, React displays the string. Good.

React does **not** make these safe:

```tsx
// 1. Raw HTML rendering. Only render sanitized, trusted HTML.
<div dangerouslySetInnerHTML={{ __html: userProvidedHtml }} />

// 2. URL schemes. Validate allowed protocols.
<a href={userProvidedUrl}>Open</a> // javascript: URLs are the classic concern.

// 3. Third-party markdown/HTML renderers with unsafe plugins.
<Markdown>{userProvidedMarkdown}</Markdown>

// 4. Direct DOM APIs outside React.
element.innerHTML = userProvidedHtml;
```

A senior React answer says: render user content as text by default; if product requires rich text/HTML, sanitize on the server and/or client with an allowlist sanitizer, store canonical sanitized content or a safe document model, and keep CSP as defense-in-depth.

### Safe rich text model

For comments, meeting notes or DrawBoard sticky notes, prefer a structured document model over arbitrary HTML:

```ts
type RichNode =
  | { type: 'text'; text: string; marks?: Array<'bold' | 'italic' | 'code'> }
  | { type: 'link'; href: string; children: RichNode[] }
  | { type: 'paragraph'; children: RichNode[] };

function safeHref(href: string): string | undefined {
  const url = new URL(href, window.location.origin);
  return ['https:', 'http:', 'mailto:'].includes(url.protocol) ? url.toString() : undefined;
}
```

This moves security from "parse arbitrary HTML correctly forever" to "render a small safe grammar".

---

## Part 2: CSP is a blast-radius reducer, not a sanitizer

Content Security Policy tells the browser which scripts, styles, images, frames and connections are allowed. It is especially valuable when XSS slips through.

A modern strict CSP for a server-rendered app often uses nonces:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'nonce-r4nd0m' 'strict-dynamic';
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
  connect-src 'self';
  img-src 'self' data: https:;
  style-src 'self' 'nonce-r4nd0m';
  report-uri /csp-report;
```

Key ideas:
- **Nonce:** generated per response; inline scripts run only if the nonce matches.
- **`strict-dynamic`:** trust propagates from a nonce-bearing bootstrap script to scripts it loads, reducing fragile host allowlists.
- **`object-src 'none'`:** blocks old plugin surfaces.
- **`base-uri 'none'`:** prevents injected `<base>` from rewriting relative links.
- **`frame-ancestors`:** controls who can embed you; also a clickjacking defense.
- **Report-only rollout:** start with `Content-Security-Policy-Report-Only` to collect violations before blocking production.

CSP trade-offs in SPAs:
- Dev tooling often uses `eval`; production should not.
- Some CSS-in-JS solutions require nonce support.
- Third-party analytics/chat widgets can force weaker policies; isolate them if possible.
- CSP does not fix unsafe HTML. It reduces execution paths.

**Interview line:** "CSP is my seatbelt, not my brakes. I still sanitize and avoid dangerous sinks; CSP limits damage if a sink is missed."

---

## Part 3: CSRF, cookies and token storage

### CSRF mental model

CSRF happens when a malicious site causes the victim's browser to send a state-changing request to your site with the victim's cookies automatically attached.

It is different from XSS:
- XSS executes inside your origin.
- CSRF executes from another origin but rides ambient credentials like cookies.

Defenses:
1. Use `SameSite=Lax` or `Strict` cookies where possible.
2. Require a CSRF token for state-changing requests when using cookies.
3. Validate `Origin` / `Referer` for sensitive requests as a defense-in-depth signal.
4. Avoid state-changing GETs.
5. Consider Fetch Metadata headers on the server (`Sec-Fetch-Site`, etc.).

### Token storage trade-offs

| Storage | XSS exposure | CSRF exposure | Pros | Cons |
|---|---|---|---|---|
| **HttpOnly Secure SameSite cookie** | JS cannot read token | Cookies are ambient, so need SameSite/CSRF design | Best for web sessions; server can rotate/revoke | CSRF must be handled; cross-site flows need care. |
| **`localStorage` access token** | JS can read and exfiltrate if XSS happens | Not automatically sent | Easy SPA implementation | XSS turns into token theft; persistent until cleared. |
| **Memory-only access token + refresh cookie** | Harder to steal persistently; XSS can still use it while active | Refresh cookie needs CSRF design | Limits persistence of stolen access token | Refresh flow complexity; reload needs silent refresh. |
| **`sessionStorage`** | JS-readable | Not ambient | Per-tab isolation | Still XSS-readable and sync storage. |

Recommended interview answer for a normal web app:
- Use an `HttpOnly`, `Secure`, `SameSite=Lax` or `Strict` session/refresh cookie.
- Keep short-lived access tokens in memory if the API architecture requires bearer headers.
- Add CSRF tokens for unsafe methods if cookies authenticate those requests.
- Rotate sessions on login/privilege change and logout server-side.

Do not say "localStorage is always fine because React prevents XSS." React reduces common XSS, but modern apps render markdown, third-party content, analytics scripts and iframes. Assume XSS can happen and minimize what JS can steal.

### Example: CSRF token with cookie session

```ts
async function unsafeRequest(path: string, body: unknown) {
  const csrf = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
  return fetch(path, {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRF-Token': csrf ?? '',
    },
    body: JSON.stringify(body),
  });
}
```

The server validates the token and the session. The frontend's job is to consistently include the token; the security guarantee is server-side validation.

---

## Part 4: clickjacking, CORS and cross-origin isolation

### Clickjacking

Clickjacking frames your app under an attacker's page and tricks the user into clicking hidden UI.

Defenses:
- `Content-Security-Policy: frame-ancestors 'none'` or a specific allowlist.
- `X-Frame-Options: DENY` or `SAMEORIGIN` for older browser support.

For Adobe Connect, embedding may be a product feature: recordings or pods might appear in an LMS/portal. Then do not use `'none'`; use a specific `frame-ancestors` allowlist and a separate embed surface with reduced privileges.

### CORS is not CSRF protection

CORS controls whether browser JS can **read** a cross-origin response. It does not stop a browser from sending many cross-origin requests, and it does not protect cookie-authenticated state changes by itself.

Bad CORS patterns:
- Reflecting any `Origin` and setting `Access-Control-Allow-Credentials: true`.
- Using `Access-Control-Allow-Origin: *` with sensitive unauthenticated data.
- Treating lack of CORS as an API authorization layer. Non-browser clients do not care about CORS.

Good pattern:
- Maintain an explicit origin allowlist.
- Only allow credentials for origins that truly need them.
- Authorize every request server-side.

### Iframes and `postMessage`

Iframes are useful for isolation: payments, third-party widgets, previews, recording embeds. They are also a trust boundary.

Use sandboxing:

```html
<iframe
  src="/embed/recording/123"
  sandbox="allow-scripts allow-same-origin"
  referrerpolicy="strict-origin-when-cross-origin"
></iframe>
```

Only grant capabilities needed. `allow-scripts` + `allow-same-origin` together can be powerful for same-origin content, so separate origins are cleaner.

For `postMessage`:

```ts
const targetOrigin = new URL(iframe.src).origin;
iframe.contentWindow?.postMessage({ type: 'seek', seconds: 120 }, targetOrigin);

window.addEventListener('message', event => {
  if (event.origin !== targetOrigin) return;
  if (!isRecordingMessage(event.data)) return;
  handleRecordingMessage(event.data);
});
```

Rules:
- Never use `'*'` as `targetOrigin` for sensitive data.
- Verify `event.origin` and message schema.
- Treat message data as untrusted input.
- Design a small message protocol with versioning and allowed commands.

---

## Part 5: supply chain and third-party code

Every npm package, build plugin, browser extension and CDN script is potentially code execution in your build or your origin.

### Dependency risk ⏭ *Skip for interviews*

Controls:
- Commit lockfiles and enforce reproducible installs (`npm ci`, pnpm frozen lockfile).
- Review dependency additions, especially packages with install scripts.
- Use automated vulnerability scanning, but triage context: a dev-only ReDoS may not matter; a runtime XSS sanitizer bug does.
- Prefer mature packages with active maintenance for security-critical parsing/sanitization.
- Pin or integrity-check third-party scripts.

### Subresource Integrity (SRI) ⏭ *Skip for interviews*

For CDN scripts/styles you do not bundle:

```html
<script
  src="/vendor/lib.min.js"
  integrity="sha384-..."
  crossorigin="anonymous"></script>
```

SRI lets the browser verify that the fetched bytes match the expected hash. It helps when the CDN or network path serves unexpected content, but you must update hashes on version changes.

### Secrets in frontend builds

Anything shipped to the browser is public. `VITE_*`, `NEXT_PUBLIC_*`, source maps, config JSON and client bundles are visible to users. Frontend env vars are configuration, not secrets. Real secrets live on the server or in a secure backend-for-frontend.

### Third-party analytics/widgets

If a third-party script runs in your origin, CSP and SRI only partly help. It can read DOM, hook events and call your APIs as the user. Prefer:
- server-side tagging where possible
- sandboxed iframe widgets on separate origins
- minimum vendor count
- explicit data-sharing review

---

## Part 6: choosing in an interview / cheat sheet

| Scenario | Choice | Why |
|---|---|---|
| Render user chat text | React text interpolation | Escapes HTML by default. |
| Render user markdown/rich text | Safe document model or allowlist sanitizer + CSP | Markdown can produce HTML/links; treat as untrusted. |
| Auth for normal web app | HttpOnly Secure SameSite cookie, CSRF defense, rotation | Minimizes JS-readable tokens; handles sessions cleanly. |
| SPA needing bearer API calls | Memory access token + refresh cookie | Limits persistent token theft while supporting Authorization header. |
| Prevent clickjacking | CSP `frame-ancestors` allowlist | Modern framing control; use XFO for legacy if needed. |
| Cross-origin API | Explicit CORS allowlist + server auth | CORS controls browser reads, not authorization. |
| Embed third-party content | Sandboxed iframe, narrow permissions, verified messages | Isolation boundary. |
| CDN script | Bundle if possible; else SRI + CSP + vendor review | Third-party JS is high privilege. |

### Common interview traps

- Saying "React prevents XSS" without mentioning `dangerouslySetInnerHTML`, URL schemes, markdown and direct DOM APIs.
- Using CSP as the only XSS defense.
- Storing long-lived tokens in `localStorage` without acknowledging XSS theft.
- Confusing CORS with CSRF.
- Reflecting arbitrary origins with credentials enabled.
- Accepting any `postMessage` or using `'*'` for sensitive messages.
- Forgetting that frontend environment variables are public.

---

## Self-test (answer out loud first, then open)

<details><summary>1. Why does React's default escaping not eliminate XSS?</summary>

It only protects normal text interpolation. XSS can still enter through `dangerouslySetInnerHTML`, unsafe markdown/HTML renderers, dangerous URL schemes, direct DOM APIs, third-party scripts or library bugs.
</details>

<details><summary>2. What is the difference between reflected, stored and DOM-based XSS?</summary>

Reflected comes from the current request and is immediately reflected; stored is persisted server-side and shown later to users; DOM-based is caused by client JavaScript moving attacker-controlled data from a source like URL/hash/storage into a dangerous sink.
</details>

<details><summary>3. What do CSP nonces and `strict-dynamic` do?</summary>

A nonce allows only inline scripts with the server-generated per-response nonce. `strict-dynamic` lets trust flow from a nonce-bearing script to scripts it loads, avoiding brittle host allowlists. CSP still complements, not replaces, sanitization.
</details>

<details><summary>4. Why are HttpOnly cookies safer than localStorage for session tokens?</summary>

JavaScript cannot read HttpOnly cookies, so XSS cannot directly exfiltrate the token. Cookies are ambient credentials, so SameSite and CSRF defenses are still required. LocalStorage tokens are directly readable by any injected JS.
</details>

<details><summary>5. Why is CORS not a CSRF defense?</summary>

CORS mainly controls whether browser JavaScript can read a cross-origin response. CSRF is about causing the browser to send a state-changing request with cookies. Many CSRF requests do not need to read the response.
</details>

<details><summary>6. How do you safely receive `postMessage` events?</summary>

Check `event.origin` against an expected origin, validate the message schema/type, ignore unknown commands, and never treat message data as trusted HTML or executable instructions. Send sensitive messages with a specific `targetOrigin`, not `'*'`.
</details>

<details><summary>7. When might `frame-ancestors 'none'` be the wrong answer?</summary>

When the product intentionally supports trusted embedding, such as an enterprise portal or LMS embedding a recording. Then use a strict allowlist and preferably a separate reduced-privilege embed surface.
</details>

<details><summary>8. What is SRI useful for, and what does it not solve?</summary>

SRI verifies that a CDN resource matches an expected hash, preventing unexpected bytes from executing. It does not make the library itself safe, handle dynamic third-party scripts well, or replace dependency review and CSP.
</details>

---

<details>
<summary>FE8 · Frontend Security — XSS, CSP, SameSite Cookies, CORS vs. CSRF & Iframes</summary>

- **Golden Opening Line:** *"Frontend security is defense-in-depth at the browser trust boundary: keep untrusted data out of execution sinks, lock down script execution with a strict nonce-based CSP, keep session credentials out of JS-readable storage, and enforce authorization on the server."*

#### 1. XSS Sinks, Structured Models & CSP
- **3 XSS Types:**
  - **Reflected XSS:** Payload comes in the current HTTP request (e.g., `?q=...`) and is echoed immediately in SSR HTML.
  - **Stored XSS:** Payload is persisted in the database (comment, chat message, bio) and runs for every viewer later.
  - **DOM-Based XSS:** Client JS reads an untrusted source (`location.hash`, `postMessage`, storage) and writes into a dangerous sink without touching the server.
- **Why "React Prevents XSS" Is Half-True (5 Doors):**
  1. `dangerouslySetInnerHTML` (sanitize with **DOMPurify** strict allowlist, or use a **structured JSON AST** like `RichNode` instead of raw HTML).
  2. `href={userUrl}` (`javascript:alert(1)` works in React—parse with `new URL(href, origin)` and allowlist only `['https:', 'http:', 'mailto:']`).
  3. Unsafe Markdown renderers (allow raw HTML / `javascript:` links by default).
  4. Direct DOM APIs (`ref.current.innerHTML = ...`, `document.write`).
  5. Third-party scripts / compromised CDN dependencies.
- **Strict Nonce-Based CSP (HTTP Response Header on `index.html`):**
  - `Content-Security-Policy: default-src 'self'; script-src 'nonce-<per-request-random>' 'strict-dynamic'; style-src 'self' 'nonce-<random>'; font-src 'self' https://gstatic.com; img-src 'self' data: https://example.com; connect-src 'self' https://example.com; object-src 'none'; base-uri 'none'; frame-ancestors 'none';`
  - **Per-request `nonce`:** Generated fresh on every HTTP request by the server/edge worker (never cached/hardcoded) so attackers cannot predict it; `'strict-dynamic'` passes trust to dynamically imported child chunks.
  - **Rollout tip:** Test with `Content-Security-Policy-Report-Only` first; CSP is defense-in-depth and never replaces sanitization.

#### 2. Cookies (`HttpOnly`, `Secure`, `SameSite`) & Token Storage
- **`localStorage` / `sessionStorage`:** Readable by any JS on the page—an XSS payload or compromised third-party script can exfiltrate tokens immediately.
- **`HttpOnly; Secure; SameSite` Cookie:** `HttpOnly` blocks `document.cookie` reads from JS; `Secure` enforces HTTPS; `SameSite` controls cross-site attachment.
- **SPA Bearer Pattern:** Keep a short-lived access token in **JS memory** (module variable) and rotate it via an `HttpOnly; Secure; SameSite` refresh cookie.
- **The 3 `SameSite` Settings (`eTLD+1` site boundary—note subdomains like `://shop.com` and `://shop.com` are *same-site*!):**
  - **`SameSite=Strict`:** Never sent on cross-site requests—not even clicking a normal external link into your site (best for high-security admin/banking consoles).
  - **`SameSite=Lax` *(Browser Default)*:** Blocks cookies on cross-site `POST`, `fetch()`, `<iframe>`, and `<img>`, while allowing cookies on top-level `GET` navigation from external links (best default for 95% of apps).
  - **`SameSite=None; Secure`:** Sent on all cross-site requests (required for cross-origin `<iframe>` embeds / LTI / SSO; requires HTTPS + strict anti-CSRF tokens).

#### 3. `CORS` vs. `CSRF` (And How Anti-CSRF Tokens Work)
- **CORS (Cross-Origin Resource Sharing):** Governs whether **JS on `evil.com` can READ a response** from `://shop.com` (`Access-Control-Allow-Origin`).
  - *Trap:* Never dynamically reflect arbitrary `Origin` headers with `Access-Control-Allow-Credentials: true` (lets any site read private user responses).
- **CSRF (Cross-Site Request Forgery):** `evil.com` tricks the victim's browser into **SENDING a state-changing request** (e.g., hidden `<form method="POST">` to `://shop.com/api/update-price`) where the browser automatically attaches ambient cookies.
  - *Why CORS doesn't stop CSRF:* Simple `<form>` `POST`s fire without a CORS preflight `OPTIONS` check, and the server mutates data before the browser ever checks response CORS headers.
- **How Anti-CSRF Tokens Defeat CSRF:**
  1. **Synchronizer Token:** Server issues a per-session random `csrfToken` (via login/`/me` header, JSON, or `<meta>` tag); frontend stores it in memory/state and attaches `X-CSRF-Token: <token>` on every `POST`/`PUT`/`PATCH`/`DELETE`.
  2. **Double-Submit Cookie:** Server sets a JS-readable `XSRF-TOKEN` cookie alongside the `HttpOnly` session cookie; frontend reads `XSRF-TOKEN` and sends it in the `X-XSRF-TOKEN` header; server verifies `cookie === header`.
  - *Why `evil.com` can't steal the token via `GET /getinfo`:* `SameSite=Lax` blocks cookie attachment on cross-site `fetch()`, and CORS (`Access-Control-Allow-Origin`) blocks `evil.com` from reading the response. Plus, custom headers force a CORS preflight `OPTIONS` check that `evil.com` fails.

#### 4. `postMessage`, Sandboxed `iframes` & Third-Party Scripts (`SRI` / Env Vars)
- **`postMessage`:** Always check `event.origin` against an exact allowlist first (`if (!ALLOWED_ORIGINS.has(event.origin)) return;`), validate payload schema, and never pass `'*'` as `targetOrigin` when sending sensitive data.
- **Sandboxed `iframes` & Clickjacking:** Isolate untrusted embeds with `<iframe sandbox="allow-scripts">` (never pair `allow-scripts` + `allow-same-origin` on same-origin frames, or the iframe can remove its own sandbox). Block framing of your own pages with CSP `frame-ancestors 'none'` (or an explicit LMS/enterprise allowlist on a reduced-privilege `/embed` route).
- **Third-Party Scripts, `SRI` & Env Vars:** Third-party scripts run with full page privilege—bundle vetted npm packages when possible, or lock static CDN scripts with `integrity="sha384-..." crossorigin="anonymous"` (`SRI` verifies untampered bytes, not library safety). Never store secrets in `VITE_*` / `NEXT_PUBLIC_*` env vars—they are bundled publicly into client JS.
</details>


---

## Sources / read more

| Source | What to read | Where / time |
|---|---|---|
| Your security roadmap | Phases 1–5 for XSS, CSP, clickjacking, CSRF, CORS, token storage and supply chain; use PortSwigger labs from that roadmap for attack-side practice | [C:\Users\neerajj\ReactPersonal\security-learning-path.md](<C:\Users\neerajj\ReactPersonal\security-learning-path.md>) |
| [OWASP XSS Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | "Framework Security", "XSS Defense Philosophy", output-encoding context sections, "Dangerous Contexts", "HTML Sanitization" | ~30 min |
| [OWASP Content Security Policy Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) | "Defense against XSS", "Defense against framing attacks", "Policy Delivery", "CSP Types", nonce / strict CSP guidance | ~25 min |
| [OWASP CSRF Prevention Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html) | "Token-Based Mitigation", "Synchronizer Token Pattern", "Fetch Metadata headers", SameSite cookie sections | ~25 min |
| [OWASP Session Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | "Session ID Properties", "Session Management Implementation", "Cookies", transport/security attributes | ~25 min |
| [OWASP Clickjacking Defense Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Clickjacking_Defense_Cheat_Sheet.html) | "Defending with Content Security Policy frame-ancestors", X-Frame-Options sections, common mistakes | ~15 min |
| [OWASP HTML5 Security Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html) | "Communication APIs", "Web Messaging", "Cross Origin Resource Sharing", "Storage APIs" | ~20 min |
| [MDN: CORS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CORS) | "Functional overview", "Simple requests", "Preflighted requests", "Requests with credentials", response headers | ~20 min |
| [MDN: Subresource Integrity](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) | "How Subresource Integrity helps", "Using Subresource Integrity", "Subresource Integrity and CORS" | ~10 min |
| [MDN: Window.postMessage](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage) | "Security concerns", "Examples", syntax/parameters for `targetOrigin` | ~15 min |

**Connects to:** FE4 Network layer · FE6 Offline + storage (auth/cache boundaries) · FE7 Accessibility + i18n (safe labels/messages) · Questions: every frontend system design, especially chat, DrawBoard and checkout

