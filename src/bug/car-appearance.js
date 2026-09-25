import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";

// Appearance only. The Sketchbook chassis, suspension and wheel transforms remain
// authoritative. See docs/ASSET-LICENSES.md for the model's CC-BY attribution.
export async function attachCarAppearance(car, scene) {
  const decoder = new DRACOLoader();
  decoder.setDecoderPath("/assets/draco/");
  decoder.setWorkerLimit(1);
  const loader = new GLTFLoader();
  loader.setDRACOLoader(decoder);
  let gltf;
  try {
    gltf = await new Promise((resolve, reject) =>
      loader.load("/assets/car/ferrari-lite.glb", resolve, undefined, reject),
    );
  } finally {
    decoder.dispose();
  }

  const model = gltf.scene;
  model.name = "Ferrari 458 Italia · vicent091036 · CC-BY 4.0";
  model.rotation.y = Math.PI; // Source faces -Z; the raycast car drives +Z.
  model.updateMatrixWorld(true);
  const sourceWheels = ["wheel_fl", "wheel_fr", "wheel_rl", "wheel_rr"].map(
    (name) => model.getObjectByName(name),
  );
  if (sourceWheels.some((wheel) => !wheel) || car.wheels.length !== 4)
    throw Error("Car appearance requires four wheels");
  const positions = sourceWheels.map((wheel) =>
    wheel.getWorldPosition(new THREE.Vector3()),
  );
  const originalWheels = car.wheels.map((wheel) => wheel.wheelObject);
  const infos = car.rayCastVehicle.wheelInfos;
  const targetPositions = infos.map((info) => info.chassisConnectionPointLocal);
  const range = (values, axis) =>
    Math.max(...values.map((p) => p[axis])) -
    Math.min(...values.map((p) => p[axis]));
  const average = (values, axis) =>
    values.reduce((total, p) => total + p[axis], 0) / values.length;
  const wheelBounds = new THREE.Box3()
    .setFromObject(sourceWheels[0])
    .getSize(new THREE.Vector3());
  const radius =
    infos.reduce((total, info) => total + info.radius, 0) / infos.length;
  const scale = new THREE.Vector3(
    range(targetPositions, "x") / range(positions, "x"),
    (radius * 2) / wheelBounds.y,
    range(targetPositions, "z") / range(positions, "z"),
  );
  const restWheelY =
    infos.reduce(
      (total, info) =>
        total + info.chassisConnectionPointLocal.y - info.suspensionRestLength,
      0,
    ) / infos.length;
  const offset = new THREE.Vector3(
    average(targetPositions, "x") - average(positions, "x") * scale.x,
    restWheelY - average(positions, "y") * scale.y,
    average(targetPositions, "z") - average(positions, "z") * scale.z,
  );

  // A small local studio reflection supplies readable paint even without an HDRI.
  // It changes materials only, never the scene's lighting or background.
  let ownEnvironment = null;
  const environment =
    scene.environment ||
    (() => {
      const faces = Array.from({ length: 6 }, (_, i) => {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = 64;
        const context = canvas.getContext("2d");
        const gradient = context.createLinearGradient(0, 0, 0, 64);
        gradient.addColorStop(0, i === 2 ? "#dae5eb" : "#697b8d");
        gradient.addColorStop(0.43, "#82909b");
        gradient.addColorStop(0.5, "#202b37");
        gradient.addColorStop(1, "#101319");
        context.fillStyle = gradient;
        context.fillRect(0, 0, 64, 64);
        if (i < 2 || i === 4) {
          context.fillStyle = "#dce6e9";
          context.fillRect(18, 4, 8, 40);
        }
        return canvas;
      });
      ownEnvironment = new THREE.CubeTexture(faces);
      ownEnvironment.encoding = THREE.sRGBEncoding;
      ownEnvironment.needsUpdate = true;
      return ownEnvironment;
    })();
  // r113 expects linear material colors. Feeding display-space hex values
  // directly into the shader made the original graphite paint look chrome-white.
  const paintColor = (hex) => new THREE.Color(hex).convertSRGBToLinear();
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: paintColor(0x39454d),
    metalness: 0.12,
    roughness: 0.55,
    clearcoat: 0.15,
    clearcoatRoughness: 0.4,
  });
  const rimMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0x727c83),
    metalness: 0.7,
    roughness: 0.4,
    envMap: environment,
    envMapIntensity: 0.65,
  });
  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: paintColor(0x182c35),
    metalness: 0.05,
    roughness: 0.12,
    clearcoat: 1,
    envMap: environment,
    envMapIntensity: 0.55,
    transparent: true,
    opacity: 0.8,
    depthWrite: false,
  });
  const tireMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0x181b1e),
    metalness: 0,
    roughness: 0.96,
  });
  const trimMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0x20262a),
    metalness: 0.12,
    roughness: 0.66,
    envMap: environment,
    envMapIntensity: 0.3,
  });
  const redMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0xd32c36),
    metalness: 0.25,
    roughness: 0.42,
  });
  const seatMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0x6c232b),
    metalness: 0,
    roughness: 0.82,
  });
  const tailMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0xea263a),
    emissive: paintColor(0xff1835),
    emissiveIntensity: 0.35,
    metalness: 0.05,
    roughness: 0.22,
  });
  const headlightMaterial = new THREE.MeshStandardMaterial({
    color: paintColor(0xd5eee9),
    emissive: paintColor(0xc5eee7),
    emissiveIntensity: 0.7,
    metalness: 0.1,
    roughness: 0.2,
  });
  const originalMaterials = new Set();
  model.traverse((object) => {
    if (!object.isMesh) return;
    (Array.isArray(object.material)
      ? object.material
      : [object.material]
    ).forEach((material) => originalMaterials.add(material));
    object.castShadow = true;
    // The arena's wide shadow map produces self-shadow acne on thin panels.
    // Keep the silhouette shadow on the floor; shade the car with direct lights.
    object.receiveShadow = false;
    const name = object.name.toLowerCase();
    if (name === "body") object.material = bodyMaterial;
    else if (name === "glass") object.material = glassMaterial;
    else if (name === "lights_red" || name === "brakes" || name === "leds")
      object.material = tailMaterial;
    else if (name === "lights") object.material = headlightMaterial;
    else if (name.startsWith("rim_") || name === "chrome" || name === "metal")
      object.material = rimMaterial;
    else if (name.includes("tire")) object.material = tireMaterial;
    else if (name.includes("brake") || name.startsWith("centre"))
      object.material = redMaterial;
    else if (name === "interior_dark" || name === "trim")
      object.material = seatMaterial;
    else if (
      name.includes("yellow") ||
      name.includes("plastic") ||
      name.includes("carbon") ||
      name.includes("interior") ||
      name.includes("leather") ||
      name.includes("carpet") ||
      name.startsWith("steering") ||
      name === "wipers" ||
      name === "grills"
    )
      object.material = trimMaterial;
    else if (object.material && !Array.isArray(object.material)) {
      object.material.envMap = environment;
      object.material.envMapIntensity = 0.5;
      object.material.needsUpdate = true;
    }
  });

  // Detach the new wheel meshes into independent physical transform rigs. Match
  // by axle/side instead of trusting either asset's wheel ordering or names.
  const available = new Set(infos.map((_, index) => index));
  const wheelRigs = sourceWheels.map((wheel, index) => {
    const desired = positions[index].clone().multiply(scale).add(offset);
    const physicalIndex = [...available].sort((a, b) => {
      const pointA = targetPositions[a],
        pointB = targetPositions[b];
      return (
        (pointA.x - desired.x) ** 2 +
        (pointA.z - desired.z) ** 2 -
        (pointB.x - desired.x) ** 2 -
        (pointB.z - desired.z) ** 2
      );
    })[0];
    available.delete(physicalIndex);
    wheel.parent.remove(wheel);
    wheel.position.set(0, 0, 0);
    const orientation = new THREE.Group();
    orientation.rotation.y = Math.PI;
    // Preserve circular tires: only tread width follows the model's X scale.
    orientation.scale.set(scale.x, scale.y, scale.y);
    orientation.add(wheel);
    const rig = new THREE.Group();
    rig.name = "appearance-wheel-" + index;
    rig.add(orientation);
    return { rig, physicalIndex };
  });
  model.scale.copy(scale);
  model.position.copy(offset);
  car.add(model);
  wheelRigs.forEach(({ rig }) => scene.add(rig));
  const previousBodyVisibility = car.modelContainer.visible;
  const previousWheelVisibility = originalWheels.map((wheel) => wheel.visible);
  car.modelContainer.visible = false;
  originalWheels.forEach((wheel) => {
    wheel.visible = false;
  });
  const update = () => {
    for (const { rig, physicalIndex } of wheelRigs) {
      const transform = infos[physicalIndex].worldTransform;
      rig.position.copy(transform.position);
      rig.quaternion.copy(transform.quaternion);
    }
  };
  update();
  return {
    model,
    update,
    wheelRigs: wheelRigs.map(({ rig }) => rig),
    scale: scale.clone(),
    dispose() {
      car.remove(model);
      wheelRigs.forEach(({ rig }) => scene.remove(rig));
      car.modelContainer.visible = previousBodyVisibility;
      originalWheels.forEach((wheel, index) => {
        wheel.visible = previousWheelVisibility[index];
      });
      const geometries = new Set();
      [model, ...wheelRigs.map(({ rig }) => rig)].forEach((root) =>
        root.traverse((object) => {
          if (object.geometry) geometries.add(object.geometry);
        }),
      );
      geometries.forEach((geometry) => geometry.dispose());
      new Set([
        ...originalMaterials,
        bodyMaterial,
        rimMaterial,
        glassMaterial,
        tireMaterial,
        trimMaterial,
        redMaterial,
        seatMaterial,
        tailMaterial,
        headlightMaterial,
      ]).forEach((material) => material.dispose());
      if (ownEnvironment) ownEnvironment.dispose();
    },
  };
}
