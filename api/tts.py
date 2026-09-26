"""Vercel Function for free Edge-TTS playback.

The Vite middleware in vite.config.ts is kept for local development. This
function is the production counterpart used by the deployed Vercel app.

The endpoint speaks user supplied text to a third party voice service, so it
must not behave like an open proxy:

* CORS is opt-in via ``TTS_ALLOWED_ORIGINS`` (no header is emitted at all when
  the variable is empty or the request ``Origin`` is not allowlisted),
* responses are ``private`` so user text never lands in a shared CDN cache,
* every client IP gets a sliding window rate limit,
* the upstream providers are called with hard timeouts.

Only the standard library may be used here: the Vercel Python runtime installs
no third party packages besides ``edge_tts``.
"""

import asyncio
import math
import os
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler
from urllib.error import URLError
from urllib.parse import parse_qs, quote, urlparse
from urllib.request import Request, urlopen

import edge_tts


VOICES = {
    "en": os.getenv("EDGE_TTS_EN_VOICE", "en-US-EmmaNeural"),
    "es": os.getenv("EDGE_TTS_ES_VOICE", "es-ES-ElviraNeural"),
    "de": os.getenv("EDGE_TTS_DE_VOICE", "de-DE-KatjaNeural"),
    "fr": os.getenv("EDGE_TTS_FR_VOICE", "fr-FR-DeniseNeural"),
    "it": os.getenv("EDGE_TTS_IT_VOICE", "it-IT-ElsaNeural"),
    "ja": os.getenv("EDGE_TTS_JA_VOICE", "ja-JP-NanamiNeural"),
    "sk": os.getenv("EDGE_TTS_VOICE", "sk-SK-ViktoriaNeural"),
    "cs": os.getenv("EDGE_TTS_CS_VOICE", "cs-CZ-VlastaNeural"),
}
RATE = os.getenv("EDGE_TTS_RATE", "-12%")
MAX_TEXT_LENGTH = 500

# Hard upstream timeouts: the function is capped at maxDuration 30s, so a
# hanging provider must never eat the whole budget.
EDGE_TTS_TIMEOUT = 10.0
FALLBACK_TTS_TIMEOUT = 8.0

DEFAULT_RATE_LIMIT_MAX = 30
DEFAULT_RATE_LIMIT_WINDOW_MS = 60_000
# Hard cap on the in-memory rate limit table, so a spoofed-IP flood cannot
# grow the map without bound.
MAX_TRACKED_CLIENTS = 5_000
MAX_IP_LENGTH = 64

_rate_lock = threading.Lock()
_client_hits: dict[str, list[float]] = {}


def _env_positive_int(name: str, default: int) -> int:
    """Read a positive integer from the environment, ignoring junk values."""
    raw = os.getenv(name)
    if raw is None or not str(raw).strip():
        return default
    try:
        value = int(str(raw).strip())
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


def _rate_limit_max() -> int:
    return _env_positive_int("TTS_RATE_LIMIT_MAX", DEFAULT_RATE_LIMIT_MAX)


def _rate_limit_window_seconds() -> float:
    millis = _env_positive_int("TTS_RATE_LIMIT_WINDOW_MS", DEFAULT_RATE_LIMIT_WINDOW_MS)
    return millis / 1000.0


def _allowed_origins() -> frozenset:
    raw = os.getenv("TTS_ALLOWED_ORIGINS", "") or ""
    entries = {
        item.strip().rstrip("/").lower()
        for item in raw.split(",")
        if item.strip()
    }
    return frozenset(entries)


def _is_origin_allowed(origin: str) -> bool:
    allowed = _allowed_origins()
    if not origin or not allowed:
        return False
    normalized = origin.strip().rstrip("/").lower()
    if not normalized:
        return False
    # "*" only works when an operator explicitly allowlists it; the request
    # origin is still reflected instead of the literal "*".
    return "*" in allowed or normalized in allowed


def _prune_clients(now: float, window: float) -> None:
    """Drop stale buckets, then the least recently active ones if still full."""
    if len(_client_hits) <= MAX_TRACKED_CLIENTS:
        return
    for ip, timestamps in list(_client_hits.items()):
        if not timestamps or now - timestamps[-1] >= window:
            _client_hits.pop(ip, None)
    overflow = len(_client_hits) - MAX_TRACKED_CLIENTS
    if overflow > 0:
        least_recent = sorted(
            _client_hits.items(), key=lambda item: item[1][-1] if item[1] else 0.0
        )[:overflow]
        for ip, _ in least_recent:
            _client_hits.pop(ip, None)


def _consume_rate_limit(ip: str) -> tuple:
    """Sliding window limiter. Returns ``(allowed, retry_after_seconds)``."""
    now = time.monotonic()
    window = _rate_limit_window_seconds()
    maximum = _rate_limit_max()
    with _rate_lock:
        timestamps = [stamp for stamp in _client_hits.get(ip, ()) if now - stamp < window]
        if len(timestamps) >= maximum:
            retry_after = max(1, math.ceil(window - (now - timestamps[0])))
            _client_hits[ip] = timestamps
            return False, retry_after
        timestamps.append(now)
        _client_hits[ip] = timestamps
        _prune_clients(now, window)
        return True, 0


async def synthesize(text: str, voice: str) -> bytes:
    communicator = edge_tts.Communicate(text, voice, rate=RATE)
    chunks = []
    async for chunk in communicator.stream():
        if chunk.get("type") == "audio":
            chunks.append(chunk["data"])
    audio = b"".join(chunks)
    if not audio:
        raise RuntimeError("Edge-TTS returned an empty audio response")
    return audio


def google_fallback(text: str, lang: str) -> bytes:
    target_lang = "jap" if lang == "ja" else lang
    url = (
        "https://translate.google.com/translate_tts?ie=UTF-8&q="
        f"{quote(text)}&tl={target_lang}&client=tw-ob"
    )
    request = Request(
        url,
        headers={
            "User-Agent": (
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 Chrome/120.0 Safari/537.36"
            )
        },
    )
    with urlopen(request, timeout=FALLBACK_TTS_TIMEOUT) as response:
        audio = response.read()
    if not audio:
        raise RuntimeError("Google TTS returned an empty audio response")
    return audio


class handler(BaseHTTPRequestHandler):
    def _log(self, message: str) -> None:
        """Report rejected requests and provider failures on stderr."""
        sys.stderr.write(f"[tts] {message}\n")

    def _client_ip(self) -> str:
        forwarded = self.headers.get("X-Forwarded-For", "") or ""
        if forwarded:
            first_hop = forwarded.split(",")[0].strip()
            if first_hop:
                return first_hop[:MAX_IP_LENGTH]
        real_ip = (self.headers.get("X-Real-IP", "") or "").strip()
        if real_ip:
            return real_ip[:MAX_IP_LENGTH]
        if self.client_address:
            return str(self.client_address[0])[:MAX_IP_LENGTH]
        return "unknown"

    def _cors_headers(self) -> dict:
        """Reflect the request origin only when it is allowlisted."""
        origin = (self.headers.get("Origin", "") or "").strip()
        if not _is_origin_allowed(origin):
            return {}
        return {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Methods": "GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "600",
        }

    def _send(
        self,
        status: int,
        body: bytes,
        content_type: str,
        extra_headers: dict | None = None,
    ) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("X-Content-Type-Options", "nosniff")
        # The cached object depends on the request Origin, so any shared cache
        # must key on it even when CORS headers are not emitted.
        self.send_header("Vary", "Origin")
        for name, value in self._cors_headers().items():
            self.send_header(name, value)
        # "private" is deliberate: the body is synthesized from user supplied
        # text, so it must never be stored in a shared CDN cache where another
        # visitor could read it (and where a poisoned key could be replayed).
        self.send_header("Cache-Control", "private, max-age=3600")
        for name, value in (extra_headers or {}).items():
            self.send_header(name, value)
        self.end_headers()
        if body:
            self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802 - Vercel handler API
        self._send(204, b"", "text/plain; charset=utf-8")

    def do_GET(self) -> None:  # noqa: N802 - Vercel handler API
        query = parse_qs(urlparse(self.path).query)
        text = query.get("text", [""])[0].strip()
        lang = query.get("lang", ["ja"])[0].lower()

        if not text:
            self._log("rejected request: missing text parameter")
            self._send(400, b"Missing text", "text/plain; charset=utf-8")
            return
        if len(text) > MAX_TEXT_LENGTH:
            self._log(f"rejected request: text is {len(text)} characters")
            self._send(413, b"Text is too long", "text/plain; charset=utf-8")
            return
        if lang not in VOICES:
            self._log(f"rejected request: unsupported language {lang[:32]!r}")
            self._send(400, b"Unsupported language", "text/plain; charset=utf-8")
            return

        # Rejected requests cost nothing, so only bill the limiter for actual
        # synthesis attempts: that is the expensive, abusable path.
        client_ip = self._client_ip()
        allowed, retry_after = _consume_rate_limit(client_ip)
        if not allowed:
            self._log(f"rate limit exceeded for {client_ip}, retry in {retry_after}s")
            self._send(
                429,
                b"Too many requests",
                "text/plain; charset=utf-8",
                {"Retry-After": str(retry_after)},
            )
            return

        try:
            audio = asyncio.run(
                asyncio.wait_for(
                    synthesize(text, VOICES[lang]), timeout=EDGE_TTS_TIMEOUT
                )
            )
        except Exception as edge_error:  # Edge-TTS can fail or hang.
            self._log(f"Edge-TTS unavailable: {edge_error!r}")
            try:
                audio = google_fallback(text, lang)
            except (URLError, OSError, RuntimeError, ValueError) as fallback_error:
                self._log(f"Google TTS unavailable: {fallback_error!r}")
                self._send(502, b"TTS providers unavailable", "text/plain; charset=utf-8")
                return

        self._send(200, audio, "audio/mpeg")

    def log_request(self, code="-", size="-") -> None:
        # Successful syntheses are the normal case and stay out of the logs.
        try:
            status = int(code)
        except (TypeError, ValueError):
            status = 0
        if 200 <= status < 400:
            return
        self.log_message('"%s" %s %s', self.requestline, str(code), str(size))

    def log_message(self, format_string: str, *args) -> None:
        sys.stderr.write("[tts] " + (format_string % args if args else format_string) + "\n")
