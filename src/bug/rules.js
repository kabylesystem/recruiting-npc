export const PATCHES = {
  gravity: {
    label: "Voiture alourdie",
    title: "LA VOITURE EST PLUS LOURDE",
    taunt: "Helix Jump taught you to fall. DeepMind is testing the landing.",
    hint: "Tu sautes moins haut. Reste au sol et vise une porte.",
    duration: 13,
  },
  rubber: {
    label: "Collisions rebondissantes",
    title: "TA VOITURE REBONDIT",
    taunt: "AlphaFold called. Your car is not a protein. Stop folding it.",
    hint: "Les chocs te font rebondir. Évite les murs ou utilise le rebond.",
    duration: 14,
  },
  ice: {
    label: "Route glissante",
    title: "LA ROUTE DEVIENT GLISSANTE",
    taunt: "Gemini imagined a skating rink. You brought a Ferrari.",
    hint: "Relâche ↑. Freine avec Espace avant de tourner.",
    duration: 12,
  },
  boost: {
    label: "Accélération forcée",
    title: "LA VOITURE ACCÉLÈRE TOUTE SEULE",
    taunt: "Voodoo asked for retention. You asked for acceleration.",
    hint: "Le frein est coupé. Utilise ← et → pour viser une sortie.",
    duration: 12,
  },
  mirror: {
    label: "Direction inversée",
    title: "GAUCHE ET DROITE SONT INVERSÉES",
    taunt: "Gemini has two sides. Your steering does too.",
    hint: "Appuie sur → pour tourner à gauche, et sur ← pour aller à droite.",
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
        ? ["ice", "gravity"]
        : state.used.length
          ? ["boost", "mirror", "rubber"]
          : ["ice", "mirror"];
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
