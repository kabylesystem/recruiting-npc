# Review — 25 September 2026

## Functional checks

| Check | Evidence / result |
| --- | --- |
| Python server | `npm run test:bug`: 8 tests pass (validation, origin, files, budgets, director parsing) |
| Game state | `node --test tests/unit/game-state.cjs`: 7 tests pass |
| Browser state | `node tests/browser/state-check.cjs`: focused Enter/retry starts one round, steering resets to zero, pause releases controls/freezes clock, real touch recovery charges 3 seconds and can end the attempt |
| Rules and input | `node tests/browser/gameplay-check.cjs`: six modifiers, expiry/reset, timeout/retry, desktop/touch input pass |
| Sound | Running AudioContext, measured RMS 0.00866, muted gain 0; this verifies a generated signal, not speaker listening |
| Escape | `node tests/browser/drive-check.cjs`: key picked up, exit crossed, barricade at 6.017 s and gravity at 13.017 s, win at 14.933 simulation seconds |
| Browser errors | No JavaScript errors in those three suites |
| Build | `npm run build:bug`: succeeds |

The browser tests use deterministic local director responses. The subscription director had already been verified separately in the previous session. Driving checks advance simulation ticks for reproducibility; they do not establish real-time FPS, retention or human enjoyment. Logs are local under ignored `artifacts/*-check.log`.

## Bugs corrected

1. Invalid successful director response now falls back immediately.
2. A replaced/aborted or previous-round request cannot overwrite the active decision or request controller.
3. Retry/recovery clears the steering spring and wheel steering values.
4. Recovery penalty counts towards the final score; consuming the remaining time ends the round immediately.
5. Enter on a focused start/retry button no longer activates both keyboard and native click handlers.

## Visual changes and inspection

Photographed asphalt/concrete with local diffuse, normal and roughness maps; UV scale follows metres. Voodoo billboard, Helix-inspired sculpture and Hole.io aperture are original tribute artwork. Billboard reacts to key pickup, rules and results. Letter textures respect the physical sign aspect ratio. Landscape HUD has separate room for patches, recovery and driving controls.

Car paint color space and material response corrected. Source body/glass/rim geometry and normals retained. Secondary detail reduced to keep the vehicle at 159,984 triangles. Disabling shadow-map reception on the vehicle removes the old renderer’s self-shadow artifacts while retaining its ground shadow. This is a visual compromise, not ray-traced rendering.

Run `node tests/browser/visual-review.cjs` for desktop/mobile screens plus asphalt, concrete and vehicle close-ups in `artifacts/review/`. These are actual browser renders. The material shots deliberately move the camera for inspection; ordinary gameplay/intro captures keep their normal cameras. Model decisions in these captures are scripted local responses.

## Scope

One arena, one vehicle and six bounded patches. The exercised paths pass; this is not a proof that every possible gameplay sequence is bug-free. Real human playtesting remains the way to judge difficulty and replay value.

## Follow-up: Voodoo AND Google DeepMind references

The earlier visual pass underrepresented the requested references. Intro and main billboard now name both; the arena contains DeepMind/Gemini/AlphaGo/AlphaFold/Genie and Voodoo/Helix Jump/Hole.io/Mob Control/Paper.io references. Each local patch has a relevant joke; the subscription director prompt requests one too. Physics and provider routing are unchanged. Rebuilt, 8 server + 7 state tests pass; visual captures refreshed with themed local responses.

Live subscription request after this update returned `source: codex`, patch `barricade`, and “Paper.io called; your route now has borders. Try not to color outside them.” Desktop and mobile captures have no page/network errors or horizontal overflow.
