// Exercise the real game methods without constructing a WebGL scene.
const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");
const root = path.resolve(__dirname, "../..");
function fixture(fetch) {
  const nodes = new Map();
  const document = {
    getElementById(id) {
      if (!nodes.has(id))
        nodes.set(id, {
          textContent: "",
          hidden: true,
          style: {},
          classList: { add() {}, remove() {}, toggle() {} },
        });
      return nodes.get(id);
    },
  };
  const context = vm.createContext({
    document,
    fetch,
    AbortController,
    setTimeout,
    clearTimeout,
    matchMedia: () => ({ matches: false }),
  });
  const rules = fs
    .readFileSync(path.join(root, "src/bug/rules.js"), "utf8")
    .replace(/export /g, "");
  const source = fs.readFileSync(path.join(root, "src/bug/main.js"), "utf8");
  vm.runInContext(
    rules +
      "\n" +
      source.slice(
        source.indexOf("const $ ="),
        source.lastIndexOf("document.fonts"),
      ) +
      "\nglobalThis.BugGame = BugGame;",
    context,
  );
  const g = Object.create(context.BugGame.prototype);
  Object.assign(g, {
    requested: 0,
    pending: null,
    roundToken: 1,
    patchDecision: null,
    used: [],
    state: "playing",
  });
  g.snapshot = () => ({
    round: 1,
    elapsed: 8,
    speed: 0,
    airborne: false,
    collisions: 0,
    x: 0,
    z: 0,
    used: g.used,
    previousOutcome: "none",
  });
  return { g, nodes };
}
const decision = { patch: "ice", taunt: "Traction removed.", source: "codex" };
test("invalid successful response immediately falls back locally", async () => {
  const { g } = fixture(async () => ({
    ok: true,
    json: async () => ({ patch: "bad", taunt: "Invalid", source: "codex" }),
  }));
  await g.requestDecision();
  assert.equal(g.patchDecision?.source, "local");
  assert.equal(g.pending, null);
});
test("superseded aborted request cannot populate a second patch", async () => {
  let reject;
  const { g } = fixture(
    () =>
      new Promise((resolve, r) => {
        reject = r;
      }),
  );
  const work = g.requestDecision();
  g.pending.abort();
  g.pending = null; // Same-round simulation deadline has already applied a fallback.
  g.used.push("rubber");
  reject(new Error("aborted"));
  await work;
  assert.equal(g.patchDecision, null);
});
test("superseded successful request cannot overwrite current decision or pending controller", async () => {
  let resolve;
  const { g } = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const work = g.requestDecision();
  const next = new AbortController();
  g.pending = next;
  resolve({ ok: true, json: async () => decision });
  await work;
  assert.equal(g.patchDecision, null);
  assert.equal(g.pending, next);
});
test("a previous round response is ignored", async () => {
  let resolve;
  const { g } = fixture(
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const work = g.requestDecision();
  g.roundToken++;
  resolve({ ok: true, json: async () => decision });
  await work;
  assert.equal(g.patchDecision, null);
});
test("a valid current response remains usable while paused", async () => {
  const { g } = fixture(async () => ({ ok: true, json: async () => decision }));
  g.state = "paused";
  await g.requestDecision();
  assert.equal(g.patchDecision.patch, "ice");
  assert.equal(g.pending, null);
});
test("recovery penalty counts towards the escape score", () => {
  const { g } = fixture();
  g.elapsed = 10;
  g.left = 50;
  g.resetCar = () => {};
  g.toast = () => {};
  g.recover();
  assert.equal(g.elapsed, 13);
  assert.equal(g.left, 47);
});
test("recovery that spends the final seconds immediately loses", () => {
  const { g } = fixture();
  g.elapsed = 58;
  g.left = 2;
  g.resetCar = () => {};
  g.toast = () => {};
  let finished;
  g.finish = (win) => {
    finished = win;
  };
  g.recover();
  assert.equal(g.elapsed, 60);
  assert.equal(g.left, 0);
  assert.equal(finished, false);
});
