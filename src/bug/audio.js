export class GameAudio {
  constructor() {
    this.enabled = false;
    this.context = null;
    this.voiceEnabled = true;
  }
  async enable() {
    if (!this.context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if (!Audio) return;
      this.context = new Audio();
      this.master = this.context.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.context.destination);
      this.analyser = this.context.createAnalyser();
      this.master.connect(this.analyser);
      this.engine = this.context.createOscillator();
      this.engine.type = "sawtooth";
      this.engineGain = this.context.createGain();
      this.engineGain.gain.value = 0;
      const filter = this.context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 280;
      this.engine.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.master);
      this.engine.start();
    }
    await this.context.resume();
    this.enabled = true;
    this.master.gain.setValueAtTime(0.22, this.context.currentTime);
    this.tone(140, 0.08, 0.2);
  }
  mute() {
    this.enabled = false;
    if (this.context) {
      this.master.gain.cancelScheduledValues(0);
      this.master.gain.value = 0;
    }
    window.speechSynthesis?.cancel();
  }
  tone(freq, duration = 0.12, volume = 0.2, shape = "sine") {
    if (!this.enabled) return;
    const c = this.context,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = shape;
    o.frequency.value = freq;
    g.gain.setValueAtTime(volume, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);
    o.connect(g);
    g.connect(this.master);
    o.start();
    o.stop(c.currentTime + duration + 0.03);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
    };
  }
  patch() {
    this.tone(90, 0.3, 0.6, "square");
    setTimeout(() => this.tone(160, 0.15, 0.3, "square"), 140);
  }
  pickup() {
    this.tone(520, 0.12, 0.3);
    setTimeout(() => this.tone(780, 0.2, 0.3), 100);
  }
  collision(power) {
    this.tone(
      45 + Math.random() * 35,
      0.13,
      Math.min(0.7, power / 20),
      "triangle",
    );
  }
  victory() {
    [330, 440, 660, 880].forEach((n, i) =>
      setTimeout(() => this.tone(n, 0.3, 0.3), i * 120),
    );
  }
  say(text) {
    if (!this.enabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "en-US";
    u.rate = 1.02;
    u.pitch = 0.65;
    u.volume = 0.65;
    const v = speechSynthesis
      .getVoices()
      .find(
        (v) =>
          v.lang.startsWith("en") && /male|David|Daniel|Mark/i.test(v.name),
      );
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  }
  update(speed, throttle, playing) {
    if (!this.context) return;
    const t = this.context.currentTime;
    this.engine.frequency.setTargetAtTime(
      40 + Math.abs(speed) * 3.4 + (throttle ? 12 : 0),
      t,
      0.08,
    );
    this.engineGain.gain.setTargetAtTime(
      this.enabled && playing ? 0.05 + (throttle ? 0.11 : 0.025) : 0,
      t,
      0.1,
    );
  }
}
