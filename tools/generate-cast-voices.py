"""Regenerate authored French dialogue, using the checked-in text/file manifest.
Run: uv run --with edge-tts python tools/generate-cast-voices.py
"""
import asyncio
import json
from pathlib import Path
import edge_tts

ROOT = Path(__file__).resolve().parents[1]

async def main():
    manifest = json.loads((ROOT / 'assets/voices/casting.json').read_text())
    limit = asyncio.Semaphore(3)
    async def save(text, relative):
        destination = ROOT / relative.lstrip('/')
        actor = destination.name.split('-')[0]
        voice = {'1': 'fr-FR-DeniseNeural', '2': 'fr-FR-RemyMultilingualNeural'}.get(actor, 'fr-FR-HenriNeural')
        async with limit:
            await edge_tts.Communicate(text, voice).save(str(destination))
        print(destination.name, flush=True)
    await asyncio.gather(*(save(text, relative) for text, relative in manifest.items()))

if __name__ == '__main__':
    asyncio.run(main())
