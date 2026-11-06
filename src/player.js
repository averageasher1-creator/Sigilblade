// ================= PLAYER =================
function makePlayer() {
  const A = G.ARENA;
  const P = {
    x: A.w / 2, y: A.h / 2 + 120, vx: 0, vy: 0, kx: 0, ky: 0, r: 13, ang: -Math.PI / 2, hp: 50, ki: 100, posture: 0, postureT: 0,
    state: 'idle', stateT: 0, swingT: 0, swingDur: 0.3, swingSide: 1, finisher: false, iframes: 0, dashing: false, dashT: 0, dashDir: 0, dashSpeed: 980,
    dashStart: -9, dashId: 0, freeDash: false, mikiriDash: -1, dashCharges: 2, dashCD: 0, dashHit: new Set(),
    deflectPress: -9, deflectWin: 0.15, lastGuardPress: -9, spam: 0, guarding: false, deflectFlash: 0, lastGuardCast: -9,
    deck: [], deckPos: 0, combo: 0, swingCount: 0, artCD: 0, artMax: 1, gourds: 2, ward: 0, riposte: false, lotus: false, rageT: 0, hurtT: 0,
    deflectCount: 0, kiSpentAcc: 0, dead: false, regenAcc: 0, lastFizzleText: -9, walk: 0, pending: [], lastDodgeText: -9, riposteT: 0, hitFrom: null, pressTimes: [], focus: 1, focusFlash: 0, hasteT: 0, dashEndT: -9, webbed: false, lastFocusMsg: -9, ironWillUsed: false,
    canGuard() { return this.state !== 'broken' && !this.dashing && this.state !== 'drink' && !this.dead && G.clock - (this.dashEndT ?? -9) > 0.12; }
  };
  P.scarf = Array.from({ length: 10 }, () => ({ x: P.x, y: P.y }));
  return P;
}
function rebuildDeck() {
  const P = G.player, B = curBlade();
  P.deck = G.run.strike.filter(Boolean).map(id => SIG[id]); if (B.shuffle || G.S.shuffleAll) shuffleArr(P.deck); P.deckPos = 0; P.combo = 0; P.cycleStart = true;
  P.deck2 = (G.run.strike2 || []).filter(Boolean).map(id => SIG[id]); P.deckPos2 = 0;
}
function fitChain(arr, n) { while (arr.length > n) { const c = arr.pop(); if (c) G.run.satchel.push(c); } while (arr.length < n) arr.push(null); }
function fitChains() { const R = G.run; fitChain(R.strike, curBlade().slots); fitChain(R.guard, G.S.guardSlots); fitChain(R.art, G.S.artSlots); if (R.strike2) fitChain(R.strike2, 3 + (R.offSlots || 0)); }
// the blade you actually wield: its base, plus engravings, hones and imprinted sigils
function curBlade() {
  const R = G.run; if (!R) return BLADES.katana;
  const key = R.blade + '|' + (R.eng || []).map(e => e.id + (e.sig || '')).join(',') + '|' + (R.always || []).join(',') + '|' + (R.bonusSlots || 0) + '|' + (R.hungerSlots || 0);
  if (G._bk === key && G._bc) return G._bc;
  const B = Object.assign({}, BLADES[R.blade]); B.always = (B.always || []).slice(); B.kiMul = 1; B.imbues = []; B.flags = {};
  for (const en of R.eng || []) { const E = ENGRAVINGS[en.id]; if (!E) continue; if (E.mod) E.mod(B); if (E.imbue) B.imbues.push({ type: 'mod', mod: E.imbue }); if (en.sig && SIG[en.sig]) B.always.push(en.sig); B.flags[en.id] = true; }
  if (B.flags.keen) B.kiMul *= 0.75; if (B.flags.greedy) B.kiMul *= 1.3;
  B.always.push(...(R.always || [])); B.slots += (R.bonusSlots || 0) + (B.flags.hungry ? Math.min(3, R.hungerSlots || 0) : 0);
  G._bk = key; G._bc = B; return B;
}
// blade damage per hit: blade base + Steel power, scaled by generic damage
function bladeBase() { const S = G.S, B = curBlade(), P = G.player, R = G.run; const grow = B.grow ? Math.min(B.grow.max, Math.floor((R.bladeKills || 0) / B.grow.per)) : 0; const low = B.lowHp && P ? 1 + B.lowHp * clamp(1 - P.hp / S.maxHp, 0, 1) : 1; return (B.dmg + grow + S.blade + S.pow.steel) * S.bladeMul * (1 + S.dmg / 100) * low; }
// resonance: everything you have equipped that shares a school
function computeResonance(R) {
  const res = {}; for (const k of SCHOOL_IDS) res[k] = 0;
  const V = VESSEL[R.vessel]; for (const k in (V.res || {})) res[k] += V.res[k];
  const B = BLADES[R.blade]; if (B.school) res[B.school] += 1;
  for (const arr of [R.strike, R.guard, R.art, R.strike2 || []]) for (const id of arr) if (id && SIG[id].school) res[SIG[id].school]++;
  for (const en of R.eng || []) { const E = ENGRAVINGS[en.id]; if (E && E.res) res[E.res]++; }
  for (const id of R.relics) { const r = RELICS[id]; if (r.school) res[r.school]++; }
  for (const k in (R.attune || {})) res[k] += R.attune[k];
  return res;
}
const resTier = n => n >= 6 ? 3 : n >= 4 ? 2 : n >= 2 ? 1 : 0;
function recomputeStats() {
  const R = G.run, s = baseStats(); const V = VESSEL[R.vessel];
  V.stat(s);
  for (const k in R.ups) { if (k.startsWith('pow.')) s.pow[k.slice(4)] += R.ups[k]; else s[k] += R.ups[k]; }
  R.relicSet = {}; for (const id of R.relics) { R.relicSet[id] = (R.relicSet[id] || 0) + 1; const r = RELICS[id]; if (r.stat) r.stat(s); }
  const B = curBlade(); s.kiMax += B.ki || 0; s.kiRegen += B.kiRegen || 0; s.deflect += (B.deflect || 0) + (B.flags && B.flags.warding ? 40 : 0); s.deflectPost *= 1 + (B.deflectPost || 0);
  if (R.fortune && FORTUNES[R.fortune] && FORTUNES[R.fortune].stat) FORTUNES[R.fortune].stat(s);
  s.maxHp = Math.max(10, Math.round(s.maxHp + R.bonusHp));
  if (s.flames) { s.maxHp = Math.min(8, 5 + Math.floor(Math.max(0, s.maxHp - 50) / 40)); s.lifesteal = 0; s.regen = 0; } s.dashes = Math.max(1, s.dashes); s.maxPosture = 100; s.kiMax = Math.max(20, Math.round(s.kiMax));
  s.deflect = Math.max(80, s.deflect);
  const old = G.S; G.S = s;
  fitChains();
  const prevT = G.resT || {};
  G.res = computeResonance(R); G.resT = {}; for (const k of SCHOOL_IDS) G.resT[k] = resTier(G.res[k]);
  if (G.resT.steel >= 1) s.posture += 25;
  if (G.resT.blood >= 1) s.lifesteal += 3;
  if (G.resT.spirit >= 3) s.focusMax += 1;
  if (G.player && G.state === 'play') for (const k of SCHOOL_IDS) if (G.resT[k] > (prevT[k] || 0)) callout(G.player.x, G.player.y - 60, SCHOOLS[k].name.toUpperCase() + ' ' + ['', 'I', 'II', 'III'][G.resT[k]], SCHOOLS[k].col, 18, 1.0);
  G.newResT = {}; for (const k of SCHOOL_IDS) if (G.resT[k] > (prevT[k] || 0) && G.resLoaded) G.newResT[k] = G.resT[k];
  G.resLoaded = true;
  const P = G.player;
  if (P) { if (old && s.maxHp > old.maxHp) P.hp += s.maxHp - old.maxHp; P.hp = Math.min(P.hp, s.maxHp); P.ki = Math.min(P.ki, s.kiMax); P.dashCharges = Math.min(P.dashCharges, s.dashes); P.focus = Math.min(P.focus, s.focusMax); }
}

// dashes recharge on their own, but much faster while you are landing blows
function dashRefund(t) { const P = G.player, S = G.S; if (!P || P.dashCharges >= S.dashes) return; P.dashCD -= t; while (P.dashCD <= 0 && P.dashCharges < S.dashes) { P.dashCharges++; P.dashCD += S.dashCd; } if (P.dashCharges >= S.dashes) P.dashCD = S.dashCd; }
function startDash(ang, free = false, mode = null) {
  const P = G.player;
  if (P.emberStepT > 0) { P.emberStepT = 0; P.emberDash = P.dashId + 1; }
  P.dashing = true; P.dashT = mode === 'step' ? 0.08 : 0.13; P.dashDir = ang; P.dashSpeed = mode === 'step' ? 900 : 1300; if (!mode) P.iframes = Math.max(P.iframes, 0.18); P.dashMode = mode; P.dashStart = G.clock; P.dashId++; P.freeDash = free; P.dashHit = new Set();
  if (P.state === 'swing') P.state = 'idle';
  if (P.state === 'drink') P.state = 'idle';
  P.guarding = false;
  AudioSys.play('dash'); smoke(P.x, P.y, 4, '#2a2530', { r: 12 });
}

function onKiSpent(n) { const P = G.player; if (!hasR('gem') || n <= 0) return; P.kiSpentAcc += n; while (P.kiSpentAcc >= 60) { P.kiSpentAcc -= 60; kiNova(); } }

function startSwing() {
  const P = G.player, S = G.S;
  const off = !!(G.run.strike2 && P.swingSide > 0); const B = off ? BLADES.offhand : curBlade();
  const dk = off ? 'deck2' : 'deck', pk = off ? 'deckPos2' : 'deckPos';
  let node = null, finisher = false;
  const lotus = P.lotus; P.lotus = false;
  if (S.inkblot) {
    const pool = [...G.run.strike, ...G.run.satchel, ...G.run.guard, ...G.run.art].filter(Boolean).map(id => SIG[id]);
    if (pool.length) { const cards = [pick(pool), pick(pool)]; node = buildNode(makeDeck(cards, 0, 0, true), 2); }
    P.combo = (P.combo + 1) % 3; finisher = P.combo === 0;
    if (Math.random() < 0.1) { later(0.1, () => { explosion(P.x, P.y, 95, spellDmg(10), { col: '#9a8cff', knock: 260 }); P.hp = Math.max(1, P.hp - 3); textPop(P.x, P.y - 24, 'SPILL -3', 'n', '#9a8cff'); }); }
  } else if (P[dk] && P[dk].length) {
    const d = makeDeck(P[dk], P[pk], P.ki, lotus, (off ? 1 : B.kiMul) * (S.drawAll ? 0.75 : 1));
    node = buildNode(d, S.drawAll ? 99 : B.draw + S.draw);
    if (!lotus) { P.ki -= d.spent; onKiSpent(d.spent); }
    if (d.hpSpent) { P.hp = Math.max(1, P.hp - d.hpSpent); textPop(P.x, P.y - 22, '-' + d.hpSpent, 'n', '#ff4a5a'); }
    if (d.fizzled.length) { AudioSys.play('fizzle'); if (G.clock - P.lastFizzleText > 1.2) { textPop(P.x, P.y - 28, 'no ki', 'n', '#59b8ff'); P.lastFizzleText = G.clock; } }
    P[pk] = d.pos;
    if (P[pk] >= P[dk].length || S.drawAll) { finisher = true; P[pk] = 0; if (B.shuffle || S.shuffleAll) shuffleArr(P[dk]); }
  } else { P.combo = (P.combo + 1) % 3; finisher = P.combo === 0; }
  P.swingCount++;
  const dashStrike = P.dashing || G.clock - P.dashEndT < 0.15;
  const beat = S.taiko ? onBeat() : null;
  const melee = { dmg: bladeBase() * (finisher ? (B.finMul || 1.5) : 1) * (beat === null ? 1 : beat ? 1.8 : 0.75) * (S.daruma ? 1 + 0.04 * (P.darumaN || 0) : 1), reach: B.reach * (finisher ? 1.12 : 1), arc: (B.arc || 1) * (finisher ? 2.4 : 1.8), fin: finisher, burn: 0, chill: 0, shock: 0, bleed: 0, crit: 0, vamp: 0 };
  melee.post = melee.dmg * 0.9 * (B.post || 1) * postMul(); melee.crit = B.crit || 0;
  if (P.kamaeReady) { P.kamaeReady = false; P.kamaeT = 0; melee.dmg *= 2.2; melee.reach *= 1.6; melee.post *= 1.6; callout(P.x, P.y - 34, 'STANCE STRIKE', '#ffe27a', 15, 0.5, { serif: false, pop: 0 }); }
  if (dashStrike && hasR('galestep') && G.clock - (P.galeT ?? -9) > 2) { P.galeT = G.clock; castArt(true); }
  if (dashStrike) { melee.dmg *= 1.5 * (hasR('windscroll') ? 1.8 : 1) * (resT('steel') >= 3 ? 2 : 1); melee.arc = Math.max(melee.arc, 2.7); melee.reach *= 1.18; melee.dash = true; P.dashing = false; P.dashEndT = -9; }
  if (P.riposteT > 0 || P.riposte) {
    const k = (P.riposte ? 2.5 : 2.0) * (resT('steel') >= 3 ? 2 : 1) * (P.ripBoost || 1); melee.dmg *= k; melee.post *= 2.2; melee.crit += 100; P.ripBoost = 0; P.riposte = false; P.riposteT = 0; melee.riposte = true;
    callout(P.x, P.y + 46, 'RIPOSTE', '#ffd36b', 14, 0.45, { rise: -8, pop: 0 });
  }
  const always = (B.always || []).map(id => SIG[id]).filter(Boolean);
  const c = { x: P.x + Math.cos(P.ang) * 16, y: P.y + Math.sin(P.ang) * 16, ang: P.ang, tx: G.mouseWorld.x, ty: G.mouseWorld.y, src: 'strike', melee,
    extraMods: always.filter(s => s.type === 'mod').concat(B.imbues || []), extraProjs: always.filter(s => s.type === 'proj') };
  const castNode = node || { projs: [], mods: [], utils: [], dups: [], link: null };
  // blade is imbued by the cast's modifiers
  const M0 = newMods(); for (const m of c.extraMods) m.mod(M0); for (const m of castNode.mods) m.mod(M0);
  melee.burn = M0.burn; melee.chill = M0.chill; melee.shock = M0.shock; melee.bleed = M0.bleed; melee.crit += M0.crit; melee.vamp = M0.vamp; melee.post *= Math.min(2, M0.post);
  if (!nodeEmpty(castNode) || c.extraProjs.length) executeNode(castNode, c);
  // engravings that bend the cast
  const F = B.flags || {}; const again = (o) => executeNode(castNode, Object.assign({}, c, { melee: null }, o));
  if (!nodeEmpty(castNode)) {
    if (F.echoing && P.swingCount % 3 === 0) later(0.08, () => again({ ang: P.ang + 0.06 }));
    if (F.twinned) again({ ang: P.ang + Math.PI });
    if (F.duelists && (melee.riposte || melee.dash)) later(0.06, () => again({ ang: P.ang - 0.06 }));
    if (B.twice && Math.random() < B.twice) later(0.07, () => again({ ang: P.ang + rand(-0.12, 0.12) }));
    if (beat) { later(0.06, () => again({ ang: P.ang + 0.05 })); }
  }
  if (finisher) {
    if (F.overflow && P.deck.length) { const dd = makeDeck(P.deck, 0, 0, true); executeNode(buildNode(dd, 99), Object.assign({}, c, { melee: null, dmgMul: 0.5 })); ring(P.x, P.y, 10, 80, '#b48cff', 0.3, 3); }
    if (F.cyclic) { P.cyclicN = Math.min(3, (P.cyclicN || 0) + 1); P.cyclicT = 6; }
    if (F.thunderous) { let n = 0; for (const e of G.enemies) { if (n >= 3) break; if (e.dead || e.spawning || dist(P.x, P.y, e.x, e.y) > 320) continue; n++; const tx = e; later(0.05 * n, () => stormStrike(tx)); } }
  }
  if (B.nth && P.swingCount % B.nth.n === 0) castFree(B.nth.sig, c.x, c.y, P.ang, c.tx, c.ty);
  // the Kagemusha's double strikes and casts too
  if (S.shadow && P.shadow) shadowStrike(P, castNode, c, melee);
  if (finisher && resT('steel') >= 2) later(0.06, () => finisherWave(P));
  if (finisher && hasR('moons') && node) executeNode(node, Object.assign({}, c, { melee: null, ang: P.ang + 0.08 }));
  if (hasR('gambit') && node && P.deckPos === (finisher ? 0 : P.deckPos) && P.cycleStart) executeNode(node, Object.assign({}, c, { melee: null, ang: P.ang - 0.08 }));
  P.cycleStart = finisher;
  if (lotus && node) { executeNode(node, Object.assign({}, c, { melee: null, ang: P.ang - 0.1 })); ring(P.x, P.y, 8, 50, '#c9b6ff', 0.3, 3); }
  if (hasR('bell') && P.swingCount % 4 === 0) executeNode({ projs: [{ card: SIG.chain, payload: null }], mods: [], utils: [], dups: [], link: null }, { x: P.x, y: P.y, ang: P.ang, src: 'bell' });
  P.state = 'swing'; P.swingT = 0; P.swingDur = (S.drawAll ? 1.7 : 1) * (G.run.strike2 ? 0.8 : 1) * 0.25 * B.swing / (1 + S.atkSpd / 100 + (S.daruma ? 0.02 * (P.darumaN || 0) : 0) + (P.hasteT > 0 ? 0.4 : 0) + (P.rhythmT > 0 ? 0.1 * (P.rhythmN || 0) : 0)) * (finisher ? 1.45 : 1); P.swingSide = -P.swingSide; P.finisher = finisher;
  P.kx += Math.cos(P.ang) * (finisher ? 260 : 150); P.ky += Math.sin(P.ang) * (finisher ? 260 : 150);
  const scol = melee.dash ? '#7fe0ff' : melee.riposte ? '#ffd36b' : finisher ? '#ff5b45' : melee.burn ? '#ffb07a' : melee.chill ? '#bfeaff' : melee.shock ? '#d9ccff' : '#efe6d2';
  slashFx(P.x, P.y, P.ang, melee.arc, melee.reach, scol, P.swingSide, finisher || melee.dash ? 0.24 : 0.17, finisher || melee.dash ? 1.4 : 1); addLight(P.x + Math.cos(P.ang) * melee.reach * 0.6, P.y + Math.sin(P.ang) * melee.reach * 0.6, finisher ? 200 : 140, scol, 0.16, 0.7);
  if (melee.dash) { callout(P.x, P.y + 46, 'DASH STRIKE', '#7fe0ff', 13, 0.4, { rise: -8, pop: 0 }); }
  if (finisher) ring(P.x, P.y, 10, melee.reach * 0.9, '#ff5b45', 0.2, 2);
  AudioSys.play(finisher ? 'heavy' : 'swing');
  meleeHit(melee);
}
function meleeHit(m) {
  const P = G.player; let hits = 0, crit = false;
  for (const e of G.enemies) {
    if (e.dead || e.spawning || e.untargetable) continue;
    const d = dist(P.x, P.y, e.x, e.y); if (d > m.reach + e.r) continue;
    const a = Math.atan2(e.y - P.y, e.x - P.x); const da = Math.abs(angDiff(P.ang, a)); const tol = m.arc / 2 + Math.asin(Math.min(1, e.r / Math.max(d, 1)));
    if (da > tol && d > e.r + P.r + 4) continue;
    const cx = P.x + Math.cos(a) * Math.max(0, d - e.r * 0.6), cy = P.y + Math.sin(a) * Math.max(0, d - e.r * 0.6);
    if (e.state === 'broken' && !e.dead && e.state !== 'intro') { deathblow(e); hits++; continue; }
    const B0 = curBlade();
    const r = damageEnemy(e, { dmg: m.dmg, post: m.post, src: 'blade', fin: m.fin, riposte: m.riposte, kx: Math.cos(a), ky: Math.sin(a), knock: m.fin ? 300 : 140, burn: m.burn, chill: m.chill, shock: m.shock, bleed: m.bleed, crit: m.crit, vamp: m.vamp, sx: P.x, sy: P.y });
    if (r.blocked) continue;
    hits++; if (r.crit) crit = true;
    e.cuts = (e.cuts || 0) + 1; if (hasR('thousand') && e.cuts % 6 === 0) { strikeCastOnly(a); callout(e.x, e.y - e.r - 18, 'THOUSAND CUTS', '#e6ecf4', 12, 0.45, { serif: false, pop: 0 }); }
    if (B0.storm && Math.random() < B0.storm) { const tx = e; later(0.03, () => stormStrike(tx)); }
    sparks(cx, cy, r.crit ? 14 : 8, r.crit ? '#ffd24a' : '#ffffff', { ang: a, spread: 0.8, min: 220, max: 680 }); shardBurst(cx, cy, 3, e.d.col, { ang: a, spread: 0.6, max: 320, r: 4 }); if (m.riposte) glowPuff(cx, cy, 60, '#ffd36b', 0.15);
  }
  for (const p of G.projs) {
    if (p.team !== 'e' || p.perilous || p.life <= 0) continue; const d = dist(P.x, P.y, p.x, p.y); if (d > m.reach + p.r) continue;
    if (Math.abs(angDiff(P.ang, Math.atan2(p.y - P.y, p.x - P.x))) > m.arc / 2 + 0.2) continue;
    p.life = 0; sparks(p.x, p.y, 6, '#ffe6a0', { max: 300 });
  }
  if (hits) { { const B1 = curBlade(); if (B1.kiHit) P.ki = Math.min(G.S.kiMax, P.ki + B1.kiHit * hits); if (B1.lifeHit && G.clock - (P.lifeHitT ?? -9) > 0.2) { P.lifeHitT = G.clock; healPlayer(B1.lifeHit * Math.min(3, hits), false); } }
    dashRefund(m.fin ? 0.4 : 0.22); P.ki = Math.min(G.S.kiMax, P.ki + (m.fin ? 6 : 3) + hits); rallyHeal((m.fin ? 5 : 2.5) + hits); hitstop(m.fin ? 0.07 : 0.04); shake(m.fin ? 6 : 2.5); AudioSys.play(crit ? 'crit' : 'hit'); kick(P.ang, m.fin ? 6 : 3);
    if (m.riposte) styleGain('riposte', 12, 'RIPOSTE'); else if (m.dash) styleGain('dashstrike', 10, 'DASH STRIKE'); else if (m.fin) styleGain('finisher', 7, 'FINISHER'); else styleGain('swing', 3.2, null); }
}
function castArt(free = false) {
  const P = G.player, S = G.S;
  const cards = G.run.art.filter(Boolean).map(id => SIG[id]);
  if (!cards.length) return;
  if (P.artCD > 0 && !free) { AudioSys.play('deny'); return; }
  if (free) { executeNode(buildNode(makeDeck(cards, 0, 0, true), 999), { x: P.x, y: P.y, ang: P.ang, tx: G.mouseWorld.x, ty: G.mouseWorld.y, src: 'art' }); ring(P.x, P.y, 14, 70, '#4fd1a5', 0.3, 3); return; }
  const d = makeDeck(cards, 0, P.ki, false); const node = buildNode(d, 999);
  if (nodeEmpty(node)) { AudioSys.play('fizzle'); textPop(P.x, P.y - 28, 'no ki', 'n', '#59b8ff'); return; }
  P.ki -= d.spent; onKiSpent(d.spent); if (d.hpSpent) P.hp = Math.max(1, P.hp - d.hpSpent);
  executeNode(node, { x: P.x, y: P.y, ang: P.ang, tx: G.mouseWorld.x, ty: G.mouseWorld.y, src: 'art' });
  const cost = cards.reduce((s, c) => s + (c.ki || 0), 0);
  P.artMax = P.artCD = Math.max(1.2, (3.5 + cost * 0.06) * (1 + S.artCd / 100));
  AudioSys.play('art'); ring(P.x, P.y, 14, 70, '#4fd1a5', 0.35, 3);
  cards.forEach((c, i) => { const a = P.ang + (i - (cards.length - 1) / 2) * 0.5; callout(P.x + Math.cos(a) * 46, P.y + Math.sin(a) * 46, c.g, c.col, 20, 0.5, { rise: 18 }); });
}
function strikeCastOnly(aim) {
  const P = G.player, B = curBlade(); if (!P.deck.length) return;
  const d = makeDeck(P.deck, P.deckPos, 0, true); const node = buildNode(d, B.draw + G.S.draw);
  P.deckPos = d.pos >= P.deck.length ? 0 : d.pos;
  executeNode(node, { x: P.x, y: P.y, ang: aim, src: 'echo' });
}
function previewDraw() {
  // indices in deck drawn by the next swing (respecting current Ki)
  const P = G.player, B = curBlade(); if (!P.deck.length) return [0, 0];
  const d = makeDeck(P.deck, P.deckPos, P.lotus ? 1e9 : P.ki, P.lotus); buildNode(d, B.draw + G.S.draw); return [P.deckPos, d.pos, d.fizzled.length];
}

function updatePlayer(dt) {
  const P = G.player, S = G.S; if (P.dead) return;
  P.iframes = Math.max(0, P.iframes - dt); P.hurtT -= dt; P.deflectFlash -= dt; P.rageT -= dt; P.artCD = Math.max(0, P.artCD - dt); P.hasteT -= dt; P.focusFlash -= dt;
  if (P.dashCharges < S.dashes) { P.dashCD -= dt; if (P.dashCD <= 0) { P.dashCharges++; P.dashCD = S.dashCd; } } else P.dashCD = S.dashCd;
  const m = G.mouseWorld; P.ang = Math.atan2(m.y - P.y, m.x - P.x);
  let mx = (Input.isHeld('right') ? 1 : 0) - (Input.isHeld('left') ? 1 : 0), my = (Input.isHeld('down') ? 1 : 0) - (Input.isHeld('up') ? 1 : 0);
  const ml = Math.hypot(mx, my); if (ml) { mx /= ml; my /= ml; }
  // deflect press
  let pressedGuard = false;
  if (Input.press.guard != null) {
    Input.press.guard = null;
    if (P.canGuard()) {
      P.pressTimes = P.pressTimes.filter(t => G.clock - t < 0.5); P.pressTimes.push(G.clock);
      const mash = P.pressTimes.length >= 4; P.lastGuardPress = G.clock;
      P.deflectWin = (S.deflect / 1000) * (mash ? 0.55 : 1); P.deflectPress = G.clock; pressedGuard = true;
      if (P.state === 'swing') P.state = 'idle';
    }
  }
  settlePending(dt, pressedGuard);
  if (P.riposteT > 0) P.riposteT -= dt;
  if (P.hitFrom) { P.hitFrom.t -= dt; if (P.hitFrom.t <= 0) P.hitFrom = null; }
  P.guarding = Input.isHeld('guard') && P.canGuard() && P.state !== 'swing' && !S.noBlock;
  if (P.deflectShieldT > 0) P.deflectShieldT -= dt;
  if (S.taiko) { const bi = Math.floor(G.clock / BEAT); if (bi !== P.beatI) { P.beatI = bi; ring(P.x, P.y, 26, 70, '#ff6a4a', 0.22, 2); if (G.state === 'play' && bi % 2 === 0) AudioSys.play('tick'); } }
  if (hasR('kamae')) { if (P.guarding && !P.kamaeReady) { P.kamaeT = (P.kamaeT || 0) + dt; if (P.kamaeT >= 0.8) { P.kamaeReady = true; ring(P.x, P.y, 10, 46, '#ffe27a', 0.3, 3); AudioSys.play('glint'); } } else if (!P.guarding && !P.kamaeReady) P.kamaeT = 0; }
  if (P.state === 'broken') { P.stateT -= dt; if (P.stateT <= 0) P.state = 'idle'; }
  if (P.state === 'drink') { P.stateT -= dt; if (P.stateT <= 0) { healPlayer(S.maxHp * (hasR('glassheart') ? 0.18 : 0.35)); P.state = 'idle'; ring(P.x, P.y, 8, 50, '#6dff9e', 0.4, 3); } }
  if (P.dashing) {
    P.dashT -= dt; ghostFx(P.x, P.y, P.ang);
    if (P.emberDash === P.dashId) { P.emberAcc = (P.emberAcc || 0) + dt; if (P.emberAcc >= 0.03) { P.emberAcc = 0; explosion(P.x, P.y, 42, spellDmg(8 + powOf('flame') * 0.8), { burn: 1, col: '#ff7a2a', knock: 40, post: 3 }); } }
    if (hasR('shadowstep') || S.dashBleed) {
      for (const e of G.enemies) {
        if (e.dead || e.spawning || P.dashHit.has(e)) continue; if (dist2(P.x, P.y, e.x, e.y) > (P.r + e.r + 6) ** 2) continue; P.dashHit.add(e);
        if (hasR('shadowstep')) { damageEnemy(e, { dmg: bladeBase(), post: 10, bleed: 2, src: 'dash', unblockable: true }); slashFx(e.x, e.y, P.dashDir, 1.2, e.r + 20, '#7fe0ff', 1, 0.15); }
        else applyStatus(e, 'bleed', 2);
      }
    }
    if (P.dashT <= 0) { P.dashing = false; P.freeDash = false; P.dashEndT = G.clock; }
  }
  if (P.state === 'swing') { P.swingT += dt; if (P.swingT >= P.swingDur) P.state = 'idle'; }
  if (P.state !== 'broken') {
    if (Input.took('dash') && !P.dashing) {
      const dir = ml ? Math.atan2(my, mx) : P.ang;
      if (S.noDash) { if (G.clock - (P.stepT ?? -9) > 0.35) { P.stepT = G.clock; startDash(dir, false, 'step'); } }
      else if (P.dashCharges > 0) { P.dashCharges--; const winded = S.bloodMagic ? P.hp <= 4 : P.ki < S.dashKi; if (!winded) { if (S.bloodMagic) P.hp -= 3; else P.ki -= S.dashKi; } if (S.shadow) placeShadow(P); startDash(dir, false, winded || S.noDashIframes ? 'winded' : null); if (winded && G.clock - (P.windedMsg || -9) > 1) { P.windedMsg = G.clock; callout(P.x, P.y - 30, 'WINDED', '#7fa0c0', 13, 0.5, { serif: false, pop: 0 }); } }
      else AudioSys.play('deny');
    }
    if (Input.took('gourd') && (P.state === 'idle') && !P.dashing) {
      if (P.gourds > 0 && P.hp < S.maxHp) { P.gourds--; P.state = 'drink'; P.stateT = 0.6; AudioSys.play('ui'); } else AudioSys.play('deny');
    }
    const canSwing = !P.dashing && P.state !== 'drink' && (P.state === 'idle' || (P.state === 'swing' && P.swingT >= P.swingDur * 0.78));
    if (canSwing && (Input.took('attack', 0.22) || (Input.isHeld('attack') && (!S.taiko || onBeat())) || (G.opts.auto && !Input.isHeld('guard') && (!S.taiko || onBeat()) && autoTarget()))) { const br = brokenTarget(); if (br) lungeTo(br, true); else startSwing(); }
    if (Input.took('art', 0.12)) castArt();
    if (Input.took('focus', 0.15)) focusThrust();
  }
  if (P.yank) { const Y = P.yank; Y.t -= dt; const e = Y.src; if (!e || e.dead || Y.t <= 0 || P.dashing) P.yank = null; else { const d = dist(P.x, P.y, e.x, e.y), want = e.r + P.r + 30; if (d > want + 2) { const st = Math.min(d - want, 1300 * dt); P.x += (e.x - P.x) / d * st; P.y += (e.y - P.y) / d * st; } else P.yank = null; } }
  let sp = 340 * (1 + S.move / 100);
  if (P.guarding) sp *= 0.55; if (P.webbed && !P.dashing) sp *= 0.5;
  if (P.state === 'swing') sp *= 0.72;
  if (P.state === 'drink') sp *= 0.35; if (P.state === 'broken') sp *= 0.25;
  let vx = mx * sp, vy = my * sp;
  if (P.dashing) { vx = Math.cos(P.dashDir) * P.dashSpeed; vy = Math.sin(P.dashDir) * P.dashSpeed; }
  P.vx = vx; P.vy = vy; if (ml && !P.dashing) P.walk += dt * sp / 30;
  P.x += (vx + P.kx) * dt; P.y += (vy + P.ky) * dt; const kd = Math.exp(-9 * dt); P.kx *= kd; P.ky *= kd;
  P.x = clamp(P.x, P.r, G.ARENA.w - P.r); P.y = clamp(P.y, P.r, G.ARENA.h - P.r);
  if (!P.dashing) for (const e of G.enemies) {
    if (e.dead || e.spawning) continue; const rr = P.r + e.r * 0.85, d2 = dist2(P.x, P.y, e.x, e.y);
    if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d); const nx = (P.x - e.x) / d, ny = (P.y - e.y) / d; P.x += nx * push * 0.5; P.y += ny * push * 0.5; e.x -= nx * push * 0.5; e.y -= ny * push * 0.5; }
  }
  // regen
  P.ki = Math.min(S.kiMax, P.ki + S.kiRegen * (P.guarding && hasR('stillwater') ? 3 : 1) * (1 - 0.85 * (G.hunt || 0)) * dt);
  if (P.rally > 0) { P.rallyT = (P.rallyT || 0) + dt; if (P.rallyT > 0.9) P.rally = Math.max(0, P.rally - dt * (hasR('rallybell') ? 2.8 : 4.5)); P.rally = Math.min(P.rally, S.maxHp - P.hp); }
  if (P.rallyFlash > 0) P.rallyFlash -= dt; if (P.rhythmT > 0) P.rhythmT -= dt; if (P.cyclicT > 0) P.cyclicT -= dt; else P.cyclicN = 0;
  { const B2 = curBlade(); if (B2.drain && G.state === 'play' && G.waveActive && G.enemies.length) { P.drainT = (P.drainT || 0) + dt; if (P.drainT >= B2.drain) { P.drainT = 0; P.hp = Math.max(1, P.hp - 1); textPop(P.x, P.y - 22, '-1', 'n', '#ff3a5a'); } } } if (P.shadow && P.shadow.swingT > 0) P.shadow.swingT -= dt; if (P.emberStepT > 0) P.emberStepT -= dt;
  if (S.regen > 0 && P.hp < S.maxHp) { P.regenAcc += S.regen * 0.2 * dt; if (P.regenAcc >= 1) { P.regenAcc -= 1; P.hp = Math.min(S.maxHp, P.hp + 1); } }
  if (G.lsBank > 0) { const h = Math.min(G.lsBank, 9 * dt); G.lsBank -= h; P.hp = Math.min(S.maxHp, P.hp + h); }
  P.postureT -= dt; if (P.postureT <= 0 && P.posture > 0) P.posture = Math.max(0, P.posture - (P.guarding ? 42 : 26) * (0.4 + 0.6 * P.hp / S.maxHp) * dt);
  // scarf
  const sc = P.scarf; const back = P.ang + Math.PI; sc[0].x = P.x + Math.cos(back) * 9; sc[0].y = P.y + Math.sin(back) * 9;
  for (let i = 1; i < sc.length; i++) {
    const a = sc[i], b = sc[i - 1]; a.x += Math.sin(G.clock * 7 + i * 0.8) * 0.5 - P.vx * dt * 0.15; a.y += Math.cos(G.clock * 6 + i * 0.6) * 0.5 - P.vy * dt * 0.15;
    const dx = a.x - b.x, dy = a.y - b.y, l = Math.hypot(dx, dy) || 1; a.x = b.x + dx / l * 5.5; a.y = b.y + dy / l * 5.5;
  }
}

function brokenTarget() {
  const P = G.player, B = curBlade(); let best = null, bd = 1e9;
  for (const e of G.enemies) { if (e.dead || e.state !== 'broken' || e.untargetable) continue; const d = dist(P.x, P.y, e.x, e.y); if (d < B.reach + e.r * 0.5) return null; if (d < (G.clock - (P.lungeT ?? -9) > 0.9 ? 230 : 0) + e.r && d < bd) { bd = d; best = e; } }
  return best;
}
function lungeTo(e, execute) {
  const P = G.player; const a = Math.atan2(e.y - P.y, e.x - P.x), d = dist(P.x, P.y, e.x, e.y); const travel = Math.max(0, d - e.r - P.r - 2);
  const ox = P.x, oy = P.y; P.x = clamp(P.x + Math.cos(a) * travel, P.r, G.ARENA.w - P.r); P.y = clamp(P.y + Math.sin(a) * travel, P.r, G.ARENA.h - P.r); P.ang = a;
  for (let i = 0; i < 6; i++) ghostFx(lerp(ox, P.x, i / 6), lerp(oy, P.y, i / 6), a, '#ffe9b0');
  P.iframes = Math.max(P.iframes, travel > 40 ? 0.2 : 0.1); P.lungeT = G.clock; P.state = 'swing'; P.swingT = 0; P.swingDur = 0.22; P.dashing = false; AudioSys.play('dash');
  if (execute && e.state === 'broken') deathblow(e);
}
function focusThrust() {
  const P = G.player, S = G.S;
  if (P.focus < 1) { AudioSys.play('deny'); if (G.clock - P.lastFocusMsg > 1) { textPop(P.x, P.y - 30, 'no focus', 'n', '#ffd36b'); P.lastFocusMsg = G.clock; } return; }
  let best = null, bs = 1e9;
  for (const e of G.enemies) {
    if (e.dead || e.spawning || e.untargetable) continue;
    const d = dist(P.x, P.y, e.x, e.y); if (d > 340 + e.r) continue;
    const da = Math.abs(angDiff(P.ang, Math.atan2(e.y - P.y, e.x - P.x)));
    let sc = d * (1 + da * 1.2); if (e.exposeT > 0) sc *= 0.3; if (e.state === 'broken') sc *= 0.3;
    if (sc < bs) { bs = sc; best = e; }
  }
  if (!best) { AudioSys.play('deny'); return; }
  P.focus--;
  const e = best; const exposed = e.exposeT > 0; const a = Math.atan2(e.y - P.y, e.x - P.x);
  if (e.state === 'broken') { lungeTo(e, true); return; }
  lungeTo(e, false);
  const base = bladeBase();
  let dmg = base * (exposed ? 4 : 1.8) + (exposed ? e.maxHp * (e.isBoss ? 0.025 : 0.12) : 0); if (hasR('anatomy')) dmg *= 1.6;
  const post = exposed ? e.maxPosture * (e.isBoss ? 0.22 : 0.6) : base * 1.5;
  e.exposeT = 0;
  damageEnemy(e, { dmg, post, src: 'focus', unblockable: true, forceCrit: exposed, critMul: exposed ? 1.5 : 1.8, kx: Math.cos(a), ky: Math.sin(a), knock: 300 });
  inkSlash(e.x, e.y, a, 230, exposed ? '#ffe27a' : '#cfefff', exposed ? 12 : 8); camPunch(exposed ? 0.06 : 0.035); addLight(e.x, e.y, 260, exposed ? '#ffe27a' : '#cfefff', 0.35, 1); sparks(e.x, e.y, exposed ? 30 : 14, exposed ? '#ffe27a' : '#ffffff', { ang: a, spread: 0.5, min: 300, max: 1000, w: 2.6 });
  glowPuff(e.x, e.y, exposed ? 120 : 60, '#ffd04a', 0.22);
  callout(e.x, e.y - e.r - 24, exposed ? 'PIERCE' : 'THRUST', exposed ? '#ffe27a' : '#cfefff', exposed ? 26 : 16, 0.7);
  hitstop(exposed ? 0.11 : 0.06); shake(exposed ? 10 : 5); kick(a, 10); AudioSys.play('mikiri'); AudioSys.play('crit');
  if (exposed) { slowmo(hasR('timesilk') ? 0.55 : 0.32, 0.22); invertFrames(0.045); }
  addCombo(exposed ? 5 : 2); styleGain(exposed ? 'weak' : 'focus', exposed ? 24 : 13, exposed ? 'WEAK POINT' : 'FOCUS THRUST');
  if (resT('spirit') >= 3) phantomBlades(P.x, P.y, a);
}
function autoTarget() {
  const P = G.player, B = curBlade(); const arc = (B.arc || 1) * 1.8;
  if (brokenTarget()) return true;
  for (const e of G.enemies) {
    if (e.dead || e.spawning || e.state === 'intro' || e.untargetable) continue;
    const d = dist(P.x, P.y, e.x, e.y); if (d > B.reach * 1.08 + e.r) continue;
    if (Math.abs(angDiff(P.ang, Math.atan2(e.y - P.y, e.x - P.x))) < arc / 2 + 0.45 || d < e.r + P.r + 10) return true;
  }
  return false;
}
// Taiko's drumbeat: twice a second
const BEAT = 0.5, BEAT_WIN = 0.1;
function onBeat() { const ph = G.clock % BEAT; return ph < BEAT_WIN || ph > BEAT - BEAT_WIN * 0.6; }
function playerDeath() {
  const P = G.player; if (P.dead) return;
  if (G.S.daruma && !P.risen && G.state === 'play') { P.risen = true; P.hp = Math.max(1, Math.round(G.S.maxHp * 0.4)); P.iframes = 1.6; callout(P.x, P.y - 60, 'RISES', '#e8432e', 34, 1.4, { serif: true }); explosion(P.x, P.y, 160, spellDmg(20), { col: '#e8432e', knock: 520 }); slowmo(0.6, 0.3); AudioSys.play('gong'); return; }
  P.dead = true;
  G.state = 'dying'; G.dyingT = 0; slowmo(1.6, 0.2);
  shardBurst(P.x, P.y, 30, '#ef3b2c', { max: 520 }); shardBurst(P.x, P.y, 16, '#e0b868', { max: 420 }); AudioSys.play('death'); screenFlash('#ff0000', 0.4); shake(16);
  Music.target = 0;
}

// ---------- Kagemusha: a shadow double left where each dash began ----------
function placeShadow(P) { P.shadow = { x: P.x, y: P.y, t: 0 }; ghostFx(P.x, P.y, P.ang); ring(P.x, P.y, 6, 40, '#8a6aff', 0.3, 3); }
function shadowStrike(P, node, c, melee) {
  const sh = P.shadow; let best = null, bd = 520;
  for (const e of G.enemies) { if (e.dead || e.spawning || e.untargetable) continue; const d = dist(sh.x, sh.y, e.x, e.y); if (d < bd) { bd = d; best = e; } }
  const a = best ? Math.atan2(best.y - sh.y, best.x - sh.x) : P.ang; sh.ang = a; sh.swingT = 0.2;
  if (!nodeEmpty(node)) executeNode(node, Object.assign({}, c, { x: sh.x, y: sh.y, ang: a, melee: null, dmgMul: 0.5, tx: best ? best.x : sh.x, ty: best ? best.y : sh.y }));
  slashFx(sh.x, sh.y, a, melee.arc, melee.reach, '#8a6aff', -P.swingSide, 0.17, 1);
  for (const e of G.enemies) { if (e.dead || e.spawning) continue; const d = dist(sh.x, sh.y, e.x, e.y); if (d > melee.reach + e.r) continue; if (Math.abs(angDiff(Math.atan2(e.y - sh.y, e.x - sh.x), a)) > melee.arc / 2 + 0.3) continue;
    damageEnemy(e, { dmg: melee.dmg * 0.5, post: melee.post * 0.5, src: 'blade', kx: Math.cos(a), ky: Math.sin(a), knock: 120, burn: melee.burn, chill: melee.chill, shock: melee.shock, bleed: melee.bleed }); }
}
