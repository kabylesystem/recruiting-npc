# PNJ À L’ESSAI

A French comedy casting game, an independent GTA VI parody. Drive to three animated candidates, honk to start an audition, perform the requested stunt, and build a cast that follows your car. The old key-and-exit game has been replaced.

## Play locally

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm run build:bug
npm run play
```

Open **http://127.0.0.1:4277**. On this workstation `you-are-the-bug.service` serves the game continuously. Reload an old tab to load the casting version.

## Controls and auditions

- Arrow keys or physical WASD (ZQSD on AZERTY): drive.
- H or the Klaxon button: speak to a candidate within 9 metres.
- Space: handbrake. Shift: boost. F: recover, with a three-second penalty.
- Escape: pause. R: restart. Touch buttons are available on phones.

Jean-Michel Cinématique wants a real collision for his stunt reel. Samira La Star wants a moving handbrake turn. Kevin Pathfinding needs three additional honks after accepting his audition. Recruited characters follow the car. Recruit all three within 90 simulation seconds; speed of recruitment and extra drifts increase the casting fee. The clock waits for the first movement or audition.

## Characters and sound

Two local skinned Mixamo/Three.js example models provide three animated characters. Fifteen original French lines have local MP3 audio with three synthetic voices. Speech and engine audio follow the sound toggle. Dynamic jury comments use browser French speech if the browser provides it; written subtitles remain available.

Regenerate the authored audio using `uv run --with edge-tts python tools/generate-cast-voices.py`. The checked-in manifest is the text/file source. Generation uses the Edge TTS service; game playback uses local files.

## Subscription jury

At most two comments per attempt are requested from the existing Codex CLI subscription (`gpt-6-luna`), with explicit local fallback. The legacy API `patch` enum now categorizes a joke; casting mode does not apply random driving penalties. Model output never executes code. Secrets are not committed or inherited into provider subprocesses.

`python tools/bug-server.py --offline` runs the local jury only. `--director claude` selects an existing Claude subscription login. The Python server binds to localhost and enforces origin, request size and request budgets.

## Verify

```sh
npm run build:bug
npm run test:bug
node --test tests/unit/game-state.cjs
node tests/browser/casting-check.cjs
```

The casting browser suite exercises real keyboard driving, collisions, drifting, horn input, local audio loading, result/retry and mobile layout. Isolated Chromium; override `CHROMIUM_PATH` if needed. Screenshots and logs are written to ignored `artifacts/casting/`. Simulation ticks are accelerated in tests; these are not measurements of FPS, human comprehension or fun. Earlier escape-game browser scripts are historical and do not validate the casting version.

## Credits and limits

Built on [Sketchbook](https://github.com/swift502/Sketchbook), MIT. The original scene remains at `/game/sketchbook.html`. Ferrari appearance, photographed surfaces, animated character models and audio provenance: [asset credits](docs/ASSET-LICENSES.md).

One street set, three authored auditions, a physical car, animated followers and optional generated jury comments. No open-world city, traffic simulation, procedural conversations or GTA assets. This is a playable prototype; human feedback must establish whether the comedy and replay loop work.
