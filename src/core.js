'use strict';
// ================= UTILITIES =================
const TAU = Math.PI * 2;
const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
const randi = (a, b) => Math.floor(a + Math.random() * (b - a + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const angDiff = (a, b) => { let d = (b - a) % TAU; if (d > Math.PI) d -= TAU; else if (d < -Math.PI) d += TAU; return d; };
const turnToward = (a, b, max) => a + clamp(angDiff(a, b), -max, max);
const dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
const dist2 = (ax, ay, bx, by) => { const dx = bx - ax, dy = by - ay; return dx * dx + dy * dy; };
function shuffleArr(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay, l = dx * dx + dy * dy;
  let t = l ? ((px - ax) * dx + (py - ay) * dy) / l : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), py - (ay + dy * t));
}
function hexA(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
function weighted(items, wf) { let tot = 0; for (const it of items) tot += wf(it); let r = Math.random() * tot; for (const it of items) { r -= wf(it); if (r <= 0) return it; } return items[items.length - 1]; }
const Store = {
  get(k, d) { try { const v = localStorage.getItem('sigilblade_' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('sigilblade_' + k, JSON.stringify(v)); } catch (e) { } }
};

// ================= GLOW SPRITES =================
const _glow = new Map();
function glowTex(col) {
  let c = _glow.get(col); if (c) return c;
  c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, hexA(col, 1)); gr.addColorStop(0.2, hexA(col, 0.6)); gr.addColorStop(0.5, hexA(col, 0.16)); gr.addColorStop(1, hexA(col, 0));
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); _glow.set(col, c); return c;
}
function drawGlow(ctx, x, y, r, col, a = 1) { if (a <= 0 || r <= 0) return; ctx.globalAlpha = Math.min(1, a); ctx.drawImage(glowTex(col), x - r, y - r, r * 2, r * 2); }

// ================= AUDIO =================
const AudioSys = {
  ctx: null, master: null, sfx: null, mus: null, rev: null, noiseBuf: null,
  sfxOn: Store.get('sfx', true), musicOn: Store.get('music', true), last: {},
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => { }); return; }
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const c = this.ctx = new AC();
      const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 5; comp.attack.value = 0.002; comp.release.value = 0.18;
      comp.connect(c.destination);
      this.master = c.createGain(); this.master.gain.value = 0.75; this.master.connect(comp);
      this.sfx = c.createGain(); this.sfx.gain.value = this.sfxOn ? 0.9 : 0; this.sfx.connect(this.master);
      this.mus = c.createGain(); this.mus.gain.value = this.musicOn ? 0.34 : 0; this.mus.connect(this.master);
      const conv = c.createConvolver(); const len = Math.floor(c.sampleRate * 1.9); const ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.8); }
      conv.buffer = ir; this.rev = c.createGain(); this.rev.gain.value = 0.3; this.rev.connect(conv); conv.connect(this.master);
      const nb = c.createBuffer(1, c.sampleRate, c.sampleRate); const nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1; this.noiseBuf = nb;
      if (c.state === 'suspended') c.resume().catch(() => { });
      Music.start();
    } catch (e) { this.ctx = null; }
  },
  setSfx(on) { this.sfxOn = on; Store.set('sfx', on); if (this.sfx) this.sfx.gain.value = on ? 0.9 : 0; },
  setMusic(on) { this.musicOn = on; Store.set('music', on); if (this.mus) this.mus.gain.value = on ? 0.34 : 0; },
  ok(name, gap) { if (!this.ctx || !this.sfxOn) return false; const now = this.ctx.currentTime; if (this.last[name] && now - this.last[name] < gap) return false; this.last[name] = now; return true; },
  osc({ type = 'sine', f = 440, f2 = 0, t = 0.2, v = 0.2, a = 0.004, delay = 0, rev = 0, filt = 0, fq = 1, ft = 'lowpass', out }) {
    const c = this.ctx, t0 = c.currentTime + Math.max(0, delay);
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(1, f2), t0 + t);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    let node = o; if (filt) { const bq = c.createBiquadFilter(); bq.type = ft; bq.frequency.value = filt; bq.Q.value = fq; o.connect(bq); node = bq; }
    node.connect(g); g.connect(out || this.sfx);
    if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.rev); }
    o.start(t0); o.stop(t0 + t + 0.05);
  },
  noise({ t = 0.2, v = 0.2, f = 1000, f2 = 0, q = 1, type = 'bandpass', a = 0.003, delay = 0, rev = 0, out }) {
    const c = this.ctx, t0 = c.currentTime + Math.max(0, delay);
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const bq = c.createBiquadFilter(); bq.type = type; bq.frequency.setValueAtTime(f, t0); if (f2) bq.frequency.exponentialRampToValueAtTime(f2, t0 + t); bq.Q.value = q;
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, v), t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + t);
    s.connect(bq); bq.connect(g); g.connect(out || this.sfx);
    if (rev) { const rg = c.createGain(); rg.gain.value = rev; g.connect(rg); rg.connect(this.rev); }
    s.start(t0, Math.random() * 0.5); s.stop(t0 + t + 0.05);
  },
  play(name, p = 1) { const fn = SFX[name]; if (fn && this.ctx && this.sfxOn && this.ctx.state === 'running') { try { fn(this, p); } catch (e) { } } }
};

const SFX = {
  swing(A, p = 1) { if (!A.ok('swing', 0.03)) return; A.noise({ t: 0.14, v: 0.16 * p, f: 2600, f2: 700, q: 0.9 }); },
  heavy(A) { if (!A.ok('heavy', 0.05)) return; A.noise({ t: 0.24, v: 0.26, f: 1800, f2: 280, q: 0.7 }); A.osc({ type: 'sine', f: 130, f2: 48, t: 0.2, v: 0.2 }); },
  hit(A, p = 1) { if (!A.ok('hit', 0.028)) return; A.osc({ type: 'sine', f: 190 * rand(0.9, 1.1), f2: 55, t: 0.13, v: 0.3 * p }); A.noise({ t: 0.07, v: 0.22 * p, f: 2600, type: 'lowpass' }); },
  tick(A) { if (!A.ok('tick', 0.035)) return; A.osc({ type: 'triangle', f: 900 * rand(0.9, 1.1), f2: 300, t: 0.05, v: 0.05 }); },
  crit(A) { if (!A.ok('crit', 0.04)) return; A.osc({ type: 'square', f: 1400, f2: 500, t: 0.09, v: 0.06, filt: 3000 }); A.osc({ type: 'sine', f: 240, f2: 60, t: 0.16, v: 0.34 }); A.noise({ t: 0.1, v: 0.24, f: 5000, type: 'highpass' }); },
  sigil(A) { if (!A.ok('sigil', 0.05)) return; A.osc({ type: 'sine', f: 520 * rand(0.95, 1.05), f2: 1100, t: 0.08, v: 0.045 }); },
  clang(A, p = 1) {
    if (!A.ok('clang', 0.03)) return; const k = rand(0.94, 1.07);
    [[1180, 0.22], [1734, 0.14], [2532, 0.11], [3389, 0.08], [4920, 0.05]].forEach(([f, v], i) => A.osc({ type: i % 2 ? 'triangle' : 'square', f: f * k, t: 0.32 + 0.28 * p - i * 0.03, v: v * 0.5 * p, a: 0.001, filt: 6500, rev: 0.55 }));
    A.noise({ t: 0.05, v: 0.42 * p, f: 4200, q: 0.8, a: 0.001 }); A.osc({ type: 'sine', f: 230, f2: 70, t: 0.12, v: 0.3 * p });
  },
  block(A) { if (!A.ok('block', 0.04)) return; [[620, 0.2], [930, 0.12], [1390, 0.08]].forEach(([f, v]) => A.osc({ type: 'triangle', f: f * rand(0.96, 1.04), t: 0.18, v, a: 0.001 })); A.noise({ t: 0.08, v: 0.24, f: 1800, q: 1 }); A.osc({ type: 'sine', f: 150, f2: 60, t: 0.12, v: 0.28 }); },
  eblock(A) { if (!A.ok('eblock', 0.05)) return; [[760, 0.12], [1140, 0.07]].forEach(([f, v]) => A.osc({ type: 'triangle', f: f * rand(0.95, 1.05), t: 0.14, v, a: 0.001 })); A.noise({ t: 0.05, v: 0.14, f: 2400, q: 1 }); },
  perilous(A) { if (!A.ok('perilous', 0.18)) return; A.osc({ type: 'sine', f: 98, t: 1.2, v: 0.32, a: 0.01, rev: 0.5 }); A.osc({ type: 'sine', f: 147, t: 1.0, v: 0.18, a: 0.01, rev: 0.5 }); A.osc({ type: 'triangle', f: 392, f2: 370, t: 0.55, v: 0.08, rev: 0.6 }); A.noise({ t: 0.32, v: 0.14, f: 300, f2: 900, q: 2 }); },
  dash(A) { if (!A.ok('dash', 0.05)) return; A.noise({ t: 0.17, v: 0.14, f: 3800, f2: 900, q: 0.6 }); },
  pop(A) { if (!A.ok('pop', 0.03)) return; A.noise({ t: 0.12, v: 0.18, f: 700, f2: 200, q: 1.2 }); A.osc({ type: 'triangle', f: 320, f2: 90, t: 0.14, v: 0.13 }); },
  boom(A, p = 1) { if (!A.ok('boom', 0.06)) return; const q = Math.min(1.3, p); A.noise({ t: 0.45 * q + 0.1, v: 0.4 * q, f: 1200, f2: 120, type: 'lowpass', a: 0.004 }); A.osc({ type: 'sine', f: 90, f2: 32, t: 0.4, v: 0.38 * q }); },
  zap(A) { if (!A.ok('zap', 0.05)) return; A.osc({ type: 'square', f: 1800, f2: 220, t: 0.12, v: 0.055, filt: 4000 }); A.noise({ t: 0.1, v: 0.12, f: 6000, type: 'highpass' }); },
  fire(A) { if (!A.ok('fire', 0.07)) return; A.noise({ t: 0.28, v: 0.12, f: 900, f2: 400, q: 0.8 }); },
  frost(A) { if (!A.ok('frost', 0.05)) return; A.osc({ type: 'triangle', f: 2100, f2: 2900, t: 0.1, v: 0.05 }); A.noise({ t: 0.06, v: 0.08, f: 7000, type: 'highpass' }); },
  shatter(A) { if (!A.ok('shatter', 0.06)) return; for (let i = 0; i < 4; i++) A.osc({ type: 'triangle', f: rand(1800, 4200), t: 0.25, v: 0.05, delay: i * 0.02 }); A.noise({ t: 0.2, v: 0.2, f: 5000, type: 'highpass' }); },
  pickup(A, p = 0) { if (!A.ok('pickup', 0.022)) return; A.osc({ type: 'sine', f: 880 + Math.min(p, 24) * 45, t: 0.07, v: 0.04 }); },
  rank(A) { [659, 988, 1318].forEach((f, i) => A.osc({ type: 'triangle', f, t: 0.22, v: 0.07, delay: i * 0.045, rev: 0.5 })); },
  rankdown(A) { A.osc({ type: 'sawtooth', f: 220, f2: 110, t: 0.25, v: 0.05 }); },
  flawless(A) { [784, 1175, 1568, 2349].forEach((f, i) => A.osc({ type: 'sine', f, t: 0.5, v: 0.08, delay: i * 0.05, rev: 0.8 })); },
  level(A) { [523, 659, 784, 1046, 1318].forEach((f, i) => A.osc({ type: 'triangle', f, t: 0.35, v: 0.09, delay: i * 0.07, rev: 0.4 })); },
  hurt(A) { if (!A.ok('hurt', 0.1)) return; A.osc({ type: 'sawtooth', f: 220, f2: 70, t: 0.25, v: 0.2, filt: 900 }); A.noise({ t: 0.15, v: 0.25, f: 900, type: 'lowpass' }); },
  ui(A) { if (!A.ok('ui', 0.03)) return; A.osc({ type: 'sine', f: 1250, t: 0.05, v: 0.06 }); },
  hover(A) { if (!A.ok('hover', 0.05)) return; A.osc({ type: 'sine', f: 1900, t: 0.03, v: 0.02 }); },
  buy(A) { A.osc({ type: 'triangle', f: 988, t: 0.12, v: 0.1 }); A.osc({ type: 'triangle', f: 1480, t: 0.22, v: 0.08, delay: 0.06 }); },
  deny(A) { A.osc({ type: 'square', f: 180, t: 0.12, v: 0.06, filt: 800 }); },
  fizzle(A) { if (!A.ok('fizzle', 0.2)) return; A.noise({ t: 0.15, v: 0.08, f: 3000, f2: 600 }); },
  break(A) { A.osc({ type: 'sine', f: 70, f2: 40, t: 0.6, v: 0.42 }); [[880, 0.18], [1320, 0.12], [1990, 0.08]].forEach(([f, v]) => A.osc({ type: 'square', f, t: 0.5, v: v * 0.5, filt: 5000, rev: 0.7 })); A.noise({ t: 0.3, v: 0.3, f: 2000, q: 0.6 }); },
  deathblow(A) { A.osc({ type: 'sine', f: 62, f2: 28, t: 1, v: 0.6 }); A.noise({ t: 0.6, v: 0.42, f: 900, f2: 100, type: 'lowpass' }); A.osc({ type: 'sine', f: 2600, f2: 1100, t: 0.5, v: 0.08, rev: 0.8 }); [[700, 0.2], [1050, 0.14]].forEach(([f, v]) => A.osc({ type: 'triangle', f, t: 0.9, v, rev: 0.8 })); },
  mikiri(A) { A.osc({ type: 'sine', f: 1600, f2: 3200, t: 0.25, v: 0.08, rev: 0.6 }); A.noise({ t: 0.25, v: 0.2, f: 5000, f2: 1200, q: 0.5 }); A.osc({ type: 'sine', f: 110, f2: 50, t: 0.3, v: 0.4 }); },
  heal(A) { [440, 554, 659, 880].forEach((f, i) => A.osc({ type: 'sine', f, t: 0.4, v: 0.07, delay: i * 0.06, rev: 0.4 })); },
  gong(A) { A.osc({ type: 'sine', f: 82, t: 2.5, v: 0.45, a: 0.01, rev: 0.7 }); A.osc({ type: 'sine', f: 123, t: 2, v: 0.2, a: 0.01, rev: 0.7 }); A.osc({ type: 'sine', f: 207, t: 1.4, v: 0.1, rev: 0.7 }); },
  taiko(A) { A.osc({ type: 'sine', f: 130, f2: 48, t: 0.45, v: 0.6 }); A.noise({ t: 0.08, v: 0.2, f: 500, type: 'lowpass' }); },
  art(A) { A.osc({ type: 'triangle', f: 330, f2: 990, t: 0.25, v: 0.1, rev: 0.5 }); A.noise({ t: 0.3, v: 0.14, f: 2000, f2: 6000, q: 0.6 }); },
  ward(A) { A.osc({ type: 'triangle', f: 1600, f2: 400, t: 0.3, v: 0.1, rev: 0.5 }); },
  win(A) { [392, 523, 659, 784, 1046].forEach((f, i) => A.osc({ type: 'triangle', f, t: 0.9, v: 0.1, delay: i * 0.12, rev: 0.6 })); },
  death(A) { A.osc({ type: 'sine', f: 110, f2: 40, t: 2, v: 0.5, rev: 0.8 }); A.osc({ type: 'triangle', f: 220, f2: 110, t: 1.5, v: 0.12, rev: 0.8 }); },
  glint(A) { if (!A.ok('glint', 0.08)) return; A.osc({ type: 'sine', f: 3400, t: 0.08, v: 0.03 }); },
  coin(A) { if (!A.ok('coin', 0.04)) return; A.osc({ type: 'triangle', f: 1320, t: 0.08, v: 0.05 }); A.osc({ type: 'triangle', f: 1760, t: 0.1, v: 0.04, delay: 0.04 }); }
};

const Music = {
  timer: null, step: 0, next: 0, bpm: 96, intensity: 0, target: 0, idx: 3,
  scale: [0, 1, 5, 7, 8, 12, 13, 17, 19, 20, 24],
  start() { if (this.timer || !AudioSys.ctx) return; this.next = AudioSys.ctx.currentTime + 0.1; this.timer = setInterval(() => this.tick(), 25); },
  tick() {
    const A = AudioSys, c = A.ctx; if (!c || c.state !== 'running') return;
    if (!A.musicOn) { this.next = c.currentTime + 0.1; return; }
    const spb = 60 / this.bpm / 4; this.intensity += (this.target - this.intensity) * 0.03;
    if (this.next < c.currentTime - 0.2) this.next = c.currentTime + 0.05;
    while (this.next < c.currentTime + 0.15) { this.play(this.step, this.next - c.currentTime); this.next += spb; this.step = (this.step + 1) % 64; }
  },
  play(s, d) {
    const A = AudioSys, o = A.mus, I = this.intensity, b = s % 16;
    if (s % 32 === 0) { A.osc({ type: 'sine', f: 73.42, t: 5.5, v: 0.07, a: 1.2, delay: d, out: o }); A.osc({ type: 'sine', f: 110, t: 4.5, v: 0.03, a: 1.5, delay: d, out: o }); }
    if (I > 0.15) {
      if (b === 0 || b === 10) A.osc({ type: 'sine', f: 120, f2: 45, t: 0.4, v: 0.42 * I, delay: d, out: o });
      if (b === 8) A.osc({ type: 'sine', f: 180, f2: 85, t: 0.22, v: 0.26 * I, delay: d, out: o });
      if (I > 0.6 && (b === 3 || b === 6 || b === 14)) A.osc({ type: 'sine', f: 150, f2: 70, t: 0.18, v: 0.2 * I, delay: d, out: o });
      if (b % 4 === 2) A.noise({ t: 0.04, v: 0.03 * I, f: 7000, type: 'highpass', delay: d, out: o });
      if (b === 4 || b === 12) A.noise({ t: 0.05, v: 0.05 * I, f: 1800, q: 3, delay: d, out: o });
    }
    const mel = I > 0.6 ? (b % 2 === 0 && Math.random() < 0.35) : (b % 4 === 0 && Math.random() < (I > 0.15 ? 0.42 : 0.28));
    if (mel) {
      this.idx = clamp(this.idx + randi(-2, 2), 0, this.scale.length - 1);
      const f = 146.83 * Math.pow(2, this.scale[this.idx] / 12);
      A.osc({ type: 'triangle', f, t: 0.9, v: 0.065, a: 0.003, delay: d, out: o, filt: 2200 });
      A.osc({ type: 'sine', f: f * 2.005, t: 0.5, v: 0.022, delay: d, out: o });
    }
  }
};

// ================= INPUT =================
const Input = {
  held: {}, press: {}, mx: 0, my: 0,
  keymap: {
    KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
    KeyJ: 'attack', Space: 'guard', KeyK: 'guard', ShiftLeft: 'dash', ShiftRight: 'dash', KeyL: 'dash',
    KeyE: 'art', KeyQ: 'focus', KeyR: 'gourd', KeyF: 'gourd', KeyC: 'auto', Escape: 'pause', KeyP: 'pause', KeyM: 'mute'
  },
  down(a) { if (!this.held[a]) { this.held[a] = true; this.press[a] = G.clock; if (this.onPress) this.onPress(a); } },
  up(a) { this.held[a] = false; },
  isHeld(a) { return !!this.held[a]; },
  took(a, buf = 0.17) { const t = this.press[a]; if (t != null && G.clock - t <= buf) { this.press[a] = null; return true; } if (t != null && G.clock - t > buf) this.press[a] = null; return false; },
  clear() { this.held = {}; this.press = {}; },
  bind(canvas) {
    window.addEventListener('keydown', (e) => {
      const a = this.keymap[e.code]; if (!a) return;
      if (G.state === 'play' || a === 'pause') e.preventDefault();
      if (e.repeat) return; AudioSys.init(); this.down(a);
    });
    window.addEventListener('keyup', (e) => { const a = this.keymap[e.code]; if (a) this.up(a); });
    canvas.addEventListener('mousedown', (e) => { AudioSys.init(); if (e.button === 0) { e.preventDefault(); this.down('attack'); } });
    window.addEventListener('mouseup', (e) => { if (e.button === 0) this.up('attack'); });
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    window.addEventListener('mousemove', (e) => { this.mx = e.clientX; this.my = e.clientY; });
    window.addEventListener('blur', () => { this.held = {}; if (G.state === 'play') UI.pause(); });
  }
};
