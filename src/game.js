// ================= GAME STATE & LOOP =================
const G = {
  state: 'title', clock: 0, ARENA: { w: 1600, h: 1000, pad: 200 }, cam: { x: 800, y: 500, zoom: 1, shake: 0, kx: 0, ky: 0 }, decals: [], combo: 0, comboT: 0, omen: null, omenMods: {},
  player: null, enemies: [], projs: [], parts: [], texts: [], callouts: [], pickups: [], hazards: [], timers: [], wisps: [], hitTimes: [], spawns: [],
  wave: 1, waveT: 0, waveDur: 30, waveActive: false, isBoss: false, boss: null, spawnBudget: 0, bossPending: null,
  ash: 0, xp: 0, level: 1, pendingLevels: 0, pendingChests: [], lsBank: 0,
  hitstop: 0, slow: { t: 0, s: 1, max: 1 }, flash: { col: '#fff', a: 0 }, invert: 0,
  tokens: { melee: 0, ranged: 0 }, maxTokens: { melee: 2, ranged: 2 }, maxAlive: 20,
  S: null, run: null, scale: null, bossScale: null, opts: { shake: Store.get('shake', true), auto: Store.get('auto', true), fancy: Store.get('fancy', true) }, lights: [], weather: [], lanterns: [], meta: null,
  mouseWorld: { x: 0, y: 0 }, banner: null, killsThisWave: 0, danger: 0, hint: null, hintsShown: {}, hpTrail: 0, pickCombo: 0, pickT: 0, ui: 1
};
let canvas, ctx, W = 0, H = 0, DPR = 1;

function loadMeta() { return Object.assign({ runs: 0, bestWave: 0, wins: 0, deflects: 0, deathblows: 0, mikiri: 0, kills: 0, maxDanger: 0, rushCleared: -1, rushBeat: {} }, Store.get('meta', {})); }
function saveMeta() { Store.set('meta', G.meta); }
function isUnlocked(v) { return !v.unlock || (G.meta[v.unlock.key] || 0) >= v.unlock.n; }
G.meta = loadMeta();

function resize() {
  DPR = Math.min(2, window.devicePixelRatio || 1);
  W = canvas.width = Math.floor(innerWidth * DPR); H = canvas.height = Math.floor(innerHeight * DPR);
  G.cam.zoom = DPR * Math.min(innerWidth / 1180, innerHeight / 720);
  G.ui = clamp(Math.min(innerWidth / 1300, innerHeight / 780), 0.72, 1.35) * DPR;
  buildVignette(G.biome || BIOMES[0]);
}

function makeDecal() { const c = document.createElement('canvas'); c.width = G.ARENA.w + G.ARENA.pad * 2; c.height = G.ARENA.h + G.ARENA.pad * 2; return { canvas: c, ctx: c.getContext('2d') }; }

// ---------- scaling ----------
function computeScale(w, dng) {
  const e = w > 15 ? Math.pow(1.17, w - 15) : 1;
  return {
    hp: (1 + 0.27 * (w - 1) + 0.032 * (w - 1) ** 2) * e * (1 + 0.18 * dng),
    dmg: (1.45 + 0.13 * (w - 1)) * (w > 15 ? Math.pow(1.08, w - 15) : 1) * (1 + 0.12 * dng),
    post: (1 + 0.1 * (w - 1)) * (w > 15 ? Math.pow(1.06, w - 15) : 1) * (1 + 0.08 * dng),
    windup: Math.max(0.72, (dng >= 2 ? 0.92 : 1) * (w > 15 ? Math.pow(0.985, w - 15) : 1)),
    ppost: 1 + 0.025 * (w - 1), pdmg: 1
  };
}
function computeBossScale(w, dng) {
  const cyc = Math.floor((w - 1) / 15);
  return { hp: (1 + 0.18 * dng) * Math.pow(2.5, cyc) * (cyc === 0 ? 1 + 0.035 * Math.max(0, w - 5) : 1), dmg: (1.5 + 0.085 * (w - 1)) * (1 + 0.1 * dng) * Math.pow(1.2, cyc), post: (1 + 0.08 * dng) * Math.pow(1.5, cyc), windup: (dng >= 2 ? 0.93 : 1) * Math.pow(0.93, cyc) };
}
const isBossWave = (w) => (G.run && G.run.rush) ? true : w % 5 === 0;
const bossFor = (w) => {
  const R = G.run; if (R.rush) return R.rush.list[Math.min(w, R.rush.list.length) - 1];
  const tier = (w / 5 - 1) % 3; if (w <= 15 && R.bossPicks) return R.bossPicks[tier];
  R.endlessBoss = R.endlessBoss || {}; if (R.endlessBoss[w]) return R.endlessBoss[w];
  const hard = BOSS_HARD.filter(b => w >= b.from).map(b => b.id);
  return (R.endlessBoss[w] = hard.length && Math.random() < 0.65 ? pick(hard) : pick(BOSS_TIERS[tier]));
};
// the wave a Boss Rush fight is scaled as
const rushWave = (w) => { const R = G.run; return R && R.rush ? R.rush.vw[Math.min(w, R.rush.vw.length) - 1] : w; };
const waveDuration = (w) => Math.min(45, 20 + w * 1.8);
// a wave ends when its quota of foes is cut down, not when a clock runs out
const waveQuota = (w, dng) => Math.round((20 + 6.5 * w) * (1 + 0.08 * dng) * ((G.omenMods && G.omenMods.spawn) || 1));
// foes press harder past the wave's par time, or whenever you stop fighting back
function pressure() { return Math.max(G.frenzy || 0, G.hunt || 0); }
const xpNeed = (L) => Math.round(12 + 6 * L + 0.6 * L * L);
const SPAWN_W = { grunt: 3, skitter: 2.2, archer: 1.4, bomber: 1, lancer: 1.3, brute: 0.9, shaman: 0.8, ninja: 1.1, monk: 1, wraith: 0.9, tengu: 1, shield: 0.8, duelist: 0.55, gunner: 0.8 };
const NUM_K = ['〇', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '十一', '十二', '十三', '十四', '十五'];

// ---------- runs ----------
function newRun(vid, danger, opts = {}) {
  const V = VESSEL[vid];
  G.run = { vessel: vid, danger, blade: V.blade, strike: [...V.strike], guard: [...V.guard], art: [...V.art], satchel: [...V.satchel], relics: [...(V.relics || [])], ups: {}, bonusHp: 0, relicSet: {},
    shop: [], bestCombo: 0, bossPicks: BOSS_TIERS.map(t => pick(t)), kills: 0, deflects: 0, deathblows: 0, mikiri: 0, dmgDealt: 0, dmgTaken: 0, ashTotal: 0, phoenixUsed: false, endless: false, time: 0, bossKills: 0, finished: false, newSigils: {}, attune: {},
    eng: rollEngravings(1, 1), always: [], bonusSlots: 0, hungerSlots: 0, hungerKills: 0, reengraves: 0, offSlots: 0, strike2: V.strike2 ? [...V.strike2] : null, fortune: null, bossAspects: rollBossAspects(danger) };
  G.lastLoc = null;
  G.resT = {}; G.res = {}; G.resLoaded = false; G.stormHits = 0;
  if (V.random) randomizePilgrim(G.run);
  G.wave = 1; G.ash = 0; G.xp = 0; G.level = 1; G.pendingLevels = 0; G.pendingChests = []; G.pendingSigilPicks = 0; G.pendingBladePicks = 0; G.omen = null; G.danger = danger;
  G.S = null; G.player = null; recomputeStats(); G.player = makePlayer(); G.player.hp = G.S.maxHp; G.player.ki = G.S.kiMax;
  G.meta.runs++; saveMeta();
  if (opts.rush !== undefined) {
    // Boss Rush: no waves to grow on, so you start with the kit for this gauntlet and tune it at the Forge
    const Gt = GAUNTLETS[opts.rush], K = Gt.kit, R = G.run;
    const list = opts.single ? [opts.single] : Gt.bosses.slice(); const vw = opts.single ? [Gt.vw[Gt.bosses.indexOf(opts.single)]] : Gt.vw.slice();
    R.rush = { g: opts.rush, list, vw, single: opts.single || null }; R.bossAspects = [[], [], []];
    for (const k in (K.ups || {})) R.ups[k] = (R.ups[k] || 0) + K.ups[k];
    G.wave = 0; G.level = K.level; G.pendingLevels = K.picks; G.ash = K.ash; R.ashTotal = K.ash; G.pendingSigilPicks = K.sigils; G.pendingBladePicks = K.blades;
    if (opts.single) { const idx = Math.max(0, Gt.bosses.indexOf(opts.single)); let extra = 0; for (let k = 1; k <= idx; k++) extra += Math.round((30 + 12 * k) * (1 + 0.5 * opts.rush)) + 40; G.level += idx; G.pendingLevels += idx; G.pendingSigilPicks += idx; G.ash += extra; R.ashTotal += extra; }
    recomputeStats(); G.player.hp = G.S.maxHp;
    G.state = 'menu'; UI.showBoon(() => { recomputeStats(); rebuildDeck(); UI.afterWave(); }); return;
  }
  G.state = 'menu'; UI.showBoon(() => { recomputeStats(); rebuildDeck(); startWave(); });
}
function randomizePilgrim(R) {
  R.blade = pick(BLADE_LIST.filter(b => b.rar <= 2)).id;
  const projs = SIG_LIST.filter(s => s.type === 'proj' && s.rar <= 2 && s.id !== 'bloodspear');
  const any = SIG_LIST.filter(s => s.rar <= 2);
  R.strike = [pick(projs).id, pick(any).id, pick(projs).id]; R.guard = [pick(projs).id]; R.art = [pick(projs).id]; R.satchel = [pick(any).id, pick(any).id];
  R.relics = [pick(RELIC_LIST.filter(r => r.rar <= 2)).id];
}
function startWave() {
  const R = G.run, w = G.wave;
  const sw = rushWave(w); G.scale = computeScale(sw, G.danger); G.bossScale = computeBossScale(sw, G.danger);
  const OM = G.omenMods = (G.omen && OMENS.find(o => o.id === G.omen)?.mods) || {};
  if (OM.hp) G.scale.hp *= OM.hp; if (OM.dmg) G.scale.dmg *= OM.dmg; if (OM.speed) G.scale.speed = OM.speed;
  G.stormT = 2;
  G.isBoss = isBossWave(w); G.waveDur = G.isBoss ? 0 : waveDuration(w); G.quota = G.isBoss ? 0 : waveQuota(w, G.danger); G.frenzy = 0; G.hunt = 0; G.lastEngageT = 0; G.waveT = 0; G.waveActive = true; G.spawnBudget = 2.5; G.eliteSpawned = 0; G.killsThisWave = 0; G.boss = null; G.waveEndT = -1; G.extraElites = 0; G.duelSpawned = false;
  if (G.S.shuffleAll && !G.isBossWaveStart) { const ks = Object.keys(FORTUNES); R.fortune = isBossWave(w) ? null : pick(ks); recomputeStats(); if (R.fortune) { const F = FORTUNES[R.fortune]; later(0.6, () => { callout(G.player.x, G.player.y - 80, F.g + ' ' + F.name.toUpperCase(), F.good ? '#ffd36b' : '#ff9a6a', 22, 2.2, { serif: true }); G.hint = { txt: 'Fortune: ' + F.desc, t: 0, life: 4, col: '#ffd36b' }; }); } }
  G.lights = []; { const gb = R.rush ? GAUNTLETS[R.rush.g].biome : undefined; const nb = gb !== undefined ? BIOMES[gb] : biomeFor(sw); if (G.biome !== nb || !G.floor) { buildFloor(nb); G.weather = []; G.mist = null; } if (G.lastLoc !== nb.id) { G.lastLoc = nb.id; showLocation(nb); } }
  G.enemies = []; G.projs = []; G.parts = []; G.texts = []; G.callouts = []; G.pickups = []; G.hazards = []; G.timers = []; G.wisps = []; G.spawns = []; G.hitTimes = [];
  G.tokens = { melee: 0, ranged: 0 }; G.maxTokens = { melee: 3 + (w >= 8 ? 1 : 0) + (G.danger >= 3 ? 1 : 0), ranged: 2 + (w >= 7 ? 1 : 0) }; G.baseTokens = { melee: G.maxTokens.melee, ranged: G.maxTokens.ranged }; G.frenzyEliteT = 0;
  G.maxAlive = Math.min(34, 9 + Math.round(w * 1.7)); G.decals = []; G.combo = 0; G.comboT = 0; styleReset();
  const P = G.player; const S = G.S;
  P.x = G.ARENA.w / 2; P.y = G.ARENA.h / 2 + (G.isBoss ? 180 : 0); P.shadow = S.shadow ? { x: P.x - 120, y: P.y, t: 0 } : null; P.risen = false; P.darumaN = 0; P.hp = S.maxHp; P.ki = S.kiMax; P.posture = 0; P.gourds = S.gourds; P.dashCharges = S.dashes;
  if (OM.startHp) P.hp = Math.round(S.maxHp * OM.startHp);
  P.state = 'idle'; P.iframes = 1; P.ward = 0; P.riposte = false; P.lotus = false; P.artCD = 0; P.kx = P.ky = 0; P.dashing = false; P.dead = false; P.deflectPress = -9;
  for (const s of P.scarf) { s.x = P.x; s.y = P.y; }
  rebuildDeck(); G.lsBank = 0; P.pending = []; P.riposteT = 0; P.focus = Math.min(S.focusMax, S.focusStart); P.ironWillUsed = false; P.hasteT = 0; G.hpTrail = P.hp;
  G.cam.x = P.x; G.cam.y = P.y;
  G.hitstop = 0; G.slow.t = 0; G.flash.a = 0; G.invert = 0;
  if (G.isBoss) {
    const bid = bossFor(w); const B = BOSSES[bid]; G.bossPending = { id: bid, t: 1.6 };
    G.banner = { txt: B.name, sub: B.title + (R.rush ? '   ' + '★'.repeat(B.diff || 1) + (R.rush.single ? '  ·  PRACTICE DUEL' : `  ·  DUEL ${w} OF ${R.rush.list.length}`) : ''), kanji: B.g, t: 0, life: 3.2, boss: true }; AudioSys.play('gong'); Music.target = 1;
  } else {
    const om = G.omen && OMENS.find(o => o.id === G.omen);
    G.bossPending = null; G.banner = { txt: 'WAVE ' + w, sub: om ? om.name.toUpperCase() + ' — ' + om.desc : (w === 1 ? 'Survive until the timer runs out' : (w % 5 === 4 ? 'A boss waits after this wave' : '')), kanji: '', t: 0, life: 1.8 };
    AudioSys.play('taiko'); Music.target = Math.min(0.85, 0.5 + w * 0.025);
  }
  if (w === 1 && !G.hintsShown.controls) { G.hintsShown.controls = true; G.hint = { txt: 'Yellow zone filling = incoming hit. Tap SPACE as it flashes white to PARRY  ·  SHIFT dash  ·  Q focus thrust  ·  E art  ·  R gourd', t: 0, life: 16 }; }
  G.state = 'play'; Input.clear(); UI.hideAll(); canvas.style.cursor = 'none';
}
function endWave() {
  if (!G.waveActive) return; G.waveActive = false; G.waveEndT = 0;
  G.enemies.forEach((e, i) => { if (!e.dead) later(0.035 * i, () => { if (!e.dead) { e.dead = true; e.releaseToken(); shardBurst(e.x, e.y, 10, e.d.col, { max: 320 }); ring(e.x, e.y, 4, e.r * 2, '#ffffff', 0.2, 2); AudioSys.play('pop'); } }); });
  G.projs = G.projs.filter(p => p.team === 'p'); G.hazards = []; G.spawns = [];
  for (const p of G.pickups) p.mag = true;
  const S = G.S, R = G.run;
  G.banner = { txt: G.isBoss ? 'BOSS DEFEATED' : 'WAVE CLEARED', sub: S.harvest > 0 ? `+${S.harvest} harvest` : '', kanji: '', t: 0, life: 2.0, good: true };
  if (S.harvest > 0) { G.ash += S.harvest; R.ashTotal += S.harvest; }
  if (hasR('ashheart')) { R.bonusHp += 3; recomputeStats(); }
  const OM = G.omenMods || {};
  if (R.fortune && FORTUNES[R.fortune].bonus) { G.ash += FORTUNES[R.fortune].bonus; R.ashTotal += FORTUNES[R.fortune].bonus; }
  if (G.wave <= 3 && !G.isBoss) G.pendingSigilPicks = (G.pendingSigilPicks || 0) + 1;
  if (R.rush) { const bid = bossFor(G.wave); G.meta.rushBeat[bid] = true; saveMeta(); G.pendingLevels += 1; G.pendingSigilPicks = (G.pendingSigilPicks || 0) + 1; const bonus = Math.round((30 + 12 * G.wave) * (1 + 0.5 * R.rush.g)); G.ash += bonus; R.ashTotal += bonus; }
  if (R.strike2 && G.isBoss) R.offSlots = (R.offSlots || 0) + 1;
  if (OM.levels) G.pendingLevels += OM.levels; if (OM.sigilPick) G.pendingSigilPicks = (G.pendingSigilPicks || 0) + OM.sigilPick; if (OM.chest) G.pendingChests.push(OM.chest); if (OM.bladePick) G.pendingBladePicks = (G.pendingBladePicks || 0) + 1;
  G.omen = null;
  AudioSys.play('win'); Music.target = 0.2;
  if (!R.rush) G.meta.bestWave = Math.max(G.meta.bestWave, G.wave + 1); saveMeta();
}
function finishRun(win) {
  const M = G.meta, R = G.run; if (R.finished) return []; R.finished = true;
  const before = new Set(VESSELS.filter(isUnlocked).map(v => v.id));
  if (!R.rush) M.bestWave = Math.max(M.bestWave, G.wave); M.deflects += R.deflects; M.deathblows += R.deathblows; M.mikiri += R.mikiri; M.kills += R.kills;
  if (win && R.rush) { if (!R.rush.single) { R.rushNew = M.rushCleared < R.rush.g; M.rushCleared = Math.max(M.rushCleared, R.rush.g); } }
  else if (win) { M.wins++; M.maxDanger = Math.max(M.maxDanger, Math.min(5, G.danger + 1)); }
  saveMeta();
  return VESSELS.filter(v => isUnlocked(v) && !before.has(v.id));
}

// ---------- spawning ----------
function spawnPoint(minD, maxD = 2000) {
  const P = G.player; const A = G.ARENA;
  for (let i = 0; i < 24; i++) { const x = rand(60, A.w - 60), y = rand(60, A.h - 60); const d = dist(x, y, P.x, P.y); if (d > minD && d < maxD) return [x, y]; }
  return [P.x < A.w / 2 ? A.w - 100 : 100, P.y < A.h / 2 ? A.h - 100 : 100];
}
function spawnGroup() {
  const w = G.wave;
  const pool = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= w && ENEMIES[k].cost > 0);
  const type = weighted(pool, k => SPAWN_W[k] * ((k === 'grunt' || k === 'skitter') ? Math.max(0.35, 1 - w * 0.045) : 1) * (ENEMIES[k].cost <= G.spawnBudget + 1.5 ? 1 : 0.12));
  const d = ENEMIES[type];
  const n = type === 'skitter' ? randi(3, 4) : type === 'grunt' ? randi(2, 3) : (type === 'archer' || type === 'bomber') ? randi(1, 2) : 1;
  const [x, y] = spawnPoint(260, 560);
  for (let i = 0; i < n; i++) { G.spawns.push({ x: clamp(x + rand(-45, 45), 40, G.ARENA.w - 40), y: clamp(y + rand(-45, 45), 40, G.ARENA.h - 40), t: 0, dur: 0.6 + i * 0.06, type, elite: false }); G.spawnBudget -= d.cost; }
}
function spawnElite(forceType) {
  const pool = Object.keys(ENEMIES).filter(k => ENEMIES[k].from <= G.wave && ENEMIES[k].cost >= 2 && k !== 'bomber');
  const type = forceType || pick(pool); const [x, y] = spawnPoint(300, 600);
  const affixes = shuffleArr(Object.keys(AFFIXES)).slice(0, G.wave >= 10 ? 2 : 1);
  G.spawns.push({ x, y, t: 0, dur: 1.2, type, elite: true, affixes });
  callout(x, y - 30, 'ELITE', '#ffd36b', 22, 1.3);
}
function waveUpdate(dt) {
  G.waveT += dt; const w = G.wave;
  for (let i = G.spawns.length - 1; i >= 0; i--) {
    const s = G.spawns[i]; s.t += dt;
    if (s.t >= s.dur) {
      G.spawns.splice(i, 1); const e = new Enemy(s.type, s.x, s.y, { elite: s.elite, affixes: s.affixes }); e.spawning = 0; e.cd = rand(0.25, 0.6); G.enemies.push(e);
      ring(s.x, s.y, 4, 30, ENEMIES[s.type].col, 0.25, 3); if (s.elite) { ring(s.x, s.y, 10, 80, '#ffd36b', 0.5, 4); AudioSys.play('gong'); }
    }
  }
  if (G.isBoss) {
    if (G.bossPending) { G.bossPending.t -= dt; if (G.bossPending.t <= 0) { const b = new Boss(G.bossPending.id, G.ARENA.w / 2, G.ARENA.h / 2 - 220); G.enemies.push(b); G.boss = b; G.bossPending = null; ring(b.x, b.y, 10, 220, '#ff5a4a', 0.6, 6); shake(12); AudioSys.play('break'); } }
    return;
  }
  if (G.killsThisWave >= G.quota) { endWave(); return; }
  // frenzy past par time; boldness when you stop landing blows
  const over = G.waveT - G.waveDur; const wasF = G.frenzy;
  G.frenzy = over > 0 ? Math.min(1, 0.35 + over / 25) : 0;
  if (wasF === 0 && G.frenzy > 0) { callout(G.player.x, G.player.y - 70, 'FRENZY', '#ff4a3a', 30, 1.3, { serif: false }); AudioSys.play('perilous'); screenFlash('#ff2a2a', 0.15); if (!G.hintsShown.frenzy) { G.hintsShown.frenzy = true; G.hint = { txt: 'Past par time, foes frenzy: faster and fiercer until the quota falls.', t: 0, life: 4.5, col: '#ff8a6a' }; } }
  const alive = G.enemies.some(e => !e.dead && !e.spawning);
  const idle = alive ? G.clock - Math.max(G.lastEngageT || 0, G.clock - G.waveT) - 2.5 : -1;
  G.hunt = idle > 0 ? Math.min(1, idle / 2) : Math.max(0, (G.hunt || 0) - dt * 2);
  if (G.hunt >= 1 && !G.hintsShown.hunt) { G.hintsShown.hunt = true; G.hint = { txt: 'Foes grow bold when you stop fighting back. Strike to calm them.', t: 0, life: 4, col: '#ff8a6a' }; }
  G.maxTokens.melee = G.baseTokens.melee + (G.frenzy > 0 ? 2 : 0) + (G.hunt > 0.5 ? 1 : 0);
  if (G.frenzy > 0) { G.frenzyEliteT = (G.frenzyEliteT || 0) - dt; if (G.frenzyEliteT <= 0) { G.frenzyEliteT = 14; if (over > 6) spawnElite(); } }
  const ramp = G.waveT < 0.8 ? 0 : 0.7 + 0.3 * Math.min(1, G.waveT / 8);
  const OM = G.omenMods || {};
  const aliveN = G.enemies.length + G.spawns.length; const remaining = G.quota - G.killsThisWave - aliveN;
  G.spawnBudget += (1.35 + 0.4 * w) * (1 + 0.1 * G.danger) * ramp * dt * (OM.spawn || 1) * (aliveN < 5 ? 3 : 1) * (1 + G.frenzy);
  if (remaining > 0 && aliveN < G.maxAlive * (OM.spawn || 1) && G.spawnBudget >= 1) spawnGroup();
  const prog = G.killsThisWave / Math.max(1, G.quota);
  if (OM.elites && (G.extraElites || 0) < OM.elites && prog > 0.2 + 0.3 * (G.extraElites || 0)) { G.extraElites = (G.extraElites || 0) + 1; spawnElite(); }
  if (OM.duel && !G.duelSpawned && prog > 0.25) { G.duelSpawned = true; spawnElite('duelist'); }
  if (OM.storm) { G.stormT -= dt; if (G.stormT <= 0) { G.stormT = rand(1.4, 2.4); const P = G.player; for (let k = 0; k < 2; k++) G.hazards.push({ k: 'ground', x: clamp(P.x + rand(-160, 160), 30, G.ARENA.w - 30), y: clamp(P.y + rand(-160, 160), 30, G.ARENA.h - 30), r: 60, t: 0, delay: 0.95, dmg: 12 * G.scale.dmg, post: 0, perilous: true, src: null, lightning: true }); } }
  if (G.run.fortune === 'snake' && G.eliteSpawned < 3 && prog > 0.15 + 0.25 * G.eliteSpawned) { G.eliteSpawned++; spawnElite(); }
  if (w >= 3 && G.eliteSpawned === 0 && prog > 0.4) { G.eliteSpawned = 1; spawnElite(); }
  if (G.danger >= 4 && w >= 3 && G.eliteSpawned === 1 && prog > 0.72) { G.eliteSpawned = 2; spawnElite(); }
  const left = G.waveDur - G.waveT; if (left < 4 && left > 0 && Math.floor(left) !== Math.floor(left + dt)) AudioSys.play('tick');
}
function onBossDeath(e) {
  G.run.bossKills++;
  slowmo(1.8, 0.12); invertFrames(0.14); shake(24);
  for (let i = 0; i < 4; i++) later(i * 0.12, () => { shardBurst(e.x + rand(-30, 30), e.y + rand(-30, 30), 24, e.d.col, { max: 700 }); sparks(e.x, e.y, 30, '#ffd36b', { max: 900 }); });
  ring(e.x, e.y, 10, 420, '#ffd36b', 0.9, 10);
  callout(e.x, e.y - 80, 'DEFEATED', '#ffd36b', 48, 2); AudioSys.play('gong');
  dropAsh(e.x, e.y, e.d.ash * (1 + G.S.ashGain / 100) * (1 + G.danger * 0.15));
  G.pendingChests.push(3);
  for (const o of G.enemies) if (!o.dead && o !== e) { o.dead = true; o.releaseToken(); shardBurst(o.x, o.y, 10, o.d.col); }
  later(2.2, () => endWave());
}

// ---------- pickups ----------
function updatePickups(dt) {
  const P = G.player, S = G.S; const R = 95 * (1 + S.pickup / 100);
  G.pickT -= dt; if (G.pickT <= 0) G.pickCombo = 0;
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt;
    const d = dist(p.x, p.y, P.x, P.y);
    if (!p.mag) { const f = Math.exp(-4 * dt); p.vx *= f; p.vy *= f; p.x += p.vx * dt; p.y += p.vy * dt; if ((d < R && p.k === 'ash') || (d < 40) || (!G.waveActive && p.k === 'ash')) p.mag = true; }
    else { p.sp = (p.sp || 160) + 1600 * dt; const a = Math.atan2(P.y - p.y, P.x - p.x); p.x += Math.cos(a) * p.sp * dt; p.y += Math.sin(a) * p.sp * dt; }
    if (d < P.r + 10 && p.t > 0.12 && !P.dead) {
      G.pickups.splice(i, 1);
      if (p.k === 'ash') {
        G.ash += p.v; G.xp += p.v; G.run.ashTotal += p.v; G.pickCombo++; G.pickT = 0.45; AudioSys.play('pickup', G.pickCombo);
        while (G.xp >= xpNeed(G.level)) { G.xp -= xpNeed(G.level); G.level++; G.pendingLevels++; AudioSys.play('level'); callout(P.x, P.y - 46, '昇', '#ffd36b', 34, 0.9); ring(P.x, P.y, 10, 70, '#ffd36b', 0.4, 3); }
      } else if (p.k === 'heart') { healPlayer(5 + S.maxHp * 0.05); }
      else if (p.k === 'chest') { G.pendingChests.push(2); AudioSys.play('coin'); callout(P.x, P.y - 46, '宝', '#ffd36b', 34, 0.9); }
    }
  }
}

// ---------- main update ----------
function update(dtReal) {
  let dt;
  if (G.hitstop > 0) { G.hitstop -= dtReal; dt = 0; }
  else {
    let s = 1; if (G.slow.t > 0) { G.slow.t -= dtReal; const k = clamp(G.slow.t / G.slow.max, 0, 1); s = lerp(1, G.slow.s, Math.min(1, k * 1.6)); }
    dt = dtReal * s;
  }
  G.flash.a *= Math.exp(-7 * dtReal); if (G.invert > 0) G.invert -= dtReal;
  G.cam.shake *= Math.exp(-11 * dtReal); G.cam.kx *= Math.exp(-14 * dtReal); G.cam.ky *= Math.exp(-14 * dtReal); G.cam.punch = (G.cam.punch || 0) * Math.exp(-9 * dtReal);
  updateLights(dt); updateWeather(dtReal); if (G.locCard) { G.locCard.t += dtReal; if (G.locCard.t > G.locCard.life) G.locCard = null; }
  { const P0 = G.player; if (P0 && !P0.dead && G.state === 'play') { const mv = Math.hypot(P0.x - (P0._lx ?? P0.x), P0.y - (P0._ly ?? P0.y)) / Math.max(1e-4, dt); if (dt > 0 && mv > 160 && Math.random() < dt * (P0.dashing ? 40 : 7)) dustPuff(P0.x, P0.y + 8); P0._lx = P0.x; P0._ly = P0.y; } }
  if (G.banner) { G.banner.t += dtReal; if (G.banner.t > G.banner.life) G.banner = null; }
  if (G.hint) { G.hint.t += dtReal; if (G.hint.t > G.hint.life) G.hint = null; }
  const P = G.player;
  G.mouseWorld.x = (Input.mx * DPR - W / 2) / G.cam.zoom + G.cam.x; G.mouseWorld.y = (Input.my * DPR - H / 2) / G.cam.zoom + G.cam.y;
  if (dt > 0) {
    G.clock += dt; G.run.time += dt;
    if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) G.combo = 0; }
    updateStyle(dt);
    if (G.waveActive) waveUpdate(dt);
    if (G.state === 'play') updatePlayer(dt);
    for (const e of G.enemies) if (!e.dead) e.update(dt);
    // separation
    const E = G.enemies;
    for (let i = 0; i < E.length; i++) {
      const a = E[i]; if (a.dead) continue;
      for (let j = i + 1; j < E.length; j++) {
        const b = E[j]; if (b.dead) continue; const rr = (a.r + b.r) * 0.9; const dx = b.x - a.x, dy = b.y - a.y; const d2 = dx * dx + dy * dy;
        if (d2 < rr * rr && d2 > 0.01) { const d = Math.sqrt(d2), push = (rr - d) * 0.5; const nx = dx / d, ny = dy / d; const wa = a.isBoss ? 0.1 : 1, wb = b.isBoss ? 0.1 : 1; a.x -= nx * push * wa; a.y -= ny * push * wa; b.x += nx * push * wb; b.y += ny * push * wb; }
      }
    }
    G.enemies = G.enemies.filter(e => !e.dead);
    updateProjs(dt); updateHazards(dt); updateWisps(dt); updateTimers(); updatePickups(dt); updateFX(dt);
    if (G.hitTimes.length) G.hitTimes = G.hitTimes.filter(t => t > G.clock - 0.3);
    if (G.enemies.some(e => e.state === 'windup' && e.step && e.step.perilous) && !G.hintsShown.perilous) { G.hintsShown.perilous = true; G.hint = { txt: 'RED zone = can\'t parry. DASH (Shift) out of it, or through it at the last moment for a Mikiri counter.', t: 0, life: 6, col: '#ff6a5a' }; }
    if (G.enemies.some(e => e.exposeT > 0) && !G.hintsShown.focus) { G.hintsShown.focus = true; G.hint = { txt: 'WEAK POINT exposed (gold diamond)! Press Q to FOCUS THRUST into it. Parries and Mikiri give Focus.', t: 0, life: 6, col: '#ffe27a' }; }
    if (G.enemies.some(e => e.state === 'broken') && !G.hintsShown.broken) { G.hintsShown.broken = true; G.hint = { txt: 'Posture broken (red dot): STRIKE it for a DEATHBLOW.', t: 0, life: 5, col: '#ff6a5a' }; }
  }
  G.hpTrail = P ? (G.hpTrail > P.hp ? Math.max(P.hp, G.hpTrail - 30 * dtReal) : P.hp) : 0;
  if (!G.waveActive && G.waveEndT >= 0 && G.state === 'play') {
    G.waveEndT += dtReal;
    if (G.waveEndT > 2.0 && ((G.pickups.length === 0 && G.timers.length === 0) || G.waveEndT > 4.5)) { G.waveEndT = -1; for (const p of G.pickups) if (p.k === 'ash') { G.ash += p.v; G.xp += p.v; } G.pickups = []; UI.afterWave(); }
  }
  if (G.state === 'dying') { G.dyingT += dtReal; if (G.dyingT > 2.4) { G.state = 'over'; UI.showOver(false); } }
  // camera
  if (P) {
    const mx = clamp(G.mouseWorld.x - P.x, -320, 320), my = clamp(G.mouseWorld.y - P.y, -320, 320);
    const tx = P.x + mx * 0.16, ty = P.y + my * 0.16; const k = 1 - Math.exp(-7 * dtReal);
    G.cam.x = lerp(G.cam.x, tx, k); G.cam.y = lerp(G.cam.y, ty, k);
    const z = G.cam.zoom, hw = W / 2 / z, hh = H / 2 / z, A = G.ARENA, pad = 90;
    G.cam.x = A.w + pad * 2 < hw * 2 ? A.w / 2 : clamp(G.cam.x, -pad + hw, A.w + pad - hw);
    G.cam.y = A.h + pad * 2 < hh * 2 ? A.h / 2 : clamp(G.cam.y, -pad + hh, A.h + pad - hh);
  }
}

// ---------- attract (menus) ----------
let attractT = 0;
function updateAttract(dt) {
  attractT += dt; G.clock += dt;
  G.cam.x = G.ARENA.w / 2 + Math.cos(attractT * 0.05) * 300; G.cam.y = G.ARENA.h / 2 + Math.sin(attractT * 0.07) * 180;
  if (Math.random() < dt * 30) { const z = G.cam.zoom; const x = G.cam.x + rand(-W / 2, W / 2) / z, y = G.cam.y + H / 2 / z + 20; addPart({ k: 'ember', x, y, vx: rand(-20, 20), vy: rand(-90, -40), r: rand(2, 4.5), col: pick(['#ff6a3a', '#ffb347', '#e8432e']), life: rand(4, 9), drag: 0.05 }); }
  updateFX(dt); updateWeather(dt); updateLights(dt);
}
function renderAttract() {
  const z = G.cam.zoom * 1.05;
  ctx.setTransform(z, 0, 0, z, W / 2 - G.cam.x * z, H / 2 - G.cam.y * z);
  if (G.floor) ctx.drawImage(G.floor, -G.ARENA.pad, -G.ARENA.pad);
  renderLighting(G.cam.x, G.cam.y, z);
  drawParts(ctx, 1); drawWeather(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = 'rgba(6,5,8,0.3)'; ctx.fillRect(0, 0, W, H); if (!G.opts.fancy) ctx.drawImage(G.vig, 0, 0, W, H);
}

// ---------- main render ----------
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = '#050407'; ctx.fillRect(0, 0, W, H);
  const P = G.player;
  if (!P || G.state === 'title') { renderAttract(); return; }
  const z = G.cam.zoom * (1 + (G.cam.punch || 0)); const sh = G.cam.shake; const sx = (Math.random() * 2 - 1) * sh + G.cam.kx, sy = (Math.random() * 2 - 1) * sh + G.cam.ky;
  const camX = G.cam.x + sx, camY = G.cam.y + sy;
  ctx.setTransform(z, 0, 0, z, W / 2 - camX * z, H / 2 - camY * z);
  const pad = G.ARENA.pad;
  ctx.drawImage(G.floor, -pad, -pad); drawDecals(ctx);
  // the world is lit; fighters, telegraphs and spells stay crisp on top of it
  renderLighting(camX, camY, z);
  drawParts(ctx, 0); drawSpawns(ctx); drawHazards(ctx); drawSilk(ctx);
  for (const e of G.enemies) drawTelegraph(ctx, e);
  drawPickups(ctx);
  for (const e of G.enemies) { if (e.spawning > 0 || e.vanishT > 0) continue; const off = e.d.float ? 16 : 6; const lift = e.air ? Math.sin(Math.min(1, e.air.t / e.air.dur) * Math.PI) : 0; drawShadow(ctx, e.x + 3, e.y + off, e.r * (1.35 - lift * 0.4), e.r * (0.95 - lift * 0.3), 0.9 - lift * 0.4); }
  if (!P.dead) drawShadow(ctx, P.x + 3, P.y + 7, 22, 15, 0.95);
  const list = G.enemies.slice().sort((a, b) => a.y - b.y); let drewP = false;
  for (const e of list) { if (e.spawning > 0) continue; if (!drewP && e.y > P.y) { drawPlayer(ctx); drewP = true; } drawEnemy(ctx, e); }
  if (!drewP) drawPlayer(ctx);
  drawWisps(ctx);
  for (const p of G.projs) drawProj(ctx, p);
  drawParts(ctx, 1);
  drawWeather(ctx);
  for (const e of G.enemies) drawEnemyOverlay(ctx, e);
  drawTexts(ctx);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
  if (!G.opts.fancy) ctx.drawImage(G.vig, 0, 0, W, H);
  const S = G.S;
  if (!P.dead && P.hp / S.maxHp < 0.3) { const k = (0.3 - P.hp / S.maxHp) / 0.3; const a = (0.15 + 0.15 * Math.sin(G.clock * 6)) * k; const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.3, W / 2, H / 2, Math.max(W, H) * 0.7); g.addColorStop(0, 'rgba(255,0,0,0)'); g.addColorStop(1, `rgba(190,0,0,${a})`); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H); }
  if (G.slow.t > 0) { ctx.fillStyle = `rgba(30,10,30,${0.12 * clamp(G.slow.t / G.slow.max, 0, 1)})`; ctx.fillRect(0, 0, W, H); }
  if ((G.hunt || 0) > 0.05 && G.state === 'play') { const a = G.hunt * (0.22 + 0.1 * Math.sin(G.clock * 7)); const gr = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.72); gr.addColorStop(0, 'rgba(120,0,0,0)'); gr.addColorStop(1, `rgba(150,10,10,${a})`); ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H); }
  if (G.flash.a > 0.01) { ctx.globalAlpha = G.flash.a; ctx.fillStyle = G.flash.col; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; }
  if (G.invert > 0) { ctx.globalCompositeOperation = 'difference'; ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, W, H); ctx.globalCompositeOperation = 'source-over'; }
  drawGrain(); drawLetterbox();
  drawHUD(); drawLocation();
  if (G.state === 'play') drawCrosshair();
}

// ---------- HUD ----------
function rrect(c, x, y, w, h, r) { c.beginPath(); c.moveTo(x + r, y); c.lineTo(x + w - r, y); c.quadraticCurveTo(x + w, y, x + w, y + r); c.lineTo(x + w, y + h - r); c.quadraticCurveTo(x + w, y + h, x + w - r, y + h); c.lineTo(x + r, y + h); c.quadraticCurveTo(x, y + h, x, y + h - r); c.lineTo(x, y + r); c.quadraticCurveTo(x, y, x + r, y); c.closePath(); }
function hudText(t, x, y, size, col, align = 'left', weight = 700, font = FONT_SANS) {
  ctx.font = `${weight} ${Math.round(size)}px ${font}`; ctx.textAlign = align; ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.22); ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.strokeText(t, x, y); ctx.fillStyle = col; ctx.fillText(t, x, y);
}
// slanted brush-stroke bar
function inkBar(x, y, w, h, k, col, trail, o = {}) {
  const sl = h * 0.7; const path = (inset = 0) => { ctx.beginPath(); ctx.moveTo(x + sl + inset, y + inset); ctx.lineTo(x + w - inset, y + inset); ctx.lineTo(x + w - sl - inset, y + h - inset); ctx.lineTo(x + inset, y + h - inset); ctx.closePath(); };
  ctx.save(); ctx.fillStyle = 'rgba(6,5,9,0.82)'; ctx.beginPath(); ctx.moveTo(x + sl - 4, y - 3); ctx.lineTo(x + w + 6, y - 4); ctx.lineTo(x + w - sl + 3, y + h + 3); ctx.lineTo(x - 6, y + h + 4); ctx.closePath(); ctx.fill();
  path(); ctx.clip();
  ctx.fillStyle = 'rgba(255,255,255,0.04)'; ctx.fillRect(x, y, w, h);
  if (trail !== undefined && trail > k) { ctx.fillStyle = 'rgba(255,236,210,0.55)'; ctx.fillRect(x, y, w * clamp(trail, 0, 1), h); }
  if (o.rally > 0) { ctx.fillStyle = `rgba(255,176,72,${0.55 + 0.25 * Math.sin(G.clock * 9)})`; ctx.fillRect(x + w * clamp(k, 0, 1), y, w * clamp(o.rally, 0, 1 - k), h); }
  const gr = ctx.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, o.hi || tintHex(col, 0.35)); gr.addColorStop(0.5, col); gr.addColorStop(1, shadeHex(col, 0.6));
  ctx.fillStyle = gr; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fillRect(x, y, w * clamp(k, 0, 1), Math.max(1, h * 0.18));
  if (o.ticks) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; for (let i = 1; i < o.ticks; i++) ctx.fillRect(x + w * i / o.ticks, y, Math.max(1, G.ui), h); }
  ctx.restore();
}
function bar(x, y, w, h, k, col, bg = 'rgba(0,0,0,0.6)', trail) {
  ctx.fillStyle = bg; rrect(ctx, x - 2, y - 2, w + 4, h + 4, 3); ctx.fill();
  if (trail !== undefined) { ctx.fillStyle = 'rgba(255,230,200,0.5)'; ctx.fillRect(x, y, w * clamp(trail, 0, 1), h); }
  ctx.fillStyle = col; ctx.fillRect(x, y, w * clamp(k, 0, 1), h);
}
function drawCard(x, y, s, card, o = {}) {
  ctx.save();
  ctx.globalAlpha = o.alpha ?? 1;
  ctx.fillStyle = o.dim ? '#0d0c11' : '#17151d'; rrect(ctx, x, y, s, s, 4 * G.ui); ctx.fill();
  if (o.hl) { ctx.strokeStyle = o.hl; ctx.lineWidth = 2 * G.ui; ctx.stroke(); }
  else { ctx.strokeStyle = 'rgba(239,230,210,0.12)'; ctx.lineWidth = 1; ctx.stroke(); }
  if (card) {
    ctx.fillStyle = TYPE_COL[card.type]; ctx.fillRect(x + 3, y + 2, s - 6, Math.max(2, 2.5 * G.ui));
    ctx.font = `800 ${Math.round(s * 0.52)}px ${FONT_SERIF}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = o.fizzle ? '#4a6a88' : card.col; ctx.fillText(card.g, x + s / 2, y + s * 0.56);
  }
  if (o.cd > 0) { ctx.fillStyle = 'rgba(0,0,0,0.65)'; ctx.fillRect(x, y, s, s * o.cd); }
  ctx.restore();
}
function drawHUD() {
  const P = G.player, S = G.S, u = G.ui; if (!P || !S) return;
  ctx.save();
  // top-left: ash + level
  const x0 = 22 * u, y0 = 26 * u;
  hudText('灰', x0, y0, 22 * u, '#ffb35a', 'left', 800, FONT_SERIF); hudText(String(G.ash), x0 + 28 * u, y0, 20 * u, '#ffe3b0');
  hudText('Lv ' + G.level, x0, y0 + 30 * u, 14 * u, '#efe6d2');
  bar(x0 + 46 * u, y0 + 26 * u, 140 * u, 6 * u, G.xp / xpNeed(G.level), '#ffd36b');
  if (G.pendingLevels > 0) hudText('+' + G.pendingLevels, x0 + 196 * u, y0 + 30 * u, 13 * u, '#ffd36b');
  { let rx0 = x0, ry0 = y0 + 54 * u; for (const k of SCHOOL_IDS) { const tr = (G.resT || {})[k]; if (!tr) continue; hudText(SCHOOLS[k].g, rx0, ry0, 16 * u, SCHOOLS[k].col, 'left', 800, FONT_SERIF); hudText(ROMAN[tr], rx0 + 19 * u, ry0 + 1 * u, 11 * u, SCHOOLS[k].col, 'left', 800); rx0 += 26 * u + 9 * u * tr; } }
  // top-center: wave / boss
  if (G.isBoss && G.boss && !G.boss.dead) drawBossBar();
  else if (!G.isBoss || G.bossPending) {
    const left = Math.max(0, G.waveDur - G.waveT);
    hudText((G.run.endless ? 'ENDLESS · ' : '') + 'WAVE ' + G.wave + (G.biome ? '  ·  ' + G.biome.name.toUpperCase() : ''), W / 2, 16 * u, 10 * u, '#a49b88', 'center', 700);
    if (G.waveActive && !G.isBoss) {
      const rem = Math.max(0, Math.ceil(G.quota - G.killsThisWave)); const k = clamp(G.killsThisWave / Math.max(1, G.quota), 0, 1); const ry = 52 * u, rr = 25 * u;
      const fz = G.frenzy > 0; const acc = fz ? '#ff3a2a' : (G.biome ? G.biome.accent : '#e8432e');
      ctx.lineWidth = 3.5 * u; ctx.strokeStyle = 'rgba(0,0,0,0.55)'; ctx.beginPath(); ctx.arc(W / 2, ry, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = acc; ctx.beginPath(); ctx.arc(W / 2, ry, rr, -Math.PI / 2, -Math.PI / 2 + TAU * k); ctx.stroke();
      if (!fz) { const pk = clamp(left / Math.max(1, G.waveDur), 0, 1); ctx.lineWidth = 1.5 * u; ctx.strokeStyle = 'rgba(239,230,210,0.35)'; ctx.beginPath(); ctx.arc(W / 2, ry, rr + 5 * u, -Math.PI / 2, -Math.PI / 2 + TAU * pk); ctx.stroke(); }
      hudText(String(rem), W / 2, ry + 1 * u, 22 * u, fz ? '#ff6a4a' : '#efe6d2', 'center', 800, FONT_SERIF);
      hudText(fz ? 'FRENZY' : left < 8 ? `frenzy in ${Math.ceil(left)}` : 'foes remain', W / 2, ry + 38 * u, 9 * u, fz ? '#ff5a4a' : left < 8 ? '#ff9a7a' : '#8a8270', 'center', 800);
      if (G.hunt > 0.2) { ctx.globalAlpha = Math.min(1, G.hunt * 1.5); hudText('HUNTED · strike back', W / 2, ry + 52 * u, 10 * u, '#ff5a4a', 'center', 800); ctx.globalAlpha = 1; }
    }
  }
  // top-right: relics
  const rel = G.run.relics; const rs = 22 * u; let rx = W - 22 * u - rs, ry = 16 * u;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < rel.length; i++) {
    const r = RELICS[rel[i]]; ctx.fillStyle = 'rgba(20,18,26,0.85)'; ctx.beginPath(); ctx.arc(rx + rs / 2, ry + rs / 2, rs / 2, 0, TAU); ctx.fill(); ctx.strokeStyle = RAR[r.rar].col; ctx.lineWidth = 1.2 * u; ctx.stroke();
    ctx.font = `800 ${Math.round(rs * 0.55)}px ${FONT_SERIF}`; ctx.fillStyle = RAR[r.rar].col; ctx.fillText(r.g, rx + rs / 2, ry + rs / 2 + 1);
    rx -= rs + 5 * u; if (rx < W * 0.62) { rx = W - 22 * u - rs; ry += rs + 5 * u; }
  }
  // bottom-left: hp, ki, dashes, gourds
  const bx = 24 * u, by = H - 26 * u, bw = 280 * u;
  const low = P.hp / S.maxHp < 0.3; const hpCol = low ? (Math.sin(G.clock * 8) > 0 ? '#ff3a2a' : '#c8221a') : '#d8392a';
  hudText('命', bx, by - 37 * u, 20 * u, '#ff6a5a', 'left', 800, FONT_SERIF);
  inkBar(bx + 26 * u, by - 47 * u, bw, 18 * u, P.hp / S.maxHp, P.rallyFlash > 0 ? '#ff9a4a' : hpCol, G.hpTrail / S.maxHp, { ticks: Math.min(20, Math.round(S.maxHp / 10)), rally: (P.rally || 0) / S.maxHp });
  if (S.flames) { for (let i = 0; i < S.maxHp; i++) { const fx = bx + 40 * u + i * 26 * u, fy = by - 60 * u; ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, fx, fy, (i < P.hp ? 22 : 10) * u, i < P.hp ? '#7fd8ff' : '#2a3a4a', i < P.hp ? 0.9 + 0.1 * Math.sin(G.clock * 6 + i) : 0.5); ctx.restore(); } }
  if (P.rally > 0.5) hudText('RALLY: strike back', bx + 26 * u + bw + 10 * u, by - 38 * u, 9 * u, '#ffb048', 'left', 800);
  hudText(`${Math.ceil(Math.max(0, P.hp))}`, bx + 46 * u, by - 38 * u, 13 * u, '#fff4ec', 'left', 800); hudText(`/ ${S.maxHp}`, bx + 46 * u + ctx.measureText(String(Math.ceil(Math.max(0, P.hp)))).width + 5 * u, by - 37 * u, 10 * u, '#e8c8c0', 'left', 700);
  if (S.bloodMagic) hudText('BLOOD MAGIC · sigils cost HP', bx + 26 * u, by - 15 * u, 9.5 * u, '#ff6a7a', 'left', 800);
  if (G.run.fortune && FORTUNES[G.run.fortune]) { const F = FORTUNES[G.run.fortune]; hudText(`${F.g} ${F.name}: ${F.desc}`, bx, by - 72 * u, 10 * u, F.good ? '#ffd36b' : '#ff9a6a', 'left', 700); }
  if (!S.bloodMagic) hudText('気', bx + 4 * u, by - 15 * u, 14 * u, '#7fc0ff', 'left', 800, FONT_SERIF);
  if (!S.bloodMagic) { inkBar(bx + 26 * u, by - 21 * u, bw * 0.86, 9 * u, P.ki / S.kiMax, '#3a9cff');
  hudText(`${Math.floor(P.ki)}`, bx + 26 * u + bw * 0.86 + 8 * u, by - 16 * u, 10 * u, '#9fd0ff', 'left', 800); }
  let ix = bx, iy = by - 66 * u;
  for (let i = 0; i < S.dashes; i++) {
    const full = i < P.dashCharges; ctx.save(); ctx.translate(ix + 7 * u, iy); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = full ? '#7fe0ff' : 'rgba(127,224,255,0.15)'; ctx.fillRect(-5 * u, -5 * u, 10 * u, 10 * u);
    if (!full && i === P.dashCharges) { ctx.fillStyle = '#7fe0ff'; ctx.fillRect(-5 * u, -5 * u, 10 * u * (1 - P.dashCD / S.dashCd), 10 * u); }
    ctx.restore(); ix += 18 * u;
  }
  ix += 6 * u;
  for (let i = 0; i < S.focusMax; i++) { const full = i < P.focus; ctx.save(); ctx.translate(ix + 8 * u, iy); ctx.rotate(Math.PI / 4); const sz = (full && P.focusFlash > 0 ? 7 : 5.5) * u; ctx.fillStyle = '#0d0f15'; ctx.fillRect(-sz - 2, -sz - 2, sz * 2 + 4, sz * 2 + 4); ctx.fillStyle = full ? '#ffe27a' : 'rgba(255,226,122,0.15)'; ctx.fillRect(-sz, -sz, sz * 2, sz * 2); ctx.restore(); ix += 19 * u; }
  hudText('Q', ix, iy + 1 * u, 9 * u, '#6d6658'); ix += 16 * u;
  hudText('瓢', ix, iy, 18 * u, P.gourds > 0 ? '#e8a85a' : '#5a4a3a', 'left', 800, FONT_SERIF); hudText('×' + P.gourds, ix + 20 * u, iy + 1 * u, 13 * u, '#efe6d2'); hudText('R', ix + 46 * u, iy + 1 * u, 9 * u, '#6d6658');
  ix += 62 * u; if (P.ward) { hudText('守', ix, iy, 18 * u, '#4fd1a5', 'left', 800, FONT_SERIF); ix += 26 * u; }
  if (P.riposte) { hudText('返', ix, iy, 18 * u, '#ffd36b', 'left', 800, FONT_SERIF); ix += 26 * u; }
  if (P.lotus) { hudText('蓮', ix, iy, 18 * u, '#c9b6ff', 'left', 800, FONT_SERIF); ix += 26 * u; }
  if (P.rageT > 0) { hudText('怒', ix, iy, 18 * u, '#ff6a3a', 'left', 800, FONT_SERIF); ix += 26 * u; }
  // bottom-center: chains
  const deck = P.deck; const cs = 36 * u, gap = 5 * u; const n = Math.max(1, deck.length);
  const tw = n * (cs + gap) - gap; let cx = W / 2 - tw / 2; const cy = H - 22 * u - cs;
  const [from, to, fz] = previewDraw();
  hudText(G.opts.auto ? 'STRIKE · AUTO [C]' : 'STRIKE · [C] auto off', W / 2, cy - 14 * u, 10 * u, G.opts.auto ? '#d9b46a' : '#a49b88', 'center');
  if (!deck.length) drawCard(cx, cy, cs, null, { dim: true });
  for (let i = 0; i < deck.length; i++) {
    const next = i >= from && i < to; const lift = next ? 6 * u : 0;
    drawCard(cx + i * (cs + gap), cy - lift, cs, deck[i], { hl: next ? (fz ? '#59b8ff' : '#ffd36b') : null, alpha: next ? 1 : 0.55 });
    if (i === deck.length - 1) { ctx.fillStyle = '#ff5b45'; ctx.fillRect(cx + i * (cs + gap) + cs * 0.3, cy + cs + 3 * u, cs * 0.4, 2 * u); }
  }
  // guard chain (left)
  const gs = 28 * u; const gcards = G.run.guard; let gx = cx - 22 * u - gcards.length * (gs + gap); const gy = cy + cs - gs;
  hudText('DEFLECT', gx + (gcards.length * (gs + gap)) / 2, gy - 12 * u, 9 * u, '#d9b46a', 'center');
  gcards.forEach((id, i) => drawCard(gx + i * (gs + gap), gy, gs, id ? SIG[id] : null, { hl: '#8a6a2a', dim: !id }));
  // art chain (right)
  const acards = G.run.art; const ax = cx + tw + 22 * u; const cdk = P.artCD > 0 ? P.artCD / P.artMax : 0;
  hudText(cdk > 0 ? `ART  ${P.artCD.toFixed(1)}s` : 'ART  [E]', ax + (acards.length * (gs + gap)) / 2, gy - 12 * u, 9 * u, cdk > 0 ? '#6d6658' : '#4fd1a5', 'center');
  acards.forEach((id, i) => drawCard(ax + i * (gs + gap), gy, gs, id ? SIG[id] : null, { hl: '#2a7a62', dim: !id, cd: cdk }));
  drawStyleRank();
  // banner & hint
  if (G.banner) drawBanner(G.banner);
  if (G.hint) {
    const h = G.hint; const a = Math.min(1, h.t * 3, (h.life - h.t) * 2);
    ctx.globalAlpha = a; hudText(h.txt, W / 2, cy - 44 * u, 13 * u, h.col || '#efe6d2', 'center', 500); ctx.globalAlpha = 1;
  }
  ctx.restore();
}
function drawBossBar() {
  const b = G.boss, u = G.ui; const w = Math.min(620 * u, W * 0.56); const x = W / 2 - w / 2; const y = 52 * u;
  hudText(b.d.name, W / 2, 24 * u, 22 * u, '#efe6d2', 'center', 800, FONT_SERIF);
  if (b.aspects && b.aspects.length) { const txt = b.aspects.map(a => BOSS_ASPECTS[a].name.toUpperCase()).join('  ·  '); hudText(txt, W / 2, y + 44 * u, 9.5 * u, '#ff9a6a', 'center', 800); }
  for (let i = 0; i < b.maxLives; i++) { const lx = x + i * 18 * u + 8 * u, ly = 24 * u; ctx.save(); ctx.translate(lx, ly); ctx.rotate(Math.PI / 4); ctx.fillStyle = '#07050a'; ctx.fillRect(-7 * u, -7 * u, 14 * u, 14 * u); ctx.fillStyle = i < b.lives ? '#e8222a' : 'rgba(232,34,42,0.18)'; ctx.fillRect(-5 * u, -5 * u, 10 * u, 10 * u); ctx.restore(); }
  if (b.lastStand && b.state !== 'broken') { ctx.globalAlpha = 0.5 + 0.5 * Math.sin(G.clock * 8); ctx.strokeStyle = '#ff5a4a'; ctx.lineWidth = 2 * u; ctx.strokeRect(x - 3 * u, y - 3 * u, w + 6 * u, 15 * u); ctx.globalAlpha = 1; hudText('LAST STAND · BREAK ITS POSTURE', W / 2, y + 40 * u, 11 * u, '#ff8a6a', 'center', 800); }
  inkBar(x, y - 2 * u, w, 12 * u, b.hp / b.maxHp, b.lastStand ? '#ff5a3a' : '#c8282a', G.bossTrail);
  G.bossTrail = G.bossTrail > b.hp / b.maxHp ? Math.max(b.hp / b.maxHp, G.bossTrail - 0.25 * (1 / 60)) : b.hp / b.maxHp;
  const k = clamp(b.posture / b.maxPosture, 0, 1); const pw = w * (b.lastStand ? 0.95 : 0.7) * k;
  if (b.state === 'broken') { ctx.fillStyle = '#ff2a2a'; ctx.beginPath(); ctx.arc(W / 2, y + 24 * u, 7 * u * (0.8 + 0.2 * Math.sin(G.clock * 14)), 0, TAU); ctx.fill(); hudText('DEATHBLOW', W / 2, y + 40 * u, 11 * u, '#ff6a5a', 'center'); }
  else if (pw > 0.5) { ctx.fillStyle = 'rgba(0,0,0,0.6)'; ctx.fillRect(W / 2 - pw / 2 - 2, y + 18 * u, pw + 4, 9 * u); ctx.fillStyle = k > 0.75 ? '#ff4a2a' : k > 0.45 ? '#ff9a3a' : '#f2c25a'; ctx.fillRect(W / 2 - pw / 2, y + 20 * u, pw, 5 * u); }
}
function drawBanner(b) {
  const u = G.ui, t = b.t; const a = Math.min(1, t * 4, (b.life - t) * 2.5); if (a <= 0) return;
  const cy = H * 0.3;
  ctx.globalAlpha = a * 0.16; hudText(b.kanji || '', W / 2, cy, (b.boss ? 240 : 190) * u, b.boss ? '#ff2a2a' : '#efe6d2', 'center', 800, FONT_SERIF);
  ctx.globalAlpha = a;
  const sw = Math.min(1, t * 3) * (b.boss ? 520 : 380) * u;
  ctx.fillStyle = b.good ? 'rgba(242,181,68,0.85)' : 'rgba(200,38,28,0.85)'; ctx.beginPath(); ctx.moveTo(W / 2 - sw / 2, cy - 4 * u); ctx.lineTo(W / 2 + sw / 2, cy - 10 * u); ctx.lineTo(W / 2 + sw / 2 - 10 * u, cy + 6 * u); ctx.lineTo(W / 2 - sw / 2 + 6 * u, cy + 10 * u); ctx.fill();
  hudText(b.txt, W / 2, cy - 26 * u, (b.boss ? 46 : 40) * u, '#f6efe0', 'center', 800, FONT_SERIF);
  if (b.sub) hudText(b.sub, W / 2, cy + 30 * u, 15 * u, '#c8bea8', 'center', 500);
  ctx.globalAlpha = 1;
}
function drawCrosshair() {
  const P = G.player; const x = Input.mx * DPR, y = Input.my * DPR, u = G.ui;
  const inWin = P && G.clock - P.deflectPress <= P.deflectWin;
  ctx.strokeStyle = inWin ? '#ffd36b' : 'rgba(239,230,210,0.85)'; ctx.lineWidth = 1.5 * u;
  ctx.beginPath(); ctx.arc(x, y, 9 * u, 0, TAU); ctx.stroke();
  ctx.fillStyle = '#ff5b45'; ctx.beginPath(); ctx.arc(x, y, 2 * u, 0, TAU); ctx.fill();
}

// ---------- loop ----------
let lastT = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
  try {
    if (G.state === 'play' || G.state === 'dying') update(dt);
    else if (G.state === 'title' || G.state === 'select') updateAttract(dt);
    render();
  } catch (err) { console.error(err); }
  requestAnimationFrame(frame);
}
function init() {
  canvas = document.getElementById('c'); ctx = canvas.getContext('2d');
  resize(); window.addEventListener('resize', resize);
  Input.bind(canvas);
  Input.onPress = (a) => {
    if (a === 'pause') { if (G.state === 'play') UI.pause(); else if (G.state === 'paused') UI.resume(); }
    if (a === 'mute') { AudioSys.setMusic(!AudioSys.musicOn); }
    if (a === 'auto' && G.state === 'play') { G.opts.auto = !G.opts.auto; Store.set('auto', G.opts.auto); UI.toast('Auto-strike ' + (G.opts.auto ? 'ON' : 'OFF'), G.opts.auto ? '#ffd36b' : '#a49b88'); }
  };
  buildFloor();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => buildFloor()).catch(() => { });
  UI.init(); UI.showTitle();
  requestAnimationFrame(frame);
}
window.addEventListener('load', init);

function drawStyleRank() {
  const S = G.style; if (!S) return; const u = G.ui; const R = STYLE_RANKS[S.rank];
  if (S.rank === 0 && S.pts < 4 && !S.feed.length) return;
  const x = W - 28 * u, y = H * 0.34; const fl = S.flash; const sc = 1 + Math.max(0, fl) * 0.45; const jx = fl < 0 ? rand(-5, 5) * -fl * u : 0;
  ctx.save();
  ctx.globalAlpha = 0.7; ctx.fillStyle = '#07050a'; ctx.beginPath(); ctx.moveTo(x - 196 * u, y - 40 * u); ctx.lineTo(x + 14 * u, y - 48 * u); ctx.lineTo(x + 8 * u, y + 36 * u); ctx.lineTo(x - 210 * u, y + 30 * u); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = 1;
  if (fl > 0) { ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, x - 40 * u, y - 6 * u, 120 * u * fl, R.col, fl); ctx.globalCompositeOperation = 'source-over'; }
  hudText(R.k, x - 6 * u + jx, y - 6 * u, (R.k.length > 1 ? 40 : 56) * u * sc, R.col, 'right', 800, FONT_SERIF);
  const lx = x - (R.k.length > 1 ? 96 : 62) * u;
  hudText(R.name.toUpperCase(), lx, y - 18 * u, 14 * u, R.col, 'right', 800);
  const bon = Math.round(comboBonus() * 100); hudText(bon || R.ash ? `+${bon}% dmg${R.ash ? ` · +${Math.round(R.ash * 100)}% ash` : ''}` : 'fight with style', lx, y, 9.5 * u, '#b8ae9a', 'right', 700);
  const bw = 170 * u, bx = x - 186 * u, by2 = y + 16 * u; ctx.fillStyle = 'rgba(255,255,255,0.08)'; ctx.fillRect(bx, by2, bw, 4 * u); ctx.fillStyle = R.col; ctx.fillRect(bx, by2, bw * clamp(S.pts / styleNeed(S.rank), 0, 1), 4 * u);
  if (G.combo >= 3) hudText(`${G.combo} hits`, x, by2 + 14 * u, 10 * u, '#8a8270', 'right', 700);
  let fy = y + 48 * u;
  for (const f of S.feed) { const a = Math.min(1, (2.4 - f.t) * 1.5); ctx.globalAlpha = a; hudText(f.bad ? f.txt : `${f.txt}  +${f.v}`, x, fy, (f.fresh ? 12 : 10.5) * u, f.bad ? '#ff5a4a' : f.fresh ? '#f4eee0' : '#8a8270', 'right', 800); fy += 17 * u; }
  ctx.restore();
}
