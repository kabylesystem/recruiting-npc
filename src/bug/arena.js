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
    this.concrete = this.surface("concrete_wall_006", 0xaab2b7, 3, 0.9);
    this.concrete.normalScale.set(0.45, 0.45);
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
    this.floor = this.surface("clean_asphalt", 0x838e96, 3, 0.95);
    this.floor.normalScale.set(0.65, 0.65);
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
      this.sign(
        `EXIT / ${x === -22 ? "ALPHAGO" : x === 0 ? "GEMINI" : "GENIE"}`,
        x,
        5.3,
        40.85,
        8.5,
        1.4,
        "#a9f4d0",
      );
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
    this.groundLabel("ONE MORE TRY", 3, -15, 20, 3.8, 0.44);
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
      this.box([75, 0.6, 0.6], [0, 19, z], this.metal);
      for (let x = -25; x <= 25; x += 25) {
        this.box(
          [8, 0.1, 0.65],
          [x, 18.6, z],
          new THREE.MeshBasicMaterial({ color: 0xd4e5ec }),
        );
      }
    }
    this.buildShowground();
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
    this.sign("GEMINI / ACCESS KEY", -11, 5, -3, 7, 1, "#f0f0e9");
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
  surface(name, color, tileSize, roughness) {
    const loader = new THREE.TextureLoader();
    const load = (kind, colorMap = false) => {
      const texture = loader.load(`/assets/textures/${name}_${kind}.jpg`);
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.anisotropy = 8;
      if (colorMap) texture.encoding = THREE.sRGBEncoding;
      return texture;
    };
    const material = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,
      map: load("diff", true),
      normalMap: load("nor_gl"),
      roughnessMap: load("rough"),
    });
    material.userData.tileSize = tileSize;
    return material;
  }
  buildShowground() {
    // The arena is a hostile arcade testing ground. These are original tribute
    // installations, not copies of Voodoo game artwork or official sponsorship.
    const dark = new THREE.MeshStandardMaterial({
      color: 0x15191e,
      roughness: 0.5,
      metalness: 0.5,
    });
    const white = new THREE.MeshStandardMaterial({
      color: 0xd8e2e4,
      roughness: 0.37,
      metalness: 0.35,
    });
    this.box([30, 8.5, 0.75], [0, 11, 43], dark);
    this.box([30.2, 0.1, 0.95], [0, 15.3, 42.9], this.light);
    this.box([0.13, 8.6, 0.95], [-15, 11, 42.9], this.light);
    this.sign("VOODOO × GOOGLE DEEPMIND", 0, 13.65, 42.5, 28, 2.2, "#f0f0e9");
    this.billboard = this.sign(
      "ONE MORE TRY.",
      0,
      10.2,
      42.5,
      27,
      4.4,
      "#f0f0e9",
    );
    this.sign(
      "ESCAPE THE RETENTION DEPARTMENT",
      0,
      7.45,
      42.5,
      24,
      1.1,
      "#aeb9bf",
    );
    for (const x of [-13, 13])
      this.box([0.6, 10, 0.6], [x, 5, 43.6], this.metal);

    // Helix Jump becomes a monumental kinetic sculpture behind the safety wall.
    this.helix = new THREE.Group();
    this.helix.position.set(29, 0, 48);
    const core = new THREE.Mesh(
      new THREE.CylinderBufferGeometry(0.6, 0.9, 27, 20),
      this.metal,
    );
    core.position.y = 13.5;
    this.helix.add(core);
    for (let i = 0; i < 9; i++) {
      const ring = new THREE.Mesh(
        new THREE.TorusBufferGeometry(3.8, 0.37, 8, 44, Math.PI * 1.62),
        i % 3 === 0 ? this.red : white,
      );
      ring.rotation.set(Math.PI / 2, 0, i * 0.77);
      ring.position.y = 5 + i * 2.45;
      ring.castShadow = true;
      this.helix.add(ring);
    }
    this.helixBall = new THREE.Mesh(
      new THREE.SphereBufferGeometry(0.85, 20, 14),
      this.light,
    );
    this.helixBall.position.set(2.8, 26, 0);
    this.helix.add(this.helixBall);
    this.scene.add(this.helix);
    this.sign("HELIX JUMP / STRESS TEST", 28, 4.5, 40.8, 11, 1.4, "#f0f0e9");

    // A sealed black aperture, a wink to Hole.io. Outside the playable enclosure.
    const aperture = new THREE.Mesh(
      new THREE.CircleBufferGeometry(5.6, 64),
      new THREE.MeshBasicMaterial({ color: 0x020305 }),
    );
    aperture.position.set(-28, 11, 46);
    aperture.rotation.y = Math.PI;
    this.scene.add(aperture);
    const rim = new THREE.Mesh(
      new THREE.TorusBufferGeometry(5.8, 0.22, 10, 64),
      this.light,
    );
    rim.position.copy(aperture.position);
    this.scene.add(rim);
    this.sign("HOLE.IO / DO NOT FEED", -27, 4.5, 40.8, 11, 1.4, "#f0f0e9");
    this.sign(
      "GOOGLE DEEPMIND",
      -33.9,
      6.5,
      3,
      22,
      2.5,
      "#ff4338",
      Math.PI / 2,
    );
    this.sign(
      "VOODOO / RETENTION LAB",
      33.9,
      6.5,
      3,
      22,
      2.5,
      "#f0f0e9",
      -Math.PI / 2,
    );

    const researchBlue = new THREE.MeshBasicMaterial({ color: 0x589dff });
    this.box([0.13, 0.12, 27], [-34, 9, 3], researchBlue);
    this.sign(
      "SOLVED GO. STILL CAN'T PARK.",
      -33.9,
      4.8,
      3,
      23,
      1.35,
      "#589dff",
      Math.PI / 2,
    );
    this.sign(
      "ONE MORE RUN IS THE BUSINESS MODEL.",
      33.9,
      4.8,
      3,
      25,
      1.35,
      "#ff4338",
      -Math.PI / 2,
    );
    this.sign(
      "ALPHAFOLD / PLEASE DO NOT FOLD THE CAR",
      -33.9,
      7,
      27,
      19,
      1.6,
      "#f0f0e9",
      Math.PI / 2,
    );
    this.sign(
      "GENIE / WORLDS WITHOUT EXIT PLANS",
      -33.9,
      7,
      -24,
      18,
      1.6,
      "#589dff",
      Math.PI / 2,
    );
    this.sign(
      "MOB CONTROL / CROWD NOT INCLUDED",
      33.9,
      7,
      -24,
      18,
      1.6,
      "#f0f0e9",
      -Math.PI / 2,
    );
    this.sign(
      "PAPER.IO / THIS LANE IS OURS",
      33.9,
      7,
      27,
      18,
      1.6,
      "#ff4338",
      -Math.PI / 2,
    );
    this.groundLabel("ALPHA, GO!", -22, 24, 10, 2.7, 0.6);
    this.groundLabel("GEMINI TEST TRACK", 16, -25, 13, 2.5, 0.5);
    // A research exhibit behind the enclosure: protein-like ribbon, not a new obstacle.
    const ribbon = new THREE.Mesh(
      new THREE.TorusKnotBufferGeometry(2.3, 0.23, 96, 8),
      researchBlue,
    );
    ribbon.position.set(-40, 10, 26);
    ribbon.rotation.z = Math.PI / 4;
    this.scene.add(ribbon);

    // Red / ivory curb blocks and panel seams give surfaces a human scale.
    for (const x of [-33.6, 33.6]) {
      for (let z = -36; z < 39; z += 4) {
        this.box(
          [0.65, 0.16, 3.9],
          [x, 0.08, z],
          ((z + 36) / 4) % 2 ? white : this.red,
        );
        this.box([0.07, 3.9, 0.04], [x < 0 ? -34.36 : 34.36, 2, z], this.metal);
      }
      this.box([0.08, 0.04, 72], [x + (x < 0 ? 1 : -1), 0.04, 0], this.light);
    }
    // Side service doors, vents and cable conduits stay outside the driving line.
    for (const x of [-34.32, 34.32]) {
      for (const z of [-24, 0, 24]) {
        this.box([0.06, 2.9, 4.5], [x, 1.45, z], dark);
        for (let h = 0.4; h < 2.6; h += 0.45)
          this.box(
            [0.1, 0.05, 4.1],
            [x + (x < 0 ? 0.07 : -0.07), h, z],
            this.metal,
          );
        this.box([0.12, 0.12, 4.5], [x, 3, z], this.light);
      }
    }
    this.addTireMarks();
  }
  addTireMarks() {
    const c = document.createElement("canvas");
    c.width = c.height = 1024;
    const ctx = c.getContext("2d");
    ctx.strokeStyle = "rgba(3, 5, 8, 0.45)";
    ctx.lineWidth = 8;
    for (let lane = 0; lane < 2; lane++) {
      ctx.beginPath();
      ctx.moveTo(50 + lane * 45, 1024);
      ctx.bezierCurveTo(
        100 + lane * 45,
        500,
        940 + lane * 45,
        680,
        730 + lane * 45,
        0,
      );
      ctx.stroke();
    }
    const map = new THREE.CanvasTexture(c);
    map.anisotropy = 8;
    const mesh = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(28, 40),
      new THREE.MeshBasicMaterial({
        map,
        transparent: true,
        depthWrite: false,
        opacity: 0.6,
        polygonOffset: true,
        polygonOffsetFactor: -1,
      }),
    );
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(-3, 0.035, -4);
    this.scene.add(mesh);
  }
  box(size, pos, material, physical = false, rx = 0, mass = 0) {
    const geometry = new THREE.BoxBufferGeometry(...size);
    // Match UVs to metres so a wall and a thin pillar share the same texel scale.
    if (material.userData.tileSize) {
      const pos = geometry.attributes.position,
        normal = geometry.attributes.normal,
        uv = geometry.attributes.uv;
      const scale = material.userData.tileSize;
      for (let i = 0; i < uv.count; i++) {
        const nx = Math.abs(normal.getX(i)),
          ny = Math.abs(normal.getY(i));
        uv.setXY(
          i,
          (nx > 0.5 ? pos.getZ(i) : pos.getX(i)) / scale,
          (ny > 0.5 ? pos.getZ(i) : pos.getY(i)) / scale,
        );
      }
      uv.needsUpdate = true;
    }
    const mesh = new THREE.Mesh(geometry, material);
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
  labelTexture(text, color = "#f0f0e9", aspect = 4) {
    const canvas = document.createElement("canvas");
    canvas.width = 2048;
    canvas.height = Math.min(1024, Math.round(2048 / aspect));
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    let size = canvas.height * 0.82;
    ctx.font = `800 ${size}px BarlowCondensed, sans-serif`;
    size *= Math.min(1, (canvas.width * 0.96) / ctx.measureText(text).width);
    ctx.font = `800 ${size}px BarlowCondensed, sans-serif`;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    const texture = new THREE.CanvasTexture(canvas);
    texture.encoding = THREE.sRGBEncoding;
    texture.anisotropy = 8;
    return texture;
  }
  sign(text, x, y, z, w, h, color, ry = 0) {
    const m = new THREE.Mesh(
      new THREE.PlaneBufferGeometry(w, h),
      new THREE.MeshBasicMaterial({
        map: this.labelTexture(text, color, w / h),
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
        map: this.labelTexture(text, "#f0f0e9", w / h),
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
  message(text) {
    const old = this.billboard.material.map;
    this.billboard.material.map = this.labelTexture(text, "#f0f0e9", 27 / 4.4);
    old.dispose();
  }
  unlock() {
    this.message("RUN. WE DARE YOU.");
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
    this.message("ONE MORE TRY.");
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
    if (this.helix) {
      const animate = !matchMedia("(prefers-reduced-motion: reduce)").matches;
      this.helix.rotation.y = animate ? Math.sin(time * 0.12) * 0.35 : 0;
      this.helixBall.position.y =
        25.8 + (animate ? Math.abs(Math.sin(time * 1.4)) * 1.8 : 0);
    }
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
