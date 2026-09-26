const { chromium } = require("playwright-core");
const assert = require("node:assert/strict");
const fs = require("node:fs");
(async () => {
  fs.mkdirSync("artifacts/casting", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.route("**/api/director", (r) =>
      r.fulfill({
        json: {
          patch: "rubber",
          taunt: "GTA VI cherchait un figurant. On a trouvé un danger public.",
          source: "local",
        },
      }),
    );
    await page.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__bug?.state === "intro");
    await page.screenshot({ path: "artifacts/casting/01-intro.png" });
    await page.locator("#start").click();
    assert.equal(await page.evaluate(() => __bug.left), 90);
    await page.screenshot({ path: "artifacts/casting/02-street.png" });
    async function driveTo(x, z, until, radius = 6) {
      for (let i = 0; i < 320; i++) {
        const r = await page.evaluate(
          ({ x, z, until, radius }) => {
            const g = __bug,
              b = g.car.collision;
            if (g.state !== "playing") return { done: true, state: g.state };
            if (until !== null && g.casting.recruited.includes(until))
              return { done: true };
            if (
              until === null &&
              Math.hypot(x - b.position.x, z - b.position.z) < radius
            ) {
              g.keys.clear();
              return { done: true };
            }
            const q = b.quaternion;
            let angle =
              Math.atan2(x - b.position.x, z - b.position.z) -
              Math.atan2(
                2 * (q.w * q.y + q.x * q.z),
                1 - 2 * (q.y * q.y + q.x * q.x),
              );
            angle = Math.atan2(Math.sin(angle), Math.cos(angle));
            const speed = Math.abs(g.car.speed);
            for (const [code, on] of [
              ["KeyW", speed < 4 || Math.abs(angle) < 0.3],
              ["KeyA", angle > 0.07],
              ["KeyD", angle < -0.07],
              ["Space", speed > 6 && Math.abs(angle) > 0.45],
            ])
              document.dispatchEvent(
                new KeyboardEvent(on ? "keydown" : "keyup", {
                  code,
                  bubbles: true,
                }),
              );
            for (let n = 0; n < 10 && g.state === "playing"; n++)
              g.tick(1 / 60);
            return {
              done: false,
              t: g.elapsed,
              pos: [b.position.x, b.position.z],
              active: g.casting.active,
            };
          },
          { x, z, until, radius },
        );
        if (r.done) return r;
        if (i === 319) throw Error("Driving timed out " + JSON.stringify(r));
      }
    }
    for (let id = 0; id < 3; id++) {
      const pos = await page.evaluate((id) => {
        const p = __bug.actors.actors[id].root.position;
        return { x: p.x, z: p.z };
      }, id);
      await driveTo(pos.x, pos.z, null);
      await page.keyboard.press("h");
      assert.equal(await page.evaluate(() => __bug.casting.active), id);
      await page.waitForTimeout(200);
      await page.screenshot({
        path: `artifacts/casting/03-audition-${id}.png`,
      });
      const voice = await page.evaluate(() => ({
        src: __bug.audio.voice?.currentSrc,
        ready: __bug.audio.voice?.readyState,
        paused: __bug.audio.voice?.paused,
      }));
      console.log("audition", id, voice);
      assert.ok(voice.src?.endsWith(id + "-brief.mp3"));
      assert.ok(voice.ready >= 2);
      if (id === 0) {
        await driveTo(-33, -17, 0);
      }
      if (id === 1) {
        await driveTo(0, 12, null, 5);
        await page.evaluate(() => {
          const g = __bug;
          g.keys.clear();
          g.keys.add("KeyW");
          for (let i = 0; i < 90; i++) g.tick(1 / 60);
          g.keys.add("KeyA");
          g.keys.add("Space");
          for (let i = 0; i < 210 && g.casting.active === 1; i++)
            g.tick(1 / 60);
          g.keys.clear();
        });
      }
      if (id === 2) {
        for (let i = 0; i < 3; i++) {
          await page.evaluate(() => {
            for (let n = 0; n < 18; n++) __bug.tick(1 / 60);
          });
          await page.keyboard.press("h");
        }
      }
      assert.ok(
        await page.evaluate((id) => __bug.casting.recruited.includes(id), id),
      );
      console.log(
        "recruited",
        id,
        await page.evaluate(() => ({
          elapsed: __bug.elapsed,
          score: __bug.casting.score,
        })),
      );
    }
    assert.equal(await page.evaluate(() => __bug.previousOutcome), "win");
    await page.screenshot({ path: "artifacts/casting/04-result.png" });
    await page.locator("#retry").click();
    assert.equal(await page.evaluate(() => __bug.casting.recruited.length), 0);
    assert.equal(await page.evaluate(() => __bug.left), 90);
    await page.close();
    const m = await browser.newPage({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    m.on("pageerror", (e) => errors.push(e.message));
    await m.route("**/api/director", (r) =>
      r.fulfill({
        json: { patch: "rubber", taunt: "Directeur local.", source: "local" },
      }),
    );
    await m.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
    await m.waitForFunction(() => window.__bug?.state === "intro");
    await m.screenshot({ path: "artifacts/casting/05-mobile-intro.png" });
    await m.locator("#start").tap();
    await m.locator("#horn").tap();
    assert.equal(
      await m.locator("#speaker").textContent(),
      "Assistant casting",
    );
    await m.screenshot({ path: "artifacts/casting/06-mobile-play.png" });
    assert.equal(
      await m.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS: 3 auditions, physical collision, drift, real horn input, local voices, result/retry and mobile UI",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
