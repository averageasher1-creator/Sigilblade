// ================= ENEMIES =================
// Attacks are honest: the danger zone is drawn exactly where it will hit, and resolves the instant it fills.
let EID = 1;
function blinkFx(x0, y0, x1, y1, col) {
  const a = Math.atan2(y1 - y0, x1 - x0), L = Math.hypot(x1 - x0, y1 - y0);
  for (let k = 0; k <= 5; k++) ghostFx(lerp(x0, x1, k / 5), lerp(y0, y1, k / 5), a, col);
  if (L > 20) cutLine((x0 + x1) / 2, (y0 + y1) / 2, a, L, col, 0.2, 2.5);
  ring(x0, y0, 6, 46, col, 0.25, 3); ring(x1, y1, 6, 62, col, 0.3, 3); sparks(x1, y1, 12, col, { max: 420 }); addLight(x1, y1, 180, col, 0.25, 0.7);
}
function expandSteps(steps) { const out = []; for (const s of steps) { if (s.branch) out.push(...expandSteps(pick(s.branch))); else out.push(s); } return out; }
const MELEE_SHAPES = { slash: 1, thrust: 1, slam: 1 };
class Enemy {
  constructor(type, x, y, o = {}) {
    const d = o.def || ENEMIES[type]; this.type = type; this.d = d; this.id = EID++;
    this.x = x; this.y = y; this.kx = 0; this.ky = 0; this.mvx = 0; this.mvy = 0;
    this.elite = !!o.elite; this.summoned = !!o.summoned;
    const sc = G.scale;
    this.r = d.r * (this.elite ? 1.3 : 1);
    this.maxHp = (o.hp || d.hp * sc.hp * (this.elite ? 4.5 : 1)) * (1 + G.S.enemyHp / 100); this.hp = this.maxHp;
    this.maxPosture = d.post * sc.post * (this.elite ? 2 : 1); this.posture = 0; this.postT = 0;
    this.dmgMul = sc.dmg * (this.elite ? 1.25 : 1);
    this.speed = d.speed * rand(0.94, 1.06) * (this.elite ? 1.06 : 1) * (sc.speed || 1);
    this.wMul = sc.windup; this.cdMul = 1; this.exposeT = 0; this.vanishT = 0; this.air = null; this.stepHit = false;
    this.affixes = o.affixes || []; this.twin = !!o.twin;
    for (const a of this.affixes) {
      if (a === 'swift') { this.speed *= 1.35; this.wMul *= 0.85; }
      if (a === 'frenzied') { this.wMul *= 0.85; this.cdMul = 0.45; }
      if (a === 'armored') this.armored = true;
      if (a === 'warded') this.warded = true;
    }
    if (o.scaleR) this.r *= o.scaleR;
    this.state = 'move'; this.t = 0; const P = G.player; this.face = Math.atan2(P.y - y, P.x - x);
    this.cd = rand(0.3, 0.9); this.combo = null; this.ci = 0; this.step = null; this.token = null;
    this.st = { burn: 0, burnT: 0, burnAcc: 0, chill: 0, chillT: 0, frozen: 0, shock: 0, bleed: 0, bleedT: 0, stun: 0 };
    this.flash = 0; this.anim = rand(0, 10); this.blockCount = 0; this.strafe = Math.random() < 0.5 ? 1 : -1; this.invuln = 0;
    this.spawning = 0; this.blockFlash = 0; this.windTotal = 1; this.counterReady = false; this.dash = null; this.hitShake = 0; this.squash = 0;
    let pr = 1e9; for (const a of d.atks) { if (a.far) continue; pr = Math.min(pr, this.atkReach(a)); } this.prefReach = pr === 1e9 ? 60 : pr;
  }
  get isBoss() { return false; }
  get heavy() { return !!(this.d.heavy || this.elite || this.isBoss); }
  get untargetable() { return this.vanishT > 0 || !!this.air; }
  expose(t) { if (this.dead) return; this.exposeT = Math.max(this.exposeT, t * (hasR('hunterseye') ? 1.6 : 1)); }
  atkReach(a) {
    const s = a.steps[0];
    switch (s.shape) {
      case 'slash': return s.range * 0.95;
      case 'thrust': return s.len * 0.85;
      case 'slam': return s.radius * 0.8;
      case 'leap': return s.reach || 440;
      case 'teleport': case 'summon': case 'clone': return 3000;
      default: return 640;
    }
  }
  addPosture(v) {
    if (this.state === 'broken' || this.dead || this.state === 'intro') return;
    this.posture += v * (this.lastStand ? 3 : 1); this.postT = this.isBoss ? 1.0 : 1.6;
    if (this.posture >= this.maxPosture) breakEnemy(this);
  }
  flinch(t) {
    if (this.state === 'move' || (this.state === 'windup' && this.t > this.windTotal * 0.3)) { this.cancelAttack(); this.state = 'stagger'; this.t = t; }
  }
  onParried(fromX, fromY) {
    if (this.dead || this.state === 'broken' || this.state === 'intro') return;
    const last = !this.combo || this.ci >= this.combo.length - 1;
    this.comboDef = (this.comboDef || 0) + 1;
    // deflected the whole string: the attacker is left wide open
    if (this.heavy && last && this.combo && this.comboMelee >= 2 && this.comboDef >= this.comboMelee) { flawless(this); return; }
    if (!this.heavy) {
      this.cancelAttack(); this.state = 'stagger'; this.t = 0.6; this.expose(1.2);
      const a = Math.atan2(this.y - fromY, this.x - fromX); this.kx += Math.cos(a) * 320; this.ky += Math.sin(a) * 320;
    } else if (last) this.expose(this.isBoss ? 0.6 : 0.85);
  }
  cancelAttack() {
    if (this.state === 'windup' || this.state === 'active' || this.state === 'recover') { this.state = 'move'; this.cd = rand(0.3, 0.7); }
    this.combo = null; this.dash = null; this.air = null; this.releaseToken();
  }
  getToken() {
    if (this.d.noToken || this.isBoss) return true;
    const kind = this.d.ranged ? 'ranged' : 'melee';
    if (G.tokens[kind] < G.maxTokens[kind]) { G.tokens[kind]++; this.token = kind; return true; }
    return false;
  }
  releaseToken() { if (this.token) { G.tokens[this.token] = Math.max(0, G.tokens[this.token] - 1); this.token = null; } }
  canBlock(h) {
    if (h.spectral) return false;
    if (this.state === 'broken' || this.st.frozen > 0 || this.st.stun > 0 || this.state === 'stagger' || this.state === 'intro') return false;
    if (this.stanceT > 0) return h.src === 'blade';
    const sx = h.sx ?? G.player.x, sy = h.sy ?? G.player.y;
    const da = Math.abs(angDiff(this.face, Math.atan2(sy - this.y, sx - this.x)));
    if (this.d.guard === 'front') return da < 1.1 && this.state !== 'active';
    if (this.d.block && (this.state === 'move' || (this.isBoss && this.state === 'recover')) && da < 1.7) return Math.random() < (h.src === 'blade' ? this.d.block : this.d.block * 0.4);
    return false;
  }
  onBlocked(h) {
    const blade = h.src === 'blade';
    if (this.stanceT > 0 && blade) { this.addPosture((h.post || h.dmg * 0.5) * 0.12); this.blockFlash = 0.18; sparks(this.x, this.y, 14, '#f2b544', { max: 480 }); AudioSys.play('block'); hitstop(0.05); this.stanceCounter(); return; }
    this.addPosture((h.post || h.dmg * 0.5) * (this.isBoss ? 0.12 : this.elite ? 0.5 : this.d.guard === 'front' ? 0.45 : 0.75));
    this.blockFlash = 0.18;
    const sx = h.sx ?? G.player.x, sy = h.sy ?? G.player.y; const a = Math.atan2(sy - this.y, sx - this.x);
    const cx = this.x + Math.cos(a) * this.r, cy = this.y + Math.sin(a) * this.r;
    sparks(cx, cy, blade ? 10 : 5, '#cfe3ff', { ang: a, spread: 1.1, min: 140, max: 460 });
    AudioSys.play(blade ? 'block' : 'eblock');
    if (blade) { hitstop(0.03); kick(a, 3); if (Math.random() < 0.4) callout(cx, cy - 16, 'GUARDED', '#a9c4ff', 13, 0.45, { serif: false, pop: 0, rise: 14 }); }
    if (this.d.counter && blade) { this.blockCount++; if (this.blockCount >= this.d.counter) { this.blockCount = 0; this.counterReady = true; } }
  }
  stanceCounter() {
    this.stanceT = 0; const ss = this.stanceStep || {};
    this.combo = [SL(ss.counterW || 0.28, { range: 114, arc: 2.6, dmg: 16, post: 40, approach: 0.8 }), SL(0.3, { range: 106, arc: 2.4, dmg: 13, post: 32, approach: 0.5, recover: 0.75, expose: 0.9 })];
    this.ci = 0; this.comboMelee = 2; this.comboDef = 0; this.dash = null; this.startStep();
    callout(this.x, this.y - this.r - 30, 'COUNTER-CUT', '#ff9a3a', 18, 0.7, { serif: false });
  }
  pickAttack(dd) {
    const opts = this.d.atks.filter(a => dd <= this.atkReach(a) && (!a.far || dd > 170));
    return opts.length ? weighted(opts, a => a.w) : null;
  }
  startCombo(atk, speedMul = 1) { this.combo = expandSteps(atk.steps);
    if (this.aspects && this.combo.some(st => st.shape === 'slash' || st.shape === 'thrust')) {
      if (this.aspects.includes('relentless')) { const last = this.combo[this.combo.length - 1]; this.combo.push(SL(0.3, { range: Math.max(96, (last.range || 100)), arc: 2.3, dmg: 11, post: 30, approach: 0.5, recover: 0.65 })); }
      if (this.aspects.includes('thunderclap') && Math.random() < 0.45) this.combo.push({ shape: 'shot', style: 'star', count: 3, spread: 0.22, speed: 620, windup: 0.36, dmg: 8, post: 26, recover: 0.55 });
    } this.ci = 0; this.comboSpeed = speedMul; this.comboDef = 0; this.comboMelee = this.combo.filter(s => MELEE_SHAPES[s.shape] && !s.perilous).length; this.startStep(); }
  startStep() {
    const s = this.combo[this.ci]; this.step = s; this.state = 'windup'; this.cue = false; this.stepHit = false; this.feinted = false; if (s.shape === 'breath') this.breathDir = Math.random() < 0.5 ? 1 : -1;
    let w = s.windup * this.wMul * (this.comboSpeed || 1) * (this.isBoss ? 1 : 1 - 0.12 * (G.frenzy || 0)); if (s.wvar) w *= Math.max(0.55, 1 + rand(-s.wvar * 0.6, s.wvar));
    if (MELEE_SHAPES[s.shape] && !s.perilous && !this.isBoss) {
      let tHit = G.clock + w, tries = 0;
      while (tries++ < 6 && G.hitTimes.some(t => Math.abs(t - tHit) < 0.2)) tHit += 0.2;
      w = tHit - G.clock; G.hitTimes.push(tHit);
    }
    this.t = w; this.windTotal = w; this.mvx = this.mvy = 0; this.lockT = Math.min(0.24, w * 0.45);
    if (s.perilous) { AudioSys.play('perilous'); ring(this.x, this.y, this.r, this.r * 2.6, '#ff3b3b', 0.35, 3); }
  }
  endCombo() {
    this.state = 'move'; this.combo = null; this.releaseToken();
    this.cd = rand(this.d.cd ? this.d.cd[0] : 0.5, this.d.cd ? this.d.cd[1] : 1.1) * (this.isBoss ? (this.lastStand ? 0.32 : this.phase > 1 ? 0.42 : 0.58) : 1) * this.cdMul;
    if (this.counterReady) { this.counterReady = false; this.cd = 0.05; this.forceCounter = true; }
  }
  hitPlayer(s, x = this.x, y = this.y) {
    const r = resolveHitOnPlayer({ src: this, dmg: s.dmg * this.dmgMul, post: (s.post || 0) * G.scale.ppost, perilous: s.perilous, x, y, step: s });
    if (r === 'hit') { this.stepHit = true; if (this.affixes.includes('vampiric')) { this.hp = Math.min(this.maxHp, this.hp + this.maxHp * 0.15); sparks(this.x, this.y, 8, '#d2143a'); } }
    return r;
  }
  activate(dd, ang) {
    const s = this.step, P = G.player; this.state = 'active'; this.t = s.active ?? 0.1;
    const fx = Math.cos(this.face), fy = Math.sin(this.face);
    const col = s.perilous ? '#ff4a3a' : '#fff4d8';
    switch (s.shape) {
      case 'slash': {
        const fa = this.face + (s.off || 0);
        slashFx(this.x, this.y, fa, s.arc, s.range, col, this.swingSide = -(this.swingSide || 1), 0.14, 1.1);
        AudioSys.play('swing', 0.75);
        const da = Math.abs(angDiff(fa, Math.atan2(P.y - this.y, P.x - this.x)));
        if (dd <= s.range + P.r && (da <= s.arc / 2 + Math.asin(Math.min(1, P.r / Math.max(dd, 1))) || dd < this.r + P.r)) this.hitPlayer(s);
        this.squash = 0.12;
        if (this.aspects && this.aspects.includes('ashen')) { const ax = clamp(this.x + Math.cos(fa) * s.range * 0.6, 20, G.ARENA.w - 20), ay = clamp(this.y + Math.sin(fa) * s.range * 0.6, 20, G.ARENA.h - 20); G.hazards.push({ k: 'ground', x: ax, y: ay, r: 74, t: 0, delay: 0.7, dmg: s.dmg * this.dmgMul * 0.7, post: 0, perilous: true, src: this }); }
        if (s.mirror) { const mx = clamp(2 * P.x - this.x, 20, G.ARENA.w - 20), my = clamp(2 * P.y - this.y, 20, G.ARENA.h - 20); G.hazards.push({ k: 'zone', shape: 'slash', x: mx, y: my, ang: Math.atan2(P.y - my, P.x - mx), range: s.range, arc: s.arc, t: 0, delay: s.mirror, dmg: s.dmg * this.dmgMul * 0.9, post: s.post, perilous: false, src: this, mirrorCut: true }); ghostFx(mx, my, Math.atan2(P.y - my, P.x - mx), this.d.accent || '#ff3a5a'); }
        const echoT = s.echo || (this.aspects && this.aspects.includes('echoing') ? 0.45 : 0);
        if (echoT) G.hazards.push({ k: 'zone', shape: 'slash', x: this.x, y: this.y, ang: fa, range: s.range, arc: s.arc, t: 0, delay: echoT, dmg: s.dmg * this.dmgMul * 0.8, post: s.post, perilous: false, src: this });
        break;
      }
      case 'thrust': {
        const ta = this.face + (s.off || 0), fx = Math.cos(ta), fy = Math.sin(ta);
        const rx = P.x - this.x, ry = P.y - this.y; const along = rx * fx + ry * fy, perp = Math.abs(-rx * fy + ry * fx);
        const inside = along >= -P.r && along <= s.len + P.r && perp <= s.width / 2 + P.r;
        let res = null; if (inside) res = this.hitPlayer(s);
        let travel = s.len * 0.85; if (inside) travel = Math.max(0, Math.min(travel, along - this.r - P.r));
        travel = Math.min(travel, this.clearance(fx, fy, travel));
        if (!s.noDash) this.dash = { vx: fx * travel / this.t, vy: fy * travel / this.t };
        cutLine(this.x + fx * s.len / 2, this.y + fy * s.len / 2, ta, s.len, s.iaido ? '#ffe6a0' : col, s.iaido ? 0.35 : 0.2, s.iaido ? 5 : 3);
        AudioSys.play(s.iaido ? 'heavy' : 'swing', 0.85); if (s.iaido) { screenFlash('#ffffff', 0.12); shake(5); }
        break;
      }
      case 'slam': {
        ring(this.x, this.y, this.r, s.radius, col, 0.3, 6); sparks(this.x, this.y, 14, col, { min: 200, max: 520 });
        if (s.fire) for (let i = 0; i < 22; i++) { const a = rand(0, TAU), r = rand(20, s.radius); embers(this.x + Math.cos(a) * r, this.y + Math.sin(a) * r, 1, '#ff6a2a', { rise: 40 }); }
        if (s.selfDestruct) {
          explosionFx(this.x, this.y, s.radius, '#ff6a3a');
          for (const o of G.enemies) { if (o === this || o.dead || o.spawning) continue; if (dist(o.x, o.y, this.x, this.y) < s.radius + o.r) damageEnemy(o, { dmg: s.dmg * 2, post: 20, src: 'blast', unblockable: true }); }
          if (dd < s.radius + P.r) this.hitPlayer(s);
          this.selfKill = true; this.hp = 0; killEnemy(this, {}); return;
        }
        AudioSys.play('heavy'); shake(4);
        if (dd < s.radius + P.r) this.hitPlayer(s);
        if (s.lightning) lightningFx([[this.x + rand(-30, 30), this.y - 520], [this.x + rand(-20, 20), this.y - 240], [this.x, this.y]], '#9fd8ff', 0.25, 5);
        if (s.shock) { const sx = this.x, sy = this.y; for (let k = 0; k < s.shock; k++) later(0.18 + k * 0.26, () => { if (this.dead) return; G.hazards.push({ k: 'ring', x: sx, y: sy, rad: s.radius * 0.6, speed: 360, thick: 14, max: 560, dmg: s.dmg * 0.6 * this.dmgMul, post: 24, perilous: false, src: this, hit: false, t: 0 }); shake(2); AudioSys.play('taiko', 0.6); }); this.t = Math.max(this.t, 0.18 + s.shock * 0.26); }
        break;
      }
      case 'shot': enemyShoot(this, s, this.face); break;
      case 'lob': {
        if (s.pattern === 'grid') {
          const skip = randi(0, 8); let k = 0;
          for (let gy = -1; gy <= 1; gy++) for (let gx = -1; gx <= 1; gx++, k++) { if (k === skip) continue; const x = clamp(P.x + gx * 118, 20, G.ARENA.w - 20), y = clamp(P.y + gy * 118, 20, G.ARENA.h - 20); G.hazards.push({ k: 'ground', x, y, r: s.radius, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: s.perilous, src: this, lightning: s.lightning }); }
          break;
        }
        if (s.pattern === 'circle') {
          const base = rand(0, TAU);
          for (let k = 0; k < s.count; k++) { const a = base + k / s.count * TAU; const x = clamp(P.x + Math.cos(a) * s.ringR, 20, G.ARENA.w - 20), y = clamp(P.y + Math.sin(a) * s.ringR, 20, G.ARENA.h - 20);
            G.hazards.push({ k: 'ground', x, y, r: s.radius, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: true, src: this });
            if (s.reignite) G.hazards.push({ k: 'ground', x, y, r: s.radius * 1.1, t: 0, delay: s.delay + s.reignite, dmg: s.dmg * this.dmgMul * 0.8, post: 0, perilous: true, src: this, ember: true }); }
          AudioSys.play('art'); break;
        }
        if (s.pattern === 'chase') {
          for (let k = 0; k < s.count; k++) later(k * s.stagger, () => { if (this.dead) return; const Q = G.player; G.hazards.push({ k: 'ground', x: clamp(Q.x + Q.vx * 0.15, 20, G.ARENA.w - 20), y: clamp(Q.y + Q.vy * 0.15, 20, G.ARENA.h - 20), r: s.radius, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: s.perilous, src: this, lightning: s.lightning }); });
          this.t = s.count * s.stagger; break;
        }
        const n = s.count || 1;
        for (let k = 0; k < n; k++) {
          const sc = s.scatter || 0; const x = clamp(P.x + P.vx * 0.2 + (k ? rand(-sc, sc) : 0), 20, G.ARENA.w - 20), y = clamp(P.y + P.vy * 0.2 + (k ? rand(-sc, sc) : 0), 20, G.ARENA.h - 20);
          G.hazards.push({ k: 'ground', x, y, r: s.radius, t: 0, delay: s.delay + k * 0.06, dmg: s.dmg * this.dmgMul, post: s.post || 0, perilous: s.perilous, src: this, lightning: s.lightning });
          if (s.reignite) G.hazards.push({ k: 'ground', x, y, r: s.radius * 1.1, t: 0, delay: s.delay + k * 0.06 + s.reignite, dmg: s.dmg * this.dmgMul * 0.8, post: 0, perilous: true, src: this, ember: true });
        }
        break;
      }
      case 'spikes': {
        const a = Math.atan2(P.y - this.y, P.x - this.x);
        for (let i = 0; i < s.n; i++) {
          const d = this.r + (i + 1) * s.gapD; const x = this.x + Math.cos(a) * d, y = this.y + Math.sin(a) * d;
          if (x < 0 || y < 0 || x > G.ARENA.w || y > G.ARENA.h) break;
          G.hazards.push({ k: 'ground', x, y, r: s.radius, t: 0, delay: s.delay + i * s.stagger, dmg: s.dmg * this.dmgMul, post: 0, perilous: s.perilous, src: this, spike: true });
        }
        break;
      }
      case 'ring': G.hazards.push({ k: 'ring', x: this.x, y: this.y, rad: this.r, speed: s.speed, thick: s.thick, max: s.max, dmg: s.dmg * this.dmgMul, post: s.post || 0, perilous: s.perilous !== false, src: this, hit: false, t: 0 }); AudioSys.play('boom', 0.6); break;
      case 'drum': {
        let acc = 0;
        for (let i = 0; i < s.n; i++, acc += s.gaps ? s.gaps[(i - 1 + s.gaps.length) % s.gaps.length] : s.gap) later(acc, () => {
          if (this.dead || this.state === 'broken') return;
          G.hazards.push({ k: 'ring', x: this.x, y: this.y, rad: this.r, speed: s.speed, thick: s.thick, max: s.max, dmg: s.dmg * this.dmgMul, post: s.post, perilous: false, src: this, hit: false, t: 0, drum: true });
          AudioSys.play('taiko'); ring(this.x, this.y, this.r, this.r * 1.8, '#ffe27a', 0.25, 5); shake(2); this.squash = 0.1;
        });
        this.t = (s.gaps ? s.gaps.slice(0, s.n - 1).reduce((x, y) => x + y, 0) : s.gap * (s.n - 1)) + 0.15; break;
      }
      case 'leap': {
        const tx = clamp(P.x + P.vx * 0.15, this.r, G.ARENA.w - this.r), ty = clamp(P.y + P.vy * 0.15, this.r, G.ARENA.h - this.r);
        this.air = { t: 0, dur: s.air, x0: this.x, y0: this.y, x1: tx, y1: ty }; this.t = s.air; this.invuln = s.air;
        AudioSys.play('dash'); sparks(this.x, this.y, 10, '#ffffff', { max: 300 }); ring(this.x, this.y, this.r, this.r * 2, '#ffffff', 0.25, 3);
        break;
      }
      case 'retreat': {
        const a = Math.atan2(this.y - P.y, this.x - P.x); const d = Math.min(s.dist, this.clearance(Math.cos(a), Math.sin(a), s.dist)); this.t = 0.16;
        this.dash = { vx: Math.cos(a) * d / this.t, vy: Math.sin(a) * d / this.t }; for (let i = 0; i < 3; i++) ghostFx(this.x, this.y, a, this.d.col); AudioSys.play('dash');
        break;
      }
      case 'xcuts': {
        const total = s.n * s.stagger + s.delay + 0.25; this.vanishT = total; this.invuln = total; this.t = total; this.releaseToken();
        sparks(this.x, this.y, 16, this.d.accent || '#ffffff', { max: 500 }); ring(this.x, this.y, this.r, this.r * 3, '#ffffff', 0.3, 4); AudioSys.play('mikiri');
        for (let i = 0; i < s.n; i++) later(i * s.stagger, () => {
          if (this.dead) return; const Q = G.player; const a = rand(0, Math.PI); const cx = Q.x + rand(-26, 26), cy = Q.y + rand(-26, 26);
          G.hazards.push({ k: 'zone', shape: 'line', x: cx - Math.cos(a) * s.len / 2, y: cy - Math.sin(a) * s.len / 2, ang: a, len: s.len, width: s.width, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: s.perilous, src: this });
        });
        later(total - 0.05, () => { if (this.dead) return; const Q = G.player; const a = rand(0, TAU); this.x = clamp(Q.x + Math.cos(a) * 170, 40, G.ARENA.w - 40); this.y = clamp(Q.y + Math.sin(a) * 170, 40, G.ARENA.h - 40); this.face = Math.atan2(Q.y - this.y, Q.x - this.x); ring(this.x, this.y, 6, 70, '#ffffff', 0.3, 4); sparks(this.x, this.y, 14, this.d.accent || '#fff'); });
        break;
      }
      case 'drop': {
        const total = (s.n - 1) * s.gap + s.delay + 0.1; this.vanishT = total; this.invuln = total; this.t = total; this.releaseToken();
        ring(this.x, this.y, this.r, this.r * 2.5, '#ffffff', 0.3, 4); AudioSys.play('dash');
        let last = null;
        for (let i = 0; i < s.n; i++) later(i * s.gap, () => {
          if (this.dead) return; const Q = G.player; const h = { k: 'ground', x: clamp(Q.x + Q.vx * 0.2, 30, G.ARENA.w - 30), y: clamp(Q.y + Q.vy * 0.2, 30, G.ARENA.h - 30), r: s.radius, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: s.perilous, src: this, drop: i === s.n - 1 ? this : null };
          G.hazards.push(h); last = h;
        });
        later(total - 0.05, () => { if (this.dead || !last) return; this.x = last.x; this.y = last.y; shake(10); ring(this.x, this.y, this.r, 160, '#ffffff', 0.35, 6); });
        break;
      }
      case 'web': {
        if (s.pattern === 'cage') { const base = rand(0, TAU); for (let i = 0; i < s.n; i++) { const a = base + i / s.n * TAU; G.hazards.push({ k: 'web', x: clamp(P.x + Math.cos(a) * s.ringR, 40, G.ARENA.w - 40), y: clamp(P.y + Math.sin(a) * s.ringR, 40, G.ARENA.h - 40), r: s.radius, t: 0, life: s.life }); } AudioSys.play('swing', 0.6); callout(P.x, P.y - 60, 'SILK CAGE', '#e8e4f0', 16, 0.7, { serif: false }); break; }
        for (let i = 0; i < s.n; i++) { const a = rand(0, TAU), d = i === 0 ? 0 : rand(70, 150); G.hazards.push({ k: 'web', x: clamp(P.x + Math.cos(a) * d, 40, G.ARENA.w - 40), y: clamp(P.y + Math.sin(a) * d, 40, G.ARENA.h - 40), r: s.radius, t: 0, life: s.life }); }
        AudioSys.play('swing', 0.6); break;
      }
      case 'illusion': {
        const base = rand(0, TAU);
        for (let i = 0; i < s.n; i++) { const a = base + i / s.n * TAU; const x = clamp(P.x + Math.cos(a) * 200, 40, G.ARENA.w - 40), y = clamp(P.y + Math.sin(a) * 200, 40, G.ARENA.h - 40); const c = new Enemy('foxclone', x, y, { summoned: true, hp: 1 }); c.dmgMul = this.dmgMul * 0.7; c.cd = rand(0.2, 0.8); G.enemies.push(c); ring(x, y, 6, 50, '#ffb36a', 0.35, 3); }
        const a = base + Math.PI / s.n; this.x = clamp(P.x + Math.cos(a) * 200, 40, G.ARENA.w - 40); this.y = clamp(P.y + Math.sin(a) * 200, 40, G.ARENA.h - 40); ring(this.x, this.y, 6, 50, '#ffb36a', 0.35, 3);
        callout(P.x, P.y - 60, 'ILLUSIONS', '#ffb36a', 18, 0.8); AudioSys.play('art'); break;
      }
      case 'spiral': {
        for (let i = 0; i < s.n; i++) { const a = this.face + (i / s.n) * TAU; makeProj({ team: 'e', owner: this, style: 'orb', x: this.x + Math.cos(a) * this.r, y: this.y + Math.sin(a) * this.r, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 8, life: 3.5, dmg: s.dmg * this.dmgMul, post: s.post, curve: 0.9, col: '#ff5ad1' }); }
        AudioSys.play('art'); break;
      }
      case 'summon': {
        for (let i = 0; i < s.n; i++) { if (G.enemies.length > G.maxAlive + 6) break; const a = rand(0, TAU); const x = clamp(this.x + Math.cos(a) * 60, 30, G.ARENA.w - 30), y = clamp(this.y + Math.sin(a) * 60, 30, G.ARENA.h - 30); const m = new Enemy(s.what, x, y, { summoned: true }); G.enemies.push(m); ring(x, y, 4, 34, this.d.col, 0.3, 3); sparks(x, y, 8, this.d.col); }
        break;
      }
      case 'teleport': {
        const x0 = this.x, y0 = this.y;
        const a = P.ang + Math.PI + rand(-0.7, 0.7); this.x = clamp(P.x + Math.cos(a) * 90, 30, G.ARENA.w - 30); this.y = clamp(P.y + Math.sin(a) * 90, 30, G.ARENA.h - 30); blinkFx(x0, y0, this.x, this.y, this.d.accent || this.d.col);
        this.face = Math.atan2(P.y - this.y, P.x - this.x); sparks(this.x, this.y, 10, this.d.col); ring(this.x, this.y, 6, 40, this.d.col, 0.25, 3); AudioSys.play('dash');
        break;
      }
      case 'blink': {
        // vanish and reappear somewhere around you; the streak shows where it went
        const x0 = this.x, y0 = this.y, away = Math.atan2(this.y - P.y, this.x - P.x); let a;
        if (s.at === 'side') a = away + (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 2 + rand(-0.3, 0.3));
        else if (s.at === 'front') a = P.ang + rand(-0.4, 0.4);
        else if (s.at === 'random') a = rand(0, TAU);
        else if (s.at === 'far') a = away + Math.PI + rand(-0.5, 0.5);
        else a = P.ang + Math.PI + rand(-0.6, 0.6);
        const d = s.dist || 100; this.x = clamp(P.x + Math.cos(a) * d, 30, G.ARENA.w - 30); this.y = clamp(P.y + Math.sin(a) * d, 30, G.ARENA.h - 30);
        this.face = Math.atan2(P.y - this.y, P.x - this.x); blinkFx(x0, y0, this.x, this.y, this.d.accent || this.d.col); AudioSys.play('dash');
        break;
      }
      case 'flashstep': {
        // a dash straight through you to the far side; the cut lands along the path a beat later
        const a = Math.atan2(P.y - this.y, P.x - this.x), x0 = this.x, y0 = this.y; const want = Math.min(s.len, dd + (s.over || 150));
        const travel = Math.min(want, this.clearance(Math.cos(a), Math.sin(a), want)); this.x += Math.cos(a) * travel; this.y += Math.sin(a) * travel; this.face = Math.atan2(P.y - this.y, P.x - this.x);
        G.hazards.push({ k: 'zone', shape: 'line', x: x0, y: y0, ang: a, len: Math.max(travel, 60), width: s.width, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: s.post || 0, perilous: !!s.perilous, src: this, flash: true });
        blinkFx(x0, y0, this.x, this.y, s.perilous ? '#ff5a4a' : '#fff1c8'); screenFlash('#ffffff', 0.08); AudioSys.play('mikiri'); shake(3);
        break;
      }
      case 'boltstep': {
        // the god strikes as lightning (red: move), then steps out of the bolt
        const tx = clamp(P.x + P.vx * 0.25 + rand(-30, 30), 40, G.ARENA.w - 40), ty = clamp(P.y + P.vy * 0.25 + rand(-30, 30), 40, G.ARENA.h - 40);
        G.hazards.push({ k: 'ground', x: tx, y: ty, r: s.radius, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: true, src: this, lightning: true });
        lightningFx([[this.x, this.y], [this.x + rand(-30, 30), this.y - 260], [this.x, this.y - 560]], '#9fd8ff', 0.2, 4); ring(this.x, this.y, 6, 60, '#9fd8ff', 0.3, 3);
        this.vanishT = s.delay; this.invuln = s.delay; this.t = s.delay; this.releaseToken(); AudioSys.play('zap');
        later(s.delay - 0.02, () => { if (this.dead) return; this.x = tx; this.y = ty; const Q = G.player; this.face = Math.atan2(Q.y - ty, Q.x - tx); ring(tx, ty, 10, 90, '#cfeaff', 0.3, 4); });
        break;
      }
      case 'toll': {
        AudioSys.play('gong'); ring(this.x, this.y, this.r, 300, this.d.accent || '#9ff0ff', 0.6, 4); ring(this.x, this.y, this.r, 200, '#ffffff', 0.4, 2); screenFlash('#0a0a14', 0.25);
        callout(P.x, P.y - 70, s.n === 9 ? 'THE NINTH BELL' : 'THE BELL TOLLS · ' + s.n, this.d.accent || '#9ff0ff', s.n === 9 ? 26 : 20, 1.0, { serif: false });
        break;
      }
      case 'edgevolley': {
        // crows dive at you from the edges of the courtyard, one after another
        const A = G.ARENA;
        for (let i = 0; i < s.n; i++) later(i * s.stagger, () => {
          if (this.dead) return; const Q = G.player; const side = randi(0, 3); let x, y;
          if (side === 0) { x = rand(0, A.w); y = -10; } else if (side === 1) { x = A.w + 10; y = rand(0, A.h); } else if (side === 2) { x = rand(0, A.w); y = A.h + 10; } else { x = -10; y = rand(0, A.h); }
          const a = Math.atan2(Q.y - y, Q.x - x); makeProj({ team: 'e', owner: this, style: 'crow', x, y, vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed, r: 9, life: 3.2, dmg: s.dmg * this.dmgMul, post: s.post || 24, homing: 0.4, curve: 0, col: '#ff4a3a', perilous: false });
          AudioSys.play('swing', 0.4);
        });
        this.t = (s.n - 1) * s.stagger + 0.1; AudioSys.play('art'); break;
      }
      case 'grid': {
        // four walls of lightning box you in; the middle square is safe
        for (const [hx, hy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const ang = hx ? Math.PI / 2 : 0; const cx = P.x + hx * s.off, cy = P.y + hy * s.off;
          G.hazards.push({ k: 'zone', shape: 'line', x: cx - Math.cos(ang) * s.len / 2, y: cy - Math.sin(ang) * s.len / 2, ang, len: s.len, width: s.width, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: 0, perilous: true, src: this, storm: true });
        }
        AudioSys.play('zap'); callout(P.x, P.y - 70, 'STORM CAGE', '#9fd8ff', 18, 0.8, { serif: false }); this.t = 0.1; break;
      }
      case 'mirage': {
        // Kagero's heat-haze: she melts into the shimmer and mirages dash through you from every side, one beat apart. Each can be deflected.
        const total = (s.n - 1) * s.stagger + s.delay + 0.3; this.vanishT = total; this.invuln = total; this.t = total; this.releaseToken();
        for (let k = 0; k < 4; k++) ghostFx(this.x, this.y, rand(0, TAU), this.d.col); ring(this.x, this.y, this.r, this.r * 3, '#ffcf7a', 0.3, 4); AudioSys.play('mikiri');
        const base = rand(0, TAU);
        for (let i = 0; i < s.n; i++) later(i * s.stagger, () => {
          if (this.dead) return; const Q = G.player; const a = base + i * 2.4 + rand(-0.25, 0.25);
          G.hazards.push({ k: 'zone', shape: 'line', x: Q.x - Math.cos(a) * s.len / 2, y: Q.y - Math.sin(a) * s.len / 2, ang: a, len: s.len, width: s.width, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: s.post || 0, perilous: false, src: this, mirage: true, col: this.d.col });
        });
        later(total - 0.05, () => { if (this.dead) return; const Q = G.player; const a = rand(0, TAU); this.x = clamp(Q.x + Math.cos(a) * 150, 40, G.ARENA.w - 40); this.y = clamp(Q.y + Math.sin(a) * 150, 40, G.ARENA.h - 40); this.face = Math.atan2(Q.y - this.y, Q.x - this.x); ring(this.x, this.y, this.r, 90, '#ffcf7a', 0.3, 4); });
        break;
      }
      case 'stance': {
        // The Shogun's Mikiri stance: strike him with your blade and he cuts you down at once; wait it out and he draws.
        this.stanceT = s.hold; this.t = s.hold; this.stanceStep = s;
        callout(this.x, this.y - this.r - 30, '見切 STANCE', '#f2b544', 15, 0.8, { serif: false }); AudioSys.play('mikiri'); ring(this.x, this.y, this.r, this.r * 2.4, '#f2b544', 0.4, 3);
        if (!G.hintsShown.stance) { G.hintsShown.stance = true; G.hint = { txt: 'Mikiri stance: hit him now and he counter-cuts instantly. Wait for the draw, or strike and be ready to deflect.', t: 0, life: 5, col: '#f2b544' }; }
        break;
      }
      case 'breath': {
        const dir = this.breathDir || 1; const a0 = this.face - dir * s.sweep / 2;
        G.hazards.push({ k: 'breath', x: this.x, y: this.y, a0, dir, sweep: s.sweep, dur: s.dur, range: s.range, arc: s.arc, t: 0, delay: s.dur, dmg: s.dmg * this.dmgMul, perilous: true, src: this, hit: false });
        this.t = s.dur; AudioSys.play('art'); shake(3); break;
      }
      case 'whiteout': {
        // Yuki-onna vanishes into the blizzard and comes for you from behind
        this.vanishT = s.hide; this.invuln = s.hide; this.t = s.hide; this.releaseToken();
        for (let k = 0; k < 30; k++) addPart({ k: 'ember', x: this.x + rand(-60, 60), y: this.y + rand(-60, 60), vx: rand(-260, 260), vy: rand(-120, 120), r: rand(2, 5), col: '#eef6ff', life: rand(0.5, 1.1), drag: 1.5 });
        screenFlash('#e6f2ff', 0.18); callout(P.x, P.y - 60, 'WHITEOUT', '#dff2ff', 18, 0.8, { serif: false }); AudioSys.play('dash');
        later(s.hide - 0.04, () => { if (this.dead) return; const Q = G.player; const a = Q.ang + Math.PI + rand(-0.5, 0.5); this.x = clamp(Q.x + Math.cos(a) * 105, 40, G.ARENA.w - 40); this.y = clamp(Q.y + Math.sin(a) * 105, 40, G.ARENA.h - 40); this.face = Math.atan2(Q.y - this.y, Q.x - this.x); ring(this.x, this.y, 6, 60, '#dff2ff', 0.3, 3); sparks(this.x, this.y, 12, '#eef6ff'); });
        break;
      }
      case 'wave': {
        // Ryūjin's tide: a wall of water sweeps the arena; slip through the gap or dash through it
        const A = G.ARENA, n = s.count || 1;
        for (let k = 0; k < n; k++) {
          const axis = s.cross ? (k % 2 ? 'y' : 'x') : (Math.random() < 0.5 ? 'x' : 'y'); const dir = Math.random() < 0.5 ? 1 : -1; const span = axis === 'x' ? A.h : A.w;
          const gapC = clamp((axis === 'x' ? P.y : P.x) + rand(-0.28, 0.28) * span, s.gapW, span - s.gapW);
          G.hazards.push({ k: 'wave', axis, dir, pos: dir > 0 ? 0 : (axis === 'x' ? A.w : A.h), speed: s.speed, gapC, gapW: s.gapW, thick: s.thick, t: 0, delay: s.delay + k * (s.stagger || 0.5), dmg: s.dmg * this.dmgMul, perilous: true, src: this, hit: false });
        }
        AudioSys.play('boom'); shake(5); callout(P.x, P.y - 60, 'TIDAL WAVE', '#7fd8ff', 18, 0.8, { serif: false }); break;
      }
      case 'whirl': {
        const x = clamp(P.x + P.vx * 0.1, 60, G.ARENA.w - 60), y = clamp(P.y + P.vy * 0.1, 60, G.ARENA.h - 60);
        G.hazards.push({ k: 'whirl', x, y, r: s.radius, burstR: s.burstR, t: 0, delay: s.life, pull: s.pull, dmg: s.dmg * this.dmgMul, perilous: true, src: this });
        AudioSys.play('art'); break;
      }
      case 'orbit': {
        // Kuzunoha's foxfire: flames circle her, then fly at you one at a time
        const base = rand(0, TAU);
        for (let i = 0; i < s.n; i++) { const a = base + i / s.n * TAU;
          const pr = makeProj({ team: 'e', owner: this, style: 'fox', x: this.x + Math.cos(a) * s.orbitR, y: this.y + Math.sin(a) * s.orbitR, vx: 0, vy: 0, r: 8, life: s.hold + s.n * s.stagger + 3.5, dmg: s.dmg * this.dmgMul, post: s.post || 26, homing: 0, curve: 0, col: '#ff8a3a', perilous: false });
          if (pr) pr.eorbit = { e: this, R: s.orbitR, a, w: 3.2, until: G.clock + s.hold + i * s.stagger, speed: s.speed, homing: s.homing || 0.6 }; }
        AudioSys.play('art'); break;
      }
      case 'fan': {
        // Nine Tails: tails lash out one after another in a sweeping fan; deflect the ones that reach you
        const dirF = Math.random() < 0.5 ? 1 : -1;
        for (let i = 0; i < s.n; i++) later(i * s.stagger, () => {
          if (this.dead) return; const a = this.face + dirF * (-s.spread / 2 + s.spread * i / (s.n - 1));
          G.hazards.push({ k: 'zone', shape: 'line', x: this.x, y: this.y, ang: a, len: s.len, width: s.width, t: 0, delay: s.delay, dmg: s.dmg * this.dmgMul, post: s.post || 0, perilous: false, src: this, tail: true });
        });
        this.t = (s.n - 1) * s.stagger + s.delay + 0.05; AudioSys.play('swing', 0.8); break;
      }
      case 'clone': {
        const a = rand(0, TAU); const x = clamp(this.x + Math.cos(a) * 100, 40, G.ARENA.w - 40), y = clamp(this.y + Math.sin(a) * 100, 40, G.ARENA.h - 40);
        const c = new Enemy('shadow', x, y, { summoned: true, hp: this.maxHp * 0.06 }); c.dmgMul = this.dmgMul * 0.8; c.maxPosture = 90; G.enemies.push(c);
        ring(x, y, 6, 70, '#8a6aff', 0.4, 4); callout(x, y - 40, 'SHADOW', '#c9b6ff', 18, 0.8, { serif: false }); AudioSys.play('gong');
        break;
      }
    }
  }
  clearance(fx, fy, want) {
    const A = G.ARENA; let t = want;
    if (fx > 0) t = Math.min(t, (A.w - this.r - this.x) / fx); if (fx < 0) t = Math.min(t, (this.r - this.x) / fx);
    if (fy > 0) t = Math.min(t, (A.h - this.r - this.y) / fy); if (fy < 0) t = Math.min(t, (this.r - this.y) / fy);
    return Math.max(0, t);
  }
  update(dt) {
    const P = G.player, st = this.st;
    this.anim += dt; if (this.jolt > 0) this.jolt = Math.max(0, this.jolt - dt * 9); if (this.flash > 0) this.flash -= dt; if (this.blockFlash > 0) this.blockFlash -= dt; if (this.invuln > 0) this.invuln -= dt; if (this.squash > 0) this.squash -= dt;
    if (this.exposeT > 0) this.exposeT -= dt; if (this.vanishT > 0) this.vanishT -= dt; if (this.resolveT > 0) this.resolveT -= dt;
    if (this.stanceT > 0) { this.stanceT -= dt; if (this.state !== 'active') this.stanceT = 0; }
    if (this.spawning > 0) { this.spawning = Math.max(0, this.spawning - dt); return; }
    if (st.burn > 0) {
      st.burnT -= dt; st.burnAcc += dt;
      if (st.burnAcc >= 0.25) { st.burnAcc -= 0.25; if (Math.random() < 0.8) embers(this.x + rand(-this.r, this.r) * 0.6, this.y + rand(-this.r, this.r) * 0.6, 1, '#ff8a3a', { rise: 70, r: 4 }); damageEnemy(this, { dmg: st.burn * 0.45 * spellMul() * G.S.burnMul * (1 + powOf('flame') * 0.06) * (resT('flame') >= 1 ? 1.5 : 1), src: 'dot', col: '#ff9a4a', unblockable: true }); }
      if (st.burnT <= 0) st.burn = 0;
      if (this.dead) return;
    }
    if (st.chill > 0) { st.chillT -= dt; if (st.chillT <= 0) { st.chill--; st.chillT = 1; } }
    if (st.shock > 0) st.shock -= dt;
    if (st.bleed > 0) { st.bleedT -= dt; if (st.bleedT <= 0) st.bleed = 0; }
    if (this.lastStand && this.state !== 'broken' && this.state !== 'intro') { this.lastStandT += dt; if (this.lastStandT > 9) { this.posture += this.maxPosture * 0.06 * dt; if (this.posture >= this.maxPosture) breakEnemy(this); } }
    if (this.postT > 0) this.postT -= dt;
    else if (this.posture > 0 && this.state !== 'broken' && !this.lastStand) this.posture = Math.max(0, this.posture - this.d.pregen * (0.3 + 0.7 * this.hp / this.maxHp) * dt);
    const dx = P.x - this.x, dy = P.y - this.y, dd = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const halt = () => { this.mvx = this.mvy = 0; };
    if (st.frozen > 0) { st.frozen -= dt; halt(); }
    else if (st.stun > 0) { st.stun -= dt; halt(); }
    else if (this.state === 'broken') { this.t -= dt; this.brokenT += dt; halt(); if (this.t <= 0) { this.state = 'move'; this.posture = this.isBoss ? this.maxPosture * 0.25 : 0; this.cd = 0.3; } }
    else if (this.state === 'stagger') { this.t -= dt; halt(); if (this.t <= 0) this.state = 'move'; }
    else if (this.state === 'intro') { this.t -= dt; halt(); this.face = turnToward(this.face, ang, 4 * dt); if (this.t <= 0) { this.state = 'move'; this.cd = 0.4; } }
    else {
      this.cd -= dt;
      switch (this.state) {
        case 'move': this.think(dt, dd, ang); break;
        case 'windup': {
          const s = this.step, p = 1 - this.t / this.windTotal;
          if ((this.isBoss || this.elite) && !this.feinted && !s.perilous && MELEE_SHAPES[s.shape] && P.dashing && this.t < 0.34 && this.t > 0.03 && Math.random() < (this.isBoss ? 0.7 : 0.35)) {
            this.feinted = true; const hold = this.isBoss ? 0.3 : 0.24; this.t += hold; this.windTotal += hold; this.lockT = Math.min(this.lockT, 0.1); this.cue = false;
            if (G.clock - (G.feintMsg || -9) > 6) { G.feintMsg = G.clock; callout(this.x, this.y - this.r - 30, 'READS YOUR DODGE', '#ff9a6a', 13, 0.7, { serif: false, pop: 0 }); }
            if (!G.hintsShown.feint) { G.hintsShown.feint = true; G.hint = { txt: 'Bosses hold their blow when you dash and strike where you land. Deflect instead: watch for the glint.', t: 0, life: 5, col: '#ff9a6a' }; }
          }
          if (this.t > this.lockT) this.face = turnToward(this.face, ang, (this.isBoss ? 10 : 8) * dt);
          halt();
          if (s.shape === 'slash' && p < 0.55 && dd > s.range * 0.55) { const ap = (s.approach ?? 0.45) * this.speed; this.mvx = Math.cos(ang) * ap; this.mvy = Math.sin(ang) * ap; }
          if (!this.cue && this.t <= 0.16 && (MELEE_SHAPES[s.shape] || s.shape === 'shot')) { this.cue = true; if (!s.perilous) AudioSys.play('glint'); }
          this.t -= dt * (st.chill > 0 && resT('frost') >= 1 ? 0.8 : 1); if (this.t <= 0) this.activate(dd, ang);
          break;
        }
        case 'active': {
          if (this.dash) { this.mvx = this.dash.vx; this.mvy = this.dash.vy; } else halt();
          if (this.air) {
            const A = this.air; A.t += dt; const k = Math.min(1, A.t / A.dur); this.x = lerp(A.x0, A.x1, k); this.y = lerp(A.y0, A.y1, k); this.face = Math.atan2(A.y1 - A.y0, A.x1 - A.x0) || this.face;
            if (k >= 1) {
              this.air = null; const s = this.step; ring(this.x, this.y, this.r, s.radius, s.perilous ? '#ff4a3a' : '#fff4d8', 0.3, 6); sparks(this.x, this.y, 16, '#ffffff', { max: 520 }); shake(7); AudioSys.play('heavy');
              if (dist(P.x, P.y, this.x, this.y) < s.radius + P.r) this.hitPlayer(s, this.x, this.y);
            }
          }
          this.t -= dt; if (this.t <= 0 && !this.air) { this.dash = null; if (this.step.expose && !this.stepHit) this.expose(this.step.expose); const last = this.ci >= this.combo.length - 1; this.state = 'recover'; this.t = last ? (this.step.recover ?? 0.5) * (this.isBoss && this.phase > 1 ? 0.8 : 1) : (this.step.gap ?? 0.05); }
          break;
        }
        case 'recover': {
          halt(); this.t -= dt; this.face = turnToward(this.face, ang, 3 * dt);
          if (this.t <= 0) { if (this.combo && this.ci < this.combo.length - 1) { this.ci++; this.startStep(); } else this.endCombo(); }
          break;
        }
      }
    }
    const slow = 1 - Math.min(this.isBoss ? 0.3 : 0.5, 0.1 * st.chill);
    if (this.air) { this.mvx = this.mvy = 0; this.kx = this.ky = 0; }
    this.x += (this.mvx * (this.dash ? 1 : slow) + this.kx) * dt; this.y += (this.mvy * (this.dash ? 1 : slow) + this.ky) * dt;
    const kd = Math.exp(-9 * dt); this.kx *= kd; this.ky *= kd;
    this.x = clamp(this.x, this.r, G.ARENA.w - this.r); this.y = clamp(this.y, this.r, G.ARENA.h - this.r);
  }
  think(dt, dd, ang) {
    const d = this.d;
    if (d.ai === 'bomber') {
      if (dd < 92) { this.startCombo(d.atks[0]); return; }
      this.mvx = Math.cos(ang) * this.speed; this.mvy = Math.sin(ang) * this.speed; this.face = turnToward(this.face, ang, 8 * dt); return;
    }
    if (this.cd <= 0) {
      const fc = this.forceCounter && dd < this.atkReach(d.atks[0]) * 1.2;
      const atk = fc ? d.atks[0] : this.pickAttack(dd);
      if (atk && (d.ai !== 'ranged' || dd < d.keep[1] + 140) && this.getToken()) { this.forceCounter = false; this.startCombo(atk, fc ? 0.7 : 1); if (fc) callout(this.x, this.y - this.r - 20, 'COUNTER', '#ffd36b', 14, 0.5, { serif: false }); return; }
    }
    let mx = 0, my = 0, sp = this.speed * (1 + 0.32 * pressure());
    if (d.ai === 'ranged') {
      const [k0, k1] = d.keep;
      if (dd < k0) { mx = -Math.cos(ang); my = -Math.sin(ang); sp *= 0.6; }
      else if (dd > k1) { mx = Math.cos(ang); my = Math.sin(ang); }
      else sp *= 0.4;
      mx += -Math.sin(ang) * this.strafe * 0.6; my += Math.cos(ang) * this.strafe * 0.6;
    } else {
      const waiting = !this.token && !d.noToken && G.tokens.melee >= G.maxTokens.melee;
      const want = waiting ? this.prefReach + 46 : this.prefReach * 0.85;
      if (dd > want) { mx = Math.cos(ang); my = Math.sin(ang); }
      else if (waiting && dd < want - 40) { mx = -Math.cos(ang) * 0.5; my = -Math.sin(ang) * 0.5; sp *= 0.5; }
      else sp *= 0.45;
      const sf = waiting ? 0.7 : 0.2; mx += -Math.sin(ang) * this.strafe * sf; my += Math.cos(ang) * this.strafe * sf;
    }
    if (Math.random() < dt * 0.4) this.strafe *= -1;
    const l = Math.hypot(mx, my) || 1; this.mvx = mx / l * sp; this.mvy = my / l * sp;
    this.face = turnToward(this.face, ang, 9 * dt);
  }
}

class Boss extends Enemy {
  constructor(id, x, y) {
    const d = BOSSES[id]; super(id, x, y, { def: d });
    this.bossId = id; this.lives = d.lives; this.maxLives = d.lives; this.phase = 1;
    const sc = G.bossScale; this.maxHp = d.hp * sc.hp * 1.7 * (1 + G.S.enemyHp / 100); this.hp = this.maxHp; this.maxPosture = d.post * sc.post * 3; this.dmgMul = sc.dmg;
    this.r = d.r; this.speed = d.speed; this.cds = {}; this.cd = 0.8; this.state = 'intro'; this.t = 1.8; this.invuln = 1.8; this.wMul = sc.windup;
    const tier = Math.max(0, Math.round(G.wave / 5) - 1); this.aspects = G.run.rush ? (G.danger >= 2 ? shuffleArr(Object.keys(BOSS_ASPECTS)).slice(0, G.danger >= 4 ? 2 : 1) : []) : G.wave <= 15 && G.run.bossAspects ? (G.run.bossAspects[tier % 3] || []) : shuffleArr(Object.keys(BOSS_ASPECTS)).slice(0, 2 + Math.min(2, Math.floor((G.wave - 16) / 10)));
    for (const a of this.aspects) if (BOSS_ASPECTS[a].apply) BOSS_ASPECTS[a].apply(this); this.stormT = 3;
    if (d.forms) { this.formI = 0; this.form = d.forms[0].id; this.formN = 0; }
  }
  get isBoss() { return true; }
  endCombo() { super.endCombo(); if (this.d.forms) this.shiftForm(); }
  shiftForm() {
    // Nue is a chimera: every couple of strings it changes body, and its whole moveset changes with it
    this.formN++; if (this.formN < (this.phase > 1 ? 1 : 2)) return; this.formN = 0;
    const F = this.d.forms; this.formI = (this.formI + 1) % F.length; const f = F[this.formI]; this.form = f.id;
    callout(this.x, this.y - this.r - 34, f.g + ' ' + f.name, f.col, 18, 0.8, { serif: false }); ring(this.x, this.y, this.r, this.r * 3.2, f.col, 0.45, 5); sparks(this.x, this.y, 14, f.col, { max: 420 }); AudioSys.play('gong');
    if (this.phase > 1) { const P = G.player; G.hazards.push({ k: 'ground', x: clamp(P.x + P.vx * 0.2, 20, G.ARENA.w - 20), y: clamp(P.y + P.vy * 0.2, 20, G.ARENA.h - 20), r: 62, t: 0, delay: 0.8, dmg: 12 * this.dmgMul, post: 0, perilous: true, src: this, lightning: true }); }
    if (!G.hintsShown.forms) { G.hintsShown.forms = true; G.hint = { txt: 'Nue changes body as it fights: Tiger pounces, Serpent lashes from afar, Ape throws and screeches.', t: 0, life: 5, col: f.col }; }
  }
  think(dt, dd, ang) {
    const d = this.d;
    if (this.aspects && this.aspects.includes('stormcalled')) { this.stormT -= dt; if (this.stormT <= 0) { this.stormT = this.lastStand ? 2.6 : 4.2; const P = G.player; for (let k = 0; k < 3; k++) { const x = clamp(P.x + rand(-170, 170), 20, G.ARENA.w - 20), y = clamp(P.y + rand(-130, 130), 20, G.ARENA.h - 20); G.hazards.push({ k: 'ground', x, y, r: 58, t: 0, delay: 0.95 + k * 0.12, dmg: 12 * this.dmgMul, post: 0, perilous: true, src: this }); } } }
    if (this.pressT > 0) { this.pressT -= dt; if (this.cd > 0) this.cd -= dt * 0.8; }
    if (this.cd <= 0 && G.hazards.some(h => (h.perilous && !h.ember && h.t < (h.delay || 0)) || h.k === 'wave')) { this.cd = 0.12; return; }
    if (this.forceCounter) { this.forceCounter = false; this.startCombo(d.atks[0], 0.7); callout(this.x, this.y - this.r - 24, 'COUNTER', '#ffd36b', 18, 0.5, { serif: false }); return; }
    if (this.cd <= 0 && dd < 170 && this.lastAtk && this.lastAtk.range[1] <= 220 && Math.random() < 0.3 && !d.float) {
      this.lastAtk = null; this.startCombo({ steps: [{ shape: 'retreat', dist: 260, windup: 0.12, recover: 0.15 }] }); return;
    }
    if (this.cd <= 0) {
      const opts = d.atks.filter(a => (a.phase || 1) <= this.phase && (!a.form || a.form === this.form) && dd >= a.range[0] && dd <= a.range[1] && !(a.cdKey && (this.cds[a.cdKey] || 0) > G.clock));
      if (opts.length) { const a = weighted(opts, o => o.w * (o === this.lastAtk ? 0.15 : o === this.lastAtk2 ? 0.55 : 1)); this.lastAtk2 = this.lastAtk; this.lastAtk = a; if (a.cdKey) this.cds[a.cdKey] = G.clock + a.cd; this.startCombo(a); return; }
    }
    let mx = 0, my = 0, sp = this.speed;
    const pref = d.pref;
    if (dd > pref + 30) { mx = Math.cos(ang); my = Math.sin(ang); }
    else if (dd < pref - 40 && d.float) { mx = -Math.cos(ang); my = -Math.sin(ang); sp *= 0.7; }
    else sp *= 0.4;
    mx += -Math.sin(ang) * this.strafe * 0.5; my += Math.cos(ang) * this.strafe * 0.5;
    if (Math.random() < dt * 0.5) this.strafe *= -1;
    const l = Math.hypot(mx, my) || 1; this.mvx = mx / l * sp; this.mvy = my / l * sp;
    this.face = turnToward(this.face, ang, 8 * dt);
  }
  phaseUp() {
    this.lives--; this.phase++; this.hp = this.maxHp; this.posture = 0; this.lastStand = false; if (this.aspects && this.aspects.includes('retinue')) { later(1.0, () => spawnElite()); later(1.4, () => spawnElite()); } this.state = 'intro'; this.t = 1.6; this.invuln = 1.6;
    this.wMul *= 0.9; this.speed *= 1.08; this.combo = null; this.dash = null; this.air = null; this.vanishT = 0; this.exposeT = 0;
    this.st = { burn: 0, burnT: 0, burnAcc: 0, chill: 0, chillT: 0, frozen: 0, shock: 0, bleed: 0, bleedT: 0, stun: 0 };
    G.hazards.length = 0; G.projs = G.projs.filter(p => p.team === 'p');
    later(0.5, () => {
      if (this.dead) return;
      callout(this.x, this.y - this.r - 40, 'PHASE ' + this.phase, '#ff5a4a', 34, 1.3, { serif: false });
      AudioSys.play('gong'); screenFlash('#ff2a2a', 0.2); shake(14); ring(this.x, this.y, this.r, 280, '#ff5a4a', 0.6, 8); sparks(this.x, this.y, 30, '#ff8a6a', { max: 700 });
      const P = G.player; const a = Math.atan2(P.y - this.y, P.x - this.x);
      if (dist(P.x, P.y, this.x, this.y) < 230) { P.kx += Math.cos(a) * 760; P.ky += Math.sin(a) * 760; }
    });
  }
}

function enemyShoot(e, s, ang) {
  const n = s.count || 1;
  for (let i = 0; i < n; i++) {
    const a = ang + (n > 1 ? (i - (n - 1) / 2) * (s.spread || 0.2) : 0);
    const style = s.style || 'arrow'; const sa = s.snake ? (i % 2 ? 1 : -1) * s.snake : 0;
    makeProj({ team: 'e', owner: e, style, x: e.x + Math.cos(a) * (e.r + 4), y: e.y + Math.sin(a) * (e.r + 4), vx: Math.cos(a) * s.speed, vy: Math.sin(a) * s.speed,
      r: style === 'orb' || style === 'fox' || style === 'bubble' || style === 'soul' ? 8 : style === 'scythe' ? 14 : style === 'gale' ? 13 : style === 'flame' ? 7 : style === 'bullet' ? 5 : 6, life: s.life || 2.2, dmg: s.dmg * e.dmgMul, post: s.post || 15, homing: s.homing || 0, curve: s.curve || 0, snake: sa, snakePh: (i % 2) * Math.PI, tether: !!s.tether, eboomer: s.boomer ? { t: s.boomer } : null,
      col: style === 'orb' ? '#ff5ad1' : style === 'fox' ? '#ff8a3a' : style === 'bullet' ? '#ffffff' : style === 'star' ? '#cfd8ff' : style === 'ice' ? '#bfeaff' : style === 'silk' ? '#f2eefa' : style === 'feather' ? '#f0e6d0' : style === 'bone' ? '#efe6d2' : style === 'bubble' ? '#9fe6ff' : style === 'scythe' ? '#9ff0ff' : style === 'gale' ? '#cfeaff' : style === 'flame' ? '#ff5a3a' : '#ffd23f', perilous: !!s.perilous });
  if (style === 'bullet') { AudioSys.play('boom', 0.5); sparks(e.x + Math.cos(ang) * (e.r + 10), e.y + Math.sin(ang) * (e.r + 10), 10, '#fff4c0', { ang, spread: 0.4, max: 600 }); shake(3); return; }
  }
  AudioSys.play('swing', 0.5);
}
function explosionFx(x, y, r, col) { glowPuff(x, y, r * 1.5, col, 0.25); ring(x, y, r * 0.3, r, col, 0.3, 6); sparks(x, y, 20, col, { max: 520 }); AudioSys.play('boom', 1); shake(6); }

function updateHazards(dt) {
  const P = G.player; P.webbed = false;
  for (let i = G.hazards.length - 1; i >= 0; i--) {
    const h = G.hazards[i]; h.t += dt;
    if (h.k === 'web') { if (h.t > h.life) G.hazards.splice(i, 1); else if (dist(P.x, P.y, h.x, h.y) < h.r) P.webbed = true; continue; }
    if (h.k === 'breath') {
      if (h.src && !h.src.dead) { h.x = h.src.x; h.y = h.src.y; }
      const a = h.a0 + h.dir * h.sweep * Math.min(1, h.t / h.dur); h.cur = a;
      for (let q = 0; q < 3; q++) { const rr = rand(20, h.range), aa = a + rand(-h.arc / 2, h.arc / 2); addPart({ k: 'ember', x: h.x + Math.cos(aa) * rr, y: h.y + Math.sin(aa) * rr, vx: Math.cos(aa) * 140, vy: Math.sin(aa) * 140, r: rand(3, 7), col: '#e6f6ff', life: rand(0.25, 0.5), drag: 2 }); }
      if (!h.hit && !P.dead) { const d = dist(h.x, h.y, P.x, P.y), da = Math.abs(angDiff(a, Math.atan2(P.y - h.y, P.x - h.x)));
        if (d <= h.range + P.r && da <= h.arc / 2 + Math.asin(Math.min(1, P.r / Math.max(d, 1)))) { const r = resolveHitOnPlayer({ src: h.src && !h.src.dead ? h.src : null, dmg: h.dmg, post: 0, perilous: true, x: h.x, y: h.y, hazard: true }); if (r !== 'dodged') h.hit = true; } }
      if (h.t >= h.dur) G.hazards.splice(i, 1); continue;
    }
    if (h.k === 'wave') {
      if (h.t < h.delay) continue;
      const A = G.ARENA, lim = h.axis === 'x' ? A.w : A.h; h.pos += h.dir * h.speed * dt;
      const pp = h.axis === 'x' ? P.x : P.y, q = h.axis === 'x' ? P.y : P.x;
      if (!h.hit && !P.dead && Math.abs(pp - h.pos) < h.thick / 2 + P.r && Math.abs(q - h.gapC) > h.gapW / 2 - P.r * 0.6) {
        const r = resolveHitOnPlayer({ src: h.src && !h.src.dead ? h.src : null, dmg: h.dmg, post: 0, perilous: true, x: h.axis === 'x' ? h.pos - h.dir * 60 : P.x, y: h.axis === 'y' ? h.pos - h.dir * 60 : P.y, hazard: true }); if (r !== 'dodged') h.hit = true;
      }
      if (Math.random() < 0.7) { const along = rand(0, h.axis === 'x' ? A.h : A.w); if (Math.abs(along - h.gapC) > h.gapW / 2) { const x = h.axis === 'x' ? h.pos : along, y = h.axis === 'x' ? along : h.pos; addPart({ k: 'ember', x, y, vx: (h.axis === 'x' ? h.dir : 0) * 260 + rand(-60, 60), vy: (h.axis === 'y' ? h.dir : 0) * 260 + rand(-60, 60), r: rand(3, 6), col: '#cfeeff', life: rand(0.3, 0.6), drag: 3 }); } }
      if (h.pos < -60 || h.pos > lim + 60) G.hazards.splice(i, 1); continue;
    }
    if (h.k === 'whirl') {
      if (h.t < h.delay) {
        const d = dist(P.x, P.y, h.x, h.y); if (d < h.r && d > 6 && !P.dashing && !P.dead) { const f = h.pull * (0.45 + 0.55 * (1 - d / h.r)) * dt; P.x += (h.x - P.x) / d * f; P.y += (h.y - P.y) / d * f; }
        if (Math.random() < 0.6) { const a = rand(0, TAU), rr = rand(h.burstR, h.r); addPart({ k: 'ember', x: h.x + Math.cos(a) * rr, y: h.y + Math.sin(a) * rr, vx: -Math.sin(a) * 160 - Math.cos(a) * 60, vy: Math.cos(a) * 160 - Math.sin(a) * 60, r: rand(2, 5), col: '#8fe0ff', life: rand(0.3, 0.6), drag: 1 }); }
      } else {
        if (!P.dead && dist(P.x, P.y, h.x, h.y) < h.burstR + P.r) resolveHitOnPlayer({ src: h.src && !h.src.dead ? h.src : null, dmg: h.dmg, post: 0, perilous: true, x: h.x, y: h.y, hazard: true });
        ring(h.x, h.y, 10, h.burstR * 1.3, '#9fe6ff', 0.35, 6); sparks(h.x, h.y, 18, '#cfeeff', { min: 200, max: 560 }); AudioSys.play('boom', 0.6); shake(5); G.hazards.splice(i, 1);
      }
      continue;
    }
    if (h.k === 'zone') {
      if (h.t >= h.delay) {
        let inside = false;
        if (h.shape === 'slash') { const d = dist(h.x, h.y, P.x, P.y); const da = Math.abs(angDiff(h.ang, Math.atan2(P.y - h.y, P.x - h.x))); inside = d <= h.range + P.r && da <= h.arc / 2 + Math.asin(Math.min(1, P.r / Math.max(d, 1))); slashFx(h.x, h.y, h.ang, h.arc, h.range, '#c9b6ff', 1, 0.14, 1); }
        else { const fx = Math.cos(h.ang), fy = Math.sin(h.ang); const rx = P.x - h.x, ry = P.y - h.y; const along = rx * fx + ry * fy, perp = Math.abs(-rx * fy + ry * fx); inside = along >= -P.r && along <= h.len + P.r && perp <= h.width / 2 + P.r; cutLine(h.x + fx * h.len / 2, h.y + fy * h.len / 2, h.ang, h.len, h.perilous ? '#ff4a3a' : '#fff4d8', 0.25, 4); }
        AudioSys.play('swing', 0.8);
        if (h.mirage) for (let k = 0; k <= 4; k++) ghostFx(h.x + Math.cos(h.ang) * h.len * k / 4, h.y + Math.sin(h.ang) * h.len * k / 4, h.ang, h.col || '#efe3c8');
        if (inside && !P.dead) resolveHitOnPlayer({ src: h.src && !h.src.dead ? h.src : null, dmg: h.dmg, post: h.post, perilous: h.perilous, x: h.x + (h.shape === 'line' ? Math.cos(h.ang) * h.len / 2 : 0), y: h.y + (h.shape === 'line' ? Math.sin(h.ang) * h.len / 2 : 0), hazard: true });
        G.hazards.splice(i, 1);
      }
      continue;
    }
    if (h.k === 'ground') {
      if (h.t >= h.delay) {
        if (!P.dead && dist(P.x, P.y, h.x, h.y) < h.r + P.r) resolveHitOnPlayer({ src: h.src, dmg: h.dmg, post: h.post, perilous: h.perilous, x: h.x, y: h.y, hazard: true });
        if (h.lightning) { lightningFx([[h.x + rand(-40, 40), h.y - 520], [h.x + rand(-20, 20), h.y - 250], [h.x, h.y]], '#ffe27a', 0.22, 4); glowPuff(h.x, h.y, h.r * 1.8, '#ffd27a', 0.25); AudioSys.play('zap'); }
        else { sparks(h.x, h.y, 10, '#ff5a4a', { max: 320 }); ring(h.x, h.y, h.r * 0.4, h.r, '#ff6a5a', 0.25, 5); }
        AudioSys.play('boom', 0.45); shake(2);
        G.hazards.splice(i, 1);
      }
    } else if (h.k === 'ring') {
      h.rad += h.speed * dt;
      const d = dist(P.x, P.y, h.x, h.y);
      if (!h.hit && !P.dead && Math.abs(d - h.rad) < h.thick / 2 + P.r) { h.hit = true; resolveHitOnPlayer({ src: h.src && !h.src.dead ? h.src : null, dmg: h.dmg, post: h.post || 0, perilous: h.perilous, x: h.x, y: h.y, hazard: true }); }
      if (h.rad > h.max) G.hazards.splice(i, 1);
    }
  }
}

// ================= HIT RESOLUTION ON PLAYER =================
const PARRY_GRACE = 0.09;
function resolveHitOnPlayer(h) {
  const P = G.player, S = G.S; if (!P || P.dead) return 'none';
  if (!h.perilous && P.deflectShieldT > 0 && h.src !== P.deflectShieldSrc && P.canGuard()) { perfectDeflect(h, true); return 'deflect'; }
  if (P.iframes > 0) {
    if (P.dashing && !P.freeDash && G.clock - P.dashStart < 0.3 && (h.perilous || S.perfectDodgeAll) && P.mikiriDash !== P.dashId) mikiri(h);
    else if (P.dashing && G.clock - P.lastDodgeText > 0.6) { P.lastDodgeText = G.clock; callout(P.x, P.y - 30, 'DODGE', '#9fe8ff', 14, 0.4, { serif: false, pop: 0, rise: 16 }); }
    return 'dodged';
  }
  if (!h.perilous && !h.proj && h.src && h.src.x !== undefined && P.state === 'swing' && P.swingT <= 0.17 && Math.abs(angDiff(P.ang, Math.atan2(h.src.y - P.y, h.src.x - P.x))) < 1.45) {
    G.clashing = true; try { perfectDeflect(h); } finally { G.clashing = false; } return 'deflect';
  }
  if (!h.perilous) {
    if (P.canGuard() && G.clock - P.deflectPress <= P.deflectWin) { perfectDeflect(h); return 'deflect'; }
    if (P.guarding) { blockHit(h); return 'block'; }
    if (P.canGuard()) { P.pending.push({ h, t: PARRY_GRACE }); return 'pending'; }
  }
  damagePlayer(h.dmg, h); return 'hit';
}
function settlePending(dt, pressed) {
  const P = G.player; if (!P.pending.length) return;
  if (pressed && P.canGuard()) { const list = P.pending; P.pending = []; for (const it of list) { perfectDeflect(it.h); if (it.h.proj) { it.h.proj.held = false; reflectProj(it.h.proj, P); } } return; }
  for (let i = P.pending.length - 1; i >= 0; i--) {
    const it = P.pending[i]; it.t -= dt;
    if (it.t <= 0) {
      P.pending.splice(i, 1); if (it.h.proj) it.h.proj.life = 0;
      if (P.iframes > 0 && P.dashing) continue;
      if (P.guarding) { blockHit(it.h); continue; }
      damagePlayer(it.h.dmg, it.h);
    }
  }
}
function perfectDeflect(h, shielded = false) {
  const P = G.player, S = G.S, src = h.src;
  if (!shielded) { P.deflectShieldT = 0.3; P.deflectShieldSrc = src; }
  G.run.deflects++; P.deflectCount++; addCombo(2);
  const ang = Math.atan2(h.y - P.y, h.x - P.x);
  const cx = P.x + Math.cos(ang) * 18, cy = P.y + Math.sin(ang) * 18;
  const heavy = (h.post || 0) >= 35;
  sparks(cx, cy, 26, '#ffe27a', { ang, spread: 1.3, min: 240, max: 820, w: 2.6 }); sparks(cx, cy, 10, '#ffffff', { ang, spread: 0.7, min: 340, max: 1000, w: 2 });
  glowPuff(cx, cy, heavy ? 110 : 76, '#ffd04a', 0.2); ring(cx, cy, 8, heavy ? 80 : 54, '#fff2b0', 0.24, 4);
  G.parryChain = G.clock - (G.lastParryT ?? -9) < 1.3 ? (G.parryChain || 0) + 1 : 0; G.lastParryT = G.clock; parryFlare(cx, cy, G.parryChain + (heavy ? 1 : 0));
  styleGain(G.clashing ? 'clash' : 'parry', (G.clashing ? 10 : 12) + Math.min(4, G.parryChain) * 2, (G.clashing ? 'CLASH' : 'DEFLECT') + (G.parryChain >= 2 ? ` ×${G.parryChain + 1}` : ''));
  AudioSys.play('clang', heavy ? 1.25 : 1);
  hitstop(heavy ? 0.085 : 0.055); shake(heavy ? 6 : 3.5); kick(ang + Math.PI, 5);
  if (heavy) slowmo(0.18, 0.35);
  if (src && !src.dead && src.addPosture) { src.addPosture((h.post || 10) * S.deflectPost * postMul() * (h.proj ? 0.5 : 1) * (1 + (src.isBoss ? 0.12 : 0.2) * Math.min(4, G.parryChain || 0)) * (G.clashing ? 0.7 : 1) * (S.taiko && onBeat() ? 1.5 : 1)); if (!h.proj && !h.hazard && src.onParried) src.onParried(P.x, P.y); }
  gainFocus(1); if (hasR('calm')) healPlayer(1, false); if (hasR('gilded')) dropAsh(P.x, P.y, 2);
  if (src && !src.dead && src.st && !h.hazard && resT('frost') >= 3) applyStatus(src, 'chill', 3);
  if (resT('steel') >= 3 && P.dashCharges < S.dashes) { P.dashCharges++; P.dashCD = 0; }
  if (resT('spirit') >= 2 && G.clock - (P.lastParryWisp || -9) > 1.2) { P.lastParryWisp = G.clock; summonWisp({ M: Object.assign(newMods(), { pw: schoolPw(SIG.wisp), school: 'spirit' }), payload: null, depth: 0 }); }
  P.ki = Math.min(S.kiMax, P.ki + 18); P.posture += (h.post || 0) * 0.08; P.postureT = 0.4; dashRefund(0.5); G.lastEngageT = G.clock; rallyHeal(4);
  P.deflectFlash = 0.18; P.deflectPress = -9; P.riposteT = 1.4;
  // the clash stings the attacker and shoves the crowd back
  if (src && !src.dead && !h.proj && !h.hazard && src.hp !== undefined) damageEnemy(src, { dmg: bladeBase() * 0.3 + (hasR('mirrorward') ? (h.dmg || 0) * 2.5 : 0), post: 0, src: 'sting', unblockable: true, kx: Math.cos(ang + Math.PI), ky: Math.sin(ang + Math.PI), knock: 0 });
  if (!shielded) { const R = S.deflectAoE ? 170 : 115; ring(P.x, P.y, 20, R, '#fff2b0', 0.28, 3);
    for (const o of G.enemies) { if (o === src || o.dead || o.spawning || o.isBoss) continue; const d = dist(P.x, P.y, o.x, o.y); if (d > R + o.r) continue; const a = Math.atan2(o.y - P.y, o.x - P.x);
      if (!o.heavy || S.deflectAoE) { o.kx += Math.cos(a) * 340; o.ky += Math.sin(a) * 340; if (o.state === 'windup' && o.step && !o.step.perilous && (S.deflectAoE || o.t > o.windTotal * 0.3)) { o.cancelAttack(); o.state = 'stagger'; o.t = S.deflectAoE ? 0.6 : 0.35; } }
      o.addPosture(8 * postMul() * S.deflectPost); } }
  if (hasR('rhythm')) { P.rhythmN = Math.min(5, (G.parryChain || 0) + 1); P.rhythmT = 4; }
  callout(cx, cy - 22, G.clashing ? 'CLASH' : 'PARRY', G.clashing ? '#ffb86b' : '#ffe27a', heavy ? 22 : 17, 0.45, { serif: false, rise: 22 });
  const aim = src && !src.dead ? Math.atan2(src.y - P.y, src.x - P.x) : ang;
  castGuardChain(aim, src);
  if (hasR('riposte')) P.riposte = true;
  if (hasR('lotus')) P.lotus = true;
  if (hasR('mirror')) executeNode({ projs: [{ card: SIG.wave, payload: null }], mods: [], utils: [], dups: [], link: null }, { x: P.x, y: P.y, ang: aim, src: 'guard' });
  if (hasR('echostone')) strikeCastOnly(aim);
  if (hasR('stormeye') && P.deflectCount % 8 === 0) { raijin({ x: P.x, y: P.y, ang: aim, M: newMods(), tx: src ? src.x : P.x, ty: src ? src.y : P.y }, 6); callout(P.x, P.y - 50, 'RAIJIN', '#c9b6ff', 24, 0.9, { serif: false }); }
}
function castGuardChain(aim, src) {
  const P = G.player, S = G.S;
  if (G.clock - P.lastGuardCast < 0.07) return; P.lastGuardCast = G.clock;
  const cards = G.run.guard.filter(Boolean).map(id => SIG[id]); if (!cards.length) return;
  for (let k = 0; k < S.guardCasts; k++) {
    const node = buildNode(makeDeck(cards, 0, 0, true), 999);
    executeNode(node, { x: P.x, y: P.y, ang: aim + (k ? rand(-0.3, 0.3) : 0), tx: src && !src.dead ? src.x : P.x + Math.cos(aim) * 160, ty: src && !src.dead ? src.y : P.y + Math.sin(aim) * 160, src: 'guard' });
  }
}
function blockHit(h) {
  const P = G.player, S = G.S; P.kamaeT = 0; P.kamaeReady = false; if (G.style) G.style.pts = Math.max(0, G.style.pts - 12);
  const post = (h.post || 8) * S.blockPost * (hasR('dragonscale') ? 0.4 : 1) * (h.proj ? 0.7 : 1);
  P.posture += post; P.postureT = 0.7;
  const ang = Math.atan2(h.y - P.y, h.x - P.x); const cx = P.x + Math.cos(ang) * 16, cy = P.y + Math.sin(ang) * 16;
  sparks(cx, cy, 8, '#9fc4ff', { ang, spread: 1, min: 120, max: 380 }); AudioSys.play('block'); kick(ang + Math.PI, 4); shake(2); hitstop(0.03);
  callout(cx, cy - 18, 'BLOCK', '#a9c4ff', 13, 0.35, { serif: false, pop: 0, rise: 14 });
  P.kx -= Math.cos(ang) * 140; P.ky -= Math.sin(ang) * 140;
  if (G.run.vessel === 'oni' && h.src && h.src.addPosture && !h.src.dead) h.src.addPosture(post * 0.5);
  if (hasR('bramble') && h.src && h.src.addPosture && !h.src.dead) damageEnemy(h.src, { dmg: spellDmg(15), post: 6, src: 'react', unblockable: true });
  if (P.posture >= S.maxPosture) {
    if (hasR('dragonscale')) P.posture = S.maxPosture - 1;
    else {
      P.state = 'broken'; P.stateT = 0.8; P.posture = S.maxPosture * 0.35; P.guarding = false;
      callout(P.x, P.y - 34, 'GUARD BROKEN', '#ff8a5a', 16, 0.7, { serif: false }); AudioSys.play('break'); damagePlayer(h.dmg * 0.5, h, true);
    }
  }
}
function mikiri(h) {
  const P = G.player, S = G.S, src = h.src; G.run.mikiri++; P.mikiriDash = P.dashId; addCombo(3); styleGain('mikiri', 26, 'MIKIRI');
  slowmo(0.3, 0.3); hitstop(0.05); AudioSys.play('mikiri'); callout(P.x, P.y - 40, 'MIKIRI', '#7fe0ff', 22, 0.8, { serif: false });
  ring(P.x, P.y, 10, 90, '#7fe0ff', 0.35, 4); sparks(P.x, P.y, 16, '#bff0ff', { max: 600 });
  if (src && !src.dead && src.addPosture) src.addPosture(Math.max(30, src.maxPosture * (src.isBoss ? 0.18 : 0.4)) * S.deflectPost);
  P.ki = Math.min(S.kiMax, P.ki + 12); P.riposteT = 1.1; dashRefund(0.6); G.lastEngageT = G.clock; gainFocus(hasR('timesilk') ? 2 : 1); if (resT('spirit') >= 3) phantomBlades(P.x, P.y, P.ang); if (src && !src.dead && src.expose) src.expose(1.0);
  const aim = src && !src.dead ? Math.atan2(src.y - P.y, src.x - P.x) : P.ang;
  castGuardChain(aim, src);
  if (hasR('riposte')) P.riposte = true; if (hasR('lotus')) P.lotus = true;
}
function damagePlayer(dmg, h = {}, force = false) {
  const P = G.player, S = G.S; if (P.dead || (P.iframes > 0 && !force)) return;
  if (P.ward) { P.ward = 0; ring(P.x, P.y, 10, 54, '#4fd1a5', 0.4, 4); AudioSys.play('ward'); P.iframes = 0.4; callout(P.x, P.y - 34, 'WARD', '#4fd1a5', 16, 0.5, { serif: false }); return; }
  const arm = S.armor; const m = arm >= 0 ? 15 / (15 + arm) : 1 + (-arm) / 15;
  dmg = Math.max(1, dmg * m * (1 + S.dmgTaken / 100) * G.scale.pdmg * (1 + 0.15 * (G.hunt || 0)) * (h.src && h.src.isBoss ? 1.05 : 1));
  if (S.flames) { dmg = 1; P.rally = 0; }
  if (S.daruma) { P.darumaN = Math.min(15, (P.darumaN || 0) + 1); callout(P.x, P.y - 40, 'DARUMA ×' + P.darumaN, '#e8432e', 12, 0.5, { serif: false, pop: 0 }); }
  P.rally = S.flames ? 0 : Math.min(S.maxHp, (P.rally || 0) + dmg * (hasR('rallybell') ? 0.95 : 0.85)); P.rallyT = 0; P.streak = 0;
  if (h.src && h.src.aspects && h.src.aspects.includes('vampiric') && !h.src.dead) { h.src.hp = Math.min(h.src.maxHp, h.src.hp + h.src.maxHp * 0.03); textPop(h.src.x, h.src.y - h.src.r - 8, '+' + Math.round(h.src.maxHp * 0.03), 'n', '#ff3a5a'); }
  P.hp -= dmg; P.iframes = 0.6; P.hurtT = 0.3; G.run.dmgTaken += dmg; G.combo = 0; styleHit(!!h.perilous);
  textPop(P.x, P.y - 24, '-' + Math.round(dmg), 'hurt');
  screenFlash('#ff1a1a', 0.2); shake(8); hitstop(0.06); AudioSys.play('hurt'); sparks(P.x, P.y, 12, '#ff4a4a', { max: 380 });
  if (h.x !== undefined) { const a = Math.atan2(P.y - h.y, P.x - h.x); P.kx += Math.cos(a) * 300; P.ky += Math.sin(a) * 300; P.hitFrom = { x: h.x, y: h.y, t: 0.35 }; }
  if (hasR('wrath')) { explosion(P.x, P.y, 130, spellDmg(30), { burn: 2, col: '#ff5a2a' }); P.rageT = 4; }
  if (P.state === 'drink') P.state = 'idle';
  if (P.hp <= 0 && hasR('ironwill') && !P.ironWillUsed) { P.ironWillUsed = true; P.hp = 1; P.iframes = 1; callout(P.x, P.y - 40, 'IRON WILL', '#ffd36b', 20, 0.9); AudioSys.play('break'); }
  if (P.hp <= 0) {
    if (hasR('phoenix') && !G.run.phoenixUsed) {
      G.run.phoenixUsed = true; P.hp = S.maxHp * 0.5; P.iframes = 2; callout(P.x, P.y - 50, 'REBORN', '#ffb347', 30, 1.2, { serif: false });
      embers(P.x, P.y, 40, '#ff9a3a', { max: 300, rise: 80 }); ring(P.x, P.y, 10, 200, '#ffb347', 0.6, 6); AudioSys.play('gong'); slowmo(0.8, 0.25);
      explosion(P.x, P.y, 200, spellDmg(40), { burn: 3, col: '#ff9a3a', knock: 500 });
    } else playerDeath();
  }
}
function addCombo(n) { G.combo += n; G.comboT = 2.6; if (G.combo > G.run.bestCombo) G.run.bestCombo = G.combo; }

function flawless(e) {
  const P = G.player;
  e.cancelAttack(); e.expose(e.isBoss ? 1.2 : 2.0); e.addPosture(e.maxPosture * (e.isBoss ? 0.1 : 0.3));
  if (!e.isBoss && e.state !== 'broken') { e.state = 'stagger'; e.t = 0.9; }
  callout(e.x, e.y - e.r - 40, 'FLAWLESS', '#fff2b0', 26, 1.0, { serif: false }); AudioSys.play('flawless');
  parryFlare(e.x, e.y, 5); ring(e.x, e.y, e.r, e.r * 4, '#fff2b0', 0.45, 5); slowmo(0.35, 0.35); camPunch(0.07);
  gainFocus(1); styleGain('flawless', 30, 'FLAWLESS'); G.run.flawless = (G.run.flawless || 0) + 1;
}
