# CLAUDE.md — Neeraj's React/JS Learning Track

Standing instructions for managing progress, summarizing docs, and writing code examples here.

## 📁 Repository Structure

- `react-learning-path.md`, `security-learning-path.md`: master curricula. **Do not edit** unless explicitly asked.
- `progressPhase{N}.md`: one progress log per phase (interview-driven topic summaries).

---

## 🧠 Summarization Principles

- **Why & How over What:** engine mechanics, execution timing (render vs commit), change detection (`Object.is`).
- **Edge cases:** turn doc "Note/Pitfall/Caveat" boxes into realistic production mistakes.
- **Interview lens:** the trade-offs and bugs a senior engineer would probe.

---

## 📝 Progress Logging Protocol

Run automatically when Neeraj marks a topic or range as complete. Don't ask for format confirmation.

- **Always WebFetch** the live source URLs first; never summarize from memory. Log the fetch date.
- Every sub-topic gets its own `###` header (no merging). Use this structure:

```markdown
### <N.N> <Topic Title from react-learning-path.md>

**Read:** [Page Title](url), [Page Title 2](url2) — fetched <YYYY-MM-DD>

- Mechanic/rule detailing the core behavior, with the **key term bolded**.
- Secondary rule, **bolded key term**, with a plain-spoken explanation of the mechanic.
- **Code example:** at least one runnable multi-line code block showing the core mechanic or gotcha, placed right after the bullet it illustrates.
- **Gotcha:** a standalone bullet phrased as a real production mistake.
- **Interview angle:** "Likely question?" → crisp, punchy answer. Add more bullets for distinct questions.

**Recap — what the doc says to take away:**

- 3-6 condensed takeaways in spoken tone (restate the page's own Recap/Summary if it has one). Nothing new here.
```

- **Tone:** write like an engineer speaking in an interview, not textbook prose.

---

## 💻 Code Formatting (Chat & Logs)

- **No inline syntax:** runnable code, braces, props or JSX go in fenced blocks, even single lines. Inline backticks only for plain names (`App.jsx`, `useState`, `return`).
- **Fully expanded:** multi-line, indented, one statement/JSX element per line (no squashed ternaries or `.map()`). Reformat condensed source code to match.
- **Comments:** short, high-utility inline comments on structural mechanics.
