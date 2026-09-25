# YOU ARE THE BUG

A driving escape game. Steal the access key, find an exit, and outplay a director that changes the rules while you drive.

Built on [Sketchbook](https://github.com/swift502/Sketchbook) by swift502. Original MIT license and vehicle physics retained.

## Play locally

```sh
npm ci --ignore-scripts --legacy-peer-deps
npm run build:bug
npm run play
```

Open **http://127.0.0.1:4277**. Node 20+ and Python 3.11+ are required. On this workstation the `you-are-the-bug.service` user service keeps the game running.

The original Sketchbook scene is available at `/game/sketchbook.html`.

## Controls

- WASD physical keys (ZQSD on AZERTY), or arrow keys: drive.
- Space: handbrake / drift.
- Shift: rechargeable boost.
- F (or touch “Sur les roues”): recover an overturned vehicle; the three-second penalty is included in the final score.
- R: immediately restart. Escape: pause.
- Touch controls are available on phones. Landscape gives a wider view.

## Rules

You start in the getaway car. Collect the white access key, then cross the perimeter through any of three exits before the 60-second simulation timer runs out. The director gets at most two interventions per attempt. Patches expire. Open exits remain physically clear: the director cannot spawn walls, and the loose red cargo has been removed.

The timer and director wait for the first forward/reverse input. Ground arrows and a distance marker lead to a recognizable white key, then to an open green gate. French instructions keep the current objective visible separately from active effects; each rule explains its consequence and the relevant controls. Recovery also starts the timer and charges its usual penalty.

| Patch | Actual effect | Opportunity |
| --- | --- | --- |
| Gravity | Gravity changes from −9.81 to −21 | More traction; boost onto the ramp |
| Rubber | Restitution rises; hard static impacts launch the car | Turn a collision into a jump |
| Ice | Tire grip is reduced | Coast, brake early, drift |
| Overdrive | Acceleration remains engaged; brake unavailable | More speed for a ramp escape |
| Mirror | Left/right inputs swap temporarily | Reverse your steering |

Best escape time is stored in this browser. Sound starts after a click and includes synthesized engine/impact sounds and optional browser speech. No microphone is used.

## AI director

The local Python server calls **Codex CLI using the existing ChatGPT subscription login**, model `gpt-6-luna`, low reasoning, strict JSON schema. Run `codex login` if this machine has no subscription login. API keys are not inherited. Shell, web search and skill tools are disabled for these game decisions. This does not change your global Codex settings.

```sh
python tools/bug-server.py --director codex  # default
python tools/bug-server.py --director claude # existing Claude subscription login
python tools/bug-server.py --offline         # explicitly local rule director
```

Two requests maximum per attempt, one model call at a time, 18-second deadline, eight requests per minute. Decisions are requested asynchronously; driving never waits. If the model is unavailable, over quota, invalid or late, a local rule director keeps the game playable. The HUD and result history say **AI** or **local** according to the actual source. The UI changes prepared mechanics; it does not execute generated code.

`GET /api/status` distinguishes authenticated availability from a successful verified model response. `POST /api/director` accepts bounded numeric game telemetry only. The server binds to localhost and rejects remote origins. Keep the inference service local; public hosting would need a different authenticated deployment.

## Verify

```sh
npm run test:bug
node --test tests/unit/game-state.cjs
node tests/browser/state-check.cjs
node tests/browser/drive-check.cjs
node tests/browser/gameplay-check.cjs
node tests/browser/onboarding-check.cjs # idle start, guided escape and mobile screenshots
node tests/browser/visual-review.cjs # desktop/mobile and material close-ups
```

Browser tests use isolated headless Chromium. Set `CHROMIUM_PATH` if Chromium is installed elsewhere. Screenshots are written under ignored `artifacts/`. `drive-check` uses keyboard events and the real game/physics loop to collect the key and escape during a patch. It accelerates simulation steps for reproducibility; it is not a measured human play session. `gameplay-check` verifies patch effects/expiry/reset, timeout/retry, pause, audio signal/mute and touch controls. `state-check` reproduces focused Enter handling, steering reset, recovery scoring and paused controls; the unit tests exercise stale/invalid director responses.

The car's runtime geometry is reduced with Blender (`blender --background --python tools/optimize-car.py`). Source asset and attribution are preserved.

## Arena design

A nocturnal test facility with photographed asphalt/concrete, metric texture scale, red/ivory curbs and original Voodoo / Google DeepMind tributes: Helix-inspired sculpture, sealed Hole.io aperture, AlphaFold ribbon, named AlphaGo/Gemini/Genie exits, research/retention walls and a “ONE MORE TRY” billboard. Local director jokes and the live director prompt refer to those worlds too. References are part of an independent hackathon demo; they do not describe its actual inference provider. Credits are available from the start screen.

## Credits

[Ferrari 458 Italia by vicent091036](https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6), CC BY 4.0; adapted materials, geometry and wheel attachment. Three.js, Cannon.js, Draco and Barlow fonts. Full [asset credits](docs/ASSET-LICENSES.md), also accessible inside the game.

## Prototype limits

One handcrafted arena, one controllable vehicle, five bounded modifiers. No open world, live code generation, multiplayer or character-on-foot phase. The borrowed 2020 physics engine remains in use. Automated play and smoke tests establish functionality; challenge, replay value and performance on target hardware still benefit from human playtesting.
