import * as THREE from "three";
import * as CANNON from "cannon";

export class Arena {
  constructor(scene, physics) {
    this.scene = scene;
    this.physics = physics;
    this.dynamic = [];
    this.temporary = [];
    this.gates = [];
    this.solid = new CANNON.Material("facility");
    this.solid.friction = 0.4;
    this.solid.restitution = 0.12;
    this.concrete = new THREE.MeshStandardMaterial({
      color: 0x50585b,
      roughness: 0.92,
      map: this.noise(),
    });
    this.metal = new THREE.MeshStandardMaterial({
      color: 0x272e33,
      roughness: 0.55,
      metalness: 0.65,
    });
    this.red = new THREE.MeshStandardMaterial({
      color: 0x9f271f,
      roughness: 0.55,
      metalness: 0.2,
    });
    this.light = new THREE.MeshBasicMaterial({ color: 0xff4338 });
    this.mint = new THREE.MeshBasicMaterial({ color: 0xa9f4d0 });
    this.floor = new THREE.MeshStandardMaterial({
      color: 0x343e44,
      map: this.noise(),
      roughness: 0.83,
      metalness: 0.1,
    });
    this.box([95, 1, 130], [0, -0.5, 8], this.floor, true);
    this.box([1.2, 4, 84], [-35, 2, 0], this.concrete, true);
    this.box([1.2, 4, 84], [35, 2, 0], this.concrete, true);
    this.box([70, 4, 1.2], [0, 2, -41], this.concrete, true);
    for (const x of [-31, -11, 11, 31])
      this.box(
        [x === -31 || x === 31 ? 8 : 12, 6, 2],
        [x, 3, 42],
        this.concrete,
        true,
      );
    // Three actual escape lanes, each can be closed without sealing the arena.
    for (const x of [-22, 0, 22]) {
      const gate = this.box([8, 3.2, 0.6], [x, 1.6, 42], this.metal, true);
      gate.body.userData = { gate: true };
      this.gates.push(gate);
      this.box([8, 0.12, 0.15], [x, 3.25, 41.6], this.light);
      this.sign("EXIT  ↗", x, 5.3, 40.85, 7, 1.4, "#a9f4d0");
      this.box(
        [8, 0.025, 5],
        [x, 0.015, 46],
        new THREE.MeshBasicMaterial({
          color: 0xa9f4d0,
          transparent: true,
          opacity: 0.13,
        }),
      );
    }
    // Ground paint, parking bays and patch-test lane.
    const paint = new THREE.MeshBasicMaterial({
      color: 0x9ca6a8,
      transparent: true,
      opacity: 0.38,
    });
    for (let z = -36; z < 39; z += 6)
      this.box([0.12, 0.012, 2.6], [0, 0.012, z], paint);
    for (const x of [-27, 27]) {
      this.box([0.13, 0.015, 69], [x, 0.02, -1], paint);
      for (let z = -30; z < 32; z += 8)
        this.box([6, 0.018, 0.13], [x + (x < 0 ? -3 : 3), 0.02, z], paint);
    }
    this.groundLabel("06", -5, -28, 9, 8, 0.22);
    this.groundLabel("CONTAINMENT", 3, -15, 19, 3, 0.16);
    this.groundLabel("RAMP  →", 13, 7, 9, 2, 0.7);
    this.groundLabel("EXIT", -22, 32, 7, 3, 0.6);
    // A real Cannon slope; jumping is produced by suspension + speed.
    this.box([7, 0.6, 15], [17, 1.85, 22], this.concrete, true, -0.25);
    this.box([7, 0.04, 0.15], [17, 3.65, 29.2], this.light);
    for (let z = 16; z <= 27; z += 3) {
      const y = 1.85 + (z - 22) * 0.247 + 0.33;
      this.box([5, 0.025, 0.12], [17, y, z], paint, false, -0.25);
    }
    // Industrial detail, no external world download.
    for (const x of [-36, 36])
      for (let z = -36; z < 48; z += 12) {
        this.box([2, 10, 2], [x, 5, z], this.concrete);
        this.box(
          [0.12, 5, 0.2],
          [x + (x < 0 ? 0.99 : -0.99), 6, z - 1.1],
          this.light,
        );
        this.box(
          [0.25, 0.25, 11],
          [x + (x < 0 ? 1.4 : -1.4), 7.8, z + 5],
          this.metal,
        );
      }
    for (let i = 0; i < 10; i++) {
      const x = (i % 2 ? 1 : -1) * (43 + (i % 3) * 6),
        z = -37 + Math.floor(i / 2) * 21;
      const h = 10 + ((i * 13) % 21);
      this.box(
        [11, h, 16],
        [x, h / 2, z],
        new THREE.MeshStandardMaterial({ color: 0x283137, roughness: 0.87 }),
      );
      for (let j = 3; j < h - 2; j += 5)
        this.box(
          [11.02, 0.1, 15.7],
          [x, j, z],
          new THREE.MeshBasicMaterial({ color: 0x61747f }),
        );
    }
    for (const z of [-28, 13, 41]) {
      this.box([75, 0.6, 0.6], [0, 13, z], this.metal);
      for (let x = -25; x <= 25; x += 25) {
        this.box(
          [8, 0.1, 0.65],
          [x, 12.6, z],
          new THREE.MeshBasicMaterial({ color: 0xd4e5ec }),
        );
      }
    }
    this.sign("YOU ARE NOT THE PLAYER.", 0, 9, 41, 24, 2.1, "#eceee9");
    this.sign("06", -33.9, 5, -20, 5, 4, "#ff4338", Math.PI / 2);
    // Pushable cargo teaches that the environment is physical.
    for (let i = 0; i < 6; i++) {
      const thing = this.box(
        [1.5, 1.5, 1.5],
        [-21 + (i % 3) * 1.7, 0.8, 14 + Math.floor(i / 3) * 1.8],
        this.red,
        true,
        0,
        12,
      );
      this.dynamic.push({ ...thing, initial: thing.body.position.clone() });
    }
    this.key = new THREE.Group();
    const diamond = new THREE.Mesh(
      new THREE.OctahedronBufferGeometry(0.85),
      new THREE.MeshStandardMaterial({
        color: 0xffffff,
        emissive: 0xb8dddd,
        emissiveIntensity: 1.3,
        metalness: 0.4,
        roughness: 0.15,
      }),
    );
    this.key.add(diamond);
    const ring = new THREE.Mesh(
      new THREE.TorusBufferGeometry(1.7, 0.055, 8, 48),
      new THREE.MeshBasicMaterial({ color: 0xf0f0e9 }),
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = -1.5;
    this.key.add(ring);
    this.key.position.set(-11, 2.4, -3);
    scene.add(this.key);
    this.keyBeam = this.box(
      [0.055, 14, 0.055],
      [-11, 7, -3],
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.5,
      }),
    ).mesh;
    this.sign("ACCESS KEY", -11, 5, -3, 5, 1, "#f0f0e9");
    this.keySign = this.scene.children[this.scene.children.length - 1];
    const converted = new Set();
    this.scene.traverse((o) => {
      if (o.isMesh && o.material && !converted.has(o.material)) {
        converted.add(o.material);
        if (o.material.color) o.material.color.convertSRGBToLinear();
        if (o.material.isMeshBasicMaterial) o.material.toneMapped = false;
      }
    });
    this.particles = [];
    const particleGeo = new THREE.BoxBufferGeometry(0.12, 0.12, 0.4);
    for (let i = 0; i < 50; i++) {
      const m = new THREE.Mesh(particleGeo, this.light);
      m.visible = false;
      scene.add(m);
      this.particles.push({ mesh: m, velocity: new THREE.Vector3(), life: 0 });
    }
  }
  noise() {
    const c = document.createElement("canvas");
    c.width = c.height = 256;
    const ctx = c.getContext("2d");
    const im = ctx.createImageData(256, 256);
    let seed = 713;
    for (let i = 0; i < im.data.length; i += 4) {
      seed = (seed * 16807) % 2147483647;
      const v = 155 + (seed % 75);
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v;
      im.data[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(18, 18);
    return t;
  }
  box(size, pos, material, physical = false, rx = 0, mass = 0) {
    const mesh = new THREE.Mesh(new THREE.BoxBufferGeometry(...size), material);
    mesh.position.set(...pos);
    mesh.rotation.x = rx;
    mesh.castShadow = size[1] > 0.3;
    mesh.receiveShadow = true;
    this.scene.add(mesh);
    let body;
    if (physical) {
      body = new CANNON.Body({
        mass,
        material: this.solid,
        shape: new CANNON.Box(new CANNON.Vec3(...size.map((v) => v / 2))),
      });
      body.position.set(...pos);
      body.quaternion.setFromEuler(rx, 0, 0);
      body.linearDamping = 0.12;
      this.physics.addBody(body);
    }
    return { mesh, body };
  }
  labelTexture(text, color = "#f0f0e9") {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "800 110px BarlowCondensed, sans-serif";
    ctx.fillText(text, 512, 128, 990);
    return new THREE.CanvasTexture(canvas);
  }
  sign(text, x, y, z, w, h, color, ry = 0) {
    const m = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this.labelTexture(text, color),
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    m.position.set(x, y, z);
    m.rotation.y = ry || Math.PI;
    this.scene.add(m);
    return m;
  }
  groundLabel(text, x, z, w, h, opacity) {
    const m = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this.labelTexture(text),
        transparent: true,
        opacity,
        depthWrite: false,
      }),
    );
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.PI;
    m.position.set(x, 0.04, z);
    this.scene.add(m);
  }
  unlock() {
    this.key.visible = false;
    this.keyBeam.visible = false;
    this.keySign.visible = false;
    for (const g of this.gates) {
      g.body.position.y = -4;
      g.body.aabbNeedsUpdate = true;
    }
    this.open = true;
  }
  reset() {
    this.clearPatches();
    this.open = false;
    this.key.visible = true;
    this.keyBeam.visible = true;
    this.keySign.visible = true;
    for (const g of this.gates) {
      g.body.position.y = 1.6;
      g.body.aabbNeedsUpdate = true;
    }
    for (const d of this.dynamic) {
      d.body.position.copy(d.initial);
      d.body.velocity.setZero();
      d.body.angularVelocity.setZero();
      d.body.quaternion.set(0, 0, 0, 1);
      d.body.wakeUp();
    }
  }
  barricade(x, z) {
    const lane = Math.max(-23, Math.min(23, x));
    const depth = Math.max(7, Math.min(32, z + 13));
    const b = this.box([10, 2.8, 0.8], [lane, 1.4, depth], this.red, true);
    b.body.userData = { patch: true };
    this.temporary.push(b);
    const edge = this.box([10, 0.08, 0.86], [lane, 2.85, depth], this.light);
    this.temporary.push(edge);
    this.burst(new THREE.Vector3(lane, 2, depth), 18);
    return b;
  }
  clearPatches() {
    for (const p of this.temporary) {
      this.scene.remove(p.mesh);
      p.mesh.geometry.dispose();
      if (p.body) this.physics.removeBody(p.body);
    }
    this.temporary = [];
  }
  burst(pos, force = 8) {
    for (let i = 0; i < 18; i++) {
      const p = this.particles.find((p) => p.life <= 0);
      if (!p) break;
      p.mesh.position.copy(pos);
      p.mesh.visible = true;
      p.life = 0.3 + Math.random() * 0.4;
      p.velocity.set(
        (Math.random() - 0.5) * force,
        Math.random() * force * 0.7,
        (Math.random() - 0.5) * force,
      );
    }
  }
  update(dt, time) {
    this.key.children[0].rotation.y = time;
    this.key.position.y = 2.5 + Math.sin(time * 2) * 0.25;
    for (const d of this.dynamic) {
      d.mesh.position.copy(d.body.position);
      d.mesh.quaternion.copy(d.body.quaternion);
    }
    for (const g of this.gates)
      g.mesh.position.y = THREE.MathUtils.lerp(
        g.mesh.position.y,
        this.open ? -4 : 1.6,
        Math.min(1, dt * 3),
      );
    for (const p of this.particles) {
      if (p.life > 0) {
        p.life -= dt;
        p.velocity.y -= 14 * dt;
        p.mesh.position.addScaledVector(p.velocity, dt);
        p.mesh.visible = p.life > 0;
      }
    }
  }
}
