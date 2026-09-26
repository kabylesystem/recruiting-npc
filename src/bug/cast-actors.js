import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils";

const NAMES = ["JEAN-MICHEL", "SAMIRA", "KEVIN"];
const SPOTS = [
  [-9, -17],
  [13, -1],
  [-13, 23],
];
export class CastActors {
  constructor(scene) {
    this.scene = scene;
    this.actors = [];
  }
  async load() {
    const loader = new GLTFLoader();
    const load = (url) =>
      new Promise((resolve, reject) =>
        loader.load(url, resolve, undefined, reject),
      );
    const models = await Promise.all([
      load("/assets/npcs/soldier.glb"),
      load("/assets/npcs/michelle.glb"),
    ]);
    for (let id = 0; id < 3; id++) {
      const data = models[id === 1 ? 1 : 0];
      const root = new THREE.Group();
      const model = SkeletonUtils.clone(data.scene);
      const bounds = new THREE.Box3().setFromObject(model);
      const size = bounds.getSize(new THREE.Vector3());
      // r113 Box3 ignores skinned bind transforms; Michelle's vertex positions are already metres.
      if (id === 1) {
        model.scale.setScalar(1.32);
        model.position.y = 0;
      } else {
        model.scale.setScalar(2.2 / size.y);
        model.position.y = -bounds.min.y * model.scale.y;
      }
      model.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.frustumCulled = false;
          o.material = o.material.clone();
          if (id === 1) o.material.onBeforeCompile = (shader) => {
            shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', '#include <map_fragment>\nif (diffuseColor.r > 0.45 && diffuseColor.g > 0.4 && diffuseColor.b < 0.2) diffuseColor.rgb = vec3(0.06, 0.28, 0.39) * (diffuseColor.r + 0.4);');
          };
          if (id === 2 && o.material.color) o.material.color.set(0x91baff);
        }
      });
      root.add(model);
      const mixer = new THREE.AnimationMixer(model);
      const actions = {};
      for (const clip of data.animations)
        actions[clip.name] = mixer.clipAction(clip);
      const idle = actions.Idle || actions.SambaDance;
      idle?.play();
      const ring = new THREE.Mesh(
        new THREE.RingBufferGeometry(2.6, 2.72, 48),
        new THREE.MeshBasicMaterial({
          color: id === 1 ? 0xa9f4d0 : 0xf0f0e9,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.7,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.y = 0.04;
      root.add(ring);
      const canvas = document.createElement("canvas");
      canvas.width = 512;
      canvas.height = 128;
      const c = canvas.getContext("2d");
      c.fillStyle = "#10161a";
      c.fillRect(0, 0, 512, 128);
      c.textAlign = "center";
      c.fillStyle = "#f0f0e9";
      c.font = "bold 38px sans-serif";
      c.fillText(NAMES[id], 256, 48);
      c.fillStyle = "#a9f4d0";
      c.font = "25px sans-serif";
      c.fillText("H · KLAXONNE", 256, 95);
      const label = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: new THREE.CanvasTexture(canvas),
          depthTest: false,
        }),
      );
      label.position.y = 3.3;
      label.scale.set(4.6, 1.15, 1);
      root.add(label);
      this.scene.add(root);
      this.actors.push({
        id,
        root,
        model,
        mixer,
        actions,
        idle,
        ring,
        label,
        collected: false,
        reactionTime: 0,
      });
    }
    this.reset();
  }
  reset() {
    for (const a of this.actors) {
      a.collected = false;
      a.root.position.set(SPOTS[a.id][0], 0, SPOTS[a.id][1]);
      a.model.rotation.set(0, 0, 0);
      a.ring.visible = a.label.visible = true;
      a.mixer.stopAllAction();
      a.idle?.play();
      a.reactionTime = 0;
    }
  }
  recruit(id) {
    const a = this.actors[id];
    a.collected = true;
    a.ring.visible = false;
    a.label.visible = false;
    a.idle?.stop();
    (a.actions.Run || a.actions.SambaDance)?.play();
  }
  reaction(id, kind) {
    const a = this.actors[id];
    if (a) {
      a.reactionTime = kind === "fall" ? 2.2 : 0.6;
      a.falling = kind === "fall";
    }
  }
  update(dt, time, car, quaternion) {
    for (const a of this.actors) {
      a.mixer.update(dt);
      a.reactionTime = Math.max(0, a.reactionTime - dt);
      if (a.collected && car) {
        const offset = new THREE.Vector3(
          (a.id - 1) * 2.3,
          0,
          -5 - a.id,
        ).applyQuaternion(
          new THREE.Quaternion(
            quaternion.x,
            quaternion.y,
            quaternion.z,
            quaternion.w,
          ),
        );
        const goal = new THREE.Vector3(car.x + offset.x, 0, car.z + offset.z);
        const d = a.root.position.distanceTo(goal);
        a.root.lookAt(goal.x, 0, goal.z);
        a.root.position.lerp(goal, Math.min(1, dt * (d > 15 ? 4 : 2)));
      } else if (car) a.root.lookAt(car.x, 0, car.z);
      a.model.rotation.z =
        a.reactionTime > 0
          ? a.falling
            ? Math.sin((Math.min(1, a.reactionTime) * Math.PI) / 2) * 1.35
            : Math.sin(time * 25) * 0.13
          : 0;
      a.ring.material.opacity = 0.55 + Math.sin(time * 3) * 0.15;
    }
  }
}
