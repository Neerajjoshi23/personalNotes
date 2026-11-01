"""Gradio lab with two tabs.

Tab 1  Retrieval test: pick a group of eval questions (all, a split, or one category)
       and any combination of methods; get mean recall/precision/MRR/nDCG per method.
Tab 2  Answer test: one question, one method; see expected facts, retrieval, the
       Gemini answer with citations, and the evidence the model saw.

Run: python app.py
"""

import csv
import sys
import time
from collections import defaultdict
from pathlib import Path

import gradio as gr

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

from rag.answer import answer_question  # noqa: E402
from rag.config import get_settings  # noqa: E402
from rag.data import load_eval_set  # noqa: E402
from rag.judge import is_correct, judge  # noqa: E402
from rag.metrics import METRICS, mean_metrics, score_retrieval  # noqa: E402
from rag.models import AppError  # noqa: E402
from rag.retrievers import method_names, retrieve  # noqa: E402

S = get_settings()
EVAL = load_eval_set()
CATEGORIES = sorted({q.category for q in EVAL})
GROUPS = ["all", "dev", "heldout", *CATEGORIES]
METHODS = method_names()
DEFAULT_METHODS = ["vector", "bm25", "hybrid", "hybrid+rerank"]
METRIC_HEADERS = METRICS
RETRIEVAL_HEADERS = ["method", *METRIC_HEADERS, "avg seconds", "errors", "MRR by category"]
ANSWER_HEADERS = ["id", "category", "question", "answer", "expected facts", "correct", "facts", "faithful",
                  "judge reason", "retrieved (top k)", "MRR", "flags", "seconds"]
RESULTS_DIR = S.data / "results"


def save_csv(name, headers, rows):
    """Write the table to data/results so it can be downloaded or shared."""
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    path = RESULTS_DIR / f"{name}.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(headers)
        w.writerows(rows)
    return str(path)


def fmt(x):
    return "n/a" if x is None else f"{x:.3f}"


def pick_questions(group, answerable_only):
    """Retrieval metrics need labels, so that tab uses answerable questions only."""
    def keep(q):
        in_group = group == "all" or (group in ("dev", "heldout") and q.split == group) or group == q.category
        return in_group and (q.answerable or not answerable_only)
    return [q for q in EVAL if keep(q)]


def retrieval_test(group, methods, k):
    if not methods:
        raise gr.Error("Pick at least one method.")
    questions = pick_questions(group, True)
    if not questions:
        raise gr.Error("No answerable questions in that group.")
    k = int(k)
    table = []
    for m in methods:
        scores, total_s, errors = [], 0.0, 0
        by_cat = defaultdict(list)
        for q in questions:
            t = time.time()
            try:
                hits = retrieve(q.question, m, k)
            except AppError:
                hits, errors = [], errors + 1
            total_s += time.time() - t
            s = score_retrieval(hits, q.relevant_sections, k)
            scores.append(s)
            by_cat[q.category].append(s)
        mean = mean_metrics(scores)
        mrr_by_cat = ", ".join(f"{c}: {mean_metrics(v)['mrr']:.2f}" for c, v in by_cat.items())
        table.append([m, *[fmt(mean[h]) for h in METRIC_HEADERS], round(total_s / len(questions), 2), errors, mrr_by_cat])
    info = f"{len(questions)} questions ({group}), k={k}"
    return info, table, save_csv("retrieval_test", RETRIEVAL_HEADERS, table)


def answer_test(group, method, k):
    """One method over a group of questions; judges each answer and streams rows as they finish."""
    k = int(k)
    questions = pick_questions(group, False)
    if not questions:
        raise gr.Error("No questions in that group.")
    rows, correct, faithful, graded, flagged, secs = [], 0, 0, 0, 0, 0.0
    for q in questions:
        r = answer_question(q.question, method, k)
        sections = q.relevant_sections
        hits = r.retrieved
        scores = score_retrieval(hits, sections, k) if hits else None
        retrieved = ", ".join(
            ("*" if h.section in sections else "") + h.meta["source_path"].split("/")[-1] + "#" + h.meta["section_anchor"]
            for h in hits
        ) or "-"
        total = len(q.expected_facts)
        facts = ok = faith = reason = "n/a"
        flags = ""
        if r.error:
            answer = f"ERROR [{r.error.kind}]: {r.error.message}"
        else:
            answer = r.answer
            flags = "; ".join(
                ([f"unknown citation ids {r.unknown_citations}"] if r.unknown_citations else [])
                + (["no citations"] if r.missing_citations and method != "none" else [])
            )
            flagged += bool(flags)
            v, err = judge(q, answer, hits)
            if v:
                graded += 1
                c = is_correct(q, v)
                correct += c
                faithful += v.faithful
                facts = f"{v.facts_covered}/{total}" if total else "n/a"
                ok, faith, reason = ("yes" if c else "NO"), ("yes" if v.faithful else "NO"), v.reason
            else:
                reason = f"judge failed: {err}"
        secs += r.total_s
        rows.append([
            q.id, q.category, q.question, answer,
            "\n".join(f"- {f}" for f in q.expected_facts) or f"({q.expected_behavior})",
            ok, facts, faith, reason, retrieved, fmt(scores["mrr"]) if scores else "n/a", flags, r.total_s,
        ])
        summary = (
            f"**{len(rows)}/{len(questions)} done** ({method}, {S.gen_model}) | "
            f"correct **{correct}/{graded}** | faithful **{faithful}/{graded}** | "
            f"citation flags {flagged} | avg {secs / len(rows):.1f}s"
        )
        yield summary, rows, save_csv("answer_test", ANSWER_HEADERS, rows)


def build():
    with gr.Blocks(title=f"{S.name} RAG lab") as demo:
        gr.Markdown(f"# {S.name} RAG lab")
        with gr.Tab("Retrieval test"):
            group = gr.Radio(GROUPS, value="all", label="Questions (answerable only)")
            methods = gr.CheckboxGroup(list(METHODS), value=DEFAULT_METHODS, label="Methods (any combination)")
            k = gr.Slider(1, 10, value=5, step=1, label="k")
            gr.Markdown("`hybrid+llmrerank` is rate-limited to 6 calls/min, so it is slow over many questions.")
            go = gr.Button("Run retrieval test", variant="primary")
            info = gr.Markdown()
            table = gr.Dataframe(headers=RETRIEVAL_HEADERS, interactive=False, wrap=True, show_copy_button=True)
            file1 = gr.File(label="Download results (CSV)")
            go.click(retrieval_test, [group, methods, k], [info, table, file1])
        with gr.Tab("Answer test"):
            group2 = gr.Radio(GROUPS, value="direct", label="Questions (all categories, incl. ambiguous / out_of_corpus)")
            method = gr.Dropdown(["none", *METHODS], value="hybrid+rerank", label="One retrieval method (none = no retrieval)")
            k2 = gr.Slider(1, 10, value=5, step=1, label="k")
            gr.Markdown("Per question: one Gemini call to answer + one to judge (+1 for `hybrid+llmrerank`), limited to 6 calls/min, so ~20s per question. Rows stream in. `*` marks retrieved chunks from a labeled section. **correct** = all expected facts stated, nothing forbidden (or right clarify/abstain behaviour). **faithful** = every claim is supported by the retrieved chunks.")
            go2 = gr.Button("Run answer test", variant="primary")
            info2 = gr.Markdown()
            answers = gr.Dataframe(
                headers=ANSWER_HEADERS, interactive=False, wrap=True, show_copy_button=True,
            )
            file2 = gr.File(label="Download results (CSV)")
            go2.click(answer_test, [group2, method, k2], [info2, answers, file2])
    return demo


if __name__ == "__main__":
    build().launch()
