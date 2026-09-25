import * as THREE from "three";
import * as CANNON from "cannon";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { Car } from "../ts/vehicles/Car";
import { Arena } from "./arena";
import { attachCarAppearance } from "./car-appearance";
import { GameAudio } from "./audio";
import { PATCHES, chooseLocalPatch, validDecision } from "./rules";
import "./style.css";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
class BugGame {
  constructor() {
    this.state = "loading";
    this.round = 0;
    this.elapsed = 0;
    this.left = 60;
    this.used = [];
    this.effects = new Map();
    this.history = [];
    this.keys = new Set();
    this.audio = new GameAudio();
    this.best = 0;
    this.previousOutcome = "none";
    this.keyCollected = false;
    this.boost = 1;
    this.patchCount = 0;
    this.roundToken = 0;
    this.pending = null;
    this.patchDecision = null;
    this.directorSource = "local";
    this.collisions = 0;
    this.distance = 0;
    this.airtime = 0;
    this.maxSpeed = 0;
    this.shake = 0;
    this.lastCollision = -10;
    this.toastUntil = 0;
    this.patchVisibleUntil = 0;
    this.since = 0;
    this.lastT = performance.now();
    try {
      this.best = Number(localStorage.getItem("youarethebug-best-v1")) || 0;
      this.round =
        Number(sessionStorage.getItem("youarethebug-attempt-v1")) || 0;
    } catch {}
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x111b23);
    this.scene.fog = new THREE.FogExp2(0x18232b, 0.011);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
    this.renderer.setSize(innerWidth, innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputEncoding = THREE.sRGBEncoding;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.95;
    $("game").appendChild(this.renderer.domElement);
    this.camera = new THREE.PerspectiveCamera(
      57,
      innerWidth / innerHeight,
      0.1,
      250,
    );
    this.camera.position.set(19, 9, -40);
    this.camera.lookAt(-4, 1, -18);
    this.cameraTarget = new THREE.Vector3();
    this.scene.add(new THREE.HemisphereLight(0xbad6ec, 0x363632, 0.55));
    const sun = new THREE.DirectionalLight(0xcce6ff, 1.8);
    sun.position.set(-25, 46, -20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    Object.assign(sun.shadow.camera, {
      left: -60,
      right: 60,
      top: 65,
      bottom: -65,
      near: 1,
      far: 130,
    });
    sun.shadow.bias = -0.0002;
    this.scene.add(sun);
    const redLight = new THREE.PointLight(0xff4338, 2.7, 46, 2);
    redLight.position.set(0, 7, 25);
    this.scene.add(redLight);
    const fill = new THREE.PointLight(0xe6f5ff, 2.6, 45, 2);
    fill.position.set(5, 5, -24);
    this.scene.add(fill);
    this.physics = new CANNON.World();
    this.physics.gravity.set(0, -9.81, 0);
    this.physics.broadphase = new CANNON.SAPBroadphase(this.physics);
    this.physics.solver.iterations = 12;
    this.physics.allowSleep = true;
    this.arena = new Arena(this.scene, this.physics);
    this.bind();
    this.resize();
    this.checkDirector();
    new GLTFLoader().load(
      "build/assets/car.glb",
      (gltf) => this.loaded(gltf),
      undefined,
      (error) => {
        console.error("Vehicle loading failed:", error);
        this.fatal("The getaway car could not load. Reload to try again.");
      },
    );
    this.loadTimeout = setTimeout(() => {
      if (this.state === "loading")
        this.fatal(
          "The vehicle is taking too long to load. Check the local server and reload.",
        );
    }, 20000);
    requestAnimationFrame((t) => this.frame(t));
  }
  async loaded(gltf) {
    clearTimeout(this.loadTimeout);
    this.car = new Car(gltf);
    // Reuse Sketchbook's actual raycast vehicle, suspension, transmission and car model.
    const world = {
      vehicles: [],
      graphicsWorld: this.scene,
      physicsWorld: this.physics,
      sky: { csm: { setupMaterial() {} } },
    };
    this.car.addToWorld(world);
    this.car.collision.allowSleep = false;
    this.car.collision.linearDamping = 0.08;
    this.car.collision.angularDamping = 0.5;
    this.car.rayCastVehicle.wheelInfos.forEach((w) => {
      w.frictionSlip = 1.8;
      w.rollInfluence = 0.05;
      w.suspensionStiffness = 34;
      w.dampingRelaxation = 3.3;
      w.dampingCompression = 3.8;
    });
    this.contact = new CANNON.ContactMaterial(
      this.car.collision.material,
      this.arena.solid,
      { friction: 0.18, restitution: 0.14 },
    );
    this.physics.addContactMaterial(this.contact);
    this.car.traverse((o) => {
      if (o.isMesh && o.visible && o.material) {
        const materials = Array.isArray(o.material) ? o.material : [o.material];
        for (const m of materials) {
          if (m.color && m.color.r > 0.3 && m.color.g < 0.35) {
            m.color.set(0xbcc9cb);
            m.roughness = 0.28;
            m.metalness = 0.65;
          }
        }
        o.castShadow = true;
        o.receiveShadow = true;
      }
    });
    this.car.collision.addEventListener("collide", (e) => this.onCollision(e));
    const tail = new THREE.PointLight(0xff3324, 0.7, 8);
    tail.position.set(0, 0.9, -1.8);
    this.car.add(tail);
    this.resetCar();
    for (let i = 0; i < 75; i++) {
      this.car.update(1 / 60);
      this.physics.step(1 / 60);
    }
    try {
      this.appearance = await attachCarAppearance(this.car, this.scene);
    } catch (error) {
      console.warn(
        "Detailed vehicle unavailable; using the original Sketchbook vehicle.",
        error,
      );
    }
    this.state = "intro";
    $("start").disabled = false;
    $("start-label").textContent = "Break the game";
    window.__bug = this; // Readable game state for QA, no hidden fake gameplay path.
  }
  bind() {
    $("start").onclick = () => {
      this.audio
        .enable()
        .then(() => this.soundLabel())
        .catch(() => {});
      this.start();
    };
    $("retry").onclick = () => this.start();
    $("pause-retry").onclick = () => this.start();
    $("resume").onclick = () => this.pause(false);
    $("pause-touch").onclick = () => this.pause(true);
    $("sound").onclick = async () => {
      if (this.audio.enabled) this.audio.mute();
      else await this.audio.enable();
      this.soundLabel();
    };
    $("share").onclick = async () => {
      const result =
        this.previousOutcome === "win"
          ? `I escaped in ${this.elapsed.toFixed(2)}s`
          : "The director patched me";
      const text = `${result}. ${this.used.length} live patches. YOU ARE THE BUG.`;
      try {
        await navigator.clipboard.writeText(text);
        $("share").textContent = "Copied. Your turn to challenge someone.";
      } catch {
        $("share").textContent = text;
      }
    };
    const mapped = (code) =>
      ({
        ArrowUp: "KeyW",
        ArrowDown: "KeyS",
        ArrowLeft: "KeyA",
        ArrowRight: "KeyD",
        ShiftRight: "ShiftLeft",
      })[code] || code;
    document.addEventListener("keydown", (e) => {
      if (
        [
          "ArrowUp",
          "ArrowDown",
          "ArrowLeft",
          "ArrowRight",
          "Space",
          "Tab",
        ].includes(e.code) &&
        this.state === "playing" &&
        e.code !== "Tab"
      )
        e.preventDefault();
      if (e.repeat) return;
      if (e.code === "Escape") {
        if (this.state === "playing" || this.state === "paused")
          this.pause(this.state === "playing");
        return;
      }
      if (
        e.code === "KeyR" &&
        ["playing", "result", "paused"].includes(this.state)
      ) {
        this.start();
        return;
      }
      if (e.code === "Enter" && ["intro", "result"].includes(this.state)) {
        this.audio
          .enable()
          .then(() => this.soundLabel())
          .catch(() => {});
        this.start();
        return;
      }
      if (e.code === "KeyF" && this.state === "playing") {
        this.recover();
        return;
      }
      if (this.state === "playing") this.keys.add(mapped(e.code));
    });
    document.addEventListener("keyup", (e) => this.keys.delete(mapped(e.code)));
    window.addEventListener("blur", () => {
      this.keys.clear();
      if (this.state === "playing") this.pause(true);
    });
    document.addEventListener("visibilitychange", () => {
      if (document.hidden && this.state === "playing") this.pause(true);
    });
    window.addEventListener("resize", () => this.resize());
    for (const b of document.querySelectorAll("[data-key]")) {
      b.onpointerdown = (e) => {
        e.preventDefault();
        b.setPointerCapture(e.pointerId);
        if (this.state === "playing") {
          this.keys.add(b.dataset.key);
          b.classList.add("pressed");
        }
      };
      const release = () => {
        this.keys.delete(b.dataset.key);
        b.classList.remove("pressed");
      };
      b.onpointerup = release;
      b.onpointercancel = release;
      b.onlostpointercapture = release;
    }
  }
  soundLabel() {
    $("sound").textContent = this.audio.enabled ? "Sound on" : "Sound off";
    $("sound").setAttribute(
      "aria-label",
      this.audio.enabled ? "Mute sound" : "Enable sound",
    );
  }
  resize() {
    this.camera.aspect = innerWidth / innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(innerWidth, innerHeight);
  }
  async checkDirector() {
    try {
      const r = await fetch("/api/status");
      const info = await r.json();
      this.apiAvailable = !!(
        info.authAvailable ||
        info.available ||
        info.claudeAvailable
      );
      $("director-label").textContent = this.apiAvailable
        ? "Director ready"
        : "Local director";
    } catch {
      this.apiAvailable = false;
      $("director-label").textContent = "Local director";
    }
  }
  resetCar() {
    const b = this.car.collision;
    b.position.set(0, 1.1, -28);
    b.previousPosition.copy(b.position);
    b.interpolatedPosition.copy(b.position);
    b.quaternion.set(0, 0, 0, 1);
    b.previousQuaternion.copy(b.quaternion);
    b.interpolatedQuaternion.copy(b.quaternion);
    b.velocity.setZero();
    b.angularVelocity.setZero();
    b.force.setZero();
    b.torque.setZero();
    b.aabbNeedsUpdate = true;
    b.wakeUp();
    this.car.resetControls();
    this.car.setBrake(0);
    this.car.gear = 1;
    this.car.shiftTimer = 0;
    this.car.update(0);
  }
  start() {
    if (!this.car) return;
    this.round++;
    try {
      sessionStorage.setItem("youarethebug-attempt-v1", String(this.round));
    } catch {}
    this.roundToken++;
    this.pending?.abort();
    this.pending = null;
    this.patchDecision = null;
    this.requested = 0;
    this.state = "playing";
    this.elapsed = 0;
    this.left = 60;
    this.keys.clear();
    this.used = [];
    this.history = [];
    this.effects.clear();
    this.keyCollected = false;
    this.boost = 1;
    this.collisions = 0;
    this.distance = 0;
    this.airtime = 0;
    this.maxSpeed = 0;
    this.flipTime = 0;
    this.patchCount = 0;
    this.lastCollision = -10;
    this.patchVisibleUntil = 0;
    this.firstPatchAt = 0;
    this.lastPatchAt = -10;
    this.shake = 0;
    this.arena.reset();
    this.restorePhysics();
    this.resetCar();
    this.camera.position.set(0, 6, -40);
    this.cameraTarget.set(0, 1, -24);
    for (const id of ["intro", "result", "pause", "patch"]) $(id).hidden = true;
    $("hud").hidden = false;
    document.body.classList.add("playing");
    $("objective").textContent = "Steal the access key.";
    $("objective-hint").textContent = "The white beacon. Then any exit.";
    $("key-label").textContent = "○ Access key missing";
    $("key-label").style.color = "";
    $("round-label").textContent =
      `Attempt ${String(this.round).padStart(2, "0")}`;
    $("share").textContent = "Copy my result";
    document
      .querySelectorAll("#patch-budget i")
      .forEach((el) => el.classList.remove("spent"));
    this.toast("You stole the car. Now steal your way out.", 3.5);
    this.audio.say("Background characters do not get an escape route.");
    this.soundLabel();
    this.requestDecision();
  }
  snapshot() {
    const b = this.car.collision;
    return {
      round: this.round,
      elapsed: this.elapsed,
      speed: Math.abs(this.car.speed) * 3.6,
      airborne: this.car.rayCastVehicle.numWheelsOnGround === 0,
      collisions: this.collisions,
      x: b.position.x,
      z: b.position.z,
      used: [...this.used],
      previousOutcome: this.previousOutcome,
    };
  }
  async requestDecision() {
    if (this.requested >= 2 || this.pending) return;
    this.requested++;
    const token = this.roundToken;
    const controller = new AbortController();
    this.pending = controller;
    $("director-label").textContent = "Director watching";
    const timeout = setTimeout(() => controller.abort(), 19000);
    try {
      const r = await fetch("/api/director", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(this.snapshot()),
        signal: controller.signal,
      });
      if (!r.ok) throw Error("Director unavailable");
      const value = await r.json();
      if (token === this.roundToken && validDecision(value, this.used)) {
        this.patchDecision = value;
        this.directorSource = value.source;
        $("director-label").textContent =
          value.source !== "local"
            ? "AI director · watching"
            : "Local director";
      }
    } catch {
      if (token === this.roundToken) {
        this.patchDecision = chooseLocalPatch(this.snapshot());
        this.directorSource = "local";
        $("director-label").textContent = "Local director";
      }
    } finally {
      clearTimeout(timeout);
      if (token === this.roundToken) this.pending = null;
    }
  }
  applyPatch(decision) {
    if (!validDecision(decision, this.used) || this.used.length >= 2) return;
    const id = decision.patch,
      rule = PATCHES[id];
    this.directorSource = decision.source;
    this.used.push(id);
    this.patchCount = this.used.length;
    this.lastPatchAt = this.elapsed;
    if (this.used.length === 1) this.firstPatchAt = this.elapsed;
    this.effects.set(id, this.elapsed + rule.duration);
    this.history.push({
      patch: id,
      source: decision.source,
      time: this.elapsed,
    });
    if (id === "barricade")
      this.arena.barricade(
        this.car.collision.position.x,
        this.car.collision.position.z,
      );
    this.configurePhysics();
    this.patchVisibleUntil = this.elapsed + Math.min(rule.duration, 9);
    $("patch").hidden = false;
    $("patch-version").textContent = `Patch 0.0.${this.used.length + 1}`;
    $("patch-kind").textContent =
      decision.source !== "local" ? "AI intervention" : "Local intervention";
    $("patch-title").textContent = rule.title;
    $("patch-taunt").textContent = decision.taunt;
    $("patch-exploit").textContent = rule.hint;
    $("director-label").textContent =
      decision.source !== "local" ? "AI director · patching" : "Local director";
    document
      .querySelectorAll("#patch-budget i")
      .forEach((el, i) => el.classList.toggle("spent", i < this.used.length));
    this.shake = 0.4;
    this.audio.patch();
    this.audio.say(decision.taunt);
    this.patchDecision = null;
  }
  configurePhysics() {
    this.physics.gravity.y = this.effects.has("gravity") ? -21 : -9.81;
    this.contact.restitution = this.effects.has("rubber") ? 1.05 : 0.14;
    this.car.rayCastVehicle.wheelInfos.forEach((w) => {
      w.frictionSlip = this.effects.has("ice") ? 0.24 : 1.8;
    });
    this.car.collision.angularDamping = this.effects.has("ice") ? 0.35 : 0.5;
  }
  restorePhysics() {
    this.effects.clear();
    this.configurePhysics();
  }
  onCollision(event) {
    if (this.state !== "playing") return;
    const power = Math.abs(event.contact.getImpactVelocityAlongNormal());
    if (power < 3 || this.elapsed - this.lastCollision < 0.25) return;
    this.lastCollision = this.elapsed;
    this.collisions++;
    this.shake = Math.min(0.9, power * 0.035);
    this.audio.collision(power);
    this.arena.burst(
      new THREE.Vector3().copy(this.car.collision.position),
      Math.min(14, power),
    );
    if (
      this.effects.has("rubber") &&
      event.body.mass === 0 &&
      this.car.collision.position.y < 2.5
    ) {
      const b = this.car.collision;
      b.velocity.y = Math.max(b.velocity.y, 7);
      this.toast("New bug discovered: weaponized bounce.", 2.5);
    }
  }
  pause(value) {
    if (value && this.state === "playing") {
      this.state = "paused";
      this.keys.clear();
      this.car.resetControls();
      $("pause").hidden = false;
      this.audio.update(0, false, false);
      window.speechSynthesis?.cancel();
    } else if (!value && this.state === "paused") {
      this.state = "playing";
      $("pause").hidden = true;
      this.lastT = performance.now();
    }
  }
  recover() {
    this.resetCar();
    this.left = Math.max(0, this.left - 3);
    this.toast("Vehicle recovered. 3 seconds lost.", 2);
    this.flipTime = 0;
  }
  finish(win) {
    if (this.state !== "playing") return;
    this.state = "result";
    this.keys.clear();
    this.car.resetControls();
    this.previousOutcome = win ? "win" : "lose";
    this.pending?.abort();
    this.roundToken++;
    this.pending = null;
    if (win && (!this.best || this.elapsed < this.best)) {
      this.best = this.elapsed;
      try {
        localStorage.setItem("youarethebug-best-v1", String(this.best));
      } catch {}
    }
    $("result").hidden = false;
    $("hud").hidden = true;
    $("result-eyebrow").textContent = win
      ? "Containment failed. You were the exception."
      : "Containment successful. For now.";
    $("result-title").textContent = win ? "UNPATCHABLE." : "BUG FIXED.";
    $("result-title").style.color = win ? "var(--mint)" : "var(--red)";
    $("result-quote").textContent = win
      ? "“This was not in the acceptance criteria.”"
      : this.keyCollected
        ? "You had the key. You saw the exit. One more try."
        : "That white beacon is your way out. Grab it, then follow the green exits.";
    $("result-time").textContent = `${this.elapsed.toFixed(2)}s`;
    $("result-time-label").textContent = win ? "Escape time" : "Time survived";
    $("result-patches").textContent = `${this.used.length}/2`;
    $("result-best").textContent = this.best ? `${this.best.toFixed(2)}s` : "—";
    $("result-history").textContent = this.history.length
      ? this.history
          .map(
            (h) =>
              `${h.time.toFixed(1)}s · ${PATCHES[h.patch].title.replace(".", "")} (${h.source !== "local" ? "AI" : "local"})`,
          )
          .join("  /  ")
      : "No patch could catch up with you.";
    if (win) this.audio.victory();
    else this.audio.tone(70, 0.5, 0.5, "triangle");
    this.audio.say(
      win
        ? "We will be removing your free will in the next update."
        : "Bug fixed. Please do not try that again.",
    );
  }
  toast(message, duration = 3) {
    $("toast").textContent = message;
    this.toastUntil = this.elapsed + duration;
    $("toast").classList.add("visible");
  }
  tick(dt) {
    if (!this.car) return;
    if (this.state !== "playing") {
      if (this.state === "intro") {
        this.car.update(dt);
        this.appearance?.update();
        this.physics.step(1 / 60, dt, 3);
        this.arena.update(dt, this.since);
      }
      this.audio.update(0, false, false);
      return;
    }
    this.elapsed += dt;
    this.left = Math.max(0, this.left - dt);
    const car = this.car,
      b = car.collision;
    const throttle = this.keys.has("KeyW"),
      reverse = this.keys.has("KeyS"),
      mirror = this.effects.has("mirror");
    car.triggerAction("throttle", throttle);
    car.triggerAction("reverse", reverse);
    car.triggerAction("left", this.keys.has(mirror ? "KeyD" : "KeyA"));
    car.triggerAction("right", this.keys.has(mirror ? "KeyA" : "KeyD"));
    car.triggerAction(
      "brake",
      this.keys.has("Space") && !this.effects.has("boost"),
    );
    const speed = Math.abs(car.speed);
    this.maxSpeed = Math.max(this.maxSpeed, speed);
    this.distance += speed * dt;
    if (car.rayCastVehicle.numWheelsOnGround === 0) this.airtime += dt;
    car.update(dt);
    this.appearance?.update();
    const boost =
      (this.keys.has("ShiftLeft") && this.boost > 0.05 && throttle) ||
      this.effects.has("boost");
    if (boost) {
      const f = new CANNON.Vec3();
      b.quaternion.vmult(new CANNON.Vec3(0, 0, 1), f);
      if (speed < 34) {
        b.velocity.x += f.x * 17 * dt;
        b.velocity.z += f.z * 17 * dt;
      }
      if (!this.effects.has("boost"))
        this.boost = Math.max(0, this.boost - dt * 0.4);
    } else this.boost = Math.min(1, this.boost + dt * 0.12);
    this.physics.step(1 / 60, dt, 4);
    this.arena.update(dt, this.since);
    if (
      !this.keyCollected &&
      Math.hypot(b.position.x + 11, b.position.z + 3) < 4.5
    ) {
      this.keyCollected = true;
      this.arena.unlock();
      $("objective").textContent = "Get out. Any way you can.";
      $("objective-hint").textContent = "Three exits. Make your own route.";
      $("key-label").textContent = "● Access key stolen";
      $("key-label").style.color = "var(--mint)";
      this.toast("Access stolen. All exits unlocked.", 3);
      this.audio.pickup();
    }
    if (this.keyCollected && b.position.z > 45 && Math.abs(b.position.x) < 37) {
      this.finish(true);
      return;
    }
    if (this.left <= 0) {
      this.finish(false);
      return;
    }
    if (
      b.position.y < -8 ||
      Math.abs(b.position.x) > 100 ||
      Math.abs(b.position.z) > 100
    )
      this.recover();
    const up = new CANNON.Vec3();
    b.quaternion.vmult(new CANNON.Vec3(0, 1, 0), up);
    if (up.y < 0.25) this.flipTime += dt;
    else this.flipTime = 0;
    if (this.flipTime > 1.8)
      this.toast("Upside down? Press F to recover. −3s", 0.5);
    // A live decision is prefetched, with a bounded wait. Network never pauses driving.
    const nextAt = this.used.length === 0 ? 6 : this.firstPatchAt + 7;
    if (this.used.length < 2 && this.elapsed >= nextAt) {
      if (this.patchDecision) {
        this.applyPatch(this.patchDecision);
      } else if (this.elapsed > nextAt + 11) {
        this.pending?.abort();
        this.pending = null;
        this.applyPatch(chooseLocalPatch(this.snapshot()));
      }
    }
    if (
      this.used.length === 1 &&
      this.requested === 1 &&
      !this.pending &&
      this.elapsed - this.firstPatchAt > 1.5
    )
      this.requestDecision();
    for (const [id, until] of this.effects) {
      if (this.elapsed >= until) {
        this.effects.delete(id);
        if (id === "barricade") this.arena.clearPatches();
        this.configurePhysics();
        this.toast("Patch expired. Use the opening.", 2);
      }
    }
    const shownId = this.used[this.used.length - 1];
    if (shownId) {
      const until = this.effects.get(shownId) || 0;
      $("patch-fill").style.width =
        `${clamp((until - this.elapsed) / PATCHES[shownId].duration, 0, 1) * 100}%`;
    }
    if (this.elapsed > this.patchVisibleUntil) $("patch").hidden = true;
    if (this.elapsed > this.toastUntil) $("toast").classList.remove("visible");
    if (this.used.length >= 2)
      $("director-label").textContent =
        `${this.directorSource !== "local" ? "AI" : "Local"} director · out of patches`;
    this.audio.update(speed, throttle || boost, true);
    this.updateHud(speed);
    this.follow(dt);
  }
  updateHud(speed) {
    $("objective-hint").textContent = this.effects.size
      ? [...this.effects]
          .map(
            ([id, end]) =>
              `${PATCHES[id].label} · ${Math.ceil(end - this.elapsed)}s`,
          )
          .join(" / ")
      : this.keyCollected
        ? "Three exits. Make your own route."
        : "The white beacon. Then any exit.";
    $("time").textContent = this.left.toFixed(2).padStart(5, "0");
    $("time-fill").style.width = `${(this.left / 60) * 100}%`;
    document.querySelector(".timer").classList.toggle("urgent", this.left < 10);
    $("speed").textContent = String(Math.round(speed * 3.6));
    $("boost-fill").style.width = `${this.boost * 100}%`;
    $("boost-label").textContent = this.effects.has("boost")
      ? "Overdrive locked"
      : this.boost > 0.95
        ? "Boost ready"
        : "Boost recharging";
    this.drawMap();
  }
  drawMap() {
    const c = $("map"),
      ctx = c.getContext("2d");
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.save();
    ctx.translate(c.width, 0);
    ctx.scale(-1, 1);
    const X = (x) => 110 + x * 2.6,
      Z = (z) => 218 - (z + 40) * 2.4;
    ctx.strokeStyle = "#becbd06b";
    ctx.lineWidth = 2;
    ctx.strokeRect(X(-35), Z(42), 70 * 2.6, 84 * 2.4);
    ctx.setLineDash([3, 5]);
    ctx.beginPath();
    ctx.moveTo(X(0), Z(-40));
    ctx.lineTo(X(0), Z(42));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "#a9f4d0";
    for (const x of [-22, 0, 22]) ctx.fillRect(X(x - 4), Z(42) - 2, 8 * 2.6, 5);
    ctx.fillStyle = "#bcc9ce55";
    ctx.fillRect(X(13.5), Z(29), 18, 36);
    for (const p of this.arena.temporary) {
      if (p.body) {
        ctx.fillStyle = "#ff4338";
        ctx.fillRect(X(p.body.position.x - 5), Z(p.body.position.z) - 2, 26, 4);
      }
    }
    if (!this.keyCollected) {
      ctx.fillStyle = "#f0f0e9";
      ctx.beginPath();
      ctx.arc(X(-11), Z(-3), 4, 0, Math.PI * 2);
      ctx.fill();
    }
    const b = this.car.collision;
    const dir = new CANNON.Vec3();
    b.quaternion.vmult(new CANNON.Vec3(0, 0, 1), dir);
    ctx.save();
    ctx.translate(X(b.position.x), Z(b.position.z));
    ctx.rotate(Math.atan2(dir.x, dir.z));
    ctx.fillStyle = "#ff4338";
    ctx.beginPath();
    ctx.moveTo(0, -7);
    ctx.lineTo(5, 5);
    ctx.lineTo(-5, 5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
    ctx.restore();
  }
  follow(dt) {
    const b = this.car.collision,
      forward = new THREE.Vector3(0, 0, 1).applyQuaternion(this.car.quaternion);
    forward.y = 0;
    forward.normalize();
    const rear = forward.clone().multiplyScalar(-10.5);
    const target = new THREE.Vector3(
      b.position.x + rear.x,
      b.position.y + 5.5,
      b.position.z + rear.z,
    );
    const smoothing = 1 - Math.exp(-4.5 * dt);
    this.camera.position.lerp(target, smoothing);
    const look = new THREE.Vector3(
      b.position.x + forward.x * 5,
      b.position.y + 1,
      b.position.z + forward.z * 5,
    );
    this.cameraTarget.lerp(look, 1 - Math.exp(-8 * dt));
    this.camera.lookAt(this.cameraTarget);
    this.camera.fov = THREE.MathUtils.lerp(
      this.camera.fov,
      57 + Math.min(10, Math.abs(this.car.speed) * 0.3),
      0.05,
    );
    this.camera.updateProjectionMatrix();
    if (!reducedMotion && this.shake > 0.02) {
      this.camera.position.x += (Math.random() - 0.5) * this.shake;
      this.camera.position.y += (Math.random() - 0.5) * this.shake * 0.5;
    }
  }
  frame(t) {
    const dt = Math.min(0.05, (t - this.lastT) / 1000);
    this.lastT = t;
    this.since += dt;
    try {
      this.tick(dt);
      if (this.state === "intro") {
        const phase = this.since * 0.08;
        this.camera.position.set(
          8 + Math.sin(phase) * 0.7,
          3.9,
          -36 + Math.cos(phase) * 0.6,
        );
        this.camera.lookAt(-3, 1, -24);
        this.camera.fov = 48;
        this.camera.updateProjectionMatrix();
      }
      this.shake *= Math.exp(-dt * 8);
      $("impact").style.opacity = String(Math.min(0.28, this.shake * 0.35));
      this.renderer.render(this.scene, this.camera);
    } catch (e) {
      console.error(e);
      this.fatal(
        "The simulation hit an unexpected error. Reload to try again.",
      );
      return;
    }
    requestAnimationFrame((time) => this.frame(time));
  }
  fatal(reason) {
    this.state = "error";
    $("fatal").hidden = false;
    $("fatal-reason").textContent = reason;
  }
}
document.fonts
  .load("800 110px BarlowCondensed")
  .then(() => new BugGame())
  .catch((e) => {
    console.error(e);
    $("fatal").hidden = false;
    $("fatal-reason").textContent =
      "WebGL could not start. Use a browser with hardware acceleration enabled.";
  });
