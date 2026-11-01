# Security path: priority + my real fixes

Companion to `security-learning-path.md`. Priority = what to revise first for interviews.
Attack before defense: for each phase, do the PortSwigger lab, then explain your own fix.

| Phase | Priority | Why |
|-------|----------|-----|
| 1 Client-side | **P1** | Many XSS fixes of your own |
| 2 Session / auth | **P1** | ATO and session-ticket fixes |
| 4 Server-side / API | **P1** | SQLi and IDOR fixes |
| 5 Supply chain | **P1** | log4j, FIPS CVE pipeline |
| 6 AI/LLM | **P1** | CVE agent safety gate + your RAG project |
| 0 Foundations | P2 | Quick threat-model vocabulary |
| 3 Network | P2 | CSRF/CORS/headers: skim |
| 7 Testing / tooling | P3 | Later |
| 8 Ship & maintain | P3 | Later |

## Phase 1: Client-side (XSS, HTMLi)
- VULN-33162 stored XSS
- VULN-35504, 35505 reflected XSS in `/system/content`
- VULN-36648 DOM XSS via `window.top.location.href`
- VULN-36711 stored XSS in SCORM wrapper
- VULN-39299 DOM XSS via meetingName
- VULN-33601 HTML injection in notes export
- CONN-4171345 custom-pod hardening
- Be ready to explain: where the payload lives, when it fires, and the exact fix (encode vs sanitize vs allowlist).

## Phase 2: Session, identity, auth
- VULN-35549 session-ticket exfiltration (bypass of an earlier fix)
- VULN-33619 0-click ATO via SHARE
- VULN-34562 sensitive info in URL
- VULN-34563 information leakage
- VULN-33621 SVG upload leading to admin ATO (also fits Phase 4)
- Be ready to explain: why tokens in URLs leak (logs, Referer, history) and why a fix can be bypassed.

## Phase 4: Server-side / API
- SQLi: VULN-35244, 35245, 35248, 35249, 35506, 35507, 35514, 35518, 35519, 35520 (filter-* params)
- VULN-40205 `Filter.toSql` placeholder hijack (CONN-4186979)
- IDOR / broken access control: VULN-35125, 35126, 35128 (unauthenticated sco-info, event-info, sco-expanded-contents), 33602, 35212 (non-admin to admin)
- Be ready to explain: why parameterize instead of escape, and why the placeholder hijack is a different bug class.

## Phase 5: Supply chain / infra
- CONN-4171318 log4j upgrade
- CVE triage for FIPS base images (CONN-4183427): Trivy re-scan, deterministic safety gate, image rebuild and PR
- Be ready to explain: why the gate is deterministic and not LLM-decided.

## Phase 6: AI/LLM security
- CVE triage agent: LLM proposes, a rule-based gate decides. This is your agentic tool-call risk story.
- To do: prompt-inject your own RAG assistant, then patch it. That is the roadmap's proof item, and it would close your biggest gap here.

## Phases 0, 3, 7, 8 (not yet)
- Phase 0: do the one-page threat model on the Interactive Recordings feature. You know it best.
- Phase 3: CSRF, CORS and headers still need real labs. Gap, not strength.
- Phases 7 and 8: after January.

## Suggested order
1. Phase 4, then Phase 1, then Phase 2: do the PortSwigger labs and rehearse your fix as a 60-second story each.
2. Phase 5 and 6: tie them to the CVE pipeline and the RAG project.
3. Phase 0 threat model for Interactive Recordings.
4. Phase 3 labs.
