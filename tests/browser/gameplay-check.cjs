const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const path = require("node:path");
const executablePath =
  process.env.CHROMIUM_PATH ||
  "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome";
(async () => {
  const browser = await chromium.launch({ headless: true, executablePath });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  await page.route("**/api/director", (route) =>
    route.fulfill({
      json: {
        patch: "barricade",
        taunt: "Your escape has been deprecated.",
        source: "local",
      },
    }),
  );
  await page.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
  await page.waitForFunction(() => window.__bug?.state === "intro");
  await page.locator("#start").click();
  // Exercise the real modifiers and their reset path, not a copy of rule calculations.
  const effects = await page.evaluate(() => {
    const g = __bug,
      report = {};
    for (const id of [
      "barricade",
      "gravity",
      "rubber",
      "ice",
      "boost",
      "mirror",
    ]) {
      g.start();
      g.keys.add("KeyW");
      g.tick(1 / 60);
      g.keys.clear();
      g.applyPatch({
        patch: id,
        taunt: "Runtime effect check.",
        source: "local",
      });
      report[id] = {
        active: g.effects.has(id),
        gravity: g.physics.gravity.y,
        restitution: g.contact.restitution,
        friction: g.car.rayCastVehicle.wheelInfos[0].frictionSlip,
        barriers: g.arena.temporary.filter((x) => x.body).length,
      };
      if (id === "boost") {
        for (let n = 0; n < 120; n++) g.tick(1 / 60);
        report[id].speed = Math.abs(g.car.speed);
      }
      if (id === "mirror") {
        document.dispatchEvent(
          new KeyboardEvent("keydown", { code: "KeyA", bubbles: true }),
        );
        g.tick(1 / 60);
        report[id].right = g.car.actions.right.isPressed;
        report[id].left = g.car.actions.left.isPressed;
      }
      g.elapsed = 50;
      g.tick(1 / 60);
      report[id].expired = !g.effects.has(id);
      g.start();
      report[id].resetGravity = g.physics.gravity.y;
      report[id].resetFriction =
        g.car.rayCastVehicle.wheelInfos[0].frictionSlip;
    }
    return report;
  });
  for (const v of Object.values(effects)) {
    assert.ok(v.active);
    assert.ok(v.expired);
    assert.equal(v.resetGravity, -9.81);
    assert.equal(v.resetFriction, 1.8);
  }
  assert.equal(effects.barricade.barriers, 1);
  assert.equal(effects.gravity.gravity, -21);
  assert.equal(effects.rubber.restitution, 1.05);
  assert.equal(effects.ice.friction, 0.24);
  assert.ok(effects.boost.speed > 2);
  assert.equal(effects.mirror.right, true);
  assert.equal(effects.mirror.left, false);
  await page.keyboard.press("Escape");
  const pausedAt = await page.evaluate(() => __bug.elapsed);
  await page.waitForTimeout(250);
  assert.equal(await page.evaluate(() => __bug.state), "paused");
  assert.equal(await page.evaluate(() => __bug.elapsed), pausedAt);
  await page.locator("#resume").click();
  assert.equal(await page.evaluate(() => __bug.state), "playing");
  const audio = await page.evaluate(async () => {
    const a = __bug.audio;
    // Software WebGL can delay this sample beyond the short tone's lifetime.
    // Keep the game loop active, but suspend drawing during the audio measurement.
    const render = __bug.renderer.render;
    __bug.renderer.render = () => {};
    try {
      await a.enable();
      a.tone(220, 0.4, 0.5);
      await new Promise((r) => setTimeout(r, 100));
      const data = new Float32Array(a.analyser.fftSize);
      a.analyser.getFloatTimeDomainData(data);
      const rms = Math.sqrt(
        data.reduce((sum, v) => sum + v * v, 0) / data.length,
      );
      const state = a.context.state;
      a.mute();
      return { state, rms, mutedGain: a.master.gain.value, enabled: a.enabled };
    } finally {
      __bug.renderer.render = render;
    }
  });
  assert.equal(audio.state, "running");
  assert.ok(audio.rms > 0);
  assert.equal(audio.mutedGain, 0);
  assert.equal(audio.enabled, false);
  // Timeout and immediate retry, preserving a clean round.
  await page.evaluate(() => {
    __bug.keys.add("KeyW");
    __bug.tick(1 / 60);
    __bug.keys.clear();
    __bug.left = 0.01;
    __bug.tick(0.02);
  });
  assert.equal(await page.evaluate(() => __bug.previousOutcome), "lose");
  assert.ok(await page.locator("#result").isVisible());
  await page.locator("#retry").click();
  assert.equal(await page.evaluate(() => __bug.state), "playing");
  assert.equal(await page.evaluate(() => __bug.used.length), 0);
  assert.equal(await page.evaluate(() => __bug.keyCollected), false);
  await page.evaluate(() =>
    __bug.applyPatch({
      patch: "rubber",
      taunt: "Collision damage removed. What could go wrong?",
      source: "local",
    }),
  );
  await page.screenshot({ path: "artifacts/patch-desktop.png" });
  await page.close();
  const mobile = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    deviceScaleFactor: 1,
  });
  mobile.on("pageerror", (e) => errors.push(String(e)));
  await mobile.route("**/api/director", (route) =>
    route.fulfill({
      json: {
        patch: "ice",
        taunt: "Traction has been deprecated.",
        source: "local",
      },
    }),
  );
  await mobile.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
  await mobile.waitForFunction(() => window.__bug?.state === "intro");
  await mobile.screenshot({ path: "artifacts/intro-mobile.png" });
  assert.equal(
    await mobile.evaluate(
      () => document.documentElement.scrollWidth > innerWidth,
    ),
    false,
  );
  await mobile.locator("#start").tap();
  const accelerator = mobile.locator('[data-key="KeyW"]');
  assert.ok(await accelerator.isVisible());
  await accelerator.dispatchEvent("pointerdown", { pointerId: 1 });
  assert.equal(await mobile.evaluate(() => __bug.keys.has("KeyW")), true);
  await accelerator.dispatchEvent("pointerup", { pointerId: 1 });
  assert.equal(await mobile.evaluate(() => __bug.keys.has("KeyW")), false);
  await mobile.screenshot({ path: "artifacts/playing-mobile.png" });
  console.log(
    JSON.stringify(
      {
        effects,
        audio,
        pause: "passed",
        timeoutRetry: "passed",
        mobile: "passed",
        errors,
      },
      null,
      2,
    ),
  );
  await browser.close();
  assert.equal(errors.length, 0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
