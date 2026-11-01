# Security Learning Path — Neeraj

> **Goal:** Structure what you already know from Adobe (frontend + security engineer) into one articulate, sequenced, interview-ready roadmap — plus fill the gaps that are outside your day-to-day surface (server-side, supply chain, AI/LLM-specific).
> **This is a standalone track.** It does not live inside `react-learning-path.md` or `ai-learning-path.md` — those two reference it, but all the actual security content lives here.

---

## The setup

- **Your level:** you already do this work professionally. This is **not** first-time learning — it's organizing scattered on-the-job knowledge into a sequence you can walk an interviewer through cleanly, plus closing specific gaps (supply chain, LLM-specific, hands-on offensive practice).
- **Primary source:** [PortSwigger Web Security Academy](https://portswigger.net/web-security) — free, phase-matched, and unlike most docs it gives you **interactive labs** where you actually exploit a vuln in a sandboxed app. Use it as the spine; [OWASP Cheat Sheet Series](https://cheatsheetseries.owasp.org/) as the reference/defense-side companion for every topic.
- **How to work each phase:** skim the cheat sheet (defense side) → do the matching PortSwigger labs (attack side) → you can't articulate a defense well until you've seen the attack it stops.
- **Rule #1 — attack before defense.** For each topic, understand how it's exploited first. "Sanitize user input" means nothing until you've seen what happens when you don't.

---

## The Spine — 9 phases

| Phase | Focus | Primary source | Project/proof |
|-------|-------|----------------|----------------|
| **0** | **Foundations** — threat modeling, trust boundaries, attacker mindset, OWASP Top 10 overview | [OWASP Top 10](https://owasp.org/www-project-top-10/) | Threat-model one real app (the React flagship or a Juice Shop instance) |
| **1** | **Client-side / browser security** — XSS (all 3 flavors), CSP, same-origin policy, clickjacking | [PortSwigger: XSS, CSP, Clickjacking](https://portswigger.net/web-security/cross-site-scripting) | Exploit + fix XSS in a lab app |
| **2** | **Session, identity & auth** — cookies vs storage, JWT, OAuth2/OIDC, session lifecycle, password storage | [PortSwigger: Authentication](https://portswigger.net/web-security/authentication) | Break a broken-auth lab; design a correct session flow on paper |
| **3** | **Network & transport** — CORS, CSRF, TLS/HSTS, security headers | [PortSwigger: CSRF, CORS](https://portswigger.net/web-security/csrf) | CSRF PoC against a lab app |
| **4** | **Server-side / API security** — injection (SQLi, command injection), IDOR/broken access control, SSRF, deserialization | [PortSwigger: SQL Injection, Access Control, SSRF](https://portswigger.net/web-security/sql-injection) | Full SQLi + IDOR lab chain |
| **5** | **Supply chain & infra security** — dependency risk, secrets management, CI/CD pipeline security, SRI | [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) + [OWASP CI/CD Top 10](https://owasp.org/www-project-top-10-ci-cd-security-risks/) | Audit a real repo's dependency tree + CI config |
| **6** | **AI/LLM security** — prompt injection, insecure output handling, agentic tool-call risk, training-data/poisoning awareness | [OWASP Top 10 for LLM Apps](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | Prompt-inject your own Codebase Copilot backend, then patch it |
| **7** | **Security testing & tooling** — Burp Suite workflow, SAST/DAST, writing a vuln report | [Burp Suite docs](https://portswigger.net/burp/documentation) | Full manual pentest pass on a lab app + a written report |
| **8** | **Ship & maintain** — apply everything to a real deployed app, monitoring/incident response basics | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) (as a checklist) | Harden + ASVS-checklist the React flagship deploy |

**How to work each phase:** cheat sheet (why) → PortSwigger labs (how it breaks) → apply to a real app (prove it) → interview checkpoint.

---

## Phase detail

### Phase 0 — Foundations
Before any specific vuln class, get the mental model right — this is what makes the rest *reasoning* instead of memorized trivia.

| # | Topic | Read | Why |
|---|-------|------|-----|
| 0.1 | **CIA triad** (confidentiality, integrity, availability) as the lens for classifying any vuln | [OWASP overview](https://owasp.org/www-project-top-10/) | every vuln maps to breaking one of these three |
| 0.2 | **Trust boundaries & attack surface** — where does untrusted data enter your system, and what changes trust level | PortSwigger "Web security" intro | the single idea underlying XSS, injection, CSRF, IDOR — all are "trust boundary crossed without a check" |
| 0.3 | **Threat modeling basics** — STRIDE categories, data-flow diagrams, "what can go wrong here" | [OWASP Threat Modeling](https://owasp.org/www-community/Threat_Modeling) | this is the skill that turns "I know OWASP Top 10" into "I can secure a system I've never seen" |
| 0.4 | **OWASP Top 10 (2021)** — the 10 categories, at a level where you can map any CVE you read about to one of them | [OWASP Top 10](https://owasp.org/www-project-top-10/) | shared vocabulary for the rest of this track and for interviews |

**Project:** pick one real app (the React flagship, or spin up [OWASP Juice Shop](https://owasp-juice.shop/) locally) and produce a one-page threat model: entry points, trust boundaries, and a guess at where each Top 10 category could show up.

**🎤 Interview checkpoint:**
1. Explain the CIA triad with one real vuln example for each leg.
2. What's a trust boundary? Give three places one exists in a typical web app.
3. Walk through STRIDE on a login form.

### Phase 1 — Client-side / browser security
| # | Topic | Read | Why |
|---|-------|------|-----|
| 1.1 | **XSS — reflected, stored, DOM-based** — the three delivery mechanisms, why they're categorized differently | [PortSwigger XSS](https://portswigger.net/web-security/cross-site-scripting) + [OWASP XSS Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html) | most common client-side vuln; framework-safety (React's JSX escaping) only covers *some* of these |
| 1.2 | **`JSON.parse` on untrusted input, prototype pollution, why `eval`/raw `innerHTML` are dangerous** | [PortSwigger Prototype Pollution](https://portswigger.net/web-security/prototype-pollution) | DOM-based XSS's less-famous sibling; comes up in library code, not just app code |
| 1.3 | **Content-Security-Policy** — directives, nonces/hashes, report-only mode, what CSP does and doesn't stop | [OWASP CSP](https://cheatsheetseries.owasp.org/cheatsheets/Content_Security_Policy_Cheat_Sheet.html) | defense-in-depth once XSS slips past sanitization |
| 1.4 | **Same-origin policy** — what it actually restricts (and the common misconception that it blocks all cross-origin *requests*, not just *reads*) | [MDN Same-origin policy](https://developer.mozilla.org/en-US/docs/Web/Security/Same-origin_policy) | foundational for understanding both CORS (Phase 3) and why XSS is so dangerous (steals same-origin access) |
| 1.5 | **Clickjacking** — `X-Frame-Options`/`frame-ancestors`, UI redressing | [PortSwigger Clickjacking](https://portswigger.net/web-security/clickjacking) | quick, cheap header fix most devs forget |

**Project:** in PortSwigger's free labs, complete the reflected, stored, and DOM-based XSS labs; then find and patch the equivalent pattern (if any) in a real app you control.

**🎤 Interview checkpoint:**
1. Reflected vs stored vs DOM-based XSS — what differs about *where* the payload lives and *when* it fires?
2. Is React XSS-safe by default? When does that guarantee break (`dangerouslySetInnerHTML`, `href="javascript:"`, unsanitized markdown/HTML rendering)?
3. What does a CSP header actually stop, and what can it not stop?
4. What is prototype pollution, and how does it differ from "normal" XSS?

### Phase 2 — Session, identity & auth
| # | Topic | Read | Why |
|---|-------|------|-----|
| 2.1 | **Cookies vs `localStorage`/`sessionStorage`** for tokens — `HttpOnly`, `Secure`, `SameSite` | [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html) | where a lot of "we built auth" projects quietly fail |
| 2.2 | **JWT vs opaque session tokens** — signing vs encryption, `alg: none` attack, token revocation problem | [PortSwigger JWT attacks](https://portswigger.net/web-security/jwt) | JWTs are misused constantly; revocation is the classic gotcha |
| 2.3 | **OAuth2 / OIDC flows** — authorization code + PKCE, what each grant type is for, common misconfigurations | [PortSwigger OAuth](https://portswigger.net/web-security/oauth) | "explain OAuth" is a top identity-interview question |
| 2.4 | **Session lifecycle** — fixation, expiry/rotation on privilege change, concurrent session handling | OWASP Session Management (same page as 2.1) | ties to 2.1; a session that never rotates on login is a fixation bug |
| 2.5 | **Password storage** — bcrypt/argon2, salting, why not to roll your own | [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html) | awareness-level; you won't implement this often but you'll be asked |
| 2.6 | **MFA** — TOTP basics, why SMS is the weakest factor | [PortSwigger Multi-factor auth](https://portswigger.net/web-security/authentication/multi-factor) | rounds out the "how do you actually secure a login" answer |

**Project:** complete PortSwigger's broken-authentication and JWT-attack labs; then design (on paper or in the flagship) a correct auth flow: httpOnly refresh token, short-lived access token, rotation on login.

**🎤 Interview checkpoint:**
1. Where do you store auth tokens, and why not `localStorage`?
2. Walk through the OAuth2 authorization code flow with PKCE, and say what PKCE actually prevents.
3. What's the `alg: none` JWT attack, and how do you defend against it?
4. What is session fixation, and when should a session ID rotate?

### Phase 3 — Network & transport
| # | Topic | Read | Why |
|---|-------|------|-----|
| 3.1 | **CSRF** — how it works, why it's distinct from XSS, token/`SameSite` defenses | [PortSwigger CSRF](https://portswigger.net/web-security/csrf) | classic interview pairing with CORS |
| 3.2 | **CORS** — preflight, credentials, origin reflection misconfigurations | [PortSwigger CORS](https://portswigger.net/web-security/cors) | the most commonly *conflated-with-CSRF* topic — nail the distinction |
| 3.3 | **TLS/HTTPS basics** — handshake at a conceptual level, why HTTPS alone isn't "secure," HSTS | [MDN TLS](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security) | baseline transport security, comes up in any "how do you secure data in transit" question |
| 3.4 | **Security headers** — `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, and how they compose with CSP (1.3) | [OWASP Secure Headers](https://owasp.org/www-project-secure-headers/) | cheap, high-leverage hardening most teams half-implement |

**Project:** build a CSRF PoC against a PortSwigger lab; then audit a real app's response headers (`curl -I`) against the OWASP Secure Headers checklist.

**🎤 Interview checkpoint:**
1. What is CSRF, and how do you prevent it? How does CORS relate — and why are they *not* the same defense?
2. What does a CORS preflight request check, and when is it skipped?
3. What does HSTS protect against that plain HTTPS doesn't?

### Phase 4 — Server-side / API security
This is the biggest gap-filling phase if your day job has been frontend-leaning — go deliberately slower here.

| # | Topic | Read | Why |
|---|-------|------|-----|
| 4.1 | **SQL injection** — classic, blind, out-of-band; parameterized queries as the fix | [PortSwigger SQLi](https://portswigger.net/web-security/sql-injection) | still one of the highest-impact vuln classes that exists |
| 4.2 | **Command injection** | [PortSwigger Command Injection](https://portswigger.net/web-security/os-command-injection) | same "untrusted data reaches an interpreter" pattern as SQLi, different interpreter |
| 4.3 | **Broken access control / IDOR** — object-level authz checks, why "the UI hides it" isn't a control | [PortSwigger Access Control](https://portswigger.net/web-security/access-control) | the #1 real-world API vuln class (OWASP Top 10 #1) |
| 4.4 | **SSRF** — server tricked into making a request on the attacker's behalf, cloud metadata endpoint attacks | [PortSwigger SSRF](https://portswigger.net/web-security/ssrf) | especially relevant if the flagship's backend fetches URLs (e.g. citations, webhooks) |
| 4.5 | **Insecure deserialization** — why deserializing untrusted data can equal RCE | [PortSwigger Deserialization](https://portswigger.net/web-security/deserialization) | less common day-to-day, but a favorite "explain a scary vuln" interview topic |
| 4.6 | **Rate limiting & brute-force protection** | [OWASP Authentication Cheat Sheet §Brute Force](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html) | ties auth (Phase 2) to abuse prevention |

**Project:** complete the SQLi and IDOR lab chains end to end (find → exploit → understand root cause) on PortSwigger; if your flagship backend exists yet, run through its endpoints checking for missing object-level authz checks.

**🎤 Interview checkpoint:**
1. Why do parameterized queries stop SQL injection when string escaping alone doesn't?
2. What is IDOR, and why is "the frontend doesn't show that button" not a control?
3. What is SSRF, and why are cloud metadata endpoints (`169.254.169.254`) a favorite target?
4. Never trust client-side validation alone — where does the *authoritative* check have to live?

### Phase 5 — Supply chain & infra security
| # | Topic | Read | Why |
|---|-------|------|-----|
| 5.1 | **Dependency risk** — `npm audit`, lockfile integrity, what a compromised package looks like in practice | [OWASP Dependency-Check](https://owasp.org/www-project-dependency-check/) | increasingly common real-world incident class (e.g. event-stream, ua-parser-js) |
| 5.2 | **Secrets management** — never in source, never in a frontend bundle (`VITE_*`/`NEXT_PUBLIC_*` are public!), secret scanning in CI | [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html) | the most common "oops, that's public" mistake |
| 5.3 | **CI/CD pipeline security** — untrusted PR code running with secrets access, pipeline poisoning | [OWASP Top 10 CI/CD Security Risks](https://owasp.org/www-project-top-10-ci-cd-security-risks/) | a gap area for most frontend-focused engineers — worth deliberate study |
| 5.4 | **Subresource Integrity (SRI)** for third-party scripts/CDN assets | [MDN SRI](https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity) | cheap mitigation almost nobody uses |

**Project:** run `npm audit` on a real repo, triage the results (which are actually exploitable in this app's context vs noise), and add a CI secret-scanning step (e.g. gitleaks) to one repo.

**🎤 Interview checkpoint:**
1. Describe a real npm supply-chain compromise you know of — how would you have caught it before it shipped?
2. Why is a `NEXT_PUBLIC_`/`VITE_`-prefixed env var not a secret?
3. What makes a CI/CD pipeline itself an attack surface, separate from the app it builds?

### Phase 6 — AI/LLM security
Directly relevant to the Codebase Copilot flagship — this is where your two tracks intersect hardest.

| # | Topic | Read | Why |
|---|-------|------|-----|
| 6.1 | **Prompt injection** — direct and indirect (via retrieved documents/tool outputs) | [OWASP LLM01: Prompt Injection](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | the LLM-native analogue of injection attacks — untrusted data reaching a "privileged interpreter" (the model) |
| 6.2 | **Insecure output handling** — treating LLM output as untrusted before rendering *or* acting on it | [OWASP LLM02](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | directly hits your chat UI + citations panel; never `dangerouslySetInnerHTML` raw model output |
| 6.3 | **Excessive agency / agentic tool-call risk** — an LLM with tool access amplifies every other vuln class (SSRF via a "fetch URL" tool, injection via a "run query" tool) | [OWASP LLM08: Excessive Agency](https://owasp.org/www-project-top-10-for-large-language-model-applications/) | your flagship *is* this pattern once it gets tool use |
| 6.4 | **Training data / RAG poisoning awareness** — why untrusted retrieved context is itself an injection vector | same OWASP LLM Top 10 | ties Phase 4 (injection) + Phase 6 together — RAG context is "untrusted input" too |

**Project:** prompt-inject your own Codebase Copilot backend (try to get it to ignore its system prompt via a crafted file/comment it retrieves), then add an output-handling guard.

**🎤 Interview checkpoint:**
1. What's the difference between direct and indirect prompt injection?
2. LLM output is untrusted twice over — as *displayed content* and as *triggered action*. How do you render/act on it safely in both senses?
3. Why does giving an LLM tool access turn every classic vuln class (SSRF, injection) into an LLM-reachable one?

### Phase 7 — Security testing & tooling
| # | Topic | Read | Why |
|---|-------|------|-----|
| 7.1 | **Burp Suite workflow** — proxy, repeater, intruder, at a working-knowledge level | [Burp Suite docs](https://portswigger.net/burp/documentation) | the standard manual-testing tool; you should be able to demo it |
| 7.2 | **SAST vs DAST** — what each catches, where each fits in a pipeline | [OWASP Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) | interview-level distinction, also informs where 5.3's CI gates go |
| 7.3 | **Writing a vulnerability report** — repro steps, impact, CVSS-style severity, a fix recommendation | [OWASP Vulnerability Report template](https://owasp.org/www-project-web-security-testing-guide/) | the skill that turns "I found a bug" into a report someone can act on |

**Project:** pick any lab or a personal project, do a full manual pass with Burp, and write it up as a one-page vulnerability report.

**🎤 Interview checkpoint:**
1. SAST vs DAST — give an example vuln each one catches that the other misses.
2. Walk through how you'd use Burp Repeater to confirm an IDOR.

### Phase 8 — Ship & maintain
| # | Topic | Read | Why |
|---|-------|------|-----|
| 8.1 | **OWASP ASVS as a checklist** — using a formal verification standard instead of ad-hoc hardening | [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/) | gives your hardening pass a named, defensible standard instead of "I did some stuff" |
| 8.2 | **Monitoring & incident response basics** — what to log, alerting on anomalies, a basic incident runbook | [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html) | "secure" isn't just prevention — it's detecting when prevention fails |

**Project:** run the deployed React flagship (or any app you control) through an ASVS Level 1 checklist pass; document what's covered, what isn't, and why.

**🎤 Interview checkpoint:**
1. What is OWASP ASVS, and how does it differ from just "following the Top 10"?
2. What should you log for security purposes that you might not log otherwise — and what should you *never* log (secrets, full card numbers, etc.)?

---

## How this connects to the other two tracks

- **`react-learning-path.md` Phase 5** references this doc for security depth — it stays lean (deploy + a11y + quality gates) and points here instead of duplicating the curriculum.
- **`ai-learning-path.md`** — Phase 6 here (AI/LLM security) is this track's contribution to the Codebase Copilot flagship; apply it once the LLM backend exists.
- Use whichever project is live at the time as the "proof" target for each phase — you don't need a dedicated app just for this track unless you want the PortSwigger labs + Juice Shop as a judgment-free sandbox (recommended for Phases 1–4, where you want to break things safely before touching your own app).

---

## Quick Links

| Resource | URL | Use for |
|----------|-----|---------|
| PortSwigger Web Security Academy | https://portswigger.net/web-security | primary source — hands-on labs, Phases 1–4 mainly |
| OWASP Cheat Sheet Series | https://cheatsheetseries.owasp.org/ | defense-side reference for every phase |
| OWASP Top 10 | https://owasp.org/www-project-top-10/ | Phase 0 shared vocabulary |
| OWASP Top 10 for LLM Apps | https://owasp.org/www-project-top-10-for-large-language-model-applications/ | Phase 6 |
| OWASP Top 10 CI/CD Security Risks | https://owasp.org/www-project-top-10-ci-cd-security-risks/ | Phase 5 |
| OWASP ASVS | https://owasp.org/www-project-application-security-verification-standard/ | Phase 8 checklist |
| OWASP Juice Shop | https://owasp-juice.shop/ | judgment-free vulnerable app to practice on |
| Burp Suite docs | https://portswigger.net/burp/documentation | Phase 7 tooling |
| React learning path | `react-learning-path.md` | frontend track this security track supports |
| AI learning path | `ai-learning-path.md` | AI track — Phase 6 here feeds its flagship |
| Progress log | `progress.md` | log security learnings here too |

*Standalone track. Referenced by, not embedded in, `react-learning-path.md` and `ai-learning-path.md`.*
