export const PATCHES = {
  barricade: {
    label: "Roadblock",
    title: "SHORTCUT REMOVED.",
    taunt: "That road was not part of your character arc.",
    hint: "The wall has edges. Find another angle.",
    duration: 16,
  },
  gravity: {
    label: "Heavy gravity",
    title: "FLIGHT PRIVILEGES REVOKED.",
    taunt: "You are a background character. Stay grounded.",
    hint: "Extra grip. Hit the ramp with boost.",
    duration: 13,
  },
  rubber: {
    label: "Rubber collisions",
    title: "COLLISION DAMAGE: ZERO.",
    taunt: "There. We made the car completely harmless.",
    hint: "Harmless things can still bounce. Hit a wall.",
    duration: 14,
  },
  ice: {
    label: "Traction lost",
    title: "TRACTION DEPRECATED.",
    taunt: "We noticed you were enjoying the steering.",
    hint: "Coast through turns. Brake before you steer.",
    duration: 12,
  },
  boost: {
    label: "Overdrive",
    title: "BRAKE SERVICE OFFLINE.",
    taunt: "We fixed the engine. Slightly too well.",
    hint: "Permanent overdrive. The ramp is your exit.",
    duration: 12,
  },
  mirror: {
    label: "Reversed steering",
    title: "STEERING REASSIGNED.",
    taunt: "Left and right were just a suggestion.",
    hint: "Your steering is reversed. Commit to it.",
    duration: 10,
  },
};
export function chooseLocalPatch(state) {
  const available = Object.keys(PATCHES).filter(
    (id) => !state.used.includes(id),
  );
  const priorities = state.airborne
    ? ["gravity", "rubber"]
    : state.collisions > 1
      ? ["rubber", "boost"]
      : state.speed > 45
        ? ["barricade", "ice"]
        : state.used.length
          ? ["boost", "mirror", "rubber"]
          : ["barricade", "mirror"];
  const id =
    priorities.find((id) => available.includes(id)) || available[0] || "rubber";
  return { patch: id, taunt: PATCHES[id].taunt, source: "local" };
}
export function validDecision(value, used = []) {
  return (
    value &&
    Object.hasOwn(PATCHES, value.patch) &&
    !used.includes(value.patch) &&
    typeof value.taunt === "string" &&
    value.taunt.length <= 240 &&
    ["claude", "codex", "local"].includes(value.source)
  );
}
