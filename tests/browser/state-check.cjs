const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 640, height: 480 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(String(e)));
    await page.route("**/api/director", (r) =>
      r.fulfill({
        json: {
          patch: "ice",
          taunt: "Runtime regression check.",
          source: "local",
        },
      }),
    );
    await page.goto("http://127.0.0.1:4277/");
    await page.waitForFunction(() => window.__bug?.state === "intro");
    // Enter has both a global shortcut and native focused-button activation.
    await page.locator("#start").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => __bug.round), 1);
    const reset = await page.evaluate(() => {
      const g = __bug;
      g.car.triggerAction("left", true);
      g.car.steeringSimulator.target = 0.8;
      for (let i = 0; i < 50; i++) g.car.steeringSimulator.simulate(1 / 60);
      const before = g.car.steeringSimulator.position;
      g.resetCar();
      const after = g.car.steeringSimulator.position;
      const wheels = g.car.rayCastVehicle.wheelInfos.map((w) => w.steering);
      g.elapsed = 10;
      g.left = 50;
      g.recover();
      const recovery = { elapsed: g.elapsed, left: g.left };
      g.elapsed = 58;
      g.left = 2;
      g.recover();
      return {
        before,
        after,
        wheels,
        recovery,
        outcome: g.previousOutcome,
        state: g.state,
        score: g.elapsed,
      };
    });
    assert.ok(reset.before > 0.7);
    assert.equal(reset.after, 0);
    assert.ok(reset.wheels.every((v) => v === 0));
    assert.deepEqual(reset.recovery, { elapsed: 13, left: 47 });
    assert.equal(reset.outcome, "lose");
    assert.equal(reset.state, "result");
    assert.equal(reset.score, 60);
    const round = await page.evaluate(() => __bug.round);
    await page.locator("#retry").focus();
    await page.keyboard.press("Enter");
    assert.equal(await page.evaluate(() => __bug.round), round + 1);
    await page.keyboard.down("ArrowUp");
    await page.keyboard.press("Escape");
    assert.equal(await page.evaluate(() => __bug.keys.size), 0);
    assert.equal(
      await page.evaluate(() => __bug.car.actions.throttle.isPressed),
      false,
    );
    const paused = await page.evaluate(() => __bug.elapsed);
    await page.waitForTimeout(120);
    assert.equal(await page.evaluate(() => __bug.elapsed), paused);
    await page.close();
    const mobile = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    mobile.on("pageerror", (e) => errors.push(String(e)));
    await mobile.route("**/api/director", (r) =>
      r.fulfill({
        json: {
          patch: "ice",
          taunt: "Runtime regression check.",
          source: "local",
        },
      }),
    );
    await mobile.goto("http://127.0.0.1:4277/");
    await mobile.waitForFunction(() => window.__bug?.state === "intro");
    await mobile.locator("#start").tap();
    await mobile.evaluate(() => {
      __bug.elapsed = 10;
      __bug.left = 50;
    });
    const recover = mobile.locator("#recover-touch");
    assert.ok(await recover.isVisible());
    await recover.tap();
    const mobileRecovery = await mobile.evaluate(() => ({
      state: __bug.state,
      elapsed: __bug.elapsed,
      left: __bug.left,
    }));
    assert.equal(mobileRecovery.state, "playing");
    assert.ok(mobileRecovery.elapsed >= 13 && mobileRecovery.elapsed < 15);
    assert.ok(mobileRecovery.left <= 47 && mobileRecovery.left > 45);
    assert.ok(
      Math.abs(mobileRecovery.elapsed + mobileRecovery.left - 60) < 0.001,
    );
    await mobile.evaluate(() => {
      __bug.elapsed = 58;
      __bug.left = 2;
    });
    await recover.tap();
    assert.equal(await mobile.evaluate(() => __bug.state), "result");
    assert.equal(await mobile.evaluate(() => __bug.previousOutcome), "lose");
    assert.ok(
      Math.abs((await mobile.evaluate(() => __bug.elapsed)) - 60) < 0.000001,
    );
    assert.deepEqual(errors, []);
    console.log(
      JSON.stringify(
        {
          enter: "single round",
          reset,
          mobileRecovery,
          retry: "single round",
          pause: "controls released and clock frozen",
          errors,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
