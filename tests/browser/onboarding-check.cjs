const path = require("node:path");
process.chdir(path.resolve(__dirname, "../.."));
const { chromium } = require("playwright-core");
const fs = require("node:fs");
const assert = require("node:assert/strict");
(async () => {
  fs.mkdirSync("artifacts/onboarding", { recursive: true });
  const b = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  });
  try {
    async function checkGuidance(page) {
      const layout = await page.evaluate(() => {
        const marker = document
          .getElementById("goal-marker")
          .getBoundingClientRect();
        const overlaps = [
          ...document.querySelectorAll(".objective, #effect-status, #patch"),
        ]
          .filter((panel) => !panel.hidden)
          .filter((panel) => {
            const r = panel.getBoundingClientRect();
            return (
              marker.left < r.right &&
              marker.right > r.left &&
              marker.top < r.bottom &&
              marker.bottom > r.top
            );
          })
          .map((panel) => panel.id || panel.className);
        return {
          overlaps,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.deepEqual(layout, { overlaps: [], overflow: false });
    }
    const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
    const errors = [];
    p.on("pageerror", (e) => errors.push(e.message));
    let calls = 0;
    await p.route("**/api/director", (r) => {
      calls++;
      return r.fulfill({
        json: {
          patch: calls === 1 ? "rubber" : "mirror",
          taunt: "AlphaFold called. Your car is not a protein. Stop folding it.",
          source: "local",
        },
      });
    });
    await p.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
    await p.waitForFunction(() => window.__bug?.state === "intro");
    await p.screenshot({ path: "artifacts/onboarding/01-intro.png" });
    await p.locator("#start").click();
    await p.evaluate(() => {
      for (let i = 0; i < 180; i++) __bug.tick(1 / 60);
    });
    assert.equal(await p.evaluate(() => __bug.left), 60);
    assert.equal(calls, 0);
    await p.screenshot({ path: "artifacts/onboarding/02-ready.png" });
    await checkGuidance(p);
    await p.keyboard.down("ArrowUp");
    await p.evaluate(() => {
      for (let i = 0; i < 30; i++) __bug.tick(1 / 60);
    });
    await p.keyboard.up("ArrowUp");
    assert.ok(await p.evaluate(() => __bug.left < 60));
    assert.ok(await p.locator("#drive-prompt").isHidden());
    let picked = false;
    for (let i = 0; i < 300; i++) {
      const r = await p.evaluate(() => {
        const g = __bug,
          b = g.car.collision;
        if (g.state !== "playing")
          return { done: true, win: g.previousOutcome };
        const t = g.currentGoal;
        const q = b.quaternion;
        let a =
          Math.atan2(t.x - b.position.x, t.z - b.position.z) -
          Math.atan2(
            2 * (q.w * q.y + q.x * q.z),
            1 - 2 * (q.y * q.y + q.x * q.x),
          );
        a = Math.atan2(Math.sin(a), Math.cos(a));
        let l = a > 0.06,
          r = a < -0.06;
        if (g.effects.has("mirror")) [l, r] = [r, l];
        const speed = Math.abs(g.car.speed);
        for (const [code, pressed] of [
          ["KeyW", speed < 5 || Math.abs(a) < 0.25],
          ["KeyA", l],
          ["KeyD", r],
          ["Space", speed > 7 && Math.abs(a) > 0.4],
        ])
          document.dispatchEvent(
            new KeyboardEvent(pressed ? "keydown" : "keyup", {
              code,
              bubbles: true,
            }),
          );
        for (let n = 0; n < 12 && g.state === "playing"; n++) g.tick(1 / 60);
        return {
          done: g.state !== "playing",
          win: g.previousOutcome,
          key: g.keyCollected,
          t: g.elapsed,
          goal: g.currentGoal,
          x: b.position.x,
          z: b.position.z,
        };
      });
      if (r.key && !picked) {
        picked = true;
        await p.screenshot({
          path: "artifacts/onboarding/03-key-collected.png",
        });
        console.log("pickup", r);
      }
      if (r.done) {
        console.log("result", r);
        assert.equal(r.win, "win");
        break;
      }
      if (i === 299) throw Error("Route guidance failed to escape");
    }
    await p.screenshot({ path: "artifacts/onboarding/04-win.png" });
    assert.ok(picked);
    console.log("errors", errors);
    assert.equal(errors.length, 0);
    await p.close();
    const m = await b.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    m.on("pageerror", (e) => errors.push(e.message));
    await m.route("**/api/director", (r) =>
      r.fulfill({
        json: {
          patch: "mirror",
          taunt: "Gemini has two sides. Your steering does too.",
          source: "local",
        },
      }),
    );
    await m.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
    await m.waitForFunction(() => window.__bug?.state === "intro");
    await m.screenshot({ path: "artifacts/onboarding/05-mobile-intro.png" });
    await m.locator("#start").tap();
    await m.screenshot({ path: "artifacts/onboarding/06-mobile-ready.png" });
    await m.evaluate(() => {
      __bug.keys.add("KeyW");
      __bug.tick(1 / 60);
      __bug.keys.clear();
    });
    await m.waitForFunction(() => __bug.patchDecision);
    await m.evaluate(() => {
      for (let i = 0; i < 400; i++) __bug.tick(1 / 60);
    });
    await m.screenshot({ path: "artifacts/onboarding/07-mobile-rule.png" });
    await checkGuidance(m);
    assert.equal(
      await m.locator("#objective").textContent(),
      "1. Ramasse la clé blanche",
    );
    assert.match(
      await m.locator("#effect-status").textContent(),
      /Direction inversée/,
    );
    await m.setViewportSize({ width: 844, height: 390 });
    await m.waitForTimeout(150);
    await m.screenshot({ path: "artifacts/onboarding/08-landscape-rule.png" });
    await checkGuidance(m);
    console.log(
      "mobile",
      await m.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        objective: document.getElementById("objective").textContent,
        hint: document.getElementById("objective-hint").textContent,
        effect: document.getElementById("effect-status").textContent,
      })),
    );
    assert.equal(errors.length, 0);
  } finally {
    await b.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
