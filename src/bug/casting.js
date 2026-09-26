import * as THREE from "three";

export const CAST = [
  {
    name: "Jean-Michel Cinématique",
    role: "Cascadeur sans assurance",
    brief: "Tape un mur. Je tombe. On appelle ça du cinéma.",
    task: "Percute un mur pour sa bande-démo",
    hint: "Prends de l’élan, puis vise le mur du plateau.",
    accepted: "Parfait. Ma mutuelle vient de me bloquer.",
    fail: "Même le mur joue mieux que toi.",
    color: "#f0f0e9",
  },
  {
    name: "Samira La Star",
    role: "Influenceuse · 12 abonnés, tous ses cousins",
    brief: "Fais un dérapage. Je dirai que je conduisais.",
    task: "Fais déraper la voiture",
    hint: "Accélère, tourne et maintiens Espace pour déraper.",
    accepted: "Je coupe le crash au montage. Google DeepMind fera le reste.",
    fail: "Je vais devoir acheter des vues pour ça.",
    color: "#a9f4d0",
  },
  {
    name: "Kevin Pathfinding",
    role: "Piéton bloqué depuis GTA III",
    brief: "Trois coups de klaxon. Sinon je continue à marcher dans ce mur.",
    task: "Klaxonne encore 3 fois",
    hint: "Appuie trois fois sur H, ou sur Klaxon.",
    accepted: "Merci. Ça faisait vingt-trois ans que je cherchais le trottoir.",
    fail: "Recalcul de l’itinéraire. Recalcul de l’itinéraire.",
    color: "#8fbfff",
  },
];
const $ = (id) => document.getElementById(id);

export class Casting {
  constructor(game, actors) {
    this.g = game;
    this.actors = actors;
    this.reset();
  }
  reset() {
    this.active = null;
    this.recruited = [];
    this.score = 0;
    this.progress = 0;
    this.horns = 0;
    this.lastHorn = -100;
    this.dialogueUntil = 0;
    this.lastQuip = -100;
    this.lastStunt = -100;
    this.dialogueSerial = 0;
    this.actors.reset();
    if ($("cast-roster"))
      $("cast-roster").innerHTML = CAST.map(
        (c, i) =>
          `<span data-cast="${i}"><i>${i + 1}</i>${c.name.split(" ")[0]}</span>`,
      ).join("");
    if ($("dialogue")) $("dialogue").hidden = true;
    this.hud();
  }
  say(id, text, duration = 5) {
    if (this.g.state === "playing") $("drive-prompt").hidden = true;
    const name = typeof id === "number" ? CAST[id].name : id;
    $("speaker").textContent = name;
    $("dialogue-line").textContent = text;
    $("dialogue").hidden = false;
    this.dialogueUntil = this.g.elapsed + duration;
    this.g.audio.sayFrench?.(text);
  }
  nearest() {
    const p = this.g.car.collision.position;
    return this.actors.actors
      .filter((a) => !this.recruited.includes(a.id))
      .map((a) => ({
        actor: a,
        distance: Math.hypot(a.root.position.x - p.x, a.root.position.z - p.z),
      }))
      .sort((a, b) => a.distance - b.distance)[0];
  }
  target() {
    if (this.active !== null) {
      // The stunt is performed on the plateau; no misleading destination arrow.
      return null;
    }
    const next = this.nearest();
    if (!next) return null;
    return {
      x: next.actor.root.position.x,
      y: 3.2,
      z: next.actor.root.position.z,
      distance: next.distance,
      name: CAST[next.actor.id].name,
    };
  }
  horn() {
    const g = this.g;
    if (g.state !== "playing" || g.elapsed - this.lastHorn < 0.22) return;
    this.lastHorn = g.elapsed;
    g.audio.tone(180, 0.22, 0.45, "sawtooth");
    g.audio.tone(235, 0.24, 0.3, "square");
    this.actors.reaction?.(this.active ?? this.nearest()?.actor.id, "horn");
    if (this.active === 2) {
      this.horns++;
      this.progress = this.horns / 3;
      if (this.horns >= 3) this.accept();
      else
        this.say(
          2,
          this.horns === 1
            ? "Une fois, c’est peut-être le vent."
            : "Deux fois… DeepMind appelle ça de l’apprentissage.",
        );
    } else if (this.active !== null) {
      this.say(this.active, CAST[this.active].brief);
    } else {
      const next = this.nearest();
      if (next && next.distance < 9) {
        this.active = next.actor.id;
        this.progress = 0;
        this.horns = 0;
        this.say(this.active, CAST[this.active].brief, 7);
        this.actors.reaction?.(this.active, "wave");
        if (!g.clockStarted) {
          g.clockStarted = true;
          $("drive-prompt").hidden = true;
        }
        // Two subscription jury comments per attempt, without random changes to controls.
        if (g.requested < 2) g.requestDecision();
      } else
        this.say(
          "Assistant casting",
          "Approche-toi d’un candidat avant de klaxonner.",
          2.5,
        );
    }
    this.hud();
  }
  collision(power) {
    if (this.active === 0 && power >= 3) {
      this.actors.reaction?.(0, "fall");
      this.accept();
    } else if (this.recruited.length && this.g.elapsed - this.lastQuip > 5) {
      const id = this.recruited[this.recruited.length - 1];
      this.say(
        id,
        [
          "C’était pas dans mon contrat. Enfin, j’ai pas de contrat.",
          "Voodoo garde les joueurs. Moi je garde le traumatisme.",
          "C’est ça, le monde ouvert ? Le mur était fermé.",
        ][this.dialogueSerial++ % 3],
      );
      this.actors.reaction?.(id, "fall");
      this.lastQuip = this.g.elapsed;
    }
  }
  accept() {
    const id = this.active;
    if (id === null) return;
    this.recruited.push(id);
    this.active = null;
    this.progress = 0;
    this.score += 500 + Math.max(0, Math.floor(this.g.left * 5));
    this.actors.recruit(id);
    this.say(id, CAST[id].accepted, 6);
    this.g.audio.pickup();
    this.g.arena.burst(
      new THREE.Vector3().copy(this.g.car.collision.position),
      5,
    );
    this.g.arena.message(`${this.recruited.length}/3 PNJ RECRUTÉS`);
    this.hud();
    if (this.recruited.length === 3) this.g.finish(true);
  }
  update(dt) {
    const g = this.g;
    this.actors.update(
      dt,
      g.since,
      g.car.collision.position,
      g.car.collision.quaternion,
    );
    const drifting =
      g.keys.has("Space") &&
      (g.keys.has("KeyA") || g.keys.has("KeyD")) &&
      Math.abs(g.car.speed) > 2.5;
    if (this.active === 1 && drifting) {
      this.progress += dt / 0.65;
      if (this.progress >= 1) this.accept();
    }
    if (drifting && this.recruited.length) this.score += dt * 45;
    if (g.elapsed > this.dialogueUntil) $("dialogue").hidden = true;
    if (g.patchDecision && g.elapsed > this.dialogueUntil + 1) {
      this.say(
        g.patchDecision.source === "local" ? "Directeur de casting" : "Jury IA",
        g.patchDecision.taunt,
        5,
      );
      g.patchDecision = null;
    }
    this.hud();
  }
  hud() {
    if (!$("casting-score")) return;
    $("casting-score").textContent =
      `${Math.floor(this.score).toLocaleString("fr-FR")} $`;
    $("key-label").textContent = `${this.recruited.length}/3 PNJ recrutés`;
    $("audition-meter").hidden = this.active === null;
    $("audition-progress").style.width =
      `${Math.min(100, this.progress * 100)}%`;
    $("audition-label").textContent =
      this.active === 2
        ? `${this.horns}/3 coups de klaxon`
        : this.active === 0
          ? "Cascade : en attente du choc"
          : "Dérapage";
    $("objective").textContent =
      this.active === null
        ? `Recrute ton casting · ${this.recruited.length}/3`
        : this.active === 2 ? `Klaxonne encore ${3 - this.horns} fois` : CAST[this.active].task;
    $("objective-hint").textContent =
      this.active === null
        ? "Approche un PNJ et klaxonne avec H."
        : CAST[this.active].hint;
    document
      .querySelectorAll("[data-cast]")
      .forEach((el) =>
        el.classList.toggle(
          "recruited",
          this.recruited.includes(Number(el.dataset.cast)),
        ),
      );
  }
}
