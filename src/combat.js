// ================= COMBAT CORE: sigil engine, projectiles, damage =================
let PID = 1;
const hasR = (id) => (G.run && G.run.relicSet[id]) || 0;
// ---- schools: power stats scale sigils of that school; resonance tiers unlock passives ----
const powOf = k => (G.S && G.S.pow && G.S.pow[k]) || 0;
const resT = k => (G.resT && G.resT[k]) || 0;
const lowHpRage = () => G.player && resT('blood') >= 3 && G.player.hp < G.S.maxHp * 0.5 ? 1.4 : 1;
// flat damage per hit = power x coefficient, expressed as a multiplier on the sigil's listed damage
function schoolPw(card) { if (!card || !card.school || !card.base) return 1; return 1 + powOf(card.school) * (card.coef ?? 0.5) / card.base; }
const spellMul = () => (1 + (G.S.sigil + G.S.dmg) / 100) * (G.player && G.player.rageT > 0 ? 1.5 : 1) * lowHpRage();
const sigDmg = (base, M) => base * (M ? M.dmg * (M.pw || 1) : 1) * spellMul();
const spellDmg = (base) => base * spellMul();
const postMul = () => 1 + G.S.posture / 100;

function newMods() { return { share: 1, dmg: 1, speed: 1, size: 1, life: 1, pierce: 0, bounce: 0, homing: 0, explode: 0, burn: 0, chill: 0, shock: 0, bleed: 0, post: 1, vamp: 0, orbit: false, boomer: false, crit: 0, echo: false, scatter: 1, link: null, split: false, accel: false, spectral: false, ringcast: false, critMul: 1.8, arc: 0, trail: false, timerLink: null }; }

// ---------- Deck & node building (Noita-style draws) ----------
function makeDeck(cards, pos, ki, free, kiMul = 1) {
  return { cards, pos, ki, kiMul, free: !!free || !!(G.S && G.S.freeInk), spent: 0, hpSpent: 0, fizzled: [], read: 0,
    next() { if (this.pos >= this.cards.length) return null; this.read++; return this.cards[this.pos++]; } };
}
function payCost(d, card) {
  if (d.free) return true;
  if (card.hp && resT('blood') >= 3) return true;
  if (card.hp) { const P = G.player; const have = P ? P.hp : 999; if (have - d.hpSpent > card.hp + 1) { d.hpSpent += card.hp; return true; } return false; }
  const k = Math.ceil((card.ki || 0) * (d.kiMul || 1) * ((G.S && G.S.kiCostMul) || 1));
  if (G.S && G.S.bloodMagic) { const hc = k > 0 ? Math.max(1, Math.round(k / 5)) : 0; const P = G.player; if (!P || P.hp - d.hpSpent > hc + 1) { d.hpSpent += hc; return true; } return false; }
  if (d.ki >= k) { d.ki -= k; d.spent += k; return true; }
  if (hasR('bloodink') && G.player) { const hc = Math.ceil((k - d.ki) / 6); if (G.player.hp - d.hpSpent > hc + 1) { d.hpSpent += hc; d.spent += d.ki; d.ki = 0; return true; } }
  return false;
}
function buildNode(d, draws, depth = 0) {
  const node = { projs: [], mods: [], utils: [], dups: [], link: null, timerLink: null };
  let guard = 0;
  while (draws > 0 && guard++ < 80) {
    const card = d.next(); if (!card) break; draws--;
    if (!payCost(d, card)) { d.fizzled.push(card); continue; }
    if (card.type === 'mod') { node.mods.push(card); draws++; if (card.id === 'm_link' && !node.link && depth < 5) node.link = buildNode(d, 1, depth + 1); if (card.id === 'm_timer' && !node.timerLink && depth < 5) node.timerLink = buildNode(d, 1, depth + 1); }
    else if (card.alpha) { const c0 = d.cards[0]; if (c0 && !c0.alpha && !c0.omega) { if (c0.type === 'proj') node.projs.push({ card: c0, payload: null }); else if (c0.type === 'mod') node.mods.push(c0); else if (c0.type === 'util') node.utils.push(c0); } draws++; }
    else if (card.omega) { for (const c0 of d.cards) if (c0.type === 'proj') node.projs.push({ card: c0, payload: null }); }
    else if (card.type === 'multi') { if (card.dup) { if (depth < 5) node.dups.push({ node: buildNode(d, 1, depth + 1), times: card.dup, mul: card.dupMul }); } else draws += card.draw; }
    else if (card.type === 'util') { node.utils.push(card); if (card.free) draws++; }
    else { const p = { card, payload: null }; if ((card.trigger || card.timer) && depth < 5) p.payload = buildNode(d, 1, depth + 1); node.projs.push(p); }
  }
  return node;
}
function nodeEmpty(n) { return !n || (!n.projs.length && !n.utils.length && !n.dups.length && !n.mods.length); }

function executeNode(node, c, depth = 0) {
  if (!node || depth > 6) return;
  const M = c.baseM ? Object.assign({}, c.baseM) : newMods();
  if (c.extraMods) for (const m of c.extraMods) m.mod(M);
  for (const m of node.mods) m.mod(M);
  if (c.dmgMul) M.dmg *= c.dmgMul;
  if (node.link) M.link = node.link;
  if (node.timerLink) M.timerLink = node.timerLink;
  const cc = Object.assign({}, c, { M, depth });
  for (const u of node.utils) u.use(cc);
  const fireAll = (cx) => {
    const ringN = cx.M.ringcast ? 6 : 1; const n = Math.max(1, Math.round(cx.M.scatter));
    for (const p of node.projs) {
      const payload = p.payload || cx.M.link || cx.M.timerLink;
      const mode = p.card.timer ? 'timer' : p.payload || cx.M.link ? 'hit' : cx.M.timerLink ? 'timer' : null;
      for (let r = 0; r < ringN; r++) for (let k = 0; k < n; k++) {
        const off = (n > 1 ? (k - (n - 1) / 2) * 0.24 : 0) + r * TAU / ringN;
        p.card.fire(Object.assign({}, cx, { M: Object.assign({}, cx.M, { pw: schoolPw(p.card), school: p.card.school }), ang: cx.ang + off, payload, trigMode: mode }));
      }
    }
    if (cx.extraProjs) for (const card of cx.extraProjs) card.fire(Object.assign({}, cx, { M: Object.assign({}, cx.M, { pw: schoolPw(card), school: card.school }), payload: null, trigMode: null }));
    for (const d of node.dups) {
      for (let i = 0; i < d.times; i++) {
        const bm = Object.assign({}, cx.M, { dmg: cx.M.dmg * d.mul, share: (cx.M.share || 1) * d.mul, echo: false, link: null, scatter: 1, pw: 1 });
        executeNode(d.node, Object.assign({}, c, { baseM: bm, extraMods: null, extraProjs: null, dmgMul: 1, ang: cx.ang + (i - (d.times - 1) / 2) * 0.16 }), depth + 1);
      }
    }
  };
  fireAll(cc);
  if (M.echo) { const M2 = Object.assign({}, M, { echo: false }); later(0.25, () => { const P = G.player; fireAll(Object.assign({}, cc, { M: M2, x: c.src === 'trigger' ? cc.x : P.x, y: c.src === 'trigger' ? cc.y : P.y })); }); }
  if (node.projs.length || node.dups.length) AudioSys.play('sigil');
}

// ---------- Projectiles ----------
function makeProj(o) {
  if (G.projs.length > 900) return null;
  const p = Object.assign({ team: 'p', x: 0, y: 0, vx: 0, vy: 0, r: 5, life: 1, dmg: 1, post: 0, pierce: 0, bounce: 0, homing: 0, burn: 0, chill: 0, shock: 0, bleed: 0, vamp: 0, crit: 0,
    explode: 0, tick: 0, pull: 0, knock: 60, drag: 0, curve: 0, blast: null, payload: null, trigMode: null, depth: 0, age: 0, col: '#ffffff', style: 'spark', size: 1 }, o);
  p.maxLife = p.life; p.hits = new Map(); p.id = PID++; p.spin = rand(0, TAU);
  G.projs.push(p); return p;
}
function bolt(c, o) {
  const M = c.M, n = o.count || 1;
  for (let i = 0; i < n; i++) {
    let a = o.ring ? c.ang + (i / n) * TAU : c.ang + (n > 1 ? (i - (n - 1) / 2) * (o.spread || 0.2) : 0);
    if (o.jitter) a += rand(-o.jitter, o.jitter);
    const sp = o.speed * M.speed * (o.spdVar ? rand(1 - o.spdVar, 1 + o.spdVar) : 1);
    const off = o.ring ? 14 : 4;
    const p = makeProj({
      team: 'p', style: o.style, x: c.x + Math.cos(a) * off, y: c.y + Math.sin(a) * off, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      r: o.r * Math.sqrt(M.size) * (M.size > 1 ? 1.25 : 1), size: M.size, life: o.life * M.life, dmg: sigDmg(o.dmg, M), post: (o.post ?? o.dmg * 0.6) * M.post * postMul() * (M.share || 1), share: M.share || 1, col: o.col,
      pierce: (o.pierce || 0) + M.pierce, bounce: (o.bounce || 0) + M.bounce, homing: (o.homing || 0) + M.homing,
      burn: (o.burn || 0) + M.burn, chill: (o.chill || 0) + M.chill, shock: (o.shock || 0) + M.shock, bleed: (o.bleed || 0) + M.bleed,
      vamp: M.vamp + (o.vamp || 0), crit: M.crit, explode: M.explode, tick: o.tick || 0, pull: (o.pull || 0) * Math.sqrt(M.size), knock: o.knock || 60, drag: o.drag || 0, curve: o.curve || 0,
      blast: o.blast ? { r: o.blast.r * Math.sqrt(M.size), dmg: sigDmg(o.blast.dmg, M), post: (o.blast.post || o.blast.dmg * 0.6) * M.post * (M.share || 1) } : null,
      payload: c.payload, trigMode: c.trigMode, depth: c.depth || 0, src: c.src,
      split: M.split, accel: M.accel, spectral: M.spectral, critMul: M.critMul, arc: M.arc, trail: M.trail, hook: o.hook, onDie: o.onDie, baseDmg: 0
    });
    if (!p) return;
    p.baseDmg = p.dmg;
    if (M.orbit || o.forceOrbit) { p.orbit = true; p.orbitA = a; p.orbitR = 50 + o.r * 1.5 + (i % 3) * 12; p.orbitW = clamp(sp / p.orbitR, 3, 9); p.life = p.maxLife = Math.max(1.6, p.life * 2.8); p.pull *= 0.6; }
    if (M.boomer) { p.boomer = true; p.life = p.maxLife = p.life * 1.9; p.pierce += 2; }
  }
}

// ---------- Instant & special sigils ----------
function targetPoint(c, maxD) {
  let tx = c.tx ?? c.x + Math.cos(c.ang) * 160, ty = c.ty ?? c.y + Math.sin(c.ang) * 160;
  const d = dist(c.x, c.y, tx, ty); if (d > maxD) { tx = c.x + (tx - c.x) / d * maxD; ty = c.y + (ty - c.y) / d * maxD; }
  return [clamp(tx, 10, G.ARENA.w - 10), clamp(ty, 10, G.ARENA.h - 10)];
}
function payloadAt(c, x, y, ang) { if (c.payload) executeNode(c.payload, { x, y, ang, tx: x + Math.cos(ang) * 160, ty: y + Math.sin(ang) * 160, src: 'trigger' }, (c.depth || 0) + 1); }
function chainLightning(c, jumps, dmg) {
  const M = c.M; jumps += Math.floor((M.pierce + M.bounce) / 2);
  let x = c.x, y = c.y; const hit = new Set(); const pts = [[x, y]]; const range = 270 * Math.sqrt(M.size) * clamp(M.speed, 0.8, 1.5);
  for (let j = 0; j < jumps; j++) {
    let best = null, bd = 1e9;
    for (const e of G.enemies) {
      if (e.dead || e.spawning || hit.has(e)) continue; const d = dist(x, y, e.x, e.y); if (d > range) continue;
      let score = d; if (j === 0) score = d * (1 + Math.abs(angDiff(c.ang, Math.atan2(e.y - y, e.x - x))) * 1.3);
      if (score < bd) { bd = score; best = e; }
    }
    if (!best) break;
    hit.add(best); pts.push([best.x, best.y]);
    damageEnemy(best, { dmg: sigDmg(dmg, M), post: dmg * 0.5 * M.post * postMul(), crit: M.crit, shock: 1 + M.shock, burn: M.burn, chill: M.chill, bleed: M.bleed, vamp: M.vamp, src: 'sigil', col: '#d9ccff' });
    x = best.x; y = best.y;
  }
  if (pts.length === 1) { x = c.x + Math.cos(c.ang) * 150; y = c.y + Math.sin(c.ang) * 150; pts.push([x, y]); }
  lightningFx(pts, '#c9b6ff', 0.2, 2.5); glowPuff(x, y, 30, '#c9b6ff', 0.2); AudioSys.play('zap');
  if (M.explode) explosion(x, y, 55 * Math.sqrt(M.size), sigDmg(dmg, M) * 0.6 * M.explode, {});
  payloadAt(c, x, y, c.ang);
}
function sunlance(c) {
  const M = c.M; const len = 540 * Math.sqrt(M.speed * M.life); const w = 12 * M.size;
  const x2 = c.x + Math.cos(c.ang) * len, y2 = c.y + Math.sin(c.ang) * len;
  for (const e of G.enemies) {
    if (e.dead || e.spawning) continue;
    if (segDist(e.x, e.y, c.x, c.y, x2, y2) < w + e.r) damageEnemy(e, { dmg: sigDmg(14, M), post: 9 * M.post * postMul(), crit: M.crit, burn: M.burn, chill: M.chill, shock: M.shock, bleed: M.bleed, vamp: M.vamp, src: 'sigil', kx: Math.cos(c.ang), ky: Math.sin(c.ang), knock: 80, col: '#fff7b0' });
  }
  beamFx(c.x, c.y, x2, y2, w, '#fff07a', 0.24); glowPuff(c.x, c.y, 40, '#fff07a', 0.2); AudioSys.play('zap');
  if (M.explode) explosion(x2, y2, 55 * Math.sqrt(M.size), sigDmg(14, M) * 0.6 * M.explode, {});
  payloadAt(c, x2, y2, c.ang);
}
function phantomSlash(c) {
  const M = c.M; let [tx, ty] = targetPoint(c, 240);
  const near = nearestEnemy(tx, ty, 100); if (near) { tx = near.x; ty = near.y; }
  const r = 64 * Math.sqrt(M.size); const a = rand(0, TAU);
  later(0.05, () => {
    slashFx(tx - Math.cos(a) * r * 0.2, ty - Math.sin(a) * r * 0.2, a, 2.6, r, '#e9e3ff', pick([1, -1]), 0.2, 1.2);
    for (const e of G.enemies) { if (e.dead || e.spawning) continue; if (dist(tx, ty, e.x, e.y) < r + e.r) damageEnemy(e, { dmg: sigDmg(10, M), post: 18 * M.post * postMul(), crit: M.crit, burn: M.burn, chill: M.chill, shock: M.shock, bleed: M.bleed, vamp: M.vamp, src: 'sigil', col: '#efe9ff' }); }
    AudioSys.play('swing', 0.8);
    if (M.explode) explosion(tx, ty, 55 * Math.sqrt(M.size), sigDmg(10, M) * 0.6, {});
    payloadAt(c, tx, ty, a);
  });
}
function fallingStar(c) {
  const M = c.M; const [tx, ty] = targetPoint(c, 460); const r = 95 * Math.sqrt(M.size);
  markFx(tx, ty, r, '#ffcf5a', 0.55); streakFx(tx - 160, ty - 420, tx, ty, '#ffcf5a', 0.55);
  later(0.55, () => { explosion(tx, ty, r, sigDmg(32, M), { burn: 2 + M.burn, chill: M.chill, shock: M.shock, post: 30 * M.post * postMul(), col: '#ffcf5a', crit: M.crit, vamp: M.vamp }); payloadAt(c, tx, ty, c.ang); });
}
function ashGeyser(c) {
  const M = c.M; const [tx, ty] = targetPoint(c, 420);
  const cands = G.enemies.filter(e => !e.dead && !e.spawning && dist(tx, ty, e.x, e.y) < 330).sort((a, b) => dist(tx, ty, a.x, a.y) - dist(tx, ty, b.x, b.y)).slice(0, 2);
  const pts = cands.length ? cands.map(e => [e.x, e.y, e]) : [[tx, ty, null]];
  const r = 52 * Math.sqrt(M.size);
  for (const [x0, y0, e] of pts) {
    markFx(x0, y0, r, '#d9c3a9', 0.3);
    later(0.3, () => {
      const x = e && !e.dead ? e.x : x0, y = e && !e.dead ? e.y : y0;
      explosion(x, y, r, sigDmg(13, M), { stun: 0.6, post: 14 * M.post * postMul(), col: '#e8d3b8', burn: M.burn, chill: M.chill, shock: M.shock, crit: M.crit, knock: 60 });
      for (let i = 0; i < 14; i++) addPart({ k: 'ember', x: x + rand(-12, 12), y: y + rand(-8, 8), vx: rand(-30, 30), vy: rand(-320, -120), r: rand(3, 6), col: '#e8d3b8', life: rand(0.3, 0.6), drag: 1 });
      payloadAt(c, x, y, c.ang);
    });
  }
}
function raijin(c, n) {
  const M = c.M; const [tx, ty] = targetPoint(c, 460);
  for (let i = 0; i < n; i++) {
    later(i * 0.14, () => {
      const pool = G.enemies.filter(e => !e.dead && !e.spawning && dist(tx, ty, e.x, e.y) < 420);
      const e = pool.length ? pick(pool) : null; const x = e ? e.x : tx + rand(-150, 150), y = e ? e.y : ty + rand(-150, 150);
      lightningFx([[x + rand(-40, 40), y - 520], [x + rand(-20, 20), y - 260], [x, y]], '#d6caff', 0.22, 3.5); glowPuff(x, y, 70, '#b9a6ff', 0.25);
      explosion(x, y, 46 * Math.sqrt(M.size), sigDmg(18, M), { shock: 1 + M.shock, burn: M.burn, chill: M.chill, col: '#b9a6ff', post: 12 * M.post * postMul(), crit: M.crit, knock: 40 });
      AudioSys.play('zap'); if (i === n - 1) payloadAt(c, x, y, c.ang);
    });
  }
}
function layMine(c) {
  const M = c.M; const a = c.ang;
  const p = makeProj({ team: 'p', style: 'mine', x: c.x + Math.cos(a) * 24, y: c.y + Math.sin(a) * 24, vx: Math.cos(a) * 60, vy: Math.sin(a) * 60, drag: 4, r: 12 * Math.sqrt(M.size), size: M.size, life: 8, dmg: 0, col: '#ff5a4a',
    homing: M.homing, burn: M.burn, chill: M.chill, shock: M.shock, bleed: M.bleed, crit: M.crit, vamp: M.vamp,
    blast: { r: 85 * Math.sqrt(M.size), dmg: sigDmg(22, M), post: 16 * M.post * postMul() }, payload: c.payload, trigMode: c.payload ? 'timer' : null, depth: c.depth || 0 });
  if (p) { p.mine = true; if (M.homing) p.creep = 70; }
}
function summonWisp(c) {
  const M = c.M; if (G.wisps.filter(w => !w.fixed).length >= (resT('spirit') >= 1 ? 8 : 6)) G.wisps.splice(G.wisps.findIndex(w => !w.fixed), 1);
  G.wisps.push({ a: rand(0, TAU), t: 8 * M.life * (resT('spirit') >= 1 ? 1.5 : 1), cd: 0.3, M: Object.assign({}, M, { scatter: 1, echo: false, link: null }), payload: c.payload, depth: c.depth || 0, x: G.player.x, y: G.player.y });
  ring(G.player.x, G.player.y, 10, 60, '#7fffd4', 0.4, 3);
}
function updateWisps(dt) {
  const P = G.player;
  for (let i = G.wisps.length - 1; i >= 0; i--) {
    const w = G.wisps[i]; w.t -= dt; if (w.t <= 0) { glowPuff(w.x, w.y, 30, '#7fffd4', 0.3); G.wisps.splice(i, 1); continue; }
    if (!w.fixed) { w.a += 2.4 * dt; const R = 56 + (i % 2) * 14; const tx = P.x + Math.cos(w.a + i * 1.05) * R, ty = P.y + Math.sin(w.a + i * 1.05) * R; w.x = lerp(w.x, tx, Math.min(1, dt * 12)); w.y = lerp(w.y, ty, Math.min(1, dt * 12)); }
    w.cd -= dt;
    if (w.cd <= 0) {
      const e = nearestEnemy(w.x, w.y, 440);
      if (e) { w.cd = w.fixed ? 0.45 : 0.7; const a = Math.atan2(e.y - w.y, e.x - w.x); bolt({ x: w.x, y: w.y, ang: a, M: w.M, payload: w.payload, trigMode: w.payload ? 'hit' : null, depth: w.depth, src: 'wisp' }, { style: 'spark', speed: 860, r: 4, life: 0.6, dmg: w.fixed ? 5 : 4, col: w.fixed ? '#f0e0b0' : '#7fffd4' }); }
      else w.cd = 0.2;
    }
  }
}
function windStep(c) { const P = G.player; if (P) startDash(c.ang, true); }
function gainKi(n) { const P = G.player; if (P) P.ki = Math.min(G.S.kiMax, P.ki + n); }
// Rally: part of every wound can be won back by hitting back quickly
function rallyHeal(n) { const P = G.player; if (!P || P.dead || !(P.rally > 0)) return; const k = (hasR('rallybell') ? 2 : 1) * (G.S.rallyMul || 1); const h = Math.min(P.rally, n * k, G.S.maxHp - P.hp); if (h <= 0) return; P.hp += h; P.rally -= h; P.rallyFlash = 0.25; G.run.rallied = (G.run.rallied || 0) + h; }
function healPlayer(n, show = true) {
  if (G.S && G.S.flames && G.player) { const P = G.player; P.flameAcc = (P.flameAcc || 0) + n * 0.1; if (P.flameAcc >= 1 && P.hp < G.S.maxHp) { P.flameAcc -= 1; P.hp += 1; callout(P.x, P.y - 40, 'FLAME', '#7fd8ff', 12, 0.5, { serif: false, pop: 0 }); } return; }
  const P = G.player; if (!P || P.dead) return; const before = P.hp; P.hp = Math.min(G.S.maxHp, P.hp + n); const h = P.hp - before;
  if (show && h >= 1) { textPop(P.x, P.y - 22, '+' + Math.round(h), 'n', '#6dff9e'); embers(P.x, P.y, 6, '#6dff9e', { rise: 60 }); if (h >= 3) AudioSys.play('heal'); }
}
function giveWard() { const P = G.player; if (!P) return; P.ward = 1; ring(P.x, P.y, 10, 34, '#4fd1a5', 0.4, 3); AudioSys.play('ward'); }
function kiNova() { const P = G.player; explosion(P.x, P.y, 150, spellDmg(25), { col: '#59b8ff', post: 20, knock: 300 }); ring(P.x, P.y, 20, 170, '#9fd8ff', 0.5, 6); }

function nearestEnemy(x, y, maxD, exclude) {
  let best = null, bd = maxD * maxD;
  for (const e of G.enemies) { if (e.dead || e.spawning || e === exclude || e.untargetable) continue; const d = dist2(x, y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  return best;
}
function castRandomProj(target) {
  const P = G.player; const pool = SIG_LIST.filter(s => s.type === 'proj' && s.rar <= 3 && !['wisp', 'mine', 'bloodspear', 'meteor'].includes(s.id));
  const card = pick(pool); const a = Math.atan2(target.y - P.y, target.x - P.x);
  executeNode({ projs: [{ card, payload: null }], mods: [], utils: [], dups: [], link: null }, { x: P.x, y: P.y, ang: a, tx: target.x, ty: target.y, src: 'kitsune' });
}

// ---------- Damage ----------
function damageEnemy(e, h) {
  const R = { dmg: 0, crit: false, blocked: false };
  if (e.dead || e.spawning || e.invuln > 0) return R;
  const sh = Math.min(1, h.share || 1);
  const S = G.S, P = G.player;
  if (e.warded && !h.spectral && h.src !== 'blade' && h.src !== 'dash' && h.src !== 'focus' && h.src !== 'dot') { if (Math.random() < 0.15) callout(e.x, e.y - e.r - 14, 'WARDED', '#4fd1a5', 12, 0.4, { pop: 0 }); sparks(e.x, e.y, 3, '#4fd1a5', { max: 200 }); return R; }
  if (h.src !== 'dot' && !h.unblockable && e.canBlock(h)) { e.onBlocked(h); R.blocked = true; return R; }
  let dmg = h.dmg;
  if (h.src !== 'dot' && (h.forceCrit || Math.random() * 100 < S.crit + (h.crit || 0))) { R.crit = true; if (resT('storm') >= 3 && h.src !== 'arc' && !h.shock) h.shock = 1; if (h.src === 'blade' && P && G.clock - (G.critCastT ?? -9) > 0.25) { const B = curBlade(); if (B.critCast) { G.critCastT = G.clock; const tg = e; later(0.02, () => castFree(B.critCast, tg.x, tg.y, Math.atan2(tg.y - P.y, tg.x - P.x))); } } dmg *= h.critMul || 1.8; if (hasR('kisiphon') && P && G.clock - (P.siphonT || -9) > 0.15) { P.siphonT = G.clock; P.ki = Math.min(S.kiMax, P.ki + 2); } }
  if (e.armored) dmg *= 0.6;
  if ((e.elite || e.isBoss) && hasR('trophy')) dmg *= 1.35;
  if (hasR('prism')) { const st = e.st; const n = (st.burn > 0) + (st.chill > 0 || st.frozen > 0) + (st.shock > 0) + (st.bleed > 0); dmg *= 1 + 0.12 * n; }
  if (e.state === 'broken' && h.src !== 'blade') dmg *= 1.5;
  if (e.st.frozen > 0 && hasR('frostbite')) dmg *= 1.4;
  if (e.st.frozen > 0 && resT('frost') >= 2) dmg *= 1.5;
  if (h.src === 'blade' && lowHpRage() > 1) dmg *= lowHpRage();
  if (e.st.shock > 0 && hasR('coil')) dmg *= 1.15;
  if (h.src === 'blade' && P.rageT > 0) dmg *= 1.5;
  if (e.isBoss && e.dmgTakenMul) dmg *= e.dmgTakenMul;
  dmg *= 1 + comboBonus();
  const own = h.src !== 'dot';
  if (own && hasR('unbroken') && P) dmg *= 1 + Math.min(0.6, Math.floor((P.streak || 0) / 8) * 0.04);
  if (hasR('bloodhound') && G.frenzy > 0) dmg *= 1.25;
  if (own && P && P.cyclicT > 0) dmg *= 1 + 0.12 * (P.cyclicN || 0);
  if (own && S.daruma && P) dmg *= 1 + 0.04 * (P.darumaN || 0);
  if (own && S.lucky && h.src !== 'react' && Math.random() < 0.07 + S.luck / 2000) { dmg *= 3; if (G.clock - (G.luckyMsg ?? -9) > 0.4) { G.luckyMsg = G.clock; callout(e.x, e.y - e.r - 22, 'LUCKY!', '#ffd36b', 15, 0.5, { serif: false, pop: 0 }); } sparks(e.x, e.y, 8, '#ffd36b', { min: 150, max: 450 }); if (Math.random() < 0.3) dropAsh(e.x, e.y, 1); }
  // bosses shrug off much of a spell barrage: their fall comes from the sword and the deflect
  if (e.isBoss && h.src !== 'blade' && h.src !== 'dash' && h.src !== 'focus' && h.src !== 'sting') dmg *= 0.7;
  // counter-hit: striking into a wind-up
  const melee = h.src === 'blade' || h.src === 'dash' || h.src === 'focus';
  const counter = melee && e.state === 'windup' && e.step && !e.step.perilous && e.state !== 'broken';
  if (counter) dmg *= 1.25;
  let resM = 1;
  // Resolve: a boss can't be erased by raw burst. Damage beyond its resolve rate is softened (with diminishing,
  // never-zero returns). Ripostes, counter-hits, reflected shots and a broken boss always take it in full.
  if (e.isBoss && dmg > 0 && !e.lastStand) {
    const exempt = counter || h.riposte || h.src === 'reflect' || e.state === 'broken';
    const now = G.clock, tau = 2; e.resLoad = (e.resLoad || 0) * Math.exp(-Math.max(0, now - (e.resT0 ?? now)) / tau); e.resT0 = now;
    if (!exempt) {
      const T = e.maxHp * BOSS_RESOLVE, rate = e.resLoad / tau;
      e.resLoad += dmg;
      if (rate > T) {
        const m = Math.max(0.1, Math.pow(T / rate, 0.8)); G.run.resLost = (G.run.resLost || 0) + dmg * (1 - m); dmg *= m; resM = m; e.resolveT = 0.35; e.pressT = 2;
        if (m < 0.7 && G.clock - (e.resolveMsgT ?? -9) > 5) { e.resolveMsgT = G.clock; callout(e.x, e.y - e.r - 30, 'RESOLVE', '#dfe8ff', 15, 0.6, { serif: false, pop: 0 }); }
        if (m < 0.7 && !G.hintsShown.resolve) { G.hintsShown.resolve = true; G.hint = { txt: 'Bosses have Resolve: raw burst is softened. Ripostes, counter-hits and hits on a broken boss land in full.', t: 0, life: 5.5, col: '#dfe8ff' }; }
      }
    }
  }
  if (h.src === 'blade') addCombo(1);
  e.hp -= dmg; R.dmg = dmg; G.run.dmgDealt += dmg; if (h.src !== 'dot' && dmg > 0) G.lastEngageT = G.clock;
  if (h.src !== 'dot') e.flash = 0.09;
  // posture
  let post = (h.post || 0) * (R.crit ? 1.3 : 1) * resM;
  if ((e.st.chill > 0 || e.st.frozen > 0) && hasR('frostbite')) post *= 1.5;
  if (e.isBoss) post *= e.lastStand ? (h.src === 'blade' ? 0.3 : h.src === 'reflect' ? 0.5 : 0.15) : (h.src === 'reflect' ? 0.25 : 0.1); else if (e.elite) post *= 0.6;
  if (counter) { post *= 1.6; if (G.clock - (e.counterT ?? -9) > 0.5) { e.counterT = G.clock; callout(e.x, e.y - e.r - 16, 'COUNTER-HIT', '#ffd36b', 13, 0.5, { serif: false, pop: 0 }); styleGain('counter', 9, 'COUNTER-HIT'); sparks(e.x, e.y, 10, '#ffd36b', { min: 200, max: 600 }); }
    if ((h.fin || h.src === 'dash' || h.riposte) && !e.heavy && !e.isBoss && !e.elite) { e.cancelAttack(); e.state = 'stagger'; e.t = 0.45; } }
  else if (h.fin && !e.heavy && !e.isBoss && !e.elite && e.state === 'move') { e.state = 'stagger'; e.t = 0.28; }
  if (post > 0) e.addPosture(post);
  // knockback
  if (h.kx !== undefined && !e.isBoss) { const k = (h.knock || 60) * (e.d.heavy ? 0.35 : 1) * (e.elite ? 0.5 : 1); e.kx += h.kx * k; e.ky += h.ky * k; }
  if (h.src === 'blade' && e.d.flinch && !e.elite) e.flinch(e.d.flinch);
  // statuses
  if (h.src !== 'dot' && h.src !== 'react' && !h.burn && e.st.burn > 0 && resT('flame') >= 3) h = Object.assign({}, h, { burn: 1 });
  if (resT('storm') >= 2 && h.src !== 'dot' && h.src !== 'arc' && h.src !== 'react' && h.src !== 'blast' && h.src !== 'storm') { G.stormHits = (G.stormHits || 0) + sh; if (G.stormHits >= 8) { G.stormHits = 0; const tx = e; later(0.02, () => stormStrike(tx)); } }
  if (sh < 1) h = Object.assign({}, h, { burn: (h.burn || 0) * sh, chill: (h.chill || 0) * sh, shock: (h.shock || 0) * sh, bleed: (h.bleed || 0) * sh });
  if (h.burn) applyStatus(e, 'burn', h.burn);
  if (h.chill) applyStatus(e, 'chill', h.chill);
  if (h.shock && h.src !== 'arc') applyStatus(e, 'shock', h.shock);
  if (h.bleed) applyStatus(e, 'bleed', h.bleed);
  // lifesteal (banked, rate-limited)
  const ls = S.lifesteal / 100 + (h.vamp || 0);
  if (ls > 0 && h.src !== 'dot') G.lsBank = Math.min(30, G.lsBank + dmg * ls);
  if (dmg >= 0.5) textPop(e.x, e.y - e.r - 4, Math.round(dmg), R.crit ? 'crit' : (h.src === 'dot' ? 'dot' : 'n'), h.src === 'dot' ? h.col : undefined, e);
  if (h.src !== 'dot') { e.jolt = 1; e.joltA = h.kx !== undefined ? Math.atan2(h.ky, h.kx) : (P ? Math.atan2(e.y - P.y, e.x - P.x) : 0); }
  if (e.hp <= 0) {
    if (e.isBoss) { e.hp = 1; if (!e.lastStand && e.state !== 'broken') startLastStand(e); }
    else killEnemy(e, h);
  } else if (!e.isBoss && !e.elite && h.src === 'blade' && hasR('execute') && e.hp < e.maxHp * 0.15) { e.hp = 0; callout(e.x, e.y - e.r - 12, 'EXECUTED', '#ff6a4a', 13, 0.5, { pop: 0 }); killEnemy(e, h); }
  if (h.src !== 'dot' && h.src !== 'kitsune' && h.src !== 'arc' && hasR('kitsune') && Math.random() < 0.1 * sh) castRandomProj(e);
  return R;
}

function applyStatus(e, k, n) {
  const st = e.st; if (e.dead) return;
  if (k === 'burn') {
    if (st.frozen > 0 || st.chill >= 2) { st.chill = 0; st.frozen = 0; react(e, 'steam'); return; }
    st.burn = Math.min(resT('flame') >= 3 ? 20 : 12, st.burn + n); st.burnT = 3;
  } else if (k === 'chill') {
    if (st.burn >= 2) { st.burn = 0; react(e, 'steam'); return; }
    if (st.frozen > 0) return;
    st.chill += n; st.chillT = 2.5;
    if (st.chill >= 5 && e.isBoss && (e.d.frostborn || (e.freezeImmT ?? -99) > G.clock)) {
      st.chill = 4; if (G.clock - (e.resistMsgT ?? -9) > 3) { e.resistMsgT = G.clock; callout(e.x, e.y - e.r - 16, e.d.frostborn ? 'FROSTBORN' : 'THAWING', '#bfeaff', 13, 0.5, { serif: false, pop: 0 }); }
    } else if (st.chill >= 5) { st.chill = 0; st.frozen = (e.isBoss ? 0.9 : 1.9) * (1 + powOf('frost') * 0.03) * (resT('frost') >= 3 ? 2 : 1); if (e.isBoss) { st.frozen = Math.min(1.2, st.frozen); e.freezeImmT = G.clock + st.frozen + 6; } if (!e.isBoss) e.cancelAttack(); shards(e.x, e.y, 8, '#bfeaff'); AudioSys.play('frost'); ring(e.x, e.y, e.r, e.r * 2.2, '#8fd8ff', 0.3, 3); }
  } else if (k === 'shock') {
    if (n < 1 && Math.random() > n) return;
    if (st.frozen > 0) { react(e, 'shatter'); return; }
    if (st.burn >= 3 && Math.random() < 0.35) { react(e, 'overload'); }
    st.shock = 2;
    const arcs = 1 + (hasR('coil') ? 2 : 0) + Math.max(0, n - 1) + (resT('storm') >= 1 ? 1 : 0);
    let from = e; const used = new Set([e]);
    for (let i = 0; i < arcs; i++) {
      let best = null, bd = 175 * 175;
      for (const o of G.enemies) { if (o.dead || o.spawning || used.has(o)) continue; const d = dist2(from.x, from.y, o.x, o.y); if (d < bd) { bd = d; best = o; } }
      if (!best) break; used.add(best);
      lightningFx([[from.x, from.y], [best.x, best.y]], '#c9b6ff', 0.14, 1.6);
      damageEnemy(best, { dmg: spellDmg(5 + powOf('storm') * 0.6), post: 3, src: 'arc' }); best.st.shock = 2; from = best;
    }
  } else if (k === 'bleed') {
    st.bleed += n; st.bleedT = 4;
    if (st.bleed >= (resT('blood') >= 2 ? 4 : 5)) {
      st.bleed = 0; const pct = G.clock - (e.hemT ?? -9) > (e.isBoss ? 1.5 : 0.6); if (pct) e.hemT = G.clock;
      const d = Math.max(spellDmg(10 + powOf('blood') * 1.5), pct ? e.maxHp * (e.isBoss ? 0.015 : 0.12) * (1 + powOf('blood') * 0.02) : 0);
      if (resT('blood') >= 2) healPlayer(2, false);
      shardBurst(e.x, e.y, 10, '#ff2a4f', { max: 320 }); sparks(e.x, e.y, 10, '#ff2a4f'); callout(e.x, e.y - e.r - 14, 'HEMORRHAGE', '#ff4a5a', 13, 0.7, { serif: false, pop: 0 });
      damageEnemy(e, { dmg: d, post: e.maxPosture * 0.12, src: 'react', unblockable: true });
    }
  }
}
function react(e, kind) {
  if (kind === 'steam') {
    callout(e.x, e.y - e.r - 14, 'STEAM', '#dff3ff', 14, 0.7, { serif: false, pop: 0 });
    smoke(e.x, e.y, 10, '#c8d8e8', { r: 26, a: 0.3, max: 140 });
    explosion(e.x, e.y, 82, spellDmg(14) + e.maxHp * (e.isBoss ? 0.01 : 0.05), { col: '#dff3ff', post: 18 });
  } else if (kind === 'shatter') {
    e.st.frozen = 0; callout(e.x, e.y - e.r - 14, 'SHATTER', '#9fe6ff', 15, 0.7, { serif: false, pop: 0 });
    shards(e.x, e.y, 18, '#bfeaff'); AudioSys.play('shatter'); ring(e.x, e.y, e.r, e.r * 3, '#bfeaff', 0.35, 4);
    const pct = G.clock - (e.shatT ?? -9) > (e.isBoss ? 1.5 : 0.6); if (pct) e.shatT = G.clock;
    damageEnemy(e, { dmg: spellDmg(22 + powOf('frost') * 2) + (pct ? e.maxHp * (e.isBoss ? 0.02 : 0.15) : 0), post: e.maxPosture * 0.15, src: 'react', unblockable: true });
  } else if (kind === 'overload') {
    callout(e.x, e.y - e.r - 14, 'OVERLOAD', '#ffd0ff', 14, 0.7, { serif: false, pop: 0 });
    explosion(e.x, e.y, 92, spellDmg(18), { col: '#e8a8ff', stun: 0.4, post: 14 });
  }
}

function explosion(x, y, r, dmg, o = {}) {
  const col = o.col || '#ff9a4a';
  for (const e of G.enemies) {
    if (e.dead || e.spawning) continue; const d = dist(x, y, e.x, e.y); if (d > r + e.r) continue;
    const a = Math.atan2(e.y - y, e.x - x);
    damageEnemy(e, { dmg, post: o.post ?? dmg * 0.5, burn: o.burn || 0, chill: o.chill || 0, shock: o.shock || 0, bleed: o.bleed || 0, src: o.src || 'blast', kx: Math.cos(a), ky: Math.sin(a), knock: o.knock ?? 220, unblockable: true, vamp: o.vamp || 0, crit: o.crit || 0, share: o.share });
    if (o.stun && !e.dead) { if (!e.isBoss) e.st.stun = Math.max(e.st.stun, o.stun); else if ((e.stunImmT ?? -99) <= G.clock) { e.st.stun = Math.max(e.st.stun, o.stun * 0.3); e.stunImmT = G.clock + e.st.stun + 2.5; } }
  }
  glowPuff(x, y, r * 1.5, col, 0.24); ring(x, y, r * 0.3, r, col, 0.3, 5); addLight(x, y, r * 2 + 50, col, 0.3, 0.9); sparks(x, y, Math.min(28, 8 + r / 6), col, { min: 120, max: 380 + r * 2 });
  smoke(x, y, 5, '#1d1a20', { r: r * 0.4 }); embers(x, y, 6, col); scorch(x, y, r * 0.9);
  AudioSys.play('boom', r / 85); shake(Math.min(7, r / 20));
}

function dropAsh(x, y, amount) {
  let n = Math.floor(amount) + (Math.random() < amount % 1 ? 1 : 0);
  while (n > 0) {
    const v = n >= 15 ? 5 : 1; n -= v; const a = rand(0, TAU), sp = rand(40, 200);
    G.pickups.push({ k: 'ash', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, v, t: 0, mag: false });
  }
}
function dropPickup(k, x, y) { const a = rand(0, TAU); G.pickups.push({ k, x, y, vx: Math.cos(a) * 80, vy: Math.sin(a) * 80, v: 1, t: 0, mag: false }); }

function killEnemy(e, info = {}) {
  if (e.dead) return; e.dead = true; e.releaseToken();
  if (e.isBoss) { onBossDeath(e); return; }
  G.run.kills++; G.killsThisWave += e.summoned ? 0.5 : 1; if (!info.deathblow) styleGain(info.src === 'blade' ? 'kill' : 'spellkill', e.elite ? 10 : 2.5, e.elite ? 'ELITE SLAIN' : null);
  const S = G.S;
  if (!e.summoned || Math.random() < 0.5) {
    if (G.player) G.player.streak = (G.player.streak || 0) + 1;
    if (G.S.flames && G.player) { const P = G.player; P.flameKills = (P.flameKills || 0) + 1; if (P.flameKills >= 15) { P.flameKills = 0; if (P.hp < G.S.maxHp) { P.hp += 1; callout(P.x, P.y - 40, 'REKINDLED', '#7fd8ff', 14, 0.6, { serif: false, pop: 0 }); } } }
    if (G.S.lucky && Math.random() < 0.012 + G.S.luck / 9000) jackpot(e);
    let ash = e.d.ash * (e.elite ? 5 : 1) * (hasR('bloodhound') && G.frenzy > 0 ? 2 : 1); if (info.deathblow) { ash *= 1.5; if (hasR('hungry')) ash *= 2; } ash *= (1 + S.ashGain / 100) * (G.omenMods.ash || 1) * (1 + styleRank().ash);
    { const F = G.run.fortune && FORTUNES[G.run.fortune]; if (F) { if (F.ash) ash *= F.ash; if (F.snake && e.elite) ash *= 3; if (F.jackpot && info.deathblow) { ash += 6; healPlayer(3, false); } } }
    if (G.waveActive) dropAsh(e.x, e.y, ash);
    { const B = curBlade(); const R = G.run; if (B.grow) R.bladeKills = (R.bladeKills || 0) + 1; if (B.killHeal) healPlayer(B.killHeal, false);
      if (B.killCast && G.clock - (G.killCastT ?? -9) > 0.12) { G.killCastT = G.clock; const t = nearestEnemy(e.x, e.y, 520, e); castFree(B.killCast, e.x, e.y, t ? Math.atan2(t.y - e.y, t.x - e.x) : rand(0, TAU), t ? t.x : undefined, t ? t.y : undefined); } }
    { const R = G.run; if (curBlade().flags.hungry && (R.hungerSlots || 0) < 3) { R.hungerKills = (R.hungerKills || 0) + 1; if (R.hungerKills >= 35) { R.hungerKills = 0; R.hungerSlots = (R.hungerSlots || 0) + 1; fitChains(); callout(G.player.x, G.player.y - 60, 'THE BLADE HUNGERS: +1 SLOT', '#ff9a6a', 16, 1.4, { serif: false }); } } }
    if (Math.random() < 0.022 * (1 + S.luck / 100)) dropPickup('heart', e.x, e.y);
  }
  if (e.elite) dropPickup('chest', e.x, e.y);
  if (e.affixes.includes('volatile')) { G.hazards.push({ k: 'ground', x: e.x, y: e.y, r: 110, t: 0, delay: 0.75, dmg: 14 * G.scale.dmg, post: 0, perilous: true, src: null }); callout(e.x, e.y - 20, 'VOLATILE', '#ff6a3a', 14, 0.6); }
  if (e.affixes.includes('twinned') && !e.twin) for (let k = 0; k < 2; k++) { const c = new Enemy(e.type, clamp(e.x + rand(-30, 30), 30, G.ARENA.w - 30), clamp(e.y + rand(-30, 30), 30, G.ARENA.h - 30), { hp: e.maxHp * 0.3, twin: true, scaleR: 0.8, summoned: true }); c.dmgMul = e.dmgMul * 0.7; c.kx = rand(-300, 300); c.ky = rand(-300, 300); G.enemies.push(c); }
  shardBurst(e.x, e.y, 8 + Math.round(e.r * 0.4), e.elite ? '#ffd36b' : e.d.col, { max: 420 }); ring(e.x, e.y, e.r * 0.6, e.r * 2.2, '#ffffff', 0.22, 3); glowPuff(e.x, e.y, e.r * 2.5, e.d.col, 0.18);
  decalSplat(e.x, e.y, e.r * 0.9, e.d.col, 5, 3.5); AudioSys.play('pop'); addCombo(1);
  if (e.d.ai === 'bomber' && !e.selfKill) { const x = e.x, y = e.y; later(0.02, () => { explosion(x, y, 95, spellDmg(22), { col: '#ff8a3a', post: 30 }); callout(x, y - 20, 'BOOM', '#ffb347', 18, 0.5); }); }
  if (e.st.burn > 0 && (hasR('lantern') || VESSEL[G.run.vessel].burnBurst || resT('flame') >= 2)) { const x = e.x, y = e.y; later(0.05, () => explosion(x, y, 75, spellDmg(16 + powOf('flame') * 1.5), { burn: 1, col: '#ff7a2f' })); }
  if (hasR('plague') && (e.st.burn > 0 || e.st.bleed > 0)) {
    for (const o of G.enemies) { if (o.dead || o === e || dist2(e.x, e.y, o.x, o.y) > 140 * 140) continue; if (e.st.burn > 0) applyStatus(o, 'burn', Math.ceil(e.st.burn / 2)); if (e.st.bleed > 0) applyStatus(o, 'bleed', 2); }
    ring(e.x, e.y, 10, 140, '#9acd32', 0.4, 2);
  }
  if (hasR('sakura')) for (let i = 0; i < 2; i++) makeProj({ team: 'p', style: 'petal', x: e.x, y: e.y, vx: rand(-200, 200), vy: rand(-200, 200), r: 5, life: 1.4, dmg: spellDmg(6), post: 3, homing: 2.2, col: '#ffb7d5' });
}

function breakEnemy(e) {
  if (e.state === 'broken' || e.dead) return;
  e.cancelAttack(); e.state = 'broken'; e.t = e.isBoss ? 3.4 : 2.6; e.posture = e.maxPosture; e.brokenT = 0; e.armored = false; e.warded = false; e.exposeT = 0; e.vanishT = 0; e.air = null;
  styleGain('break', e.isBoss ? 30 : e.elite ? 14 : 7, 'BREAK');
  ring(e.x, e.y, e.r, e.r * 3.5, '#ff3a2a', 0.4, 4); sparks(e.x, e.y, 18, '#ffb347', { max: 600 }); AudioSys.play('break'); hitstop(0.05); shake(5); addLight(e.x, e.y, 220, '#ff5a3a', 0.4, 1); camPunch(0.02);
  callout(e.x, e.y - e.r - 22, 'BREAK', '#ff6a4a', e.isBoss ? 30 : 18, 0.7);
}

// a boss at 0 HP does not fall: it makes a last stand until its posture is broken
function startLastStand(e) {
  e.lastStand = true; e.lastStandT = 0; e.posture = Math.max(e.posture, e.maxPosture * 0.25);
  callout(e.x, e.y - e.r - 34, 'LAST STAND', '#ff5a4a', 28, 1.1, { serif: false });
  G.hint = { txt: 'Its life is spent. Break its posture: deflect, riposte, strike.', t: 0, life: 3.2, col: '#ffb08a' };
  AudioSys.play('gong'); screenFlash('#ff2a2a', 0.12); shake(8); ring(e.x, e.y, e.r, e.r * 5, '#ff5a4a', 0.5, 6);
}
function deathblow(e) {
  const P = G.player; const ang = Math.atan2(e.y - P.y, e.x - P.x);
  G.run.deathblows++; styleGain('deathblow', e.isBoss ? 45 : e.elite ? 24 : 15, e.isBoss ? 'BOSS DEATHBLOW' : 'DEATHBLOW');
  if (resT('frost') >= 2) { for (const o of G.enemies) if (o !== e && !o.dead && !o.spawning && dist(o.x, o.y, e.x, e.y) < 220) applyStatus(o, 'chill', 3); ring(e.x, e.y, 20, 220, '#8fd8ff', 0.4, 4); }
  hitstop(e.isBoss ? 0.2 : 0.11); slowmo(e.isBoss ? 1.0 : 0.42, e.isBoss ? 0.15 : 0.25); invertFrames(e.isBoss ? 0.12 : 0.06); shake(e.isBoss ? 20 : 10); kick(ang, 14);
  const ca = ang + Math.PI / 2 + rand(-0.5, 0.5);
  inkSlash(e.x, e.y, ca, (e.r * 2 + 150) * (e.isBoss ? 2.4 : 1), '#ff2a3a', e.isBoss ? 22 : 13); camPunch(e.isBoss ? 0.11 : 0.05); addLight(e.x, e.y, e.isBoss ? 520 : 300, '#ff3a2a', 0.5, 1.1);
  shardBurst(e.x, e.y, e.isBoss ? 40 : 22, e.d.col, { max: 640 }); shardBurst(e.x, e.y, 12, '#ffffff', { max: 760, ang, spread: 0.45 });
  sparks(e.x, e.y, 26, '#ff4a3a', { min: 200, max: 820, w: 2.5 }); glowPuff(e.x, e.y, e.isBoss ? 200 : 100, '#ff3a2a', 0.32);
  decalSplat(e.x, e.y, e.r * 1.6, '#ff3a3a', 10, 3);
  callout(e.x, e.y - e.r - 30, 'DEATHBLOW', '#ff4a3a', e.isBoss ? 40 : 24, 0.9); G.calloutLock = G.clock + 0.35;
  AudioSys.play('deathblow');
  if (hasR('oath')) healPlayer(G.S.maxHp * (e.isBoss || e.elite ? 0.12 : 0.03));
  if (G.S.flames && G.player.hp < G.S.maxHp) { G.player.hp += 1; callout(G.player.x, G.player.y - 40, 'REKINDLED', '#7fd8ff', 14, 0.6, { serif: false, pop: 0 }); }
  healPlayer(e.isBoss ? 6 : e.elite ? 3 : 1, false); { const B = curBlade(); if (B.dbHeal) healPlayer(G.S.maxHp * B.dbHeal); } dashRefund(9); rallyHeal(999); if (G.player) G.player.ki = Math.min(G.S.kiMax, G.player.ki + 15); if (!e.isBoss && Math.random() < 0.06 * (1 + G.S.luck / 100)) dropPickup('heart', e.x, e.y);
  if (hasR('thunderclap')) { const x = e.x, y = e.y; later(0.05, () => { explosion(x, y, 160, spellDmg(30), { col: '#ffe27a', post: 18, knock: 400 }); }); }
  gainFocus(1);
  for (const o of G.enemies) if (o !== e && !o.dead && !o.isBoss && dist2(o.x, o.y, e.x, e.y) < 150 * 150) o.addPosture((o.elite ? 4 : 10) * postMul());
  if (e.isBoss && e.lives > 1) e.phaseUp();
  else { if (!e.isBoss) sliceFx(e, ca); e.hp = 0; killEnemy(e, { deathblow: true }); }
}

// ---------- Projectile update ----------
function projHit(p, e) {
  const ang = Math.atan2(p.vy, p.vx);
  const r = damageEnemy(e, { dmg: p.dmg, post: p.post, crit: p.crit, critMul: p.critMul, burn: p.burn, chill: p.chill, shock: p.shock, bleed: p.bleed, vamp: p.vamp, src: p.reflected ? 'reflect' : 'sigil', kx: Math.cos(ang), ky: Math.sin(ang), knock: p.knock, sx: p.x, sy: p.y, spectral: p.spectral, unblockable: p.spectral });
  if (p.split && !p.didSplit) { p.didSplit = true; for (let k = -1; k <= 1; k++) { const a = ang + k * 0.5; const c = makeProj(Object.assign({}, p, { id: undefined, x: p.x, y: p.y, vx: Math.cos(a) * 600, vy: Math.sin(a) * 600, r: p.r * 0.7, dmg: p.dmg * 0.4, baseDmg: p.dmg * 0.4, life: 0.4, split: false, didSplit: true, payload: null, trigMode: null, blast: null, hits: undefined })); if (c) { c.hits = new Map([[e.id, G.clock]]); } } }
  if (p.hook && !p.hooked) { p.hooked = true; const P = G.player; const a2 = Math.atan2(P.y - e.y, P.x - e.x); if (e.heavy) { P.kx -= Math.cos(a2) * 900; P.ky -= Math.sin(a2) * 900; } else { e.kx += Math.cos(a2) * 900; e.ky += Math.sin(a2) * 900; e.st.stun = Math.max(e.st.stun, 0.35); } beamFx(P.x, P.y, e.x, e.y, 2, '#d9c49a', 0.2); }
  if (p.arc && !r.blocked) { const o = nearestEnemy(e.x, e.y, 200, e); if (o) { lightningFx([[e.x, e.y], [o.x, o.y]], '#c9b6ff', 0.14, 1.6); damageEnemy(o, { dmg: p.dmg * 0.5 * p.arc, post: 4, src: 'arc' }); } }
  if (!p.tick) { sparks(p.x, p.y, 4, p.col, { min: 80, max: 260 }); AudioSys.play('tick'); }
  if (r.blocked && !p.tick) { p.life = 0; return; }
  if (p.trigMode === 'hit' && p.payload && !p.triggered) { p.triggered = true; executeNode(p.payload, { x: p.x, y: p.y, ang, tx: p.x + Math.cos(ang) * 160, ty: p.y + Math.sin(ang) * 160, src: 'trigger' }, p.depth + 1); }
  if (p.tick) return;
  if (p.pierce > 0) { p.pierce--; return; }
  if (p.bounce > 0) {
    p.bounce--; const t = nearestEnemy(p.x, p.y, 380, e); const sp = Math.hypot(p.vx, p.vy);
    if (t) { const a = Math.atan2(t.y - p.y, t.x - p.x); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; } else { p.vx = -p.vx; p.vy = -p.vy; }
    return;
  }
  if (p.boomer && !p.returning) { p.returning = true; return; }
  p.life = 0;
}
function projDie(p) {
  if (p.team === 'p') {
    if (p.blast) explosion(p.x, p.y, p.blast.r, p.blast.dmg, { post: p.blast.post, burn: p.burn, chill: p.chill, shock: p.shock, bleed: p.bleed, col: p.col, crit: p.crit, vamp: p.vamp, share: p.share });
    if (p.explode) explosion(p.x, p.y, 55 * Math.sqrt(p.size), p.dmg * 0.6 * p.explode, { col: p.col, burn: p.burn, chill: p.chill, share: p.share });
    if (p.trigMode === 'timer' && p.payload) executeNode(p.payload, { x: p.x, y: p.y, ang: Math.atan2(p.vy, p.vx), tx: p.x + p.vx * 0.3, ty: p.y + p.vy * 0.3, src: 'trigger' }, p.depth + 1);
    if (p.onDie === 'chain') chainLightning({ x: p.x, y: p.y, ang: Math.atan2(p.vy, p.vx), M: newMods(), depth: p.depth || 0, src: 'sigil' }, 3, 9);
    if (!p.blast && !p.explode && !p.noTrail) glowPuff(p.x, p.y, p.r * 2.5, p.col, 0.12);
  } else glowPuff(p.x, p.y, p.r * 2.5, p.col, 0.15);
}
function reflectProj(p, P) {
  const src = p.owner && !p.owner.dead ? p.owner : null;
  const sp = Math.max(500, Math.hypot(p.vx, p.vy) * 1.5);
  const a = src ? Math.atan2(src.y - p.y, src.x - p.x) : Math.atan2(-p.vy, -p.vx);
  p.team = 'p'; p.reflected = true; p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.life = p.maxLife = 1.6; p.age = 0;
  p.dmg = p.dmg * 3 * (1 + G.S.dmg / 100); p.post = (p.post || 10) * 2.5 * postMul() * G.S.deflectPost; p.col = '#ffd36b'; p.homing = src ? 3 : 0; p.hits = new Map(); p.pierce = 0; p.bounce = 0; p.perilous = false; p.eboomer = null; p.snake = 0; p.tether = false; p.curve = 0;
}
function updateProjs(dt) {
  const P = G.player, A = G.ARENA;
  for (let i = G.projs.length - 1; i >= 0; i--) {
    const p = G.projs[i];
    p.age += dt; p.life -= dt; p.spin += dt * 14;
    projTrail(p);
    if (p.team === 'p') {
      if (p.orbit) {
        p.orbitA += p.orbitW * dt; const R = p.orbitR * (p.age < 0.15 ? p.age / 0.15 : 1);
        const tx = P.x + Math.cos(p.orbitA) * R, ty = P.y + Math.sin(p.orbitA) * R;
        p.vx = -Math.sin(p.orbitA) * p.orbitW * R; p.vy = Math.cos(p.orbitA) * p.orbitW * R; p.x = tx; p.y = ty;
      } else {
        if (p.homing > 0) {
          const t = nearestEnemy(p.x, p.y, 440);
          if (t) { const sp = Math.hypot(p.vx, p.vy); const na = turnToward(Math.atan2(p.vy, p.vx), Math.atan2(t.y - p.y, t.x - p.x), p.homing * 3 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
        }
        if (p.curve) { const k = p.curve * dt * Math.max(0, 1 - p.age / p.maxLife); const c = Math.cos(k), s = Math.sin(k); const vx = p.vx * c - p.vy * s; p.vy = p.vx * s + p.vy * c; p.vx = vx; }
        if (p.boomer && (p.returning || p.age > p.maxLife * 0.42)) {
          p.returning = true; const a = Math.atan2(P.y - p.y, P.x - p.x); const sp = Math.max(420, Math.hypot(p.vx, p.vy));
          const na = turnToward(Math.atan2(p.vy, p.vx), a, 9 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp;
          if (dist2(p.x, p.y, P.x, P.y) < 24 * 24 && p.age > 0.2) { G.projs.splice(i, 1); continue; }
        }
        if (p.creep) { const t = nearestEnemy(p.x, p.y, 300); if (t) { const a = Math.atan2(t.y - p.y, t.x - p.x); p.vx = Math.cos(a) * p.creep; p.vy = Math.sin(a) * p.creep; } }
        if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
        if (p.accel) { const f = Math.min(3, 1 + p.age * 2.2); const sp = Math.hypot(p.vx, p.vy) || 1; const want = (p.v0 || (p.v0 = sp)) * f; p.vx *= want / sp; p.vy *= want / sp; p.dmg = p.baseDmg * (1 + Math.min(1.5, p.age * 2)); }
        p.x += p.vx * dt; p.y += p.vy * dt;
        if (p.trail) { p.trailT = (p.trailT || 0) - dt; if (p.trailT <= 0) { p.trailT = 0.08; const f = makeProj({ team: 'p', style: 'flame', x: p.x, y: p.y, vx: 0, vy: 0, r: 11, life: 0.55, dmg: spellDmg(2), post: 1, burn: 1, tick: 0.25, pierce: 99, col: '#ff7a2f', knock: 0 }); if (f) f.noTrail = true; } }
        if (p.spectral && (p.x < -40 || p.x > A.w + 40 || p.y < -40 || p.y > A.h + 40)) p.life = 0;
        else if (!p.spectral && (p.x < 0 || p.x > A.w || p.y < 0 || p.y > A.h)) {
          if (p.bounce > 0) { if (p.x < 0 || p.x > A.w) p.vx = -p.vx; if (p.y < 0 || p.y > A.h) p.vy = -p.vy; p.x = clamp(p.x, 0, A.w); p.y = clamp(p.y, 0, A.h); p.bounce--; }
          else if (p.boomer) { p.returning = true; p.x = clamp(p.x, 0, A.w); p.y = clamp(p.y, 0, A.h); }
          else p.life = 0;
        }
      }
      if (p.pull) {
        for (const e of G.enemies) {
          if (e.dead || e.spawning) continue; const d = dist(p.x, p.y, e.x, e.y); if (d > p.pull || d < 1) continue;
          const f = (1 - d / p.pull) * (e.isBoss ? 25 : e.d.heavy ? 90 : 230) * dt; e.x += (p.x - e.x) / d * f; e.y += (p.y - e.y) / d * f;
        }
      }
      if (p.life > 0) {
        if (p.mine) {
          if (p.age > 0.4) for (const e of G.enemies) { if (e.dead || e.spawning) continue; if (dist2(p.x, p.y, e.x, e.y) < (p.r + e.r + 8) ** 2) { p.life = 0; break; } }
        } else {
          for (const e of G.enemies) {
            if (e.dead || e.spawning || e.untargetable) continue; const rr = p.r + e.r; if (dist2(p.x, p.y, e.x, e.y) > rr * rr) continue;
            const last = p.hits.get(e.id); if (last !== undefined && (!p.tick || G.clock - last < p.tick)) continue;
            p.hits.set(e.id, G.clock); projHit(p, e); if (p.life <= 0) break;
          }
        }
      }
    } else {
      // enemy projectile
      if (p.held) { if (p.life <= 0) { G.projs.splice(i, 1); } continue; }
      if (p.eorbit) {
        const O = p.eorbit;
        if (O.e.dead) p.life = 0;
        else if (G.clock >= O.until || O.e.state === 'broken') { const a = Math.atan2(P.y - p.y, P.x - p.x); p.vx = Math.cos(a) * O.speed; p.vy = Math.sin(a) * O.speed; p.homing = O.homing; p.age = 0; p.eorbit = null; AudioSys.play('swing', 0.45); }
        else { O.a += O.w * dt; p.x = O.e.x + Math.cos(O.a) * O.R; p.y = O.e.y + Math.sin(O.a) * O.R; p.vx = -Math.sin(O.a) * 60; p.vy = Math.cos(O.a) * 60; continue; }
      }
      if (p.homing > 0 && p.age < 2.2) { const sp = Math.hypot(p.vx, p.vy); const na = turnToward(Math.atan2(p.vy, p.vx), Math.atan2(P.y - p.y, P.x - p.x), p.homing * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; }
      if (p.curve) { const k = p.curve * dt; const c = Math.cos(k), s = Math.sin(k); const vx = p.vx * c - p.vy * s; p.vy = p.vx * s + p.vy * c; p.vx = vx; }
      if (p.snake) { const k = p.snake * Math.cos(p.age * 7 + (p.snakePh || 0)) * dt; const c = Math.cos(k), s = Math.sin(k); const vx = p.vx * c - p.vy * s; p.vy = p.vx * s + p.vy * c; p.vx = vx; }
      if (p.eboomer) { const B = p.eboomer, o = p.owner; if (!B.back && p.age > B.t) B.back = true;
        if (B.back) { if (!o || o.dead) p.life = 0; else { const sp = Math.max(460, Math.hypot(p.vx, p.vy)); const na = turnToward(Math.atan2(p.vy, p.vx), Math.atan2(o.y - p.y, o.x - p.x), 9 * dt); p.vx = Math.cos(na) * sp; p.vy = Math.sin(na) * sp; if (dist2(p.x, p.y, o.x, o.y) < (o.r + 12) ** 2 && p.age > B.t + 0.15) p.life = 0; } } }
      p.x += p.vx * dt; p.y += p.vy * dt;
      if (p.eboomer && !p.eboomer.back && (p.x < 10 || p.x > A.w - 10 || p.y < 10 || p.y > A.h - 10)) { p.eboomer.back = true; p.x = clamp(p.x, 10, A.w - 10); p.y = clamp(p.y, 10, A.h - 10); }
      else if (p.x < -20 || p.x > A.w + 20 || p.y < -20 || p.y > A.h + 20) p.life = 0;
      if (p.life > 0 && !P.dead && dist2(p.x, p.y, P.x, P.y) < (p.r + P.r) ** 2) {
        const res = resolveHitOnPlayer({ src: p.owner, proj: p, dmg: p.dmg, post: p.post, perilous: p.perilous, x: p.x, y: p.y });
        if (p.tether && (res === 'hit' || res === 'block') && p.owner && !p.owner.dead) { P.yank = { src: p.owner, t: 0.5 }; callout(P.x, P.y - 40, 'SNARED', '#e8e4f0', 15, 0.6, { serif: false }); }
        if (res === 'deflect') reflectProj(p, P); else if (res === 'pending') { p.held = true; p.life = 1; } else if (res !== 'dodged') p.life = 0;
      }
    }
    if (p.life <= 0) { G.projs.splice(i, 1); projDie(p); }
  }
}

// ---------- timers ----------
function later(t, fn) { G.timers.push({ at: G.clock + t, fn }); }
function updateTimers() {
  if (!G.timers.length) return;
  const due = []; G.timers = G.timers.filter(t => { if (G.clock >= t.at) { due.push(t); return false; } return true; });
  for (const t of due) { try { t.fn(); } catch (err) { console.error(err); } }
}

// ---------- expansion sigil behaviours ----------
function arrowRain(c, n, o = {}) {
  const M = c.M; const col = o.col || '#9fe8ff'; const [tx, ty] = targetPoint(c, 460); markFx(tx, ty, 95, col, 0.4);
  for (let i = 0; i < n; i++) later(0.12 + i * 0.07, () => { const x = tx + rand(-80, 80), y = ty + rand(-80, 80); streakFx(x + 40, y - 260, x, y, col, 0.12); later(0.12, () => explosion(x, y, (o.r || 36) * Math.sqrt(M.size), sigDmg(o.dmg || 7, M), { col, post: (o.post || 6) * M.post, burn: M.burn + (o.burn || 0), chill: M.chill + (o.chill || 0), shock: M.shock + (o.shock || 0), bleed: M.bleed + (o.bleed || 0), knock: 40, crit: M.crit, share: M.share })); });
  if (c.payload) later(0.6, () => payloadAt(c, tx, ty, c.ang));
}
function groundShock(c) {
  const M = c.M; const range = 160 * Math.sqrt(M.size), arc = 1.5;
  for (const e of G.enemies) {
    if (e.dead || e.spawning || e.untargetable) continue; const d = dist(c.x, c.y, e.x, e.y); if (d > range + e.r) continue;
    const a = Math.atan2(e.y - c.y, e.x - c.x); if (Math.abs(angDiff(c.ang, a)) > arc / 2 + 0.2) continue;
    damageEnemy(e, { dmg: sigDmg(10, M), post: 18 * M.post * postMul(), kx: Math.cos(a), ky: Math.sin(a), knock: 560, src: 'sigil', burn: M.burn, chill: M.chill, shock: M.shock, bleed: M.bleed, crit: M.crit });
  }
  slashFx(c.x, c.y, c.ang, arc, range, '#f2d48a', 1, 0.2, 1.4); for (let i = 0; i < 10; i++) { const a = c.ang + rand(-arc / 2, arc / 2); sparks(c.x + Math.cos(a) * range * 0.6, c.y + Math.sin(a) * range * 0.6, 1, '#f2d48a', { ang: a, spread: 0.2 }); }
  AudioSys.play('heavy'); shake(4); payloadAt(c, c.x + Math.cos(c.ang) * range, c.y + Math.sin(c.ang) * range, c.ang);
}
function plantShikigami(c) {
  const M = c.M; if (G.wisps.filter(w => w.fixed).length >= 4) G.wisps.splice(G.wisps.findIndex(w => w.fixed), 1);
  const x = clamp(c.x + Math.cos(c.ang) * 40, 20, G.ARENA.w - 20), y = clamp(c.y + Math.sin(c.ang) * 40, 20, G.ARENA.h - 20);
  G.wisps.push({ fixed: true, x, y, a: 0, t: 6 * M.life * (resT('spirit') >= 1 ? 1.5 : 1), cd: 0.2, M: Object.assign({}, M, { scatter: 1, echo: false, link: null, ringcast: false }), payload: c.payload, depth: c.depth || 0 });
  ring(x, y, 6, 40, '#f0e0b0', 0.3, 3);
}
function gainFocus(n) { const P = G.player; if (!P) return; const before = P.focus; P.focus = Math.min(G.S.focusMax, P.focus + n); if (P.focus > before) P.focusFlash = 0.3; }
function shadowBlink(c) {
  const P = G.player; const [tx, ty] = targetPoint(Object.assign({}, c, { x: P.x, y: P.y }), 230);
  const ox = P.x, oy = P.y; for (let i = 0; i < 5; i++) ghostFx(lerp(ox, tx, i / 5), lerp(oy, ty, i / 5), P.ang);
  P.x = tx; P.y = ty; P.iframes = Math.max(P.iframes, 0.2); AudioSys.play('dash');
  slashFx(ox, oy, rand(0, TAU), 3, 60, '#c9b6ff', 1, 0.2, 1.2);
  for (const e of G.enemies) { if (e.dead || e.spawning || e.untargetable) continue; if (dist(ox, oy, e.x, e.y) < 60 + e.r) damageEnemy(e, { dmg: spellDmg(10), post: 14, src: 'sigil' }); }
}
function comboBonus() { return styleRank().dmg * (hasR('tempo') ? 1.7 : 1); }

// ---------- Style rank: clean, varied play climbs D → Kensei ----------
// every verb scores, repeating the same one scores less, getting hit costs a rank.
const STYLE_RANKS = [
  { k: 'D', name: 'Dull', col: '#8a8270', dmg: 0, ash: 0 },
  { k: 'C', name: 'Crisp', col: '#9fd0ff', dmg: 0.04, ash: 0 },
  { k: 'B', name: 'Bold', col: '#7fe0b0', dmg: 0.08, ash: 0.1 },
  { k: 'A', name: 'Artful', col: '#ffd36b', dmg: 0.13, ash: 0.2 },
  { k: 'S', name: 'Savage', col: '#ff9a3a', dmg: 0.19, ash: 0.3 },
  { k: 'SS', name: 'Sublime', col: '#ff5a4a', dmg: 0.26, ash: 0.45 },
  { k: '剣聖', name: 'Kensei', col: '#ff3a7a', dmg: 0.35, ash: 0.6 }
];
const styleRank = () => (G.style ? STYLE_RANKS[G.style.rank] : STYLE_RANKS[0]);
function styleReset() { G.style = { pts: 0, rank: 0, recent: {}, feed: [], flash: 0 }; }
function styleGain(kind, base, label) {
  const S = G.style; if (!S || G.state !== 'play') return;
  const r = S.recent[kind] || 0; const k = 1 / (1 + 0.4 * r); S.recent[kind] = r + 1;
  const v = base * k * 1.25; S.pts += v;
  if (label) { S.feed.unshift({ txt: label, v: Math.max(1, Math.round(v)), t: 0, fresh: k > 0.66 }); if (S.feed.length > 5) S.feed.pop(); }
  while (S.pts >= styleNeed(S.rank) && S.rank < STYLE_RANKS.length - 1) { S.pts -= styleNeed(S.rank); S.rank++; S.flash = 1; G.run.bestRank = Math.max(G.run.bestRank || 0, S.rank); AudioSys.play('rank'); }
  if (S.rank === STYLE_RANKS.length - 1) S.pts = Math.min(S.pts, styleNeed(S.rank));
}
const styleNeed = (r) => 45 + r * 16;
function styleHit(severe) {
  const S = G.style; if (!S || G.state !== 'play') return;
  if (S.rank > 0) AudioSys.play('rankdown');
  S.rank = Math.max(0, S.rank - (severe ? 2 : 1)); S.pts = S.rank ? styleNeed(S.rank) * 0.35 : 0; S.flash = -1;
  S.feed.unshift({ txt: 'STRUCK', v: 0, t: 0, bad: true }); if (S.feed.length > 5) S.feed.pop();
}
function updateStyle(dt) {
  const S = G.style; if (!S) return;
  for (const k in S.recent) S.recent[k] = Math.max(0, S.recent[k] - dt * 0.6);
  const decay = (4 + S.rank * 4.2) * (hasR('tempo') ? 0.7 : 1) * (G.enemies.length ? 1 : 0.4); S.pts -= decay * dt;
  if (S.pts < 0) { if (S.rank > 0) { S.rank--; S.pts = styleNeed(S.rank) * 0.7; } else S.pts = 0; }
  for (const f of S.feed) f.t += dt; S.feed = S.feed.filter(f => f.t < 2.4);
  if (S.flash > 0) S.flash = Math.max(0, S.flash - dt * 2.2); else if (S.flash < 0) S.flash = Math.min(0, S.flash + dt * 2.2);
}

// ---------- school helpers ----------
function glacierSpikes(c) {
  const M = c.M; const n = 7, step = 52 * Math.sqrt(M.size);
  for (let i = 0; i < n; i++) later(0.04 * i, () => {
    const x = c.x + Math.cos(c.ang) * (40 + i * step), y = c.y + Math.sin(c.ang) * (40 + i * step);
    if (x < 0 || y < 0 || x > G.ARENA.w || y > G.ARENA.h) return;
    shards(x, y, 6, '#bfeaff'); ring(x, y, 4, 34 * Math.sqrt(M.size), '#9fe6ff', 0.22, 3);
    for (const e of G.enemies) { if (e.dead || e.spawning || e.untargetable) continue; if (dist(x, y, e.x, e.y) < 34 * Math.sqrt(M.size) + e.r) damageEnemy(e, { dmg: sigDmg(12, M), post: 8 * M.post * postMul(), chill: 2 + M.chill, burn: M.burn, shock: M.shock, bleed: M.bleed, crit: M.crit, vamp: M.vamp, src: 'sigil', knock: 30, kx: Math.cos(c.ang), ky: Math.sin(c.ang), col: '#bfeaff' }); }
    if (i === n - 1) payloadAt(c, x, y, c.ang);
  });
  AudioSys.play('frost');
}
function stormStrike(e) {
  if (!e || e.dead) return;
  const pts = [[e.x + rand(-30, 30), e.y - 420]]; for (let i = 1; i < 6; i++) pts.push([e.x + rand(-24, 24), e.y - 420 + i * 70]); pts.push([e.x, e.y]);
  lightningFx(pts, '#e6dcff', 0.2, 3); glowPuff(e.x, e.y, 80, '#c9b6ff', 0.22); AudioSys.play('zap'); AudioSys.play('boom', 0.6); shake(4);
  damageEnemy(e, { dmg: spellDmg(14 + powOf('storm') * 1.5), post: 10, shock: 1, src: 'storm', unblockable: true, col: '#e6dcff' });
}
function phantomBlades(x, y, ang) {
  const M = Object.assign(newMods(), { homing: 6, pw: 1 + powOf('spirit') * 0.8 / 8, school: 'spirit' });
  bolt({ x, y, ang, M, src: 'spirit' }, { style: 'spear', speed: 820, r: 5, life: 0.9, dmg: 8, col: '#7fffd4', count: 4, ring: true, pierce: 1 });
}
function finisherWave(P) {
  const M = Object.assign(newMods(), { pw: schoolPw(SIG.wave), school: 'steel' });
  SIG.wave.fire({ x: P.x, y: P.y, ang: P.ang, M, src: 'strike', depth: 0 });
}

function iaidoCut(c) {
  const M = c.M; const L = 270 * Math.sqrt(M.size); const ax = Math.cos(c.ang), ay = Math.sin(c.ang); const x1 = c.x + ax * L, y1 = c.y + ay * L;
  inkSlash(c.x + ax * L / 2, c.y + ay * L / 2, c.ang, L, '#f4efe4', 9); streakFx(c.x, c.y, x1, y1, '#ffffff', 0.12); AudioSys.play('swing', 1.2);
  for (const e of G.enemies) { if (e.dead || e.spawning || e.untargetable) continue; if (segDist(e.x, e.y, c.x, c.y, x1, y1) > e.r + 22) continue;
    damageEnemy(e, { dmg: sigDmg(16, M), post: 14 * M.post * postMul(), bleed: 1 + M.bleed, burn: M.burn, chill: M.chill, shock: M.shock, crit: M.crit, vamp: M.vamp, src: 'sigil', unblockable: true, kx: ax, ky: ay, knock: 80, share: M.share }); }
  payloadAt(c, x1, y1, c.ang);
}

// ---------- helpers for the elemental grimoire ----------
const stat = (M, o = {}) => ({ burn: M.burn + (o.burn || 0), chill: M.chill + (o.chill || 0), shock: M.shock + (o.shock || 0), bleed: M.bleed + (o.bleed || 0), crit: M.crit, vamp: M.vamp + (o.vamp || 0), share: M.share, col: o.col, knock: o.knock ?? 120, post: (o.post ?? 10) * M.post * postMul() });
function castFree(id, x, y, ang, tx, ty) { const card = SIG[id]; if (!card || !card.fire) return; card.fire({ x, y, ang, tx: tx ?? x + Math.cos(ang) * 200, ty: ty ?? y + Math.sin(ang) * 200, M: Object.assign(newMods(), { pw: schoolPw(card), school: card.school }), src: 'blade', depth: 0 }); }
function firePillar(c) {
  const M = c.M; const [tx, ty] = targetPoint(c, 420); const r = 72 * Math.sqrt(M.size); markFx(tx, ty, r, '#ff7a2a', 0.4);
  for (let k = 0; k < 3; k++) later(0.35 + k * 0.22, () => { explosion(tx, ty, r, sigDmg(10, M), stat(M, { burn: 2, col: '#ff8a3a', post: 8, knock: 60 })); streakFx(tx, ty + 10, tx, ty - 200, '#ffb36b', 0.2); if (k === 2) payloadAt(c, tx, ty, c.ang); });
}
function fireField(x, y, r, dur, dmg, M, col = '#ff7a2a') { const n = Math.round(dur / 0.3); for (let k = 0; k < n; k++) later(k * 0.3, () => { explosion(x, y, r, dmg, stat(M, { burn: 1, col, post: 2, knock: 0 })); }); markFx(x, y, r, col, dur); }
function kindling(c) { const M = c.M; const [tx, ty] = targetPoint(c, 380); streakFx(c.x, c.y, tx, ty, '#ff7a2a', 0.2); later(0.25, () => { explosion(tx, ty, 80 * Math.sqrt(M.size), sigDmg(9, M), stat(M, { burn: 2, col: '#ff7a2a' })); fireField(tx, ty, 70 * Math.sqrt(M.size), 2.4, sigDmg(3, M), M); payloadAt(c, tx, ty, c.ang); }); }
function frostNova(c) { const M = c.M; const P = G.player; const x = c.src === 'blade' && P ? P.x : c.x, y = c.src === 'blade' && P ? P.y : c.y; explosion(x, y, 140 * Math.sqrt(M.size), sigDmg(10, M), stat(M, { chill: 3, col: '#9fe6ff', knock: 260, post: 14 })); ring(x, y, 20, 150, '#bfeaff', 0.35, 5); AudioSys.play('frost'); payloadAt(c, x, y, c.ang); }
function icePrison(c) { const M = c.M; const e = nearestEnemy(c.x, c.y, 420); if (!e) return; streakFx(c.x, c.y, e.x, e.y, '#bfeaff', 0.15); damageEnemy(e, Object.assign({ dmg: sigDmg(8, M), src: 'sigil' }, stat(M, { chill: 6, col: '#bfeaff', knock: 0, post: 18 }))); shards(e.x, e.y, 10, '#bfeaff'); payloadAt(c, e.x, e.y, c.ang); }
function staticField(c) { const M = c.M; const P = G.player; const x = P ? P.x : c.x, y = P ? P.y : c.y; explosion(x, y, 125 * Math.sqrt(M.size), sigDmg(6, M), stat(M, { shock: 2, col: '#c9b6ff', knock: 90, post: 6 })); lightningFx([[x - 60, y - 20], [x - 10, y + 30], [x + 50, y - 10]], '#c9b6ff', 0.15, 2); AudioSys.play('zap'); }
function skyfall(c) { const M = c.M; const [tx, ty] = targetPoint(c, 480); let n = 0; for (const e of G.enemies) { if (n >= 4 + Math.floor(M.pierce / 2)) break; if (e.dead || e.spawning || dist(tx, ty, e.x, e.y) > 260 * Math.sqrt(M.size)) continue; n++; const tg = e; later(0.06 * n, () => { if (tg.dead) return; const pts = [[tg.x + rand(-20, 20), tg.y - 420]]; for (let i = 1; i < 5; i++) pts.push([tg.x + rand(-24, 24), tg.y - 420 + i * 84]); pts.push([tg.x, tg.y]); lightningFx(pts, '#e6dcff', 0.2, 3); damageEnemy(tg, Object.assign({ dmg: sigDmg(14, M), src: 'sigil', unblockable: true }, stat(M, { shock: 1, col: '#e6dcff', post: 12 }))); }); } if (!n) explosion(tx, ty, 60, sigDmg(14, M), stat(M, { shock: 1, col: '#e6dcff' })); AudioSys.play('zap'); }
function exsanguinate(c) { const M = c.M; const P = G.player; let any = false; for (const e of G.enemies) { if (e.dead || e.spawning || !(e.st.bleed > 0) || dist(P.x, P.y, e.x, e.y) > 340) continue; any = true; const b = e.st.bleed; e.st.bleed = 0; streakFx(e.x, e.y, P.x, P.y, '#ff2a4f', 0.2); damageEnemy(e, Object.assign({ dmg: sigDmg(7, M) * b, src: 'sigil', unblockable: true }, stat(M, { col: '#ff2a4f', post: 6 * b }))); healPlayer(Math.min(3, b * 0.5), false); } if (any) { ring(P.x, P.y, 10, 340, '#ff2a4f', 0.35, 4); AudioSys.play('crit'); } }
function bloodMoon(c) { const M = c.M; const [tx, ty] = targetPoint(c, 460); const r = 110 * Math.sqrt(M.size); markFx(tx, ty, r, '#ff2a4f', 0.6); streakFx(tx + 140, ty - 420, tx, ty, '#ff2a4f', 0.6); later(0.6, () => { explosion(tx, ty, r, sigDmg(26, M), stat(M, { bleed: 3, col: '#ff2a4f', post: 26 })); payloadAt(c, tx, ty, c.ang); }); }
function soulBurst(c) { const M = c.M; const [tx, ty] = targetPoint(c, 380); ring(tx, ty, 10, 100, '#7fffd4', 0.3, 4); later(0.18, () => { const kills0 = G.run.kills; explosion(tx, ty, 100 * Math.sqrt(M.size), sigDmg(14, M), stat(M, { col: '#7fffd4', post: 12 })); later(0.05, () => { if (G.run.kills > kills0) gainFocus(1); }); payloadAt(c, tx, ty, c.ang); }); }
function soulHarvest(c) { const P = G.player; let n = 0; for (const e of G.enemies) if (!e.dead && !e.spawning && dist(P.x, P.y, e.x, e.y) < 260) { n++; streakFx(e.x, e.y, P.x, P.y, '#7fffd4', 0.18); } if (n) { healPlayer(Math.min(6, n), false); gainKi(n * 6); ring(P.x, P.y, 10, 260, '#7fffd4', 0.3, 3); } }
function thunderStep(c) { const P = G.player; if (!P) return; const x0 = P.x, y0 = P.y; startDash(c.ang, true); later(0.14, () => { explosion(x0, y0, 70, spellDmg(8 + powOf('storm')), { shock: 1, col: '#c9b6ff' }); explosion(P.x, P.y, 70, spellDmg(8 + powOf('storm')), { shock: 1, col: '#c9b6ff' }); lightningFx([[x0, y0], [(x0 + P.x) / 2 + rand(-20, 20), (y0 + P.y) / 2 + rand(-20, 20)], [P.x, P.y]], '#c9b6ff', 0.2, 3); }); }

function jackpot(e) {
  const P = G.player; callout(e.x, e.y - 50, 'JACKPOT!', '#ffd36b', 38, 1.6, { serif: true }); AudioSys.play('rank'); AudioSys.play('gong'); screenFlash('#ffd36b', 0.2); slowmo(0.5, 0.3);
  explosion(e.x, e.y, 230, spellDmg(60), { col: '#ffd36b', knock: 420, post: 40 }); ring(e.x, e.y, 20, 260, '#ffd36b', 0.6, 8); addLight(e.x, e.y, 520, '#ffd36b', 0.7, 1.3);
  for (let i = 0; i < 5; i++) later(i * 0.08, () => dropAsh(e.x + rand(-60, 60), e.y + rand(-60, 60), 5));
  G.pendingSigilPicks = (G.pendingSigilPicks || 0) + 1; G.run.jackpots = (G.run.jackpots || 0) + 1;
}
