# LLM Engineering - Progress Tracker

**Course:** LLM Engineering - Master AI and LLLMs (8-week journey)  
**Instructor:** Edward Donner (ed@edwarddonner.com)  
**Started:** 2026-05-27

---

## Key Things to Take Care Of (from README)

- [x] Install **Ollama** v0.20.7 — `llama3.2` downloaded (2 GB), tested and working ✓ (knowledge cutoff: Dec 2023)
- [x] Complete **environment setup** — `uv` v0.11.16 installed, `uv sync` done, `.venv` created ✓
- [x] Set up a **Google account** for Google Colab (needed from Week 3 onwards for GPU usage) ✓
- [x] **API Strategy decided** — No personal API keys needed:
  - `llama3.2` via Ollama for course exercises (free, local)
  - Claude Enterprise via Adobe ($600/month budget) for anything complex
  - Claude Code (already running) as the primary AI assistant throughout
- [ ] Read the **FAQ**: https://edwarddonner.com/faq/
- [ ] Bookmark **course resources**: https://edwarddonner.com/2024/11/13/llm-engineering-resources/
- [ ] Consider submitting **Pull Requests** for exercise solutions to get recognized on GitHub

---

## Ollama Quick Reference

### Pull Models

```
ollama pull llama3.2          # download a model
ollama pull llama3.2:1b       # smaller variant
```

### Run / Chat

```
ollama run llama3.2                      # interactive chat
ollama run llama3.2 "your prompt here"  # one-shot prompt
```

Inside chat: `/bye` or `Ctrl+D` to exit

### List & Info

```
ollama list                   # all downloaded models
ollama show llama3.2          # details: params, size, context length
ollama ps                     # what's currently loaded in memory
```

### Remove / Stop

```
ollama rm llama3.2            # delete from disk
ollama stop llama3.2          # unload from memory (keeps on disk)
```

### Server & Advanced

```
ollama serve                  # manually start server (usually auto-starts)
ollama cp llama3.2 my-model   # copy under new name
ollama create my-model -f Modelfile   # create custom model
```

**Mental model:** `pull` = download → `run` = load + chat → `stop` = unload from RAM → `rm` = delete from disk

---

## Weekly Progress

### Week 1 — LLM Foundations & First Projects

**Files:** `day1.ipynb`, `day2.ipynb`, `day4.ipynb`, `day5.ipynb`, `week1 EXERCISE.ipynb`, `company-research-tool.ipynb`

| Day      | Topic                                             | Status | Notes                                      |
| -------- | ------------------------------------------------- | ------ | ------------------------------------------ |
| Day 1    | Ollama quick start + first LLM project            | [x]    | Completed 2026-05-29                       |
| Day 2    | Frontier vs Open Source models + Ways to use LLMs | [x]    | Completed 2026-05-30                       |
| Day 3    | 3 types of LLMs: Base, Chat, Reasoning models     | [x]    | Lecture only, no lab. Completed 2026-05-30 |
| Day 4    | Tokenization + Illusion of Memory                 | [x]    | Completed 2026-06-06                       |
| Day 5    | Company Brochure Generator (Capstone)             | [x]    | Completed 2026-06-06                       |
| Exercise | AI Tutor + file reader + multi-LLM analysis       | [x]    | Completed 2026-06-07                       |

**Key Learnings:**

**Setup (Pre-Week 1):**

- LLMs like `llama3.2` and Claude are the same architecture (transformers) — just different scale, cost and training data. Local models = smaller params + older data, frontier models = larger params + recent data. Same intent.
- Ollama runs LLMs fully locally — no API key, no cost, no internet after download. Call it directly in Python via `ollama.chat()`.
- `llama3.2` has Dec 2023 knowledge cutoff — fine for coding/debugging, not for recent events or new libraries.
- `.venv` is an isolated Python environment scoped to this project — same concept as `node_modules/` in Node.js. Keeps packages from conflicting across projects.
- `pyproject.toml` = `package.json` — lists all packages + versions. `uv sync` reads it and installs everything in one shot.
- When opening a notebook in Cursor/Jupyter, always select the `.venv` kernel so imports resolve correctly.

**Week 1 / Day 1:**

- Calling an LLM via API: load API key from `.env` using `python-dotenv`, create an `OpenAI()` client, pass a `messages` list, get the reply from `response.choices[0].message.content`.
- `system` prompt = sets the model's behaviour/persona/tone. `user` prompt = the actual input/question. Every API call uses this two-role structure.
- Web scraping limitations: JS-rendered sites (React apps) need Selenium/Playwright — `requests` + `BeautifulSoup` returns empty HTML. CloudFront-protected sites return 403 and actively block bots.
- `from IPython.display import Markdown, display` — renders LLM markdown output as formatted text (headers, bold, bullets) inside the notebook instead of raw string. Use `display(Markdown(...))` not `print(Markdown(...))`.
- Full Day 1 pattern: URL → scrape text (`scraper.py`) → build messages (system + user prompt) → call GPT → `display(Markdown(...))`. This is the foundation of every LLM pipeline.
- Also ran the same pipeline using **local Ollama (`llama3.2`)** instead of GPT — `OpenAI(base_url="http://localhost:11434/v1", api_key="ollama")`. Same call structure, model runs free on local machine, no cloud needed.
- `openai` is just a Python client library (SDK), not OpenAI's model. Ollama copied OpenAI's API format so the same client works for both — just change `base_url` and `model`.

**Week 1 / Day 1 — Project: Company Research Tool (`company-research-tool.ipynb`):**

- Built on top of the Day 1 pattern: URL → scrape → system prompt → LLM → `display(Markdown(...))`. Same pipeline, different purpose.
- Scraper improvements over Day 1: also removes `nav`, `footer`, `header`, `aside` tags (not just `script`/`style`) — strips structural chrome so LLM gets actual content, not menus and footers.
- Truncates scraped text to `[:5_000]` chars — enough for a homepage, avoids overflowing LLM context window.
- **Key insight:** Output quality is entirely controlled by the system prompt. Same scraped data → VC analyst lens vs recruiter lens vs journalist lens = completely different reports. The data doesn't change, only the role instruction.
- `User-Agent` header added to `requests.get()` — some sites block requests without it (treat it as a bot). Mimicking a browser header gets past basic bot detection.
- Adobe.com returns JS-fragment URLs in scraped text (e.g. `https://main--upp--adobecom.aem.page/...`) — confirms Adobe's homepage is JS-rendered (React/AEM). Real content is loaded client-side, not in raw HTML. Known limitation of `requests` + BeautifulSoup approach.
- Bonus: same tool works as a **person/profile analyzer** — point at any public portfolio or GitHub profile, change only the system prompt. LinkedIn won't work (blocks scrapers, returns login form HTML).

**Week 1 / Day 2:**

- **Frontier models** = closed-source, most powerful, run in the cloud, cost money — GPT, Claude, Gemini. **Open source models** = free, run locally or on HuggingFace — llama3.2, DeepSeek, Mistral etc.
- **4 ways to use LLMs:**
  1. **Cloud API** — call via HTTP/SDK (OpenAI, Anthropic, Google) — what we've been doing
  2. **Chat interface** — browser UI like ChatGPT, Claude.ai — no code needed
  3. **Direct/local inference** — Ollama runs model on your machine, no internet, no cost, private
  4. **HuggingFace Transformers lib** — load model weights directly in Python, full control, used in Week 3+
- The `openai` library is just an HTTP wrapper — under the hood it's a `requests.post()` to `https://api.openai.com/v1/chat/completions` with JSON payload. Nothing magical.
- **OpenAI Compatible Endpoints** — Gemini, Ollama, DeepSeek all copied OpenAI's API format exactly. Same client, same code — just change `base_url` and `model` name.
- DeepSeek locally via Ollama (`deepseek-r1:1.5b`) — a reasoning model, thinks step by step (shows `<think>` tags). Better for logic/math, not casual chat. llama3.2 is better for general use at small size.

**Week 1 / Day 3 — Lecture 1 (Lecture only — no lab):**

- **3 types of LLMs:**
  1. **Base model** — just predicts the next token in a sequence. No chat, no instructions. Like phone predictive text. Used before ChatGPT era (GPT-3 was this). Only useful now when fine-tuning a model from scratch.
  2. **Chat model (Instruct model)** — base model + trained on message/response pairs using RLHF (Reinforcement Learning from Human Feedback). This is what gave us ChatGPT. Has system prompt + user prompt + assistant reply structure.
  3. **Reasoning model (Thinking model)** — chat model + trained to output thinking steps before the answer. Originated from "chain of thought" prompting trick (add "think step by step" → better results). OpenAI then trained models with examples of this → reasoning models born.
- **Hybrid model** — can decide how much thinking to do based on the question. Simple chat = minimal reasoning. Hard puzzle = heavy reasoning. GPT-5 and Gemini 2.5 Pro are hybrid models.
- **Reasoning budget / reasoning effort** — how much thinking a reasoning model does. More thinking = better results, slower, more expensive.
- **Budget forcing** — technique to force a reasoning model to think longer. Discovered in the S1 paper (Jan 2025). The trick: insert the word "wait" into the thinking trace. Model then continues with "wait, let me reconsider..." and reasons deeper. Sounds ridiculous, actually works.
- **When to use which:**
  - Reasoning model → problem solving, puzzles, anything where quality matters more than speed
  - Chat model → interactive chat (faster, cheaper), creative writing (reasoning models can "overthink" and sound cold)
  - Base model → only when fine-tuning a model to learn a new skill from scratch (covered in Week 6+)

**Week 1 / Day 3 — Lecture 2: Frontier Models + LLM Strengths & Weaknesses:**

- **Frontier model = Foundation model** — terms used interchangeably. The major closed-source models from the big labs.
- **The big labs and their models:**
  - **OpenAI** — GPT-5 (hybrid, replaces all prior GPT + O series), GPT-4.1 (pure chat, still useful — much faster than GPT-5 for interactive use), O-series (pure reasoning)
  - **Anthropic** — Claude (Haiku = small/fast, Sonnet = mid/best balance, Opus = largest). Use latest Sonnet.
  - **Google** — Gemini 2.5 Pro (hybrid model)
  - **xAI (Elon Musk)** — Grok (chat platform + model, spelt with K)
  - **DeepSeek** — odd one out: Chinese company, **open sourced all their models** including the biggest one. Also have a chat product.
  - **OpenAI** also has an open source model (OSS) — likely provoked by DeepSeek's move.
- **What frontier models are genuinely great at:**
  - Synthesizing + summarizing information (what we built in Day 1)
  - Answering questions with structured, well-researched detail
  - Generating content — emails, presentations, project skeletons
  - Coding — write, test, fix, iterate. Has completely replaced Stack Overflow as the go-to resource for engineers (Stack Overflow traffic collapsing since ~2023)
- **Where LLMs go wrong — the honest picture:**
  - **Knowledge cutoff** — training stops at a date, no knowledge beyond it. Will confidently suggest outdated models/APIs (e.g. replacing `gpt-4.1` with `gpt-3.5-turbo` and insisting the newer one doesn't exist). Web search in ChatGPT is extra code added on top — not part of the model itself.
  - **Hallucination with conviction** — LLMs predict the most _plausible_ next token, not the _true_ next token. They are trained to sound confident. When wrong, they are confidently wrong. This is the dangerous part.
  - **Band-Aid thinking** — LLMs tend to push forward and fix the immediate symptom rather than stepping back to find the root cause. Classic example: student used wrong model name (base instead of chat variant) → LLM generated pages of code to manufacture chat tokens instead of just correcting the model name. Junior dev didn't know better, went along with it.
- **Key mental model: LLM as a tireless junior analyst**
  - Incredibly hardworking, does whatever you ask, fast
  - But needs supervision — will go off on wrong tangents confidently
  - Senior engineers benefit most: they can spot when the LLM is wrong
  - Junior engineers risk: can be led astray without realizing it
  - Your job: keep it on rails, challenge it, don't blindly accept generated output

**Week 1 / Day 3 — Lecture 3: Exploring LLM Capabilities via Chat UI (In Progress):**

- **Purpose of this lecture:** Before writing code, tour the chat UIs (ChatGPT, Claude, etc.) hands-on to build intuition about LLM strengths and limits.
- **Structured reasoning** — GPT-5 handles business/professional questions excellently: coherent, structured, balanced (e.g. "when is a problem suitable for an LLM?"). Headings, sub-bullets, both sides of the argument.
- **Self-awareness** — Models can reflect on their own strengths/weaknesses. GPT-5 cited: excels at teaching, tool-assisted answers, synthesis across domains. Struggles with: fresh info past training cutoff, long mathematical derivations, deeply personal/subjective matters, extremely long reasoning chains. Also correctly named competitors: Claude (long context, human tone), Gemini (real-time multimodal), Mistral (lightweight/fast), Cohere (accuracy).
- **Emotional/human questions** — GPT-5 handles "what does jealousy feel like?" with rich, grounded emotional vocabulary. Likely draws from training data (many articles on this topic exist), but result is genuinely impressive. Future labs will test questions clearly outside training knowledge.
- **Nonsense question handling** — Old models (early GPT) gave garbled answers to absurd questions ("how many rainbows to jump from Hawaii to 17?"). GPT-5 gracefully identifies it as poetic/metaphorical and responds with wit and intelligence rather than hallucinating a literal answer. Huge improvement.
- **Token counting challenge** — Early models struggled with "how many times does letter A appear in this sentence?" because input is tokenized (chunks of chars), not individual letters. Frontier models now handle this easily. Also handles meta self-referential questions like "how many words are in your answer to this question?" — remarkable self-modeling ability.
- **Key takeaway:** Chat UIs are a fast way to test LLM capability before building with APIs. Same strengths/limits apply when you call the API in code — the UI just hides the API call.

**Day 3 — Quick Revision Summary:**

- **3 model types:** Base (just predicts next token, no instructions) → Chat/Instruct (RLHF-trained to follow Q→A instructions) → Reasoning (trained to think step by step before answering)
- **RLHF in one line:** Humans wrote good Q→A examples + rated responses → model reinforced toward preferred behavior. Same base weights, behavior steered into an assistant. "Helpful personality" is a trained layer, not fundamental — hence jailbreaks work.
- **Hybrid models** (GPT-5, Gemini 2.5 Pro): dynamically decide how much reasoning to use per question. A 4th mode, not just chat or reason.
- **Reasoning budget:** controllable via API — more thinking = better quality, slower, more expensive.
- **Budget forcing:** inserting "wait" into a reasoning model's thinking trace forces deeper reasoning. Works. (S1 paper, Jan 2025)
- **When to use which:** Reasoning → quality-critical problems. Chat → speed/cost-sensitive, creative writing. Base → only when fine-tuning from scratch (Week 6+).
- **Frontier model landscape:** OpenAI (GPT-5 hybrid, GPT-4.1 chat), Anthropic (Claude Sonnet = best balance), Google (Gemini 2.5 Pro hybrid), xAI (Grok), DeepSeek (open sourced everything — odd one out).
- **LLM weaknesses (architectural, not just usage tips):** Knowledge cutoff (training stops at a date), Hallucination with conviction (predicts plausible tokens, not true ones — confidently wrong), Band-Aid thinking (fixes symptoms not root causes).
- **Mental model:** LLM = tireless junior analyst. Fast and hardworking but needs supervision. Senior engineers benefit most — they catch when it goes wrong.

**Week 1 / Day 4 — Tokenization:**

- **Text → tokens, not words** — LLMs never see raw text. Input is converted to token IDs before processing. Common English words are usually 1 token each (with the space before them included: `" important"` ≠ `"important"`).
- **Rare words split into pieces** — `exquisitely` → `ex + quis + it + ly`, `witchcraft` → `witch + craft`. Lets the model handle unseen words by reusing known fragments.
- **Numbers split into chunks** — `3.141592653589793` becomes `3 . 141 592 653 589 793`. GPT tokenizers have separate tokens for every 3-digit number (000–999).
- **Code & math = more tokens** — `calculateUserSessionStatistics()` splits into many tokens. The "1 token ≈ 4 chars" rule breaks down for code, formulas, long variable names — they're rare strings and get fragmented.
- **`tiktoken` runs locally** — no API key needed. It just loads the tokenizer rules for a given model and runs the algorithm on your machine. No LLM call, no network request.
- **Practical estimates:**
  - 1 token ≈ 4 characters
  - 1 token ≈ 0.75 words
  - **1,000 tokens ≈ 750 words ≈ 4,000 characters**
  - Shakespeare's complete works ≈ 900k words ≈ 1.2M tokens (why API pricing is per million tokens)
- **Why it matters for engineers:** Context window limits, API costs, and chunking strategies (Week 5 RAG) are all measured in tokens not words. Always think in tokens when designing prompts or estimating cost.

**Week 1 / Day 4 — Illusion of Memory:**

- **Every API call is completely stateless** — the model has zero memory between calls. Each call is a fresh start with no knowledge of anything before it.
- **"Memory" is a trick you build** — to simulate conversation, you pass the entire conversation history in the `messages` list on every single call. The model just sees a long sequence and predicts the next token from it.
- **Why it knows your name** — it doesn't "remember" you told it. You included `{"role": "user", "content": "Hi! I'm Neeraj!"}` in the messages array. The model reads that in the current input and predicts accordingly.
- **You pay for the full history every call** — every turn you send all prior messages again. Cost grows with conversation length. That's intentional — you want the model to compute over the full context.
- **ChatGPT does this automatically** — the product manages the messages list for you. At the API level, it's the same trick: full history sent every time.
- **Frontier vs small models on explaining this** — Claude/GPT-4.1 say "you told me in message 1." llama3.2 invents technical explanations (NER, POS tagging) that sound plausible but are completely wrong. Classic hallucination with conviction — gets the _what_ right, fabricates the _how_. This is emergent honesty in frontier models, not an explicit rule someone programmed.

**Week 1 / Day 5 — Company Brochure Generator (Capstone):**

**The flow:**

- Scrape raw links from URL → LLM call 1 filters relevant links (returns JSON) → scrape content from each link → LLM call 2 writes brochure from all content

**Prompting lessons (transfer everywhere):**

- **One schema only** — never show two conflicting JSON examples in the same prompt
- **Valid JSON in example** — model copies what it sees, including syntax errors
- **Explicit skip rules** — "skip anchor links, mailto, duplicates" — be precise
- **Lock the output shape** — "links is the only key in your response" prevents hallucinated extra keys
- **Small models need more constraints** — frontier models are forgiving, llama3.2 needs tight instructions or it invents structure

**Engineering lessons:**

- **`response_format={"type": "json_object"}`** — API-level constrained decoding, not a prompt suggestion. Invalid tokens are masked, model physically cannot produce bad JSON
- **`try/except` around IO** — one bad URL (DNS fail, 403, timeout) shouldn't crash the whole pipeline
- **Truncate input `[:5_000]`** — prevents context window overflow when scraping large pages
- **Streaming** — `stream=True` + `update_display()` = typewriter effect. Syntax is a Google search, not worth memorising

**The progression:**

```
Day 1  = one LLM call
Day 5  = two LLM calls chained, each with a specific job (hardcoded pipeline)
Week 8 = LLM decides how many calls, in what order (orchestrated pipeline)
```

**Deep Understanding — How LLMs Actually Work (built during Week 1 discussions):**

- **Parameters are not data storage** — weights are connection strengths between neurons, not slots holding facts. Training data is discarded after training. Only the adjusted weights remain on disk.
- **Training loop is embarrassingly simple** — predict next token → measure error (loss) → adjust weights via backpropagation → repeat billions of times. That's GPT, Claude, all of them. Scale is what makes it non-trivial.
- **Self-supervised learning** — no human labels needed. The next token in the text IS the label. Entire internet = automatic training data. This is why scale was possible — no labeling bottleneck.
- **Input layer is tiny (~50k nodes)** — one node per token in vocabulary, not one per data point. Parameters live in the middle layers as connection weights between neurons. 10T parameters = total count of all connection weights across all layers in the entire network.
- **Activation functions found empirically** — Sigmoid → Tanh → ReLU → GELU. Nobody proved which was correct. Tried them, measured what worked, moved on. ReLU accidentally discovered to work better. Even researchers admit: "we don't fully know why it works as well as it does."
- **Loss decreases over training** — starts high (random weights, wrong predictions), drops fast early, slows down, never hits zero. Training stops when improvement per compute dollar isn't worth it. Emergent capability jumps happen unpredictably along the way.
- **Hallucination is architectural, not a bug** — model has no "truth" circuit. Only one mode: predict plausible next token. When knowledge gap exists, it fills with plausible-sounding tokens confidently. Can't be patched from inside — needs external grounding.
  - **Why, in more depth:** training only ever rewards "did you predict the token that actually appeared next" — truth was never the objective, plausibility was. A knowledge gap doesn't trigger a "not sure" response because no such circuit exists; the model just keeps doing the one thing it knows how to do (predict plausible tokens). Training data is full of confidently-written prose, so the _style_ it reproduces is confident even when the _content_ is fabricated — recalling and confabulating are literally the same mechanism (next-token prediction) internally, so the model can't tell them apart.
  - **Why prompting alone can't fix it** — "please only say true things" can shift tone/hedging but can't inject facts the model never saw. You'd be asking a next-token predictor to fact-check using only more tokens as input — no new information enters the system.
  - **What actually fixes it — grounding, not prompting:** give the model tools (function calling) so real actions/lookups replace memorized recall, or RAG so it does reading comprehension over fetched real documents instead of recalling from frozen weights. The model becomes an orchestration/reasoning engine over live, verifiable data instead of being asked to _be_ the knowledge store. This is the course's actual arc: Week 2 = tools, Week 5 = RAG, Week 8 = full agents.
- **Context drift in long conversations** — early precise details get diluted as conversation grows. Model starts pattern-matching to "what usually comes next in a conversation like this" rather than your specific facts. Why fresh context from a summary file beats long conversation history.
- **Your ideas that already exist:** GAN (generator vs discriminator fighting = your "opposite sections" idea, Goodfellow 2014), AI Debate (OpenAI 2018 = your "convince each other" idea), Constitutional AI (Claude's training = generate → critique → revise), Mixture of Experts (multiple sub-networks vote internally).
- **Why multi-model voting doesn't fully fix hallucination** — if all models trained on same data, they share the same blind spots. Consensus isn't truth, it's popular prediction. Like 5 people who all read the same wrong textbook verifying each other.
- **The real fix matches the problem** — LLM is a next-token predictor, not a knowledge store. Fix = stop asking it to know things, make it find things via tools. Model as reasoning/orchestration engine, tools as truth anchors. `Week 2 = tools, Week 5 = RAG, Week 8 = full agents.`
- **The big picture** — algorithm is solved, science is understood, what's left is engineering: data quality, hardware, chip manufacturing, energy. "Attention is All You Need" (2017) was the one genuine insight — everything since is scale + engineering.

---

### Week 2 — Chatbots & Conversation

**Files:** `day1.ipynb` through `day5.ipynb`, `week2 EXERCISE.ipynb`, `revealer.py`, `scraper.py`

| Day      | Topic                                        | Status | Notes                                                       |
| -------- | -------------------------------------------- | ------ | ----------------------------------------------------------- |
| Day 1    | Frontier APIs + Multi-Model Conversations    | [x]    | Completed 2026-06-20                                        |
| Day 2    | Gradio UI                                    | [x]    | Completed 2026-06-20                                        |
| Day 3    | Simple Chatbot with Gradio ChatInterface     | [x]    | Completed 2026-06-20                                        |
| Day 4    | Tools + Airline Assistant                    | [x]    | Completed 2026-06-20                                        |
| Day 5    | Multimodal Assistant (tools + image + audio) | [x]    | Completed 2026-06-20                                        |
| Exercise | Week 2 exercise                              | [x]    | Completed 2026-06-21 — built Celeste the astrologer chatbot |

**Key Learnings:**

**Week 2 / Day 1 — Frontier APIs + Multi-Model Conversations:**

- **One OpenAI client, all models** — Gemini, DeepSeek, Groq, Grok, Ollama all copied OpenAI's API format. Same `OpenAI()` client, just change `base_url` and `model`. Anthropic has its own SDK too (`from anthropic import Anthropic`) with slightly different syntax (`client.messages.create`, `max_tokens` required).
- **Reasoning effort** — same model, different thinking budget set at inference time. `reasoning_effort="minimal"` (fast/cheap) vs `"high"` (slow/expensive/accurate). Same weights, you're just telling the model how long to think before answering. More effort = better on hard problems, overkill on simple ones.
- **Inference vs Training** — Training = model learns from data, adjusts weights, happens once at the lab (very expensive). Inference = model uses frozen weights to generate a response to your input, happens every API call. Every `chat.completions.create()` = one inference. Reasoning effort controls how much compute is spent at inference time.
- **Local inference is slow** — deepseek-r1:1.5b running on CPU via Ollama = ~3 minutes for a simple puzzle. Same model on a datacenter GPU = seconds. Use `llama3.2` for quick local tests, save deepseek-r1 for when you want the reasoning chain.
- **Prompt caching** — send a large document once, pay full price. Send it again (same prefix), get a big discount — the KV cache from the first call is reused. OpenAI does it automatically. Anthropic requires explicit cache markers. Gemini supports both implicit and explicit. Put static content (instructions, large docs) at the start of the prompt, variable content at the end.
- **LiteLLM** — lightweight abstraction layer that unifies all model APIs. Also gives you cost tracking per call via `response._hidden_params["response_cost"]`. Preferred over LangChain for simple use cases.
- **LangChain vs LiteLLM:**

|             | LangChain                                                | LiteLLM                                         |
| ----------- | -------------------------------------------------------- | ----------------------------------------------- |
| Size        | Heavy — chains, agents, memory, tools, RAG, vectorstores | Lightweight — just the API call                 |
| Purpose     | Full framework for building LLM apps                     | Unified API wrapper only                        |
| When to use | Complex pipelines, agents, RAG                           | Just want to swap models easily + cost tracking |

- **LangChain/LiteLLM vs OpenRouter:**

|              | LangChain / LiteLLM                                   | OpenRouter                                               |
| ------------ | ----------------------------------------------------- | -------------------------------------------------------- |
| What it is   | Python library (runs in your code)                    | A cloud service (an actual server)                       |
| How it works | Translates your call → each provider's format locally | You call OpenRouter's API → they forward to the provider |
| API key      | You need each provider's key separately               | One OpenRouter key for all models                        |
| Cost         | Free (it's just a library)                            | OpenRouter adds a small markup per call                  |

**Short mental model:** LiteLLM = thin translation layer in your code. LangChain = full framework built on top of that idea. OpenRouter = a middleman server in the cloud.

- **Two-model adversarial conversation** — GPT and Claude talk to each other. The trick: manually build the `messages` list so each model sees itself as `assistant` and the other as `user`. Same "illusion of memory" from Week 1, but now you manage it across two separate models simultaneously.

**Week 2 / Day 2 — Gradio UI:**

- **Gradio in one line** — `gr.Interface(fn=your_function, inputs="textbox", outputs="textbox").launch()`. Wraps any Python function in a browser UI instantly. No frontend needed.
- **Streaming with `yield`** — already knew this from Week 1. Same concept, just wired into Gradio output.
- **Not worth going deep on** — Gradio is a prototyping/demo tool. At Adobe you'd use proper React UI. Just know the concept: wrap LLM function → get a UI for free.

**Week 2 / Day 3 — Simple Chatbot:**

- **`gr.ChatInterface`** — Gradio's built-in chat UI, handles conversation display automatically. Simpler than `gr.Interface` for chat use cases.
- **`chat(message, history)`** — the callback pattern Gradio expects. History is the full conversation so far, you append new message and call LLM.
- **Dynamic system prompt** — modify system prompt on the fly based on user input (keyword detection mid-conversation).
- **Illusion of memory confirmed live** — chatbot remembered name given earlier in conversation. Not real memory — just history list passed every call.

**Week 2 / Day 4 — Tools + Airline Assistant:**

- **Tools = LLM as decision maker, not executor** — LLM never runs code. It produces a token saying "call this function with these args" → your code runs it → result passed back → LLM gives final answer.
- **`finish_reason="tool_calls"`** — how you detect LLM wants to call a tool. Check this, run the function, pass result back with `role="tool"`.
- **Tool description is a dict** — name, description, parameters (JSON schema). LLM reads this to know what tools exist and when to use them.
- **`while` loop not `if`** — LLM may want to call multiple tools in sequence. Loop until `finish_reason` is no longer `"tool_calls"`.
- **Claude Code permission prompt = same pattern** — Claude produces "I want to run bash command X" token → harness intercepts → shows you Allow/Deny → you approve → harness runs it → result back to Claude. Human-in-the-loop added on top of same architecture.
- **`client.chat.completions.create()` is an SDK call** — `openai` is just a Python SDK that wraps a raw HTTP POST to `/v1/chat/completions`. Under the hood it's JSON over HTTP — the SDK handles auth headers, serialization, retries, streaming. Same as Axios/fetch wrapping HTTP in JS. Anthropic has its own SDK (`from anthropic import Anthropic`) with slightly different method names but same idea. LiteLLM sits on top of all SDKs as a unified abstraction layer.

**Week 2 / Day 4 — Tool Calling Pattern (exact steps, same everywhere):**

The tool calling flow is always the same pattern regardless of model or use case:

```
1. Define tool as a dict (name + description + JSON schema parameters)
2. Pass tools=tools to the API call
3. Check finish_reason == "tool_calls" on the response
4. Extract tool_call.function.name and json.loads(tool_call.function.arguments)
5. Run your actual Python function with those arguments
6. Append assistant message (has tool_calls, empty content) to messages
7. Append tool result as {"role": "tool", "content": result, "tool_call_id": id}
8. Call the API again with updated messages
9. Loop (while, not if) until finish_reason != "tool_calls"
```

- **Assistant message has empty content during tool call** — when model decides to call a tool, `message.content = None` and `message.tool_calls = [...]`. The text only appears in the final response after seeing the tool result. This is expected behavior, not a bug.
- **`messages.extend()` not `messages.append()` for tool responses** — tool responses come back as a list (multiple tool calls possible). `extend` unpacks the list into individual messages. `append` would nest a list inside a list, breaking the flat structure the API expects.
- **Every tool_call_id must have a matching tool response** — if model calls 3 tools, you must return 3 tool responses with matching IDs. Silent skip = API error or model confusion. Always add a fallback: `result = f"Unknown tool: {name}"`.
- **`while finish_reason == "tool_calls"` only** — don't add `or message.tool_calls`. After the final response, some models (qwen2.5) still have `tool_calls` populated on the message object even when `finish_reason = "stop"`. The `or` condition causes the tool to be called twice. `finish_reason` is the only reliable signal.
- **Variable shadowing bug** — old code used `message = response.choices[0].message` inside the loop, overwriting the `message` parameter (user's text). Use a different name: `assistant_msg = response.choices[0].message`.
- **Tool call intermediate messages are NOT in next turn's history** — Gradio only stores the final user/assistant text pairs. Tool call messages (assistant with tool_calls, tool results) live only in the current turn's local `messages` list. Next turn starts clean from Gradio history.
- **Small models ignore tool results** — `llama3.2` (3B) calls the tool but then answers from its own knowledge anyway. The code is correct, the model is too small. `qwen2.5:7b` handles tool results reliably. Always test tool use with a capable model.
- **Hallucination still happens with tools** — model only uses tool results for what the tool covers. Anything outside the tool (discounts, booking URLs) gets hallucinated confidently. Fix = add more tools, not better prompting.

**AI Engineering — Designing an Agentic Flow (General, not domain specific):**

- **System prompt is the brain** — domain rules, data dependencies, tone, what to refuse, when to ask for more info — all lives in the system prompt, not in if/else code. The better the system prompt, the less code you write.
- **Define minimum viable input upfront** — what is the absolute minimum a user must provide before the model can answer? Collect that first, everything else is optional/progressive.
- **Progressive enhancement** — design for minimum input, get better as more data arrives. Never block the user completely, always give something useful with what you have.
- **Separate computation from interpretation** — LLM does reasoning, storytelling, decision making. Tools do math, DB lookups, API calls, geocoding. Never ask the LLM to calculate things it can't (coordinates, planetary positions, dates).
- **Context window is a constraint, not a feature** — small local models have limited context. Decide upfront what to keep (last N messages) and what to drop. Full history = model gets confused or errors out.
- **Teach the model its own data dependencies via system prompt** — "if user asks X, you must first collect Y." Model then handles the conversation flow naturally without explicit code for every case.
- **Fallback strategy for every tool** — exact input fails → try fuzzy → try broader → ask user. Never let a tool silently fail with no recovery path.
- **Save opportunistically** — if user mentions useful data (location, time, preference) anywhere in conversation, extract and save it silently. Don't make user repeat themselves.
- **Scope creep is a system prompt problem** — users will ask off-topic questions. Block it in system prompt ("only answer X, for anything else say Y"), not in code.
- **Agentic flow = model decides, tools execute** — your job as engineer is to give the model the right tools and the right instructions. The model orchestrates, you don't hardcode the order.

**Week 2 / Day 5 — Agent Definition (Lecture):**

- **"Agent" has no single definition** — it's almost a running joke in the industry. But two definitions have taken hold.
- **Definition 1 — LLM controls the workflow** — the LLM decides what happens when. Not literally (it only predicts tokens), but those tokens are interpreted to drive the workflow. Autonomy = using token prediction as a decision mechanism.
- **Definition 2 (newer) — LLM runs tools in a loop to achieve a goal** — this is the Claude Code sense. Ongoing thought process, tool loop, working toward a goal until done.
- **Hallmark features of an agent** (the more you tick off, the more "agentic" it is):
  - Memory/persistence — remembers state across steps
  - Planning — can plan activities in advance
  - Autonomy — LLM token output drives what happens next
  - Orchestration — decides which tools to call and in what order
  - Tools — can take real actions in the world
- **Key insight** — generating structured JSON output and using tools are basically the same thing. Both are the model outputting tokens that get interpreted as instructions.
- **Day 5 is "baby steps toward agentic"** — multiple LLM calls stitched together (chat + image + audio) with tools. Not full agentic AI but the flavor of it. Full agentic AI = Week 8.

**Week 2 / Exercise — Celeste the Astrologer Chatbot:**

- **Real tools beyond toy examples** — `kerykeion` for actual birth chart calculation (sun/moon/rising/planets), `geopy` (Nominatim) for geocoding birth place to lat/lon. LLM orchestrates both in the right order.
- **SQLite persistence** — returning users are greeted by name with saved chart data, no need to re-enter details. `COALESCE` in upsert preserves existing values when new data is partial.
- **Tool ordering as system prompt instruction** — "call `resolve_location` before `calculate_chart`" is a system prompt rule, not code. LLM respects it and sequences the calls correctly.
- **Context window budget** — trimmed to last 6 messages (`history[-6:]`) for small model compatibility. Trade-off: old details may be forgotten mid-conversation.
- **Element-based compatibility table** — `get_compatibility` maps signs → elements → score/reading. Clean approach: data-driven lookup, not LLM hallucination for planetary positions.
- **Scope creep handled in system prompt** — "only answer astrology questions" blocks off-topic questions without any code.
- **Gemini via OpenAI-compatible endpoint** — `model="gemini-3.5-flash"` with `base_url="https://generativelanguage.googleapis.com/v1beta/openai/"`. Same tool-call pattern, different provider.

**Week 2 / Day 5 — Multimodal Airline Assistant (Tools + Image + Audio):**

- **DALL-E image generation** — `openai.images.generate()` with `model="dall-e-3"`, returns base64 JSON, decode with `base64.b64decode()` → `PIL.Image`. Costs ~$0.04 per image.
- **Text-to-speech** — `openai.audio.speech.create()` with `model="gpt-4o-mini-tts"`, returns raw audio bytes. Pass directly to Gradio `gr.Audio` component.
- **`handle_tool_calls` returns cities** — modified to also collect destination city names so the image can be generated for the right city after tool calls resolve.
- **`gr.Blocks`** — third Gradio UI type for custom layouts. `gr.Interface` = simple, `gr.ChatInterface` = chat, `gr.Blocks` = full custom control with rows, columns, and explicit component wiring.
- **`.then()` chaining** — Gradio event chain: `message.submit → put_message_in_chatbot → chat`. First callback adds user message to UI, second calls LLM and returns chat + audio + image simultaneously.
- **Capstone pattern** — tools (DB lookup) + image (DALL-E) + audio (TTS) all orchestrated by one `chat()` function. LLM decides which tool to call, your code handles the rest and updates all three UI components at once.

---

### Week 3 — Open Source Models + Google Colab (GPU)

**Files:** `day1.ipynb` through `day5.ipynb`, `visualizer.py`  
**Note:** Google Colab required from this week onwards

| Day   | Topic                                                        | Status | Notes                                                             |
| ----- | ------------------------------------------------------------ | ------ | ----------------------------------------------------------------- |
| Day 1 | HuggingFace Platform + Libraries + Google Colab              | [x]    | Concepts understood; ran and walked through the Colab notebook    |
| Day 2 | HuggingFace Pipelines (transformers vs diffusers)            | [x]    | Understood pipelines API + why diffusion syntax differs           |
| Day 3 | Tokenizers (encode/decode, vocab, chat templates)            | [x]    | Notebook reviewed, understanding refined                          |
| Day 4 | Model internals + Quantization (`Week_3_Day_4_models.ipynb`) | [x]    | Notebook reviewed                                                 |
| Day 5 | Token prediction visualizer (Ed Donner's `visualizer.py`)    | [x]    | Actually _seeing_ the probability distribution `lm_head` produces |

**Key Learnings:**

**Week 3 / Day 1 — my own understanding:**

- **Context window** — max amount of text (tokens = words or word-pieces) an LLM can process/"remember" in one request. Acts as the model's working memory — holds system prompt, chat history, user input, and the response all at once.
- **HuggingFace = "the GitHub of models"** — 3 parts on the platform:
  1. **Models** — huge catalog of open source models
  2. **Datasets** — datasets to train/test with
  3. **Spaces** — where you host the model/app you built
- **Temperature** — controls randomness/creativity of output by changing how the model picks the next word.
  - Low (0.0–0.3): safest/most likely word every time → steady, factual, repetitive
  - Medium (0.5–1.0): balances safe picks with some variety → good for normal chat
  - High (1.1–2.0+): flattens the odds, picks unusual words → creative but can lose focus / make errors
- **Ollama vs HuggingFace libraries:**
  - **Ollama** = pre-packaged product. Gives you a ready, efficient, packaged model — plug and play.
  - **HuggingFace libraries** = give you the actual model code. You can download it and play with layers/weights however you want.
- **HuggingFace libraries breakdown:**
  1. **Hub** — log in from code, pull models straight from the HF website
  2. **Datasets** — fetch datasets in code
  3. **Transformers** — train or do whatever you want with the model
  4. **peft** — used in fine-tuning
  5. **trl** — used in fine-tuning
  6. **accelerate** — used in fine-tuning
     (peft, trl, accelerate = the fine-tuning trio)
- **Google Colab** — runs a Jupyter notebook on the cloud with a powerful runtime. Code executes on a Google machine, viewed in the browser. Lets you collaborate with others.
  - **Runtime** — you connect to the cloud machine's resources
  - Free tier GPU: **T4 (15GB)**. Paid, higher spec: **A100 (40GB)**
- **Where I'm at:** ran the Colab notebook and saw the model working; the code is walked through below.

**`Copy_of_Week_3_Day_1_Colab.ipynb` — actual code walkthrough (part 1 of N):**

1. **GPU check** — `!nvidia-smi` runs a shell command from inside the notebook (`!` = shell escape in Colab). It queries the GPU driver directly and prints what card is attached + memory used/free. Code just checks the output text for "Tesla T4" to confirm the free-tier GPU is connected, not a CPU-only box.
2. **HuggingFace login** — `login(hf_token, ...)` — same idea as an API key for OpenAI/Anthropic. HF gates rate limits and gated models behind a token. `userdata.get(...)` is Colab's `.env` equivalent — reads a secret stored in Colab's key-icon panel instead of hardcoding it in the notebook.

The rest of the notebook (diffusion image pipelines, base+refiner, TTS, gated model access, cost calc) was covered in the following days.

**Week 3 / Day 2 — my own understanding:**

- **Two API levels in HuggingFace `transformers`:**
  - **Pipelines** — high level API to carry out standard tasks very quickly. Unlocks the power of a model in 2-3 lines of code (e.g. sentiment analysis, translation, summarization, NER, question-answering, text generation).
  - **Tokenizer + model directly** — lower level API, more power and control (used when pipelines aren't enough — Week 6/7 fine-tuning territory).
- Pattern for every pipeline: `my_pipeline = pipeline("the_task_I_want_to_do")` then `result = my_pipeline(my_input)`. If no model is specified, HF picks a sensible default for that task.
- **Training vs Inference** — training = model adapts/updates its weights from data (fine-tuning = training a model that's already been trained once). Inference = using an already-trained model to produce outputs on new inputs (a.k.a. "execution", "running a model"). Every GPT/Claude/Gemini API call so far = inference. The pipelines API is inference-only.
- Tried pipelines for: sentiment analysis, named entity recognition (NER), question-answering (context-based — a "baby RAG"), summarization, translation (en→fr, en→es), zero-shot classification, text generation.

**Diffusion pipeline syntax looks different — why:**

```python
# Text pipeline (one-shot task)
my_pipeline = pipeline("sentiment-analysis", device="cuda")
result = my_pipeline("some text")

# Diffusion pipeline (image generation)
pipe = AutoPipelineForText2Image.from_pretrained("stabilityai/sdxl-turbo", torch_dtype=torch.float16, variant="fp16")
pipe.to("cuda")
image = pipe(prompt=prompt, num_inference_steps=4, guidance_scale=0.0).images[0]
```

1. **No single `pipeline("task")` factory for diffusion** — `diffusers` is a separate library from `transformers`, with its own family of Pipeline _classes_ (`AutoPipelineForText2Image`, `DiffusionPipeline`, `FluxPipeline`). You pick the class yourself and call `.from_pretrained(model_id)` directly on it instead of naming a task.
2. **`.to("cuda")` is a separate step, not a `device=` kwarg** — a diffusion pipeline bundles several separate neural nets (UNet for denoising, VAE for encoding/decoding images, sometimes a text encoder), not one model. `.to()` is plain PyTorch's method for moving all their weights to the GPU at once. The text pipeline's `device="cuda"` kwarg is doing the same thing internally, just hidden because there's only one model to move.
3. **Extra generation knobs because it's iterative, not one-shot** — sentiment analysis is a single forward pass. Image generation starts from random noise and repeatedly refines it, so the call needs `num_inference_steps` (how many refinement passes) and `guidance_scale` (how strictly to follow the prompt). No text task needs these since it's not an iterative process.
4. **Return shape matches the output type** — text pipelines return `[{'label': ..., 'score': ...}]`. Diffusion pipelines return an object with `.images` (a list of actual images), since the output is pixels, not labels/text.

**Transformer models vs Diffusion models — the core architectural difference:**

|                              | Transformer (GPT, Claude, BERT, etc.)                                                                                                                                                                                          | Diffusion (SDXL, FLUX, etc.)                                                                                                          |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| **What it predicts**         | The next token, one at a time, given everything before it                                                                                                                                                                      | How much noise to remove from an image, given the current noisy image + prompt                                                        |
| **How output is built**      | Sequential — token 1, then token 2, then token 3... each depends on all previous tokens                                                                                                                                        | Iterative refinement — start from pure random noise, repeatedly "denoise" the whole image a little more each step                     |
| **Number of forward passes** | Roughly one per output token (can be 100s for a long response)                                                                                                                                                                 | Fixed, small number of steps set upfront (e.g. 4 for turbo, 30-50 for full quality) — same image gets progressively sharper each step |
| **Core building block**      | Self-attention — every token looks at every other token to decide what matters                                                                                                                                                 | UNet — a network that looks at the whole noisy image and predicts the noise pattern to subtract                                       |
| **Used in this course for**  | Text tasks — chat, sentiment, NER, summarization, translation, generation                                                                                                                                                      | Image tasks — text-to-image generation                                                                                                |
| **Common thread**            | Both are just next-step predictors at heart: transformer predicts "next token", diffusion predicts "how to make this slightly less noisy." Neither model _generates the final thing directly_ — both build it up step by step. |

**Week 3 / Day 3 — my own understanding (refined against `Copy_of_Week_3_Day_3_tokenizers.ipynb`):**

- **Tokenizer = the map between text and tokens for a particular model** — correct. `encode()` = text → token IDs (numbers). `decode()` = token IDs → text (reconstructs the original string). Confirmed in the notebook: `tokenizer.encode(text)` returns a list of ints, `tokenizer.decode(tokens)` turns that whole list back into one string.
- **`batch_decode` — refinement:** in the notebook it's used a bit differently than plain `decode`. Calling `batch_decode` on the _list of token IDs_ decodes each ID **individually**, letting you see exactly what text fragment each single token maps to (e.g. token `1234` → `" excited"`). `decode` on the same list reconstructs the **whole sentence** at once. Same method family, different granularity of what you're inspecting.
- **Vocab contains special tokens — correct**, and the notebook draws a distinction worth keeping: `len(tokenizer.vocab)` = the full vocabulary size (every token the model knows), while `get_added_vocab()` = only the _extra_ special tokens added on top of the base vocab (like `<|begin_of_text|>`, chat role markers) — the ones that "signal information" rather than represent real words/subwords.
- **Different models = different tokenizers — confirmed directly.** The notebook runs the _same_ sentence through Llama 3.1, Qwen2.5, Phi-4, and DeepSeek-V3.1 tokenizers and gets different token ID sequences each time — proof that vocab + splitting rules are model-specific, not universal.
- **`-Instruct` models — your understanding is right, here's the precise mechanism:** the base model (`Meta-Llama-3.1-8B`) is a raw next-token predictor with no built-in conversational behavior. The `-Instruct` variant (`Meta-Llama-3.1-8B-Instruct`) is the _same architecture_, further trained (RLHF-style, like Week 1 Day 3 covered) on examples wrapped in a specific system/user/assistant format. That format is exactly what `tokenizer.apply_chat_template(messages, ...)` reproduces.
- **The "Aha moment" — this is the one thing worth sharpening:** you said "it sends in this pattern as it pattern matches to what the model has been trained, no rocket science" — that's the right instinct, but it's not pattern-matching at _inference_ time, it's literal reuse of the _training-time_ format. Concretely, the pipeline is:
  1. Your `messages` list of dicts (Python objects) is **not** sent to the model directly — a model can only take numbers as input.
  2. `apply_chat_template()` converts that list into a **plain text string**, inserting the exact special tags (e.g. `<|start_header_id|>system<|end_header_id|>`) that this specific model saw millions of times during its instruct fine-tuning.
  3. That string is then tokenized (`encode`) into token IDs — _that_ numeric sequence is the real input to the model.
  4. The model outputs a probability distribution over "what token ID comes next" — nothing more mystical than that.
  - **Why this matters:** the notebook shows Llama, Phi-4, and DeepSeek each producing a _different_ literal prompt string from the identical `messages` list, because each was fine-tuned with its own chat template. Using the wrong template (or hand-rolling your own tags) for a given model degrades output quality, because you're feeding it a format it never trained on.
- **QwenCoder example** — encoding a Python function and decoding each token one-by-one showed subword tokenization on _code_ specifically (fragments like `def`, indentation, `_world`), reinforcing the Week 1 Day 4 point that code tokenizes less cleanly than prose — more, smaller fragments per line.

**Week 3 / Day 4 — `Week_3_Day_4_models.ipynb` — Model internals + Quantization:**

**Part A — Quantization (your deep-dive, confirmed against real code):**

The notebook's actual config, matching what you researched:

```python
quant_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_use_double_quant=True,
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_quant_type="nf4"
)
model = AutoModelForCausalLM.from_pretrained(LLAMA, device_map="auto", quantization_config=quant_config)
```

- **4-bit = 4 bits of memory per weight → 2⁴ = 16 possible values.** Every one of the model's original (near-infinite-precision) decimal weights gets rounded to the nearest of only 16 fixed numbers. Correct, and exactly what `load_in_4bit=True` + `bnb_4bit_quant_type="nf4"` does.
- **Quantization = compression** — trading "infinite decimal precision" for "16 pre-chosen buckets" to cut memory ~75% (4 bits vs the usual 16-bit storage). `model.get_memory_footprint()` in the notebook is literally measuring this saving.
- **Why NF4 specifically (not plain uniform 4-bit):** model weights aren't spread evenly across their range — most cluster near zero, in a roughly bell-curve (normal) distribution. NF4 ("NormalFloat4") places its 16 buckets _denser_ near zero and sparser at the extremes, so the buckets land where the actual weight values are, minimizing rounding error where it matters most. A naive evenly-spaced 4-bit scheme would waste precision on rare extreme values and under-serve the dense middle.
- **`bnb_4bit_use_double_quant=True`** — quantizes the quantization constants themselves (the small scaling numbers NF4 needs per block of weights) for a bit more memory savings on top.
- **`bnb_4bit_compute_dtype=torch.bfloat16`** — weights sit in 4-bit storage, but during actual math (matrix multiply) they're temporarily de-quantized to bfloat16 for the computation, then re-quantized. Storage is compressed; compute precision isn't crippled.
- **~98–99% accuracy retained** — matches the general finding that well-designed 4-bit quantization loses only a small amount of quality, because the buckets are placed intelligently (NF4) rather than naively.

**Part B — Model internals: what `print(model)` actually shows**

The notebook loads a real Llama model and prints its raw PyTorch structure (`model` cell) — this is worth grounding in transformer basics, since this is the first time you're seeing the architecture itself rather than just calling it through an API.

_Big picture pipeline (any decoder-only LLM: GPT, Claude, Llama, all of them):_

```
Input text
   │
   ▼
1. Tokenizer          → text into token IDs (Week 3 Day 3)
   │
   ▼
2. embed_tokens        → each token ID becomes a vector of numbers (e.g. 4,096 for Llama 3.2)
   │
   ▼
3. N × Decoder layers  → self-attention + MLP, repeated (16 for Llama 3.2-1B, 32 for Llama 3.1-8B)
   │
   ▼
4. lm_head             → final vector scored against the whole vocabulary
   │
   ▼
Predicted next token ID → decode back to text
```

- **`embed_tokens` (the embedding layer)** — a lookup table: 128,256 rows (one per possible token in the vocab), each row a 4,096-number vector. This vector is the model's _learned_ representation of what that token "means" — not a word definition, just coordinates in a 4,096-dimensional space that the model's training shaped so related concepts end up near each other. Turning text into these vectors is literally what makes the model's later math possible — you can't matrix-multiply words, only numbers.
- **Decoder layers (repeated block)** — each one contains:
  - **Self-attention** — lets tokens exchange context with each other. Every token produces three vectors from its embedding:
    - **Query (q_proj)** — "what am I looking for in the rest of the sentence?"
    - **Key (k_proj)** — "what do I have to offer, as a tag other tokens can match against?"
    - **Value (v_proj)** — "here's my actual content, to be pulled in if someone's query matches my key"
    - The model compares every token's Query against every other token's Key (a dot product) to get an attention score — how relevant token A is to token B. High-scoring pairs pull in more of that token's Value. Example: in "the bank of the river," the word "bank" attends strongly to "river" and pulls in its "nature/water" Value, shifting "bank" away from meaning a financial institution.
    - **Output projection (o_proj)** — mixes everything gathered back into a single updated vector, same size as before, ready for the next layer.
    - **Grouped-Query Attention (GQA)** — in the printout, `k_proj`/`v_proj` output smaller dimensions than `q_proj`/`o_proj` (e.g. 1024 vs 4096). This is a memory/speed optimization: fewer, shared Key/Value "profiles" are reused across multiple Queries instead of computing a full-size Key/Value per attention head.
      - **Multi-head attention, first** — a token's vector isn't used as one giant Q/K/V. It's split into multiple smaller **heads** (e.g. 32 heads of 128 dims each), each independently attending to a different _kind_ of relationship (one head might specialize in subject-verb links, another in pronoun references, etc.). Results get concatenated back together by `o_proj`. In **standard** attention, every token gets a full, separate Q, K, _and_ V vector per head — 32 heads = 32 independent Key/Value profiles.
      - **What GQA changes** — keeps all 32 Query heads, but reduces the number of _Key/Value_ heads (e.g. to 8). Each group of 4 Query heads shares one Key/Value head instead of having its own. That's the 4096 vs 1024 split in the printout (32×128 vs 8×128).
      - **The precise tradeoff (worth getting exactly right):** the 4 Query heads in a group still ask 4 _different_ questions — the Query side stays fully independent. What's shared is only the Key ("what I have to offer") and Value ("here's my actual content") — the catalog being searched. So it's: **full attention = 4 different catalogs for 4 different questions; GQA = 1 shared catalog, 4 different questions asked against it.** You lose the catalog's ability to specialize toward any one of the 4 question-types, but keep each question's ability to search that shared catalog differently.
      - **Analogy:** 4 researchers (Query heads), each digging into a different angle (tense, plurality, sentiment, category). In full attention, each has a private reference library (own K/V). In GQA, all 4 share one library. They can still each pull out different findings — because _how_ you search still shapes what you find — but the library itself is now one "generic enough for all 4" resource instead of 4 specialized ones.
      - **Why it doesn't collapse into "bad":** the Query projections are trained _knowing_ the K/V will be shared, so they adapt to extract the most useful signal from whatever generic-but-useful representation the shared K/V head settles into. Quality lands close to full multi-head attention (much closer than the more extreme Multi-Query Attention, which shares one K/V across _all_ heads) — a deliberate, measured point on the memory-vs-precision tradeoff, not an accident.
  - **MLP (multi-layer perceptron)** — after tokens have exchanged context via attention, the MLP processes each token's vector _independently_ — this is where the model applies learned "knowledge," not where tokens talk to each other. Llama uses a **Gated Linear Unit (GLU)** variant with three parts:
    - `gate_proj` and `up_proj` — both expand the vector from 4,096 up to a much larger space (e.g. 14,336) — more room to compute complex feature combinations.
    - `act_fn` (**SiLU**, a smooth ReLU-like non-linearity) — applied to `gate_proj`'s output, then multiplied element-wise with `up_proj`'s output. This acts as a learned filter: the gate decides which of the 14,336 computed features get to "pass through," and `up_proj` supplies the values being filtered.
    - `down_proj` — compresses the result back down from 14,336 to 4,096, so the vector matches the expected size for the next layer.
  - **Attention vs MLP in one line:** attention = tokens gather context from each other; MLP = each token independently reasons over what it just gathered.
- **`lm_head`** — the mirror image of `embed_tokens`. Takes the final 4,096-number vector (after all decoder layers) and projects it back across the full 128,256-word vocabulary, producing a score for every possible next token. The highest-scoring token is (usually) what gets generated next.
- **Important — this only produces ONE token, and then the whole thing repeats (autoregressive generation):**
  - The model processes every position in the input at once (a 10-token prompt gets 10 vectors pushed through all decoder layers in parallel), but `lm_head` only needs the vector from the **last position** — that's the one representing "everything so far," and it's what gets scored against the vocabulary. One forward pass → one new token.
  - That new token gets appended to the input, and the **entire sequence** (original prompt + every token generated so far) is fed through the model again to predict the next one. This is the same "illusion of memory" pattern from Week 1 (every API call resends the full history) — just now one level deeper: it's not "resend the conversation," it's _literally_ resending every prior token through the whole network again.
    ```
    [T1, T2, T3] → forward pass → predict T4
    [T1, T2, T3, T4] → forward pass → predict T5
    [T1, T2, T3, T4, T5] → forward pass → predict T6
    ... repeat until stop token or max_new_tokens
    ```
    This loop is exactly what `model.generate(input_ids, max_new_tokens=80)` does internally.
  - **KV cache (the efficiency fix):** naively, this means recomputing Key/Value vectors for T1, T2, T3 all over again on every step, even though nothing about them changed. In practice `transformers` caches previously computed K/V vectors, so each new step only computes Q/K/V for the _newest_ token and reuses cached K/V for everything before it — the new token's attention still checks against all prior Keys, just without recalculating them. This is also why GQA's memory savings compound: fewer K/V heads means a smaller cache to hold in GPU memory for the whole generation, so longer sequences fit without running out of VRAM.
- **Why this matters practically:** this is the actual content behind every "the model predicts the next token" statement from Week 1 — it's not abstract, it's this exact sequence of embedding lookup → repeated attention+MLP blocks → vocabulary-wide scoring. `bitsandbytes` quantization applies to the big weight matrices inside these `Linear4bit` layers (q/k/v/o/gate/up/down projections) — that's _where_ the 4-bit compression from Part A actually lives.

**Part C — other code details in the notebook:**

- **`device_map="auto"`** — lets `transformers` decide automatically how to split the model across available GPU/CPU memory, instead of you manually calling `.to("cuda")`.
- **`TextStreamer`** — swap `model.generate(...)` to also pass `streamer=streamer` and tokens print as they're generated, instead of waiting for the full response (same streaming concept from Week 1/2, just at the raw model level instead of an API).
- **`add_generation_prompt=True`** — tells `apply_chat_template` to append the special tokens that signal "now it's the assistant's turn to respond," rather than just formatting the conversation so far. Without it, the model may try to continue the _user's_ message instead of answering it.
- **`attention_mask`** — a same-shaped tensor of 1s telling the model which input positions are real tokens vs padding — needed once you're setting `pad_token` explicitly (`tokenizer.pad_token = tokenizer.eos_token` earlier in the notebook).
- Ran the same `messages` list across Llama, Phi, Gemma, Qwen, and DeepSeek (mix of quantized/non-quantized) through one shared `generate()` function — reinforcing Day 3's point that the underlying call pattern is identical across model families; only the model name and a couple of flags change.

**Week 3 / Day 5 — `visualizer.py` (Ed Donner's code) — actually _seeing_ the token prediction step:**

`day5.ipynb` calls into a local helper file (`visualizer.py`) that makes the exact "one forward pass → probability distribution over the whole vocabulary → pick the winner" step from Day 4 visible as a picture, using the OpenAI API instead of a local model:

```python
predictor = TokenPredictor(model_name)
predictions = predictor.predict_tokens(message)
G = create_token_graph(model_name, predictions)
plt = visualize_predictions(G)
```

- **`TokenPredictor.predict_tokens()`** — calls `chat.completions.create(..., stream=True, logprobs=True, top_logprobs=3, temperature=0, seed=42)`. The key parameters:
  - `logprobs=True` + `top_logprobs=3` — for every single token the model generates, OpenAI returns not just the chosen token, but the **top 3 candidates it considered** and their log-probabilities. This is the API exposing exactly what `lm_head`'s vocabulary-wide scoring produces internally (Day 4) — you don't normally get to see this, it's usually hidden behind the one word that "won."
  - `temperature=0` + `seed=42` — forces deterministic output (always picks the highest-probability token, same result every run) so the visualization is reproducible — ties back to the Week 3 Day 1 temperature note: `temperature=0` = always take the safest, most likely token.
  - `stream=True` — processes token-by-token as they arrive, capturing each one's probability + its runner-up alternatives (`math.exp(logprob)` converts log-probability back into a normal 0–1 probability) before moving to the next.
- **`create_token_graph()`** — builds a graph (via `networkx`) where the chosen tokens form a single vertical chain (the actual generated sentence, one node per token, in order), and each chosen token also gets 2 "alternative" nodes branching off it — the runner-up tokens that _almost_ got picked instead, each labeled with its probability.
- **`visualize_predictions()`** — draws that graph with `matplotlib`: the real generated sentence running down the middle, with the road-not-taken alternatives branching to the left/right at each step, all labeled with percentages.
- **Why this is worth sitting with:** every node in that graph is a snapshot of the same event described abstractly in Day 4 — "the final decoder-layer vector gets scored against the whole vocabulary, highest score wins" — except now you can literally look at a step and see, e.g., "orange" won with 61%, "vibrant" was a close second at 24%. It makes the probability distribution concrete instead of a mental abstraction.
- **Difference from Day 4's notebook:** Day 4 loaded open Llama/Phi/Qwen weights locally and looked at the raw PyTorch layers. This one calls the closed OpenAI API (`gpt-4.1-mini`) — you don't get to see `lm_head` itself, but `logprobs`/`top_logprobs` is the API's way of letting you peek at that same scoring step from outside a black-box model.

**Week 3 / Day 5 (part 2) — `Week_3_Day_5_Meeting_Minutes_product.ipynb` — the actual capstone:**

Your summary is right: the goal is a solution that turns a meeting audio recording into meeting minutes. It's a **two-step pipeline**, and it's the week's concepts landing in one real project:

```
Audio file
   │
   ▼
STEP 1: Transcribe (speech → text)
   │
   ▼
STEP 2: Analyze & Report (text → structured minutes)
```

- **STEP 1 — Transcription, two options compared side by side:**
  - **Open source** — `pipeline("automatic-speech-recognition", model="openai/whisper-medium.en", dtype=torch.float16, device='cuda', return_timestamps=True)`. Same `transformers.pipeline()` high-level API from Day 2, just a new task name. Whisper is OpenAI's open-sourced speech-to-text model (confusingly, "openai/" here is the HuggingFace org name, not an API call).
  - **Frontier API** — `openai.audio.transcriptions.create(model="gpt-4o-mini-transcribe", file=audio_file)`. Cloud call instead of a locally-loaded model, for comparison.
- **STEP 2 — Analyze & Report — this is 100% the Week 1 pattern, just with a bigger payload:**
  - Same `system` + `user` message structure from Week 1 Day 1 (system prompt sets the role/task — "you produce minutes of meetings..."; user prompt carries the actual data — the transcript). Nothing new conceptually, just the input is a transcript instead of scraped web text.
  - The generation step reuses **exactly** the Day 4 code pattern — `BitsAndBytesConfig` (NF4 4-bit quant) → `apply_chat_template` → `AutoModelForCausalLM.from_pretrained(..., quantization_config=quant_config)` → `TextStreamer` → `model.generate()` — running a quantized Llama 3.2 3B locally to turn the transcript into structured markdown minutes (summary, discussion points, takeaways, action items with owners).
- **The whole week converges here:** Day 2's pipelines (for transcription) + Day 3's tokenizer/chat template + Day 4's quantized local generation, all chained into one real product. Nothing new to learn conceptually — this is confirmation that all the individual pieces compose.
- **Your visualizer note (confirmed, no correction needed):** yes — every time the model generates the next token, the full sequence so far (initial prompt + every token generated up to that point) is what gets fed back in. That's the autoregressive loop covered in Day 4's notes above, and it's the same mechanism whether the model is generating one word for a joke or 2,000 tokens of meeting minutes (`max_new_tokens=2000` here).

**Week 3 — wrap-up takeaway:**

- **Core takeaway:** after Week 3, comfortable picking/loading an open source model — the harder part is prompt design + use case, not the HuggingFace plumbing. Finding a good model, loading it, and running it is now routine (`from_pretrained`, quantization config, tokenizer, `generate()` — same handful of lines regardless of which model). What actually takes the thought is picking the right model for the use case and writing a solid prompt.
- **Nuance for the next task (synthetic dataset generator):** with synthetic data, the prompt does double duty — it's not "get one good answer" like Week 1/2 projects, it's "generate _many_ answers that stay correctly formatted, diverse, and don't repeat/hallucinate in a way that would poison training data later." The Week 1 Day 5 prompting lessons (one schema only, valid JSON in the example, lock the output shape) matter more here than usual, since generation happens at volume, not once.

---

### Week 4 — Advanced Techniques

**Files:** `day1.ipynb`, `day2.ipynb`, `day3.ipynb`, `day4.ipynb`, `day5.ipynb`, `styles.py`, `system_info.py`

| Day   | Topic                                                           | Status | Notes                |
| ----- | --------------------------------------------------------------- | ------ | -------------------- |
| Day 1 | Choosing the right LLM — basics, Chinchilla scaling, benchmarks | [x]    | Completed 2026-08-29 |
| Day 2 | Leaderboards + commercial use cases (automate vs augment)       | [x]    | Completed 2026-08-29 |
| Day 3 | Python → C++ code conversion for performance (frontier models)  | [x]    | Completed 2026-08-29 |
| Day 4 | Same Python → C++ challenge with open source models             | [x]    | Completed 2026-08-29 |
| Day 5 | Same code-conversion challenge, C++ → Rust                      | [x]    | Completed 2026-08-29 |

**Week 4 — in short:** Week 4 was mostly about _awareness_. It's about knowing what to look at when choosing a model (open vs closed, params, context window, cost, benchmarks, leaderboards), then practising it by repeating the same code-conversion task with different models (Python → C++, then C++ → Rust).

**Key Learnings:**

**Week 4 / Day 1 — Choosing the Right LLM:**

- **"What's the best LLM?" is the wrong question** — the right question is "what LLM is good for the task in hand?" There's no universal winner, only fit-for-purpose.
- **Basics to check before picking a model:**
  - Open source vs closed source
  - Chat model vs reasoning model vs hybrid model
  - Parameter count
  - Context window
  - Release date + knowledge cutoff
  - Token count (pricing unit)
  - Inference cost, training cost, build cost
  - Time to market
  - Rate limits
  - Speed / latency
  - License
- **The Chinchilla Scaling Law** — number of parameters should scale roughly proportional to number of training tokens. If you're seeing diminishing returns from adding more training data, this gives a rule of thumb for how to scale model size instead (and vice versa — a model too large for its training data is undertrained).
- **Benchmarks narrow down options but aren't the final validation** — always sanity-check on your actual task, not just leaderboard rank.
- **Key benchmarks:**
  - **GPQA (Google-Proof Q&A)** — 448 hard physics/chemistry questions; PhD test-takers score ~65%, GPT-4 scored only 39%.
  - **MMLU-Pro** — harder version of MMLU with 10 answer choices instead of 4, reduces answer-guessing ambiguity.
  - **AIME benchmark** — complex mathematical problem-solving, distinct from basic arithmetic.
  - **LiveCodeBench** — coding benchmark sourced dynamically so models can't rely on memorized training data.
  - **MuSR (Multi-step Soft Reasoning)** — tests reasoning through scenarios like solving murder mysteries (means, motive, opportunity).
  - **Humanity's Last Exam (HLE)** — designed to be extremely hard; early models scored only 2-3%, showing how much harder it is than prior benchmarks.
- **Limitations of benchmarks:**
  - Training data contamination (model may have seen the test questions)
  - Not consistently applied across labs
  - Too narrow in scope
  - Hard to measure nuanced reasoning
  - Saturation (everyone scores near 100%, benchmark stops being useful)
  - Overfitting to the benchmark itself
  - Not proven whether models behave differently when they detect they're being evaluated

**Week 4 / Day 2 — Leaderboards + Commercial Use Cases:**

- **Where to actually compare models:**
  - **Artificial Analysis** — clear, comprehensive leaderboard evaluating models on intelligence, cost, and speed together.
  - **Vellum** — compares API costs and context windows across major providers (NY-based AI company).
  - **Scale (SEAL leaderboards)** — expert human evaluations.
  - **Hugging Face** — used to be the go-to leaderboard source, lost relevance due to gaming/update issues.
  - **LiveBench** — specifically addresses dataset leakage/contamination for more accurate performance measurement.
  - **LM Arena** — head-to-head human-voted model comparisons.
- **Commercial use case framing — two levers:**
  - **Automate** — use LLMs to do existing work faster/cheaper (e.g. a ChatGPT wrapper).
  - **Augment (differentiate)** — use LLMs to build something new/better than competitors could without it (e.g. specialization, agentic coding tools).

**Week 4 / Day 3 & Day 4 — Code Optimization Challenge (Python → C++):**

- **The task:** give the model a slow Python implementation (a compute-heavy loop) and have it rewrite it in C++ for a massive performance gain, then compile and run the C++ to confirm identical output with a fraction of the runtime. Same task run twice — once picking a frontier model (Day 3), once picking an open source model (Day 4) — to compare how well each tier handles it.
- **Why this task specifically** — it's a clean way to _pick a task and pick a model to fit it_, the Day 1 lesson in practice. Code translation + performance optimization needs strong code reasoning, so it's a good stress test to compare frontier vs open source at.
- **Frontier model (Day 3)** — handled the conversion with minimal guidance: correct C++ syntax, matching logic, picked sensible types/optimizations (e.g. right integer types for the loop range) largely on its own.
- **Open source model (Day 4)** — same prompt, same task. More capable open source coding models handled it fine too — the gap between frontier and open source has narrowed a lot for well-defined, mechanical tasks like straight code translation (as opposed to open-ended reasoning).
- **Key takeaway** — for a scoped, mechanical task like "translate this code and optimize it," an open source model can often get you most of the way there for free/cheap. Save frontier model spend for tasks with more ambiguity or open-ended reasoning, per the Day 1/Day 2 automate-vs-augment framing.

---

### Week 5 — RAG & Knowledge Bases

**Files:** `day1.ipynb` through `day5.ipynb`, `app.py`, `evaluator.py`  
**Folders:** `evaluation/`, `implementation/`, `knowledge-base/`, `pro_implementation/`

| Day   | Topic                                                                                 | Status | Notes                |
| ----- | ------------------------------------------------------------------------------------- | ------ | -------------------- |
| Day 1 | RAG basics — knowledge base, naive keyword retrieval, embeddings & vector search idea | [x]    | Completed 2026-10-02 |
| Day 2 | Chunking, embeddings, Chroma, t-SNE visualization (LangChain)                         | [x]    | Completed 2026-10-02 |
| Day 3 | Full RAG pipeline: retriever + LLM, implementation folder, Gradio app                 | [x]    | Completed 2026-10-04 |
| Day 4 | Evaluation: test sets, retrieval metrics (MRR, nDCG, Recall@K), LLM-as-judge          | [x]    | Completed 2026-10-04 |
| Day 5 | Getting more from RAG: LLM chunking, query rewrite, rerank; pro vs baseline          | [x]    | Completed 2026-10-11 |

**Key Learnings:**

**Week 5 / Day 1 — RAG (Retrieval-Augmented Generation):**

- **Where RAG fits:** we've already improved prompts with multi-shot prompting, tools, and more context. RAG takes "more context" to the next level:
  1. Build a **knowledge base** of expert/domain information.
  2. **Retrieve** the relevant pieces whenever the user asks a question.
  3. **Add** them to the prompt before calling the LLM.
- **Flow:** `User question → orchestrator code → (retrieve from knowledge base) → LLM (question + retrieved context) → answer`. The LLM itself is unchanged; the orchestrator code does the retrieval.
- **Why RAG over stuffing everything in the prompt / fine-tuning:** context windows are limited and costly; only the relevant slice is sent; the knowledge base can be updated instantly without retraining; answers are grounded in company data (fewer hallucinations).
- **Example project:** an AI knowledge worker for an insurance-tech startup, using the company's knowledge base (docs in a drive: products, employees, contracts, company info).
- **Naive RAG (first version):** load the knowledge base into a Python dictionary (`key → document text`), word-search the user message against the keys, and add any matching documents to the context.
  - **Limitation:** exact matching is brittle — one typo, plural, synonym or small mismatch and nothing is retrieved. Fuzzy matching helps a bit, but it still matches on _spelling_, not _meaning_. → motivates embeddings.
- **Auto-regressive vs auto-encoding LLMs:**
  - **Auto-regressive** (GPT, Claude, Llama — everything used so far): predict the next token from past tokens only; used for generation.
  - **Auto-encoding:** produce output from the _whole_ input (sees context before and after); used for sentiment analysis, classification, and **computing vector embeddings**. Examples: **BERT** (Google), **OpenAI embedding models** (`text-embedding-3-small/large`), sentence-transformers (`all-MiniLM-L6-v2`). Note: BERT itself is a base model; embedding models (e.g. sentence-transformers) are BERT-style models fine-tuned to output one vector for a whole text.
- **Tokens (recap):** LLMs don't take words, they take numeric token IDs. Modern tokens are word _fragments_ — not whole words, not single letters.
- **Vector embeddings:**
  - A vector = a list of numbers (hundreds to thousands of dimensions, e.g. 384, 1536, 3072) representing the _meaning_ of the input as a point in a high-dimensional space.
  - Can represent a token, word, sentence, paragraph, whole document, or even something abstract (e.g. an image).
  - **Closer points = more similar meaning.** Closeness is measured with **cosine similarity** (angle between vectors), Euclidean distance, or dot product.
  - Famous example: `king − man + woman ≈ queen` — comes from word2vec-style word vectors and shows vectors capture semantic relationships. Modern embedding models are used for similarity search, not usually for vector arithmetic.
  - An embedding model turns the **whole input text into one vector** (not a vector per token relationship); the vector database stores each vector alongside its original text.
- **The big idea of RAG with embeddings:**
  1. **Offline (indexing):** split knowledge-base documents into **chunks**, embed each chunk with an embedding model, and store vectors + original text in a **vector database** (Chroma, FAISS, Pinecone, etc.).
  2. **At query time:** embed the user's question with the _same_ embedding model and find the **nearest vectors** (top-k).
  3. **Augment:** add the original _text_ of those chunks to the prompt (system + history + user question + retrieved context), then call the chat LLM.
- **Important distinctions:**
  - The **embedding model is completely separate from the chat LLM** — different model, different job. Only natural-language text (never vectors) goes to the chat LLM.
  - Query and documents must use the **same** embedding model, otherwise the spaces don't match.
- **Gotchas:** chunk size/overlap affects quality; top-k too small misses info, too large adds noise and cost; retrieval quality caps answer quality, so evaluate retrieval separately from generation.
- **Hands-on (`week5/day1.ipynb`) — brute-force RAG on Insurellm:**
  - Local Ollama (`qwen2.5:7b`) through the OpenAI client (`base_url=http://localhost:11434/v1`), streaming responses.
  - **Knowledge base → dict:** read every file in `knowledge-base/employees/*` (key = lowercase surname, e.g. `lancaster`) and `knowledge-base/products/*` (key = lowercase file stem, e.g. `carllm`), value = file text.
  - **Retrieval:** `get_relevant_context(message)` strips punctuation, lowercases, splits into words, and returns `knowledge[word]` for every word that exactly matches a key.
  - **Augmentation:** `additional_context()` wraps matches as "The following additional context might be relevant…" (or "There is no additional context…"); `chat()` appends it to `SYSTEM_PREFIX` to build the system message, then sends `system + history + user message`.
  - **UI:** `gr.ChatInterface(chat, type="messages")` for a quick chat prototype.
  - **Observed limits:** only single-word exact matches work ("Who is Lancaster?" hits; "Alex Lancaster" works only via the surname; typos, synonyms, or multi-word product names miss) → this is why Day 2 moves to chunking + embeddings + a vector DB.

**Week 5 / Day 2 — Chunking, Embeddings & Chroma (LangChain):**

- **LangChain — pros/cons:**
  - Pros: simplifies building LLM apps (RAG, summarization, loaders, splitters, vector-store wrappers); faster time to market.
  - Cons: LLM APIs have matured, and the OpenAI-compatible endpoint means switching providers is often just changing `base_url`, so the need for a unifying framework has shrunk. LangChain is also heavyweight (many abstractions/dependencies) compared with light wrappers like LiteLLM.
- **Pipeline for the day:** Part A chunk documents → Part B embed chunks and store in Chroma → Part C visualize vectors.
- **Part A — Chunking:**
  - Load docs with `DirectoryLoader` + `TextLoader`, tagging each with `metadata["doc_type"]` (products / employees / contracts / company). Metadata is useful later for filtering and colouring.
  - Why chunk: whole documents are too big/noisy to retrieve; a chunk should hold one coherent idea. Chunk size is **experimental** — too small loses context, too large dilutes meaning and wastes tokens.
  - `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)`:
    - **Separator hierarchy:** tries paragraphs (`\n\n`) → lines (`\n`) → spaces → characters.
    - **Greedy packing:** adds pieces at the highest-level separator until the next piece would exceed 1000 chars, then closes the chunk (never splits a piece just to fill space).
    - **Fallback:** only drops to the next separator if a single piece is bigger than the limit.
    - **Overlap:** the next chunk starts with up to ~200 chars from the end of the previous one, so ideas cut at a boundary aren't lost.
    - Sizes are in **characters**, not tokens.
  - **How do we know chunking is good?** Evaluate retrieval: do the right chunks come back for real questions (recall/MRR — covered later in the week)? Also inspect chunks by eye and tune size/overlap.
  - Token-counting the whole KB (HF tokenizer for Qwen2.5) showed it fits in a context window — but we still do RAG for cost, speed and scalability.
- **Part B — Embeddings + vector DB:**
  - The **encoder/embedding model** turns each chunk's text into a vector; it only _creates_ vectors. The **vector database** (Chroma) just _stores and searches_ them (alongside text + metadata) — it doesn't create them.
  - Embedding options: OpenAI `text-embedding-3-small/large`, Gemini, Hugging Face models. Used `HuggingFaceEmbeddings("all-MiniLM-L6-v2")` locally (free, **384 dimensions**). Most of the compute/cost of indexing is in the embedding step.
  - `Chroma.from_documents(documents=chunks, embedding=embeddings, persist_directory="vector_db")`; inspect with `vectorstore._collection.count()` and `.get(include=["embeddings"])`.
  - Re-running: delete the old collection first so you don't duplicate chunks.
  - Vector DB choices: Chroma, Pinecone, Postgres (pgvector), MongoDB Atlas, FAISS, etc. It's like picking any database — decide on performance, cost, scale, hosting and ops; nothing magical.
- **Part C — Visualization:** t-SNE reduces vectors from 384D to 2D/3D (Plotly scatter, coloured by `doc_type`). Chunks of the same document type cluster together, showing embeddings capture meaning. Caveat: t-SNE distorts distances — good for intuition, not for exact measurement.
- **Interview takeaway:** nobody expects you to memorize package/import names — you look those up in the docs. What matters is the concepts and trade-offs: why chunk, chunk size/overlap trade-off, embedding model choice (quality vs cost vs dimensions), vector DB choice, same embedding model for index and query, and how you'd evaluate retrieval.

**Week 5 / Day 3 — Full RAG pipeline (retriever + LLM) & moving from notebook to code:**

- **Two abstractions used:** the **LLM** (`ChatOllama`, already seen) and the **retriever** (new). Everything else is plumbing.
- **Flow per question:** combine user text -> `retriever.invoke()` returns top-k chunks -> format them into the system prompt as `{context}` -> send system + history + question to the LLM -> return answer **and** the source docs (shown in the UI for transparency).
- **Chroma basics (key takeaways):**
  - A `Document` = `page_content` (text) + `metadata` dict (e.g. `source`, `doc_type`).
  - `Chroma.from_documents(docs, embedding, collection_name, persist_directory)` embeds, stores and saves to disk in one call.
  - To reuse later: `Chroma(persist_directory=..., collection_name=..., embedding_function=...)`, then `db.as_retriever(search_kwargs={"k": 4})` and `retriever.invoke(query)`.
  - The embedding model at query time **must be exactly the one used at ingest**.
- **Implementation folder (notebook -> app):** `implementation/ingest.py` (load, chunk, embed, store) and `implementation/answer.py` (retriever, LLM, `answer_question`), with `app.py` as the Gradio UI. The logic is the same as the notebook, just split into reusable modules: ingest once, answer many times.
- **History is a design choice:** here the retrieval query is _all previous user messages + the new one_. How you build the retrieval query is use-case specific.
- **Known weaknesses (RAG is somewhat hacky/experimental):**
  - **Missing neighbouring context:** a chunk about a topic may lack related info that sits in an adjacent chunk (e.g. awards listed in one chunk, the person's identity in the previous one).
  - **Query contamination:** concatenating the whole session means a sudden topic change is still dragged towards earlier messages. Fixes: use only the latest question, or have an LLM rewrite it into a standalone query.
- **Debugging note (keep in mind):** use one embedding model per collection, clean up/rebuild the vector DB when changing models or chunking, and sanity-check that different questions give different embeddings.
- **Next lesson:** evaluation and experimenting with encoders and chunking strategies.

**Week 5 / Day 4 — Evaluating RAG (test sets, retrieval metrics, LLM-as-judge):**

- **RAG pros:** rapid time to market; gives an LLM vast expertise; saves context length; avoids distracting the LLM with irrelevant context.
- **RAG cons:** it's a hack; it's empirical (trial and error: which chunking strategy, what to include in the context); unexpected "I don't know".
- **Turning the art into science = evaluate everything.** Build a test set: question + the right context identified (keywords) + reference answer. Then measure retrieval and answers separately.
- **Retrieval metrics:**
  - **MRR (Mean Reciprocal Rank):** average inverse rank of the first hit (rank 1 = 1.0, rank 2 = 0.5, rank 4 = 0.25). "Do I get a good chunk right at the top?"
  - **nDCG:** did the relevant chunks get ranked higher than the weaker ones? Rewards relevant items near the top, handles multiple relevant items.
  - **Recall@K:** what share of the needed information appears in the top K chunks (keyword coverage is the proxy used in the course code). "Did we miss important context?"
  - **Precision@K:** share of the top K chunks that are actually relevant. "How noisy is the context?"
- **Answer evaluation:** an LLM as a judge scores the generated answer against the reference answer for accuracy, completeness and relevance (1-5), plus written feedback. The judge returns **structured output**: a Pydantic model (`AnswerEval`) passed as `response_format`, so the reply is guaranteed JSON that is validated into a typed object and the scores can be used in code.
- **Course code:** `evaluation/test.py` (loads 150 questions from `tests.jsonl` in 7 categories: direct_fact, temporal, comparative, numerical, relationship, spanning, holistic) and `evaluation/eval.py` (`evaluate_retrieval`, `evaluate_answer`).
- **Experiments:** change one thing (chunk size, encoder), re-run the same tests and compare. Keep `k` fixed while changing chunk size so the amount of context sent to the LLM stays comparable.
- **Note on the course code:** relevance is decided by keyword presence in a chunk, and MRR is averaged per keyword. That is a practical proxy, not textbook MRR.

**Week 5 / Day 4 — Lecture example: how the course code measures retrieval and answers (`evaluation/eval.py`):**

**1. Retrieval test (is the right context fetched?)**

Each test has a question, **keywords**, and a reference answer. `evaluate_retrieval` calls `fetch_context(question)`, then checks the keywords against the retrieved chunks:

- **Relevance rule:** a chunk is "relevant" if it contains the keyword (case-insensitive). This is a proxy, not true labels.
- **MRR:** for each keyword, 1/rank of the first chunk containing it, averaged over keywords.
- **nDCG:** per keyword, binary relevance (1 or 0) per chunk in the top k, with a log discount, divided by the ideal DCG. Averaged over keywords.
- **Recall@K:** shown as keyword coverage, which is keywords found / total keywords.
- **Precision@K:** taught in the lecture, but not coded.

**2. Answer test (does the LLM answer correctly from context?)**

`evaluate_answer` runs the full RAG (`answer_question`). A judge LLM (`ollama/qwen2.5:7b`, the same model family as the generator) then compares the generated answer with the reference answer. It scores **accuracy, completeness and relevance** (1-5) plus written feedback. The output is forced into the Pydantic `AnswerEval` via `response_format`.

Hallucination is only indirectly checked. The judge compares against the reference answer, not against the retrieved chunks. So nothing checks whether the answer is supported by the context, unless the judge is also given the retrieved chunks (see gap 4).

**My local setup (progress so far):** to keep local runs fast, retrieval eval runs only the first 6 tests and answer eval only the first 8 (deliberate cap, not a bug). Done: 150 tests loaded across 7 categories; MRR, nDCG and keyword coverage coded; local LLM judge with structured output working.

**Week 5 / Day 4 — Gaps and industry-standard fixes (to read and tweak):**

1. **Test set.**
   - **What we have:** 150 fixed questions, each with keywords and a reference answer.
   - **The problem:** can't tell if the set is good; tuning chunk size or `k` against it overfits.
   - **Fix (industry):** split into a development set (for tuning) and a held-out set (final check); add unanswerable questions to test abstention; start from real user questions and logs; add LLM-generated questions reviewed by a human; keep growing it from production failures.
   - **Fits the local setup:** use a small stratified sample (a couple of questions per category) while tuning, then run the full set once at the end. The first 6/8 tests may cover only one or two categories if `tests.jsonl` is ordered by category.
2. **What counts as relevant.**
   - **What we have:** a chunk is relevant if it contains the keyword (case-insensitive substring match).
   - **The problem:** false hits (keyword appears in a chunk that doesn't answer the question), misses (paraphrases such as "price" vs "cost" score 0), and partial matches (short keyword like "AI" matches inside other words). MRR, nDCG and Recall are only as good as the keywords.
   - **Fix (industry):** define ground truth that does not change when chunking changes, then map each retrieved chunk back to it using its metadata (source, page, offset) or its text. Label the _source_, not the chunk ID, so one labelling works for every chunking experiment. Options: (a) source document labels (stable, coarse); (b) answer-span text labels (precise, stable, but a chunk boundary can split the span, so use a short span or fuzzy match); (c) an LLM judges "does this chunk help answer the question?" (no labelling, but one LLM call per chunk, slow locally). Cheap upgrade: whole-word regex match, and require the keyword _and_ the labelled source document.
   - **Ground truth depends on the knowledge base format:**

     | Knowledge base                    | Stable ground truth                      |
     | --------------------------------- | ---------------------------------------- |
     | Markdown / text files (Insurellm) | Source file name and/or answer-span text |
     | PDFs                              | Document + page number, plus answer text |
     | Web pages / wiki                  | URL or section heading                   |
     | Database rows                     | Primary key of the record                |
     | Tables / spreadsheets             | Sheet + row/cell reference               |
     | Tickets, chats, emails            | Ticket / thread ID                       |
     | Code repos                        | File path + function/class name          |

   - **"Correct" means correct per the local knowledge base:** reference answers and keywords come from our own documents, so the evaluation tests the pipeline, not real-world truth (if a document is wrong, a faithful answer still scores correct). Insurellm is fictional, so the LLM cannot answer from memory; a correct answer proves it used retrieved context. With public-knowledge questions a good score could come from the model's memory and hide retrieval failures. This is why the judge should also see the retrieved chunks (gap 4).
   - **Interview answer:** "I labelled each question with the source document(s) and key answer phrases. A chunk is relevant if it comes from a labelled document and contains the phrase. Labels are tied to source and text, not chunk IDs, so I can change chunking and re-run without relabelling. My course setup used keyword matching alone, a proxy; I'd add document labels or an LLM relevance judge."
   - **Where labels come from:** domain experts, real user logs, or LLM-generated question-from-document pairs reviewed by a human (the source document is the ground truth).
   - **For local experiments:** keyword matching is fine for comparing experiments (same bias on both sides), weak as an absolute score.

3. **Retrieval metrics in practice.**
   - **What we have:** MRR, nDCG, Recall@K computed, but no target for what is good enough. A 0.7 alone means nothing.
   - **The problem:** no pass/fail bar; averages hide failing categories (e.g. `spanning` or `holistic` near 0 while the overall MRR looks fine); the metrics answer different questions, so one number isn't enough.
   - **Fix (industry):**
     1. Set thresholds from the product need, e.g. Recall@K >= 0.9, MRR >= 0.7. Measure a baseline first, then require "no regression"; raise the bar when errors are costly (legal, medical).
     2. Treat **Recall@K as the primary metric**: the LLM can ignore noisy chunks but cannot use context that was never retrieved.
     3. Secondary signals: **MRR** = is the best chunk near the top; **nDCG** = ranking quality with several relevant chunks; **Precision@K** = how noisy the context is (cost and distraction).
     4. Report **per category**, not one global average. `direct_fact` is easy; `spanning` and `holistic` need many chunks, so judge their Recall@K separately.
     5. Tune K against Recall: pick the smallest K that hits the Recall target (larger K = more tokens and noise).
   - **Interview answer:** "I tracked Recall@K as the primary metric since missing context can't be recovered by the LLM, with MRR and nDCG for ranking quality and Precision@K for noise. I set a target such as Recall@K >= 0.9 from the baseline and business risk, reported it per question category, and used it as a regression gate when changing chunking or the encoder."
   - **For my project:** use keyword coverage as the Recall@K proxy, compute it per category on a stratified sample, and record the baseline in this file so later experiments have something to beat.
4. **Validating the LLM judge.**
   - **What we have:** the judge scores accuracy, completeness and relevance (1-5). Nobody has checked that the scores can be trusted.
   - **The problem:** self-preference (a judge from the same family as the generator favours its own style); a weak judge misses subtle errors and is inconsistent run to run; common biases (favours long answers, lenient).
   - **Fix (industry):** (1) hand-label a sample (~20-30), measure judge-vs-human agreement, tune the judge prompt until it agrees; (2) use a strong model at temperature 0, different from the generator; (3) keep the judge fixed across experiments (same model, prompt, rubric); (4) use a rubric with anchors ("5 only if every fact in the reference is present") and feedback before the score.
   - **For my project:** qwen2.5:7b generates answers, I store them, and Claude Sonnet reviews them in a chat session (stronger, different judge). Paste the same saved rubric each time, include question + retrieved chunks + generated answer + reference answer (the chunks let Sonnet also check that every claim in the answer is supported by the context, which catches hallucination), and spot-check some scores myself. Manual, so not automatable.
   - **Interview answer:** "The generator was a small local model and the judge a stronger, different model. Two things made the judge reliable: (1) I tuned its rating behaviour: a fixed rubric with anchored scores ('5 only if every fact in the reference is present; any wrong fact is 1'), compared against my own hand-labelled sample, adjusting the prompt where it was too lenient or inconsistent until it agreed with me, then kept the judge, prompt and temperature 0 fixed across experiments; (2) I gave it full context to judge with: the question, the retrieved chunks, the reference answer and the generated answer. The reference answer lets it check accuracy and completeness; the chunks let it check the answer is supported by the context, which catches hallucination. So score changes reflected the pipeline change, not the judge."
5. **Experiment discipline.** Learned: one change at a time, fixed `k`. Gap: single runs and averages can mislead. Industry: log every experiment (chunk size, overlap, encoder, `k`, prompt, scores) in MLflow, Weights & Biases or a simple log; inspect per-category and per-question failures; check the change is larger than run-to-run noise.
6. **Evaluation as a process.** Learned: a manual notebook step. Gap: not automated or ongoing. Industry: run evals automatically in CI on every prompt, chunking or model change; monitor live traffic with tracing (LangSmith, Langfuse, Phoenix); feed bad production answers back into the test set.
7. **Cost, latency and abstention.** Learned: "unexpected I don't know" is a con. Gap: only quality is measured. Industry: also track latency, cost per query and token use; measure correct abstention (says "I don't know" when context lacks the answer) and wrongful refusals.
8. **Retrieval improvements.** Learned: chunk size and `k` are the levers. Gap: no other levers tried. Industry: hybrid search (keyword + vector), reranking and query rewriting, each kept only if it beats the baseline on the test set (Day 5).

**Week 5 — Other chunking strategies (interview-ready):**

| Strategy                                                     | How it works                                                                                      | Good for / trade-off                                    |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Fixed-size (char/token)                                      | Cut every N chars/tokens, optional overlap                                                        | Simple, fast; can cut mid-sentence                      |
| Sentence-based                                               | Split on sentence boundaries, group N sentences                                                   | Clean units; uneven sizes                               |
| Structure-aware (Markdown headers, HTML, code, PDF sections) | Uses the document's own structure; headings become metadata                                       | Keeps sections intact; ideal for `.md` knowledge bases  |
| Recursive (used in the course)                               | Separator hierarchy, greedy packing, overlap                                                      | Strong general-purpose default                          |
| Semantic chunking                                            | Embed sentences; start a new chunk when similarity drops                                          | Topic-coherent; costs embedding calls, slower           |
| Token-based                                                  | Count in model tokens (`tiktoken`)                                                                | Guarantees fit within the embedding model's token limit |
| Sliding window                                               | Heavy overlap between chunks                                                                      | Few boundary losses; lots of duplicated storage         |
| Parent–child (small-to-big)                                  | Search on small chunks, return the larger parent to the LLM                                       | Precise retrieval + enough context                      |
| LLM / agentic chunking                                       | LLM decides split points or summarises chunks                                                     | Best quality; slow and expensive                        |
| Contextual chunking                                          | LLM prepends "where this chunk fits in the doc" before embedding (Anthropic contextual retrieval) | Fewer context-less chunks; extra indexing cost          |

- **Rule of thumb:** start with recursive → structure-aware for Markdown/code → parent–child or contextual if answers lack context → semantic/LLM only if cheaper methods fall short.

**Week 5 — Other likely interview questions (topics covered so far):**

- **RAG vs fine-tuning vs long context:** RAG = fresh/private knowledge, cheap to update, citable sources. Fine-tuning = change style/behaviour/skills, not great for facts. Long context = simple but costly per call, and accuracy can degrade on very long inputs ("lost in the middle"). Often combined.
- **Why not put the whole KB in the prompt?** Cost and latency per call, context limits, noise, no scaling to larger data.
- **Embedding-model considerations:** quality (MTEB benchmark), dimensions (storage/speed), max input tokens, cost/latency, local vs API, language support, domain fit. Changing the model means **re-embedding everything**.
- **Similarity metrics:** cosine similarity (most common), dot product, Euclidean (L2). Normalised vectors make cosine = dot product.
- **Exact vs approximate search:** large stores use ANN indexes (HNSW, IVF) trading a little recall for big speed gains.
- **Retrieval params:** top-k, similarity threshold, metadata filters (e.g. `doc_type`), MMR for diversity. Too low k misses info; too high adds noise and cost.
- **Dense vs sparse vs hybrid:** embeddings (semantic) vs BM25/keyword (exact terms, IDs, names); hybrid combines both, often with a **re-ranker** on the top results.
- **Common RAG failure modes:** bad chunking, wrong chunks retrieved, right chunks retrieved but ignored by the LLM, stale data, hallucination when context lacks the answer (hence "say you don't know" in the system prompt).
- **Evaluating RAG:** evaluate retrieval (recall@k, MRR, nDCG) separately from generation (accuracy, faithfulness/groundedness, relevance, LLM-as-judge).
- **Vector DB selection:** managed vs self-hosted, scale, filtering, hybrid search support, cost, existing stack (pgvector if you already run Postgres).
- **Security/ops:** access control per document, PII in the KB, prompt injection via retrieved documents, re-indexing when documents change.
- **Conversation handling in RAG:** what do you embed for retrieval - last message only, whole history, or an LLM-rewritten standalone question (query rewriting/condensing)? Whole-history concatenation can drag retrieval toward old topics; last-message-only loses follow-up context ("what about his salary?").
- **Lost neighbouring context:** a chunk may lack info from adjacent chunks. Mitigations: more overlap, bigger chunks, parent-child retrieval, contextual chunking (prepend doc/title info), or fetching neighbour chunks.
- **Ingest vs query code separation:** ingestion runs once/offline (`ingest.py`), answering runs per request (`answer.py`); both must share the same embedding model, `persist_directory` and `collection_name`.
- **Silent failure of embeddings:** a wrong or broken encoder returns plausible but irrelevant chunks with no error. Sanity-check that different questions give different vectors (cosine < 1), spot-check known queries (including misspelt names), and measure retrieval hit rate on a small test set. Mixing models/dimensions in one collection fails.
- **Why `temperature=0` for RAG:** factual, grounded answers with less random drift from the supplied context.
- **Showing sources:** return the retrieved chunks/metadata with the answer for transparency, debugging and citations.
- **Local vs API encoders:** Ollama/HF are free and private but need your hardware and can have quality or version quirks; API encoders (OpenAI, Gemini) cost money and send data out. Pick per privacy, cost and quality.
- **t-SNE caveat:** for visual intuition only; distances/cluster sizes are distorted.

**Week 5 — RAG mental model, glossary & quick reference:**

```text
INDEXING (offline, once / when docs change)
  documents → load (+ metadata) → chunk → embed (encoder model) → store in vector DB (vector + text + metadata)

QUERY (every question)
  user question → embed (SAME encoder) → similarity search top-k → retrieved chunks
        → prompt = system + history + retrieved context + question → chat LLM → answer
```

- **Glossary:**
  - **Chunk** — a small slice of a document that is embedded and retrieved as one unit.
  - **Embedding / vector** — fixed-length list of numbers representing the meaning of a text.
  - **Dimensions** — length of the vector (384 for MiniLM, 1536 for `text-embedding-3-small`, 3072 for `-large`).
  - **Vector store / DB** — stores vectors + original text + metadata and does nearest-neighbour search.
  - **Top-k** — number of closest chunks returned.
  - **Context window** — max tokens the chat LLM can read per call; retrieved chunks must fit within it.
  - **Grounding** — forcing answers to be based on supplied context (and "say I don't know" otherwise).
- **Quick code reference (look up the exact imports in the docs when needed):**
  - Load: `DirectoryLoader(path, glob="**/*.md", loader_cls=TextLoader)`
  - Chunk: `RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200).split_documents(docs)`
  - Embed: `HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")` or `OpenAIEmbeddings(model="text-embedding-3-large")`
  - Store: `Chroma.from_documents(documents=chunks, embedding=embeddings, persist_directory="vector_db")`
  - Retrieve: `vectorstore.as_retriever(search_kwargs={"k": 5})` then `retriever.invoke(query)`
- **Cost thinking:** indexing is a one-off embedding cost (re-run when docs change); each query costs one cheap query embedding + the chat LLM call whose size grows with k × chunk size. Local embedding models (HF) are free but use your hardware.
- **Design choices to be able to justify:** chunk size/overlap, embedding model, vector DB, top-k, metadata schema, and how you will evaluate retrieval quality.
- **Why Day 2 matters:** retrieval quality caps answer quality — a great LLM can't answer from the wrong chunks, so most RAG tuning effort goes into chunking, embeddings and retrieval, not the LLM.

**Week 5 / Day 5 — How to get more juice from RAG (lecture):**

10 techniques:

1. **Chunking strategy R&D** (semantic chunking, etc.)
2. **Encoder R&D:** try several encoders and pick one on a test set.
3. **Improve prompts:** general context, current date and history.
4. **Document pre-processing:** use an LLM to make the chunk or text for encoding.
5. **Query rewriting:** use an LLM to turn the user question into a RAG query.
6. **Query expansion:** use an LLM to turn the question into multiple RAG queries.
7. **Re-ranking:** use an LLM to sub-select from the RAG results.
8. **Hierarchical:** use an LLM to summarise at multiple levels.
9. **Graph RAG:** retrieve content closely related to similar documents (e.g. same metadata on related chunks; a graph DB when queries are very specific).
10. **Agentic RAG:** agents do the retrieval, combined with memory and tools such as SQL. Almost everything above can be done this way, since the LLM itself builds and gathers the context, but it is not predictable.

- **Observation:** query rewriting appended "Insurellm" to the query, which made retrieval pick more general company documents. Not every strategy helps every question.

**Week 5 / Day 5 — What I ran (pro pipeline vs baseline, local + Gemini):**

- **Pro pipeline:** LLM chunking (4) + query rewrite (5) + LLM rerank (7). Gemini flash-lite via litellm, `mxbai-embed-large` for embeddings.
- **Baseline:** recursive splitter (1000 chars, 300 overlap), plain vector search, `mxbai-embed-large`.

| Run                                       | MRR    | nDCG   | Keyword coverage |
| ----------------------------------------- | ------ | ------ | ---------------- |
| Baseline, all 150 tests                   | 0.8605 | 0.8642 | 94.1%            |
| Pro with nomic-embed-text, all 150 tests  | 0.6206 | 0.6259 | 66.4%            |
| Baseline, 30 hard (spanning + holistic)   | 0.5844 | 0.6320 | 79.5%            |
| Pro with mxbai, 30 hard                   | 0.7304 | 0.7559 | 85.2%            |

- **Small or easy test sets mislead:** 6 `direct_fact` tests gave MRR 1.0, but the full 150 gave 0.62.
- **The encoder mattered most:** the same chunks scored far better after switching from nomic to mxbai (technique 2).
- **One change at a time:** changing encoder, chunking and rerank together made the first result impossible to explain.
- **Pro helped on hard questions:** about +0.15 MRR, at the cost of roughly 2 extra LLM calls per question.

**Week 5 / Project — `tanstack-rag-assistant` (built, then reviewed and understood, completed 2026-10-17):**

- **What:** a RAG assistant over the TanStack docs. Corpus builder, structure-aware chunker, 6 retrieval methods, grounded answers with citations, retrieval metrics and an LLM judge. Notes are in `tanstack-rag-assistant/REVIEW.md`, with `PROJECT.md` and `DECISIONS.md`.
- **Refactor practice:** `Basic/1.py` to `Basic/7.py`, the refactor-and-rewrite exercises, are done.
- **Retrieval:** vector (Chroma), BM25, hybrid (RRF = `1/(rrf_k + rank)`), plus cross-encoder and LLM rerankers as a decorator. All sit behind one `Retriever` interface and a registry.
- **Index:** content-hash sync, so a rerun is a no-op and stale chunks are removed.
- **`llm.py`:** the only place that calls models. Sliding-window rate limiter; retries only transient errors, with jittered backoff.
- **`answer.py`:** errors returned as data. Citation ids are resolved in app code against the retrieved set only, so the model can't invent links.
- **Metrics:** recall@k is section-level (labeled sections covered / labeled sections). Precision@k is relevant chunks / k. MRR is 1/rank of the first relevant chunk. nDCG uses binary gain and a `1/log2(pos+1)` discount, normalized by the ideal DCG.
- **Judge:** a structured `Verdict` (`facts_covered`, `contradicts`, `faithful`, `behavior_ok`, `reason`). Field descriptions act as the prompt and force the output shape. The pass/fail rule `is_correct()` is deterministic code, not the LLM.
- **Fixes made in review:** removed the debug print in BM25 and added transient-only retries with jitter.
- **Gaps to close in later projects:** no `tests/`, `requirements.txt` instead of `pyproject.toml`/uv, `print` instead of logging, no CI.
- **Next (updated 2026-10-30):** Week 9 (FastAPI backend, `week9-fastapi/`) -> Week 10 (LangGraph, flagship-shaped exercises) -> flagship (HAR to SDK Studio, see `projects/har-sdk-studio/SCOPE.md`) -> Week 8.

---

### Week 6 — Fine-tuning

**Files:** `day1.ipynb` through `day5.ipynb`, `results.ipynb`  
**Folders:** `jsonl/`, `pricer/`

| Day   | Topic | Status | Notes |
| ----- | ----- | ------ | ----- |
| Day 1 |       | [ ]    |       |
| Day 2 |       | [ ]    |       |
| Day 3 |       | [ ]    |       |
| Day 4 |       | [ ]    |       |
| Day 5 |       | [ ]    |       |

**Note:** Week 7 has cheaper dataset option — look out for instructor instructions on cost control.

**Key Learnings:**

- ***

### Week 7 — Advanced Fine-tuning (Optional spend ~$10 for best results)

**Files:** `day1.ipynb`, `day2.ipynb`, `day3 and 4.ipynb`, `day5.ipynb`, `results.ipynb`, `util.py`  
**Folders:** `pricer/`

| Day       | Topic | Status | Notes |
| --------- | ----- | ------ | ----- |
| Day 1     |       | [ ]    |       |
| Day 2     |       | [ ]    |       |
| Day 3 & 4 |       | [ ]    |       |
| Day 5     |       | [ ]    |       |

**Key Learnings:**

- ***

### Week 8 — Autonomous Agentic AI (Capstone)

**Files:** `day1.ipynb` through `day5.ipynb`, `deal_agent_framework.py`, `price_is_right.py`  
**Folders:** `agents/`

| Day   | Topic | Status | Notes |
| ----- | ----- | ------ | ----- |
| Day 1 |       | [ ]    |       |
| Day 2 |       | [ ]    |       |
| Day 3 |       | [ ]    |       |
| Day 4 |       | [ ]    |       |
| Day 5 |       | [ ]    |       |

**Key Learnings:**

- ***

## Overall Progress Summary

| Week   | Status      | Completed Date |
| ------ | ----------- | -------------- |
| Week 1 | Completed   | 2026-06-07     |
| Week 2 | Completed   | 2026-06-21     |
| Week 3 | Completed   | 2026-08-10     |
| Week 4 | Completed   | 2026-08-29     |
| Week 5 | Completed   | 2026-10-11 (course), 2026-10-17 (TanStack RAG project reviewed) |
| Week 6 | Deferred    | Not needed for the current path |
| Week 7 | Deferred    | Not needed for the current path |
| Week 9 | Next main block: FastAPI backend (NoteMind, 9 sessions) |  |
| Week 10 | LangGraph bridge, then the flagship |  |
| Week 8 | Planned (after the flagship) |  |
| Week 11 | LLM system design, 1–2 weeks before interviews |  |

---

## Setup Checklist

- [x] Ollama installed — version 0.20.7
- [x] Python environment configured — `uv` v0.11.16, `uv sync` done, `.venv` created ✓
- [x] OpenAI API key — using Ollama locally instead (free, no key needed for course exercises) ✓
- [x] Anthropic API key — using Claude Enterprise via Adobe ($600/month budget) ✓
- [x] Google account ready for Colab — used for Week 3 notebooks ✓
- [ ] Repo bookmarked + course resources saved

---

## Notes & Reminders

- The course was **refreshed December 2025** — original content available via `git checkout original`
- Week 3+ requires Google Colab for GPU usage (free tier is fine)
- Always run cells yourself and tweak code — learning by DOING is the course mantra
