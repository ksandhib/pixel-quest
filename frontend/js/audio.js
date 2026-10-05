const cfg = Object.assign({ sound: 1, music: 1, diff: 1, screen: 0, touch: ('ontouchstart' in window) ? 1 : 0 }, (() => { try { return JSON.parse(localStorage.pq || '{}'); } catch (e) { return {}; } })());
const saveCfg = () => { try { localStorage.pq = JSON.stringify(cfg); } catch (e) {} };
const Audio_ = {
  ctx: null,
  beep(f, d, t = 'square', v = .08, s = 0) {
    if (!cfg.sound) return;
    try {
      const c = this.ctx || (this.ctx = new AudioContext()), o = c.createOscillator(), g = c.createGain();
      o.type = t; o.frequency.setValueAtTime(f, c.currentTime);
      if (s) o.frequency.exponentialRampToValueAtTime(s, c.currentTime + d);
      g.gain.setValueAtTime(v, c.currentTime); g.gain.exponentialRampToValueAtTime(.001, c.currentTime + d);
      o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + d);
    } catch (e) {}
  },
  play(n) {
    const B = (...a) => this.beep(...a), seq = (fs) => fs.forEach((f, i) => setTimeout(() => B(f, .2), i * 140));
    const m = { jump: () => B(300, .15, 'square', .08, 700), coin: () => { B(988, .08); setTimeout(() => B(1319, .2), 80); },
      enemy: () => B(200, .12, 'square', .1, 80), damage: () => B(150, .3, 'sawtooth', .1, 60), death: () => B(400, .8, 'triangle', .12, 50),
      win: () => seq([523, 659, 784, 1047]), select: () => B(660, .05), power: () => B(400, .4, 'square', .08, 1200) };
    if (m[n]) m[n]();
  },
  music() {
    clearInterval(this.mi); if (!cfg.music) return;
    let i = 0; const n = [262, 330, 392, 330, 294, 349, 440, 349];
    this.mi = setInterval(() => { if (G.scene === 'play') this.beep(n[i++ % 8] / 2, .18, 'triangle', .04); }, 220);
  }
};
