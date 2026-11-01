"""The only place that calls models (via litellm): chat completions and embeddings.

Completions share one rate limiter, so reranking, answering and judging stay
under the provider limit together. Override with LLM_CALLS_PER_MINUTE.
"""

import os
import random
import threading
import time
from collections import deque
from functools import lru_cache

import litellm
from dotenv import load_dotenv

from .config import ROOT, Settings, get_settings
from .models import AppError

load_dotenv(ROOT.parent / ".env")


class LLMError(Exception):
    pass


# Only these failures deserve a retry; a 400 or an auth error will fail again identically.
TRANSIENT_ERRORS = (
    litellm.RateLimitError,
    litellm.Timeout,
    litellm.APIConnectionError,
    litellm.ServiceUnavailableError,
    litellm.InternalServerError,
)


class LLM:
    def __init__(self, settings: Settings):
        self.s = settings
        self.model = settings.gen_model
        self.calls_per_minute = int(os.getenv("LLM_CALLS_PER_MINUTE", settings.llm_calls_per_minute))
        self._times: deque = deque()
        self._lock = threading.Lock()

    def _rate_limit(self) -> None:
        with self._lock:
            while True:
                now = time.monotonic()
                while self._times and now - self._times[0] >= 60:
                    self._times.popleft()
                if len(self._times) < self.calls_per_minute:
                    self._times.append(now)
                    return
                time.sleep(60 - (now - self._times[0]) + 0.1)

    def complete(self, messages, response_format=None, temperature=0) -> str:
        """Return the reply text. Retries transient failures with jittered backoff, then raises LLMError."""
        last = None
        for attempt in range(self.s.llm_retries):
            try:
                self._rate_limit()
                reply = litellm.completion(
                    model=self.model, messages=messages, temperature=temperature, response_format=response_format
                )
                return reply.choices[0].message.content
            except TRANSIENT_ERRORS as e:
                last = e
                time.sleep(2**attempt + random.random())  # jitter keeps concurrent retries from bunching up
            except Exception as e:
                raise LLMError(f"LLM call failed with a non-retryable error: {e}") from e
        raise LLMError(f"LLM call failed after {self.s.llm_retries} attempts: {last}")

    def embed(self, texts: list[str], prefix: str = "") -> list[list[float]]:
        """Embed texts with the configured embedding model; prefix is the model's task prefix."""
        try:
            res = litellm.embedding(
                model=self.s.embed_model,
                input=[prefix + t for t in texts],
                api_base=self.s.embed_api_base,
            )
            return [d["embedding"] for d in res.data]
        except Exception as e:
            raise AppError("embedding", f"Embedding request failed: {e}")


@lru_cache(maxsize=1)
def get_llm() -> LLM:
    return LLM(get_settings())
