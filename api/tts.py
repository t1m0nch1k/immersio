"""Vercel Function for free Edge-TTS playback.

The Vite middleware in vite.config.ts is kept for local development. This
function is the production counterpart used by the deployed Vercel app.
"""

import asyncio
import os
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
    with urlopen(request, timeout=20) as response:
        audio = response.read()
    if not audio:
        raise RuntimeError("Google TTS returned an empty audio response")
    return audio


class handler(BaseHTTPRequestHandler):
    def _send(self, status: int, body: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Cache-Control", "public, max-age=86400")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802 - Vercel handler API
        self._send(204, b"", "text/plain; charset=utf-8")

    def do_GET(self) -> None:  # noqa: N802 - Vercel handler API
        query = parse_qs(urlparse(self.path).query)
        text = query.get("text", [""])[0].strip()
        lang = query.get("lang", ["ja"])[0].lower()

        if not text:
            self._send(400, b"Missing text", "text/plain; charset=utf-8")
            return
        if len(text) > MAX_TEXT_LENGTH:
            self._send(413, b"Text is too long", "text/plain; charset=utf-8")
            return
        if lang not in VOICES:
            self._send(400, b"Unsupported language", "text/plain; charset=utf-8")
            return

        try:
            audio = asyncio.run(synthesize(text, VOICES[lang]))
        except Exception as edge_error:  # Edge-TTS can fail transiently.
            print(f"Edge-TTS unavailable: {edge_error}")
            try:
                audio = google_fallback(text, lang)
            except (URLError, RuntimeError, TimeoutError) as fallback_error:
                print(f"Google TTS unavailable: {fallback_error}")
                self._send(502, b"TTS providers unavailable", "text/plain; charset=utf-8")
                return

        self._send(200, audio, "audio/mpeg")

    def log_message(self, format_string: str, *args) -> None:
        # Keep Vercel logs focused on provider errors.
        return
