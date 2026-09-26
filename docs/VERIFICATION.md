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

## Follow-up: first-play comprehension

Kusaila reported that the gameplay itself remained incomprehensible. The entry screen now illustrates three concrete steps in French. The world contains a recognizable key, ground arrows and a destination label with distance; gates change their label and light when unlocked. The current objective is never replaced by active-effect statuses. The timer and first director request wait for forward/reverse input (or recovery). Each patch states its actual effect and relevant input in French. Voodoo / Google DeepMind references remain in the world and jokes.

`node tests/browser/onboarding-check.cjs` exercises idle start (60 seconds unchanged, zero director calls), first movement, then drives using the game's current guidance target and real keyboard/Cannon mechanics. No teleport or hardcoded pickup/exit path is used. Desktop, portrait and landscape screenshots are under `artifacts/onboarding/`; objective/patch overlap checks and page errors are part of this suite. The guided run escaped in approximately 11.5 simulation seconds with a scripted local director. This proves the exercised path, not that a new human player understands or enjoys it.

The first visual pass exposed destination labels overlapping the HUD. Placement now avoids the objective, active-effect panel and patch card; corrected renders were inspected at 1440×900, 390×844 and 844×390.

Final checks for this update: build succeeds, all 7 state unit tests pass, and state-check, gameplay-check and onboarding-check finish successfully with no page errors. The guided run in the final check took 11.4 simulation seconds. Screenshots and logs remain under ignored artifacts/.

The audio assertion initially sampled silence: the idle start now silences the engine, and slow software WebGL can delay sampling past the short test tone. The test suspends drawing only during its 100 ms audio sample and restores rendering in finally; the actual audio graph/tone/mute code is unchanged. The rerun measures a nonzero signal.

## 26 September: remove confusing walls and redundant intro copy

User feedback overrides the earlier barricade mechanic: red walls appearing on the exit route contradict the green destination guidance. Removed barricade from both client and server patch catalogs, director prompt, local selection and scene spawning; five driving modifiers remain. Also removed the six loose red cargo blocks from the route. Historical tests above describe the older six-patch version.

Removed the intro dedication and explanatory AI paragraph identified as distracting. Desktop and mobile intro renders inspected after removal. Build, 8 server tests and 7 game-state tests pass. The onboarding and gameplay browser suites both pass against the five-modifier version: guided key-to-exit run wins at 10.48 simulation seconds, every remaining effect spawns zero barrier bodies, effect expiry/reset and touch controls pass, no page errors.

## Casting refactor — 26 September (current game)

The user rejected the underlying escape game, including its empty setting, missing NPCs and lack of voices/comedy. PNJ À L’ESSAI replaces that loop with three auditions in an exterior street set. Previous key/door and patch screenshots/tests above are historical.

New evidence: `tests/browser/casting-check.cjs` drives to the three actual characters, starts auditions with real H input, produces a Cannon collision, performs a moving handbrake turn, honks three times, reaches 3/3 and retries. The completed run took 20.97 simulation seconds and scored 2702; this is accelerated automated play, not a human score or evidence of enjoyment. Each audition audio returned readyState 4 and was playing. All fifteen local MP3s decode (61.1 seconds total). Eight server and seven state unit tests pass; the browser run has no page errors and no mobile overflow.

Screenshots in artifacts/casting/ cover intro, street, all three auditions, result and mobile. An incorrect skinned-model bounding box initially made Michelle enormous under old Three.js; source units now determine her scale. A mobile starting prompt overlapped a dialogue; speaking now dismisses that prompt.

Known scope: one street set, three authored auditions, two character models reused for three roles, procedural falls rather than ragdoll physics, followers rather than passengers inside the car. Fifteen authored lines have local audio; dynamic subscription jury lines depend on browser speech availability. The model jury is optional commentary and no longer changes driving rules. Humor, replay value and performance on the target PC still require human play.

Final follow-up: corrected mobile dialogue screenshot inspected; a focused browser check passes dialogue visibility without the starting prompt, paused clock, and timeout loss.
