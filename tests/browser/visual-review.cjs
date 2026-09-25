const { chromium } = require("playwright-core");
const path = require("node:path");
process.chdir(path.resolve(__dirname, "../.."));
const fs = require("fs");
(async () => {
  fs.mkdirSync("artifacts/review", { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.CHROMIUM_PATH ||
      "/home/kusaila/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome",
  });
  const p = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("response", (r) => {
    if (r.status() >= 400) errors.push(r.status() + " " + r.url());
  });
  await p.route("**/api/director", (r) =>
    r.fulfill({
      json: {
        patch: "barricade",
        taunt: "Our retention department has sealed your preferred exit.",
        source: "local",
      },
    }),
  );
  await p.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
  await p.waitForFunction(() => window.__bug?.state === "intro");
  await p.screenshot({ path: "artifacts/review/01-intro-desktop.png" });
  await p.locator("#start").click();
  await p.evaluate(() => {
    const g = __bug;
    for (let i = 0; i < 40; i++) g.tick(1 / 60);
  });
  await p.screenshot({ path: "artifacts/review/02-game-desktop.png" });
  // Freeze normal loop by withholding future RAF calls for close-up material inspection.
  await p.evaluate(() => {
    window.requestAnimationFrame = () => 0;
  });
  await p.waitForTimeout(200);
  async function shot(name, pos, look) {
    await p.evaluate(
      ({ pos, look }) => {
        const g = __bug;
        g.camera.position.set(...pos);
        g.camera.lookAt(...look);
        g.camera.fov = 48;
        g.camera.updateProjectionMatrix();
        g.renderer.render(g.scene, g.camera);
        document
          .querySelectorAll("#hud,#masthead,#vignette,#impact")
          .forEach((e) => (e.hidden = true));
      },
      { pos, look },
    );
    await p.screenshot({ path: "artifacts/review/" + name + ".png" });
  }
  await shot("03-materials-close", [4, 2.8, -32], [0, 0.4, -26]);
  await shot("04-voodoo-installations", [8, 6, 15], [0, 13, 44]);
  await shot("05-concrete-close", [-27, 3.5, -14], [-35, 2.5, -22]);
  console.log(
    JSON.stringify({
      errors,
      render: await p.evaluate(() => ({
        triangles: __bug.renderer.info.render.triangles,
        calls: __bug.renderer.info.render.calls,
        textures: __bug.renderer.info.memory.textures,
      })),
    }),
  );
  fs.writeFileSync(
    "artifacts/review/browser-errors.json",
    JSON.stringify(errors, null, 2),
  );
  await p.close();
  const m = await browser.newPage({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  await m.route("**/api/director", (r) =>
    r.fulfill({
      json: {
        patch: "mirror",
        taunt: "Left is now a matter of opinion.",
        source: "local",
      },
    }),
  );
  await m.goto("http://127.0.0.1:4277/", { waitUntil: "networkidle" });
  await m.waitForFunction(() => window.__bug?.state === "intro");
  await m.screenshot({ path: "artifacts/review/06-intro-mobile.png" });
  await m.locator("#start").click();
  await m.evaluate(() => {
    for (let i = 0; i < 390; i++) __bug.tick(1 / 60);
  });
  await m.screenshot({ path: "artifacts/review/07-patch-mobile.png" });
  console.log(
    "mobile overflow",
    await m.evaluate(() => document.documentElement.scrollWidth > innerWidth),
  );
  await m.setViewportSize({ width: 844, height: 390 });
  await m.screenshot({ path: "artifacts/review/08-landscape-mobile.png" });
  await browser.close();
  if (errors.length) throw new Error(errors.join("\n"));
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
