"""LLM judge for generated answers.

One call per answer returns a Verdict: how many expected facts the answer states,
whether it contradicts a must_not_claim, whether every claim is supported by the
retrieved evidence, and whether it behaved right (answer / clarify / abstain).
The judge is the same model family as the generator, so spot-check by hand.
"""

from .config import get_settings
from .llm import get_llm
from .models import EvalCase, Hit, Verdict


def judge(q: EvalCase, answer: str, chunks: list[Hit]) -> tuple[Verdict | None, str | None]:
    """Returns (Verdict, None) or (None, error message)."""
    evidence = "\n\n".join(f"[{c.chunk_id}] {c.text}" for c in chunks) or "(no evidence passages were given)"
    facts = "\n".join(f"- {f}" for f in q.expected_facts) or "(none)"
    banned = "\n".join(f"- {f}" for f in q.must_not_claim) or "(none)"
    user = (
        f"Question: {q.question}\nExpected behavior: {q.expected_behavior}\n\n"
        f"Expected facts (N={len(q.expected_facts)}):\n{facts}\n\nMust not claim:\n{banned}\n\n"
        f"Evidence passages shown to the assistant:\n{evidence}\n\nAssistant answer:\n{answer}"
    )
    try:
        raw = get_llm().complete(
            [{"role": "system", "content": get_settings().prompt(get_settings().judge_prompt)},
             {"role": "user", "content": user}],
            response_format=Verdict,
        )
        return Verdict.model_validate_json(raw), None
    except Exception as e:
        return None, str(e)


def is_correct(q: EvalCase, v: Verdict) -> bool:
    """answer questions: all facts stated and no contradiction. clarify/abstain: behaved right."""
    if q.expected_behavior == "answer":
        return v.facts_covered >= len(q.expected_facts) and not v.contradicts and v.behavior_ok
    return v.behavior_ok and not v.contradicts
