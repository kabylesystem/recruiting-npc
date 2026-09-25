const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  });
  const p = await b.newPage({ viewport: { width: 1200, height: 800 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(String(e)));
  p.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });
  let requests = 0;
  await p.route("**/api/director", (route) => {
    requests++;
    return route.fulfill({
      json: {
        patch: requests === 1 ? "rubber" : "gravity",
        taunt: "Your escape has been deprecated.",
        source: "local",
      },
    });
  });
  await p.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
  await p.waitForFunction(() => window.__bug?.state === "intro");
  await p.screenshot({ path: "artifacts/intro-desktop.png" });
  await p.locator("#start").click();
  let snapshots = [];
  for (let i = 0; i < 240; i++) {
    const result = await p.evaluate(() => {
      const g = __bug,
        b = g.car.collision;
      if (g.state !== "playing")
        return { state: g.state, outcome: g.previousOutcome, t: g.elapsed };
      const target = !g.keyCollected
        ? [-11, -3]
        : b.position.z < 25
          ? [-22, 29]
          : [-22, 51];
      const q = b.quaternion;
      const yaw = Math.atan2(
        2 * (q.w * q.y + q.x * q.z),
        1 - 2 * (q.y * q.y + q.x * q.x),
      );
      let angle =
        Math.atan2(target[0] - b.position.x, target[1] - b.position.z) - yaw;
      angle = Math.atan2(Math.sin(angle), Math.cos(angle));
      let left = angle > 0.06,
        right = angle < -0.06;
      if (g.effects.has("mirror")) [left, right] = [right, left];
      const speed = Math.abs(g.car.speed);
      const throttle = speed < 6 || Math.abs(angle) < 0.25;
      for (const [code, pressed] of [
        ["KeyW", throttle],
        ["KeyA", left],
        ["KeyD", right],
        ["Space", speed > 7 && Math.abs(angle) > 0.4],
      ])
        document.dispatchEvent(
          new KeyboardEvent(pressed ? "keydown" : "keyup", {
            code,
            bubbles: true,
          }),
        );
      for (let n = 0; n < 12 && g.state === "playing"; n++) g.tick(1 / 60);
      return {
        state: g.state,
        outcome: g.previousOutcome,
        t: g.elapsed,
        x: b.position.x,
        z: b.position.z,
        speed: g.car.speed,
        key: g.keyCollected,
        patches: g.used,
        angle,
      };
    });
    if (i % 20 === 0) snapshots.push(result);
    if (result.state !== "playing") {
      snapshots.push(result);
      break;
    }
  }
  await p.screenshot({ path: "artifacts/drive-result.png" });
  const final = await p.evaluate(() => ({
    state: __bug.state,
    outcome: __bug.previousOutcome,
    key: __bug.keyCollected,
    history: __bug.history,
  }));
  console.log(
    JSON.stringify(
      {
        snapshots,
        requests,
        errors,
        final,
      },
      null,
      2,
    ),
  );
  await b.close();
  assert.equal(errors.length, 0);
  assert.equal(final.state, "result");
  assert.equal(final.outcome, "win");
  assert.equal(final.key, true);
  assert.deepEqual(final.history.map((entry) => entry.patch), ["rubber", "gravity"]);
})();
