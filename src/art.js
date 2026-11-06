// ================= ART: biomes, lit arenas, weather, cinematic effects =================
// Each boss tier is its own place. The floor is painted once per biome; a light pass
// (multiply) makes lanterns, spells and explosions actually light the world.
const BIOMES = [
  { id: 'shrine', name: 'Moonlit Shrine', kanji: '月社', amb: [128, 138, 182], gravel: '#596173', gravelHi: '#8e97ad', gravelLo: '#2a2f3d', stone: ['#3d4558', '#373e50', '#434c60', '#323849'], grout: '#14171f', moss: '#3e5f45', wood: '#3a2a24', woodHi: '#5a4234', accent: '#e8432e', lantern: '#ffb066',
    weather: 'petal', wcols: ['#ffc4dc', '#ffb0cf', '#ffe3ee', '#f59ac0'], wind: [38, 26], fog: '#7f8fc0', vig: [10, 14, 34], scatter: ['#ffb7d5', '#f59ac0'], moss2: '#4f7a52' },
  { id: 'maple', name: 'Maple Hollow', kanji: '紅葉', amb: [166, 126, 108], gravel: '#6e5d4e', gravelHi: '#a48d74', gravelLo: '#352a22', stone: ['#4d4038', '#463930', '#54473d', '#3e342c'], grout: '#1a1410', moss: '#6a5424', woodHi: '#6a4428', wood: '#46291a', accent: '#ff7a2a', lantern: '#ffa04a',
    weather: 'leaf', wcols: ['#e8552a', '#ff8a3a', '#c9341e', '#f2b544', '#d8461f'], wind: [55, 18], fog: '#c08a5a', vig: [30, 12, 4], scatter: ['#e8552a', '#c9341e', '#f2b544'], moss2: '#8a6a2a' },
  { id: 'keep', name: 'Crimson Keep', kanji: '紅城', amb: [142, 100, 114], gravel: '#443c47', gravelHi: '#71677a', gravelLo: '#1c171f', stone: ['#302b33', '#2a252d', '#37313b', '#252028'], grout: '#0c090d', moss: '#3a2027', woodHi: '#4a2426', wood: '#2a1418', accent: '#ff3a3a', lantern: '#ff6448',
    weather: 'ash', wcols: ['#a9a3a8', '#8a8489', '#c8c0c4', '#ff7a4a'], wind: [22, -14], fog: '#8a3a4a', vig: [34, 4, 10], scatter: ['#1a1418', '#3a3036'], moss2: '#5a2a30' },
  { id: 'peak', name: 'Frozen Peak', kanji: '雪嶺', amb: [150, 164, 194], gravel: '#a3afbe', gravelHi: '#eef4fa', gravelLo: '#68748a', stone: ['#4c5666', '#454f5e', '#56616f', '#3e4754'], grout: '#1a2029', moss: '#8aa0b4', woodHi: '#4a4c56', wood: '#30323a', accent: '#8fd8ff', lantern: '#ffd28a',
    weather: 'snow', wcols: ['#ffffff', '#e8f4ff', '#d6e8ff'], wind: [30, 60], fog: '#c8dcf0', vig: [14, 22, 36], scatter: ['#e8f4ff', '#ffffff'], moss2: '#b8cad8' }
];
function biomeFor(w) { if (w <= 5) return BIOMES[0]; if (w <= 10) return BIOMES[1]; if (w <= 15) return BIOMES[2]; return BIOMES[(3 + Math.floor((w - 16) / 5)) % 4]; }
function artRng(seed) { let s = seed >>> 0; return () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
function hexRGB(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mixHex(a, b, k) { const A = hexRGB(a), B = hexRGB(b); return '#' + [0, 1, 2].map(i => clamp(Math.round(A[i] + (B[i] - A[i]) * k), 0, 255).toString(16).padStart(2, '0')).join(''); }

// ---------- floor ----------
function buildFloor(bi) {
  const B = bi || G.biome || BIOMES[0]; G.biome = B;
  const A = G.ARENA, pad = A.pad; const c = document.createElement('canvas'); c.width = A.w + pad * 2; c.height = A.h + pad * 2; const g = c.getContext('2d');
  const R = artRng(B.id.charCodeAt(0) * 7919 + B.id.length * 104729 + 13); const rr = (a, b) => a + R() * (b - a); const rp = (arr) => arr[Math.floor(R() * arr.length)];
  // outer ground: dark earth with gravel speckle
  g.fillStyle = B.grout; g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 9000; i++) { g.globalAlpha = rr(0.04, 0.14); g.fillStyle = R() < 0.5 ? '#000' : B.stone[2]; const s = rr(1, 3.2); g.fillRect(rr(0, c.width), rr(0, c.height), s, s); }
  g.globalAlpha = 1;
  // engawa: wooden boardwalk framing the courtyard
  const wb = 64; g.save(); g.translate(pad, pad);
  const plank = (x, y, w, h, vert) => {
    const n = vert ? Math.ceil(w / 22) : Math.ceil(h / 22);
    for (let i = 0; i < n; i++) {
      const px = vert ? x + i * 22 : x, py = vert ? y : y + i * 22, pw = vert ? 21 : w, ph = vert ? h : 21;
      g.fillStyle = mixHex(B.wood, B.woodHi, rr(0, 0.45)); g.fillRect(px, py, pw, ph);
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
      for (let k = 0; k < 3; k++) { g.beginPath(); if (vert) { const gx = px + rr(3, 18); g.moveTo(gx, py); g.bezierCurveTo(gx + rr(-3, 3), py + ph * 0.3, gx + rr(-3, 3), py + ph * 0.7, gx, py + ph); } else { const gy = py + rr(3, 18); g.moveTo(px, gy); g.bezierCurveTo(px + pw * 0.3, gy + rr(-3, 3), px + pw * 0.7, gy + rr(-3, 3), px + pw, gy); } g.stroke(); }
      g.fillStyle = 'rgba(0,0,0,0.45)'; if (vert) g.fillRect(px + 21, py, 1, ph); else g.fillRect(px, py + 21, pw, 1);
    }
  };
  plank(-wb, -wb, A.w + wb * 2, wb, true); plank(-wb, A.h, A.w + wb * 2, wb, true); plank(-wb, 0, wb, A.h, false); plank(A.w, 0, wb, A.h, false);
  g.restore();
  // raked gravel courtyard: speckled base, rake grooves, ripples around every stone feature
  g.save(); g.translate(pad, pad); g.beginPath(); g.rect(0, 0, A.w, A.h); g.clip();
  const cx = A.w / 2, cy = A.h / 2;
  const gravel = (x0, y0, w, h) => {
    g.fillStyle = B.gravel; g.fillRect(x0, y0, w, h);
    for (let i = 0, n = w * h / 34; i < n; i++) { const t = R(); g.globalAlpha = rr(0.12, 0.38); g.fillStyle = t < 0.45 ? B.gravelLo : t < 0.9 ? B.gravelHi : '#ffffff'; const sz = rr(0.8, 2.2); g.fillRect(x0 + R() * w, y0 + R() * h, sz, sz); }
    g.globalAlpha = 1;
  };
  gravel(0, 0, A.w, A.h);
  const groove = (draw) => { g.strokeStyle = hexA(B.gravelLo, 0.42); g.lineWidth = 2; draw(1.3); g.strokeStyle = hexA(B.gravelHi, 0.22); g.lineWidth = 1.3; draw(-1); };
  for (let yy = 8; yy < A.h; yy += 16) groove((o) => { g.beginPath(); for (let xx = 0; xx <= A.w; xx += 40) g.lineTo(xx, yy + o + Math.sin(xx * 0.004 + yy * 0.03) * 2.5); g.stroke(); });
  const features = [{ x: cx, y: cy, r: 214 }];
  for (const [fx, fy] of [[250, 220], [A.w - 250, 220], [250, A.h - 220], [A.w - 250, A.h - 220]]) features.push({ x: fx + rr(-30, 30), y: fy + rr(-20, 20), r: rr(34, 48), moss: true });
  for (const f of features) {
    const rip = f.r + (f.moss ? 46 : 70);
    g.save(); g.beginPath(); g.arc(f.x, f.y, rip, 0, TAU); g.clip(); gravel(f.x - rip, f.y - rip, rip * 2, rip * 2); g.restore();
    for (let rr0 = f.r + 9; rr0 < rip; rr0 += 13) groove((o) => { g.beginPath(); g.arc(f.x, f.y, rr0 + o, 0, TAU); g.stroke(); });
  }
  // stepping stones from the centre platform out toward each side
  const stepStone = (x, y, w, h, rot) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(2, 3, w, h, 0, 0, TAU); g.fill();
    const base = mixHex(rp(B.stone), B.gravelHi, 0.45); const sg = g.createLinearGradient(-w, -h, w, h); sg.addColorStop(0, mixHex(base, '#ffffff', 0.18)); sg.addColorStop(1, mixHex(base, '#000000', 0.18));
    g.fillStyle = sg; g.beginPath(); for (let i = 0; i < 12; i++) { const an = i / 12 * TAU; const k = 1 + rr(-0.1, 0.08); g.lineTo(Math.cos(an) * w * k, Math.sin(an) * h * k); } g.closePath(); g.fill();
    for (let k = 0; k < (w * h) / 30; k++) { g.globalAlpha = rr(0.06, 0.18); g.fillStyle = R() < 0.5 ? '#000' : '#fff'; g.fillRect(rr(-w * 0.7, w * 0.7), rr(-h * 0.7, h * 0.7), 1.5, 1.5); }
    g.globalAlpha = 1; g.restore();
  };
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    const len = dx ? A.w / 2 - 120 : A.h / 2 - 110;
    for (let d = 262; d < len; d += 74) stepStone(cx + dx * d + dy * rr(-14, 14), cy + dy * d + dx * rr(-12, 12), rr(26, 32), rr(18, 23), rr(-0.4, 0.4));
  }
  // moss islands with a resting stone
  for (const f of features) {
    if (!f.moss) continue;
    for (let k = 0; k < 26; k++) { g.globalAlpha = rr(0.35, 0.7); g.fillStyle = R() < 0.6 ? B.moss : B.moss2; const an = rr(0, TAU), dd = rr(0, f.r); g.beginPath(); g.arc(f.x + Math.cos(an) * dd, f.y + Math.sin(an) * dd * 0.8, rr(6, 15), 0, TAU); g.fill(); }
    g.globalAlpha = 1; stepStone(f.x + rr(-8, 8), f.y + rr(-6, 6), f.r * 0.55, f.r * 0.4, rr(0, TAU));
  }
  // the centre platform: a ring of cut stone around a solid disc
  g.fillStyle = 'rgba(0,0,0,0.4)'; g.beginPath(); g.arc(cx + 4, cy + 6, 216, 0, TAU); g.fill();
  const rings = [[0, 74, 1], [74, 146, 10], [146, 212, 16]];
  for (const [r0, r1, n] of rings) {
    for (let i = 0; i < n; i++) {
      const a0 = i / n * TAU + (n > 1 ? rr(-0.02, 0.02) : 0), a1 = (i + 1) / n * TAU; const gp = n > 1 ? 0.012 : 0;
      const base = mixHex(rp(B.stone), B.gravelHi, 0.32); const tone = rr(-0.08, 0.1);
      g.fillStyle = tone > 0 ? mixHex(base, '#ffffff', tone * 0.6) : mixHex(base, '#000000', -tone);
      g.beginPath(); if (r0 === 0) g.arc(cx, cy, r1 - 3, 0, TAU); else { g.arc(cx, cy, r1 - 2.5, a0 + gp, a1 - gp); g.arc(cx, cy, r0 + 2.5, a1 - gp, a0 + gp, true); g.closePath(); }
      g.fill();
      g.save(); g.clip(); g.fillStyle = 'rgba(255,255,255,0.07)'; g.fillRect(cx - 220, cy - 220, 440, 200);
      for (let k = 0, m = (r1 * r1 - r0 * r0) * 3.1 / n / 70; k < m; k++) { g.globalAlpha = rr(0.05, 0.16); g.fillStyle = R() < 0.55 ? '#000' : '#fff'; const an = rr(a0, a1), dd = rr(r0, r1); g.fillRect(cx + Math.cos(an) * dd, cy + Math.sin(an) * dd, 1.6, 1.6); }
      g.globalAlpha = 1;
      if (R() < 0.25) { g.strokeStyle = 'rgba(0,0,0,0.4)'; g.lineWidth = 1.1; g.beginPath(); let an = rr(a0, a1), dd = rr(r0 + 6, r1 - 6); g.moveTo(cx + Math.cos(an) * dd, cy + Math.sin(an) * dd); for (let q = 0; q < 4; q++) { an += rr(-0.06, 0.06); dd += rr(-10, 10); g.lineTo(cx + Math.cos(an) * dd, cy + Math.sin(an) * dd); } g.stroke(); }
      g.restore();
    }
  }
  g.strokeStyle = 'rgba(0,0,0,0.55)'; g.lineWidth = 4; g.beginPath(); g.arc(cx, cy, 213, 0, TAU); g.stroke();
  g.strokeStyle = hexA(B.gravelHi, 0.25); g.lineWidth = 1.5; g.beginPath(); g.arc(cx, cy, 216, Math.PI * 1.0, Math.PI * 1.7); g.stroke();
  // painted enso + sigil circle at the heart of the courtyard
  g.save(); g.globalCompositeOperation = 'source-over';
  for (let pass = 0; pass < 3; pass++) {
    g.strokeStyle = hexA(B.accent, 0.06 + pass * 0.025); g.lineCap = 'round';
    const r0 = 180 + pass * 2, a0 = -1.9 + pass * 0.05, a1 = a0 + TAU * 0.93;
    for (let i = 0; i < 90; i++) { const t = i / 90; const a = lerp(a0, a1, t); const w = (22 - pass * 6) * Math.sin(Math.PI * Math.min(1, t * 1.15)) + 3; g.lineWidth = w; g.beginPath(); g.arc(cx, cy, r0 + Math.sin(t * 9) * 3, a, a + TAU / 88); g.stroke(); }
  }
  g.font = `800 28px ${FONT_SERIF}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = 'rgba(255,255,255,0.07)';
  const runes = '印刃斬弾崩見切返月';
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + 0.2; g.save(); g.translate(cx + Math.cos(a) * 110, cy + Math.sin(a) * 110); g.rotate(a + Math.PI / 2); g.fillText(runes[i % runes.length], 0, 0); g.restore(); }
  g.font = `800 92px ${FONT_SERIF}`; g.fillStyle = hexA(B.accent, 0.08); g.fillText(B.kanji[0], cx, cy + 6);
  g.restore();
  // fallen petals / leaves / ash and pebbles
  for (let i = 0; i < 260; i++) {
    const px = rr(0, A.w), py = rr(0, A.h); if (Math.hypot(px - cx, py - cy) < 90) continue;
    g.save(); g.translate(px, py); g.rotate(rr(0, TAU)); g.globalAlpha = rr(0.25, 0.6); g.fillStyle = rp(B.scatter);
    if (B.weather === 'leaf') { leafPath(g, rr(4, 7)); g.fill(); } else if (B.weather === 'petal') { g.beginPath(); g.ellipse(0, 0, rr(3, 5), rr(1.8, 3), 0, 0, TAU); g.fill(); } else if (B.weather === 'snow') { g.globalAlpha = rr(0.15, 0.35); g.beginPath(); g.ellipse(0, 0, rr(6, 22), rr(4, 12), 0, 0, TAU); g.fill(); } else { g.fillRect(-2, -2, rr(2, 5), rr(2, 5)); }
    g.restore();
  }
  g.globalAlpha = 1;
  // inner edge shadow from the boardwalk lip
  const edge = (x0, y0, x1, y1) => { const gr = g.createLinearGradient(x0, y0, x1, y1); gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); return gr; };
  g.fillStyle = edge(0, 0, 0, 60); g.fillRect(0, 0, A.w, 60); g.fillStyle = edge(0, A.h, 0, A.h - 60); g.fillRect(0, A.h - 60, A.w, 60);
  g.fillStyle = edge(0, 0, 60, 0); g.fillRect(0, 0, 60, A.h); g.fillStyle = edge(A.w, 0, A.w - 60, 0); g.fillRect(A.w - 60, 0, 60, A.h);
  g.restore();
  // pillars and stone lanterns (the lanterns are real light sources)
  g.save(); g.translate(pad, pad);
  const pillar = (x, y) => { g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(x - 15, y - 11, 34, 34); g.fillStyle = '#120d0c'; g.fillRect(x - 17, y - 17, 34, 34); g.fillStyle = mixHex(B.wood, B.woodHi, 0.5); g.fillRect(x - 14, y - 14, 28, 28); g.fillStyle = 'rgba(255,255,255,0.10)'; g.fillRect(x - 14, y - 14, 28, 4); g.fillStyle = hexA(B.accent, 0.9); g.fillRect(x - 14, y + 6, 28, 4); };
  for (let i = 0; i <= 8; i++) { pillar(-wb / 2 + (A.w + wb) * i / 8, -wb / 2); pillar(-wb / 2 + (A.w + wb) * i / 8, A.h + wb / 2); }
  for (let i = 1; i < 5; i++) { pillar(-wb / 2, -wb / 2 + (A.h + wb) * i / 5); pillar(A.w + wb / 2, -wb / 2 + (A.h + wb) * i / 5); }
  G.lanterns = [];
  const toro = (x, y) => {
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.ellipse(x + 6, y + 10, 30, 22, 0, 0, TAU); g.fill();
    g.fillStyle = '#0f0e12'; g.fillRect(x - 22, y - 22, 44, 44); g.fillStyle = '#5c5a62'; g.fillRect(x - 19, y - 19, 38, 38); g.fillStyle = '#6e6c74'; g.fillRect(x - 19, y - 19, 38, 6);
    g.fillStyle = '#0f0e12'; g.beginPath(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + Math.PI / 8; g.lineTo(x + Math.cos(a) * 16, y + Math.sin(a) * 16); } g.closePath(); g.fill();
    g.fillStyle = B.lantern; g.fillRect(x - 6, y - 6, 12, 12); g.fillStyle = '#fff3d6'; g.fillRect(x - 3, y - 3, 6, 6);
    G.lanterns.push({ x, y, r: 230, col: B.lantern, ph: rr(0, 10) });
  };
  for (const [x, y] of [[36, 36], [A.w - 36, 36], [36, A.h - 36], [A.w - 36, A.h - 36], [A.w / 2, 36], [A.w / 2, A.h - 36], [36, A.h / 2], [A.w - 36, A.h / 2]]) toro(x, y);
  g.restore();
  G.floor = c;
  buildVignette(B);
}
function leafPath(g, s) { g.beginPath(); g.moveTo(0, -s); g.quadraticCurveTo(s * 0.62, -s * 0.2, 0, s * 0.85); g.quadraticCurveTo(-s * 0.62, -s * 0.2, 0, -s); g.closePath(); }
function buildVignette(B) {
  const v = G.vig = document.createElement('canvas'); v.width = 512; v.height = 512; const g = v.getContext('2d'); const [r, gg, b] = B.vig;
  const gr = g.createRadialGradient(256, 256, 130, 256, 256, 372); gr.addColorStop(0, `rgba(${r},${gg},${b},0)`); gr.addColorStop(0.7, `rgba(${r},${gg},${b},0.16)`); gr.addColorStop(1, `rgba(${Math.round(r * 0.4)},${Math.round(gg * 0.4)},${Math.round(b * 0.4)},0.62)`);
  g.fillStyle = gr; g.fillRect(0, 0, 512, 512);
}

// ---------- lighting ----------
const Light = { c: null, g: null, s: 0.25, vm: null, vmKey: '' };
function addLight(x, y, r, col, life = 0.25, a = 1) { const n = G.lights.length; if (n < 70 && !(n > 35 && Math.random() < 0.5)) G.lights.push({ x, y, r: Math.min(r, 520), col, life, a, t: 0 }); }
function updateLights(dt) { for (let i = G.lights.length - 1; i >= 0; i--) { const L = G.lights[i]; L.t += dt; if (L.t >= L.life) { G.lights[i] = G.lights[G.lights.length - 1]; G.lights.pop(); } } }
function renderLighting(camX, camY, z) {
  if (!G.opts.fancy || !G.biome) return;
  const s = Light.s, lw = Math.max(2, Math.ceil(W * s)), lh = Math.max(2, Math.ceil(H * s));
  if (!Light.c || Light.c.width !== lw || Light.c.height !== lh) { Light.c = document.createElement('canvas'); Light.c.width = lw; Light.c.height = lh; Light.g = Light.c.getContext('2d'); }
  const g = Light.g; g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'source-over'; g.globalAlpha = 1;
  const [ar, ag, ab] = G.biome.amb; const fl = G.boss && G.boss.lastStand ? 0.85 + 0.08 * Math.sin(G.clock * 6) : 1;
  g.fillStyle = `rgb(${Math.round(ar * fl)},${Math.round(ag * fl)},${Math.round(ab * fl)})`; g.fillRect(0, 0, lw, lh);
  g.setTransform(z * s, 0, 0, z * s, (W / 2 - camX * z) * s, (H / 2 - camY * z) * s);
  g.globalCompositeOperation = 'lighter';
  for (const L of G.lanterns || []) drawGlow(g, L.x, L.y, L.r * (1 + 0.05 * Math.sin(G.clock * 7.3 + L.ph) + 0.03 * Math.sin(G.clock * 13 + L.ph * 2)), L.col, 0.75);
  const P = G.player;
  if (P && !P.dead) { drawGlow(g, P.x, P.y, 300, '#ffe9c8', 0.42); drawGlow(g, P.x, P.y, 110, '#fff6e6', 0.35); if (P.deflectFlash > 0) drawGlow(g, P.x, P.y, 260, '#ffd36b', P.deflectFlash * 4); }
  let n = 0;
  for (const p of G.projs) { if (n++ > 160) break; drawGlow(g, p.x, p.y, p.team === 'p' ? 56 + p.r * 5 : 70 + p.r * 3, p.col || '#ffffff', p.team === 'p' ? 0.5 : 0.6); }
  for (const e of G.enemies) {
    if (e.dead || e.spawning > 0) continue;
    if (e.st.burn > 0) drawGlow(g, e.x, e.y, 90 + e.st.burn * 6, '#ff7a2a', 0.55);
    if (e.state === 'broken') drawGlow(g, e.x, e.y, 120, '#ff3a2a', 0.5);
    if (e.state === 'windup' && e.step && e.step.perilous) drawGlow(g, e.x, e.y, 150, '#ff2020', 0.55 * (1 - e.t / e.windTotal) + 0.2);
    if (e.elite) drawGlow(g, e.x, e.y, 110, '#ffc94a', 0.35);
    if (e.isBoss) drawGlow(g, e.x, e.y, 220, e.d.accent || '#ff5a4a', 0.32);
  }
  for (const h of G.hazards) { const hx = h.x ?? (h.x0 + h.x1) / 2, hy = h.y ?? (h.y0 + h.y1) / 2; if (hx !== undefined && !isNaN(hx)) drawGlow(g, hx, hy, (h.r || h.rad || 90) * 1.4, h.k === 'web' ? '#d8c8ff' : '#ff4a3a', 0.3); }
  for (const w of G.wisps) drawGlow(g, w.x, w.y, 90, w.col || '#7fffd4', 0.45);
  for (const pk of G.pickups) if (pk.k === 'heal' || pk.k === 'chest') drawGlow(g, pk.x, pk.y, 70, pk.k === 'heal' ? '#ff6a7a' : '#ffd36b', 0.5);
  for (const L of G.lights) drawGlow(g, L.x, L.y, L.r * (0.8 + 0.2 * (1 - L.t / L.life)), L.col, L.a * (1 - L.t / L.life));
  for (const m of G.mist || []) drawGlow(g, m.x, m.y + Math.sin(m.ph) * 30, m.r, G.biome.fog, 0.16);
  // vignette multiplied into the same map: one full-screen blend instead of two
  const key = G.biome.id + lw + 'x' + lh;
  if (Light.vmKey !== key) { const v = Light.vm = document.createElement('canvas'); v.width = lw; v.height = lh; const vg = v.getContext('2d'); const [r, gg, b] = G.biome.vig; const gr = vg.createRadialGradient(lw / 2, lh / 2, Math.min(lw, lh) * 0.32, lw / 2, lh / 2, Math.hypot(lw, lh) * 0.56); gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.6, `rgb(${200 + r},${200 + gg},${200 + b})`); gr.addColorStop(1, `rgb(${60 + r * 2},${60 + gg * 2},${60 + b * 2})`); vg.fillStyle = gr; vg.fillRect(0, 0, lw, lh); Light.vmKey = key; }
  g.setTransform(1, 0, 0, 1, 0, 0); g.globalCompositeOperation = 'multiply'; g.drawImage(Light.vm, 0, 0);
  ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'multiply'; ctx.globalAlpha = 1; ctx.imageSmoothingEnabled = true; ctx.drawImage(Light.c, 0, 0, W, H); ctx.restore();
}

// ---------- weather & mist ----------
function weatherDensity() { return G.opts.fancy ? 70 : 0; }
function spawnFlake(fresh) {
  const B = G.biome; const z = G.cam.zoom, hw = W / 2 / z + 120, hh = H / 2 / z + 120;
  const [wx, wy] = B.wind; const d = rand(0.6, 1.5);
  let x = G.cam.x + rand(-hw, hw), y = G.cam.y + rand(-hh, hh);
  if (!fresh) { if (Math.random() < Math.abs(wx) / (Math.abs(wx) + Math.abs(wy) + 1)) x = G.cam.x - Math.sign(wx || 1) * hw; else y = G.cam.y - Math.sign(wy || 1) * hh; }
  const ember = B.weather === 'ash' && Math.random() < 0.18;
  return { x, y, d, vx: wx * d * rand(0.7, 1.3), vy: wy * d * rand(0.7, 1.3) + (B.weather === 'ash' && ember ? -30 : 0), rot: rand(0, TAU), vr: rand(-2.5, 2.5), ph: rand(0, TAU), col: ember ? '#ff8a4a' : pick(B.wcols), s: rand(0.8, 1.25), ember };
}
function updateWeather(dt) {
  if (!G.biome) return; if (!G.weather) G.weather = [];
  const want = weatherDensity(); while (G.weather.length < want) G.weather.push(spawnFlake(true)); if (G.weather.length > want) G.weather.length = want;
  const z = G.cam.zoom, hw = W / 2 / z + 160, hh = H / 2 / z + 160;
  for (let i = 0; i < G.weather.length; i++) {
    const f = G.weather[i]; f.ph += dt * 2; f.x += (f.vx + Math.sin(f.ph) * 18 * f.d) * dt; f.y += (f.vy + Math.cos(f.ph * 0.7) * 10) * dt; f.rot += f.vr * dt;
    if (Math.abs(f.x - G.cam.x) > hw || Math.abs(f.y - G.cam.y) > hh) G.weather[i] = spawnFlake(false);
  }
  if (!G.mist) G.mist = Array.from({ length: 6 }, () => ({ x: rand(0, G.ARENA.w), y: rand(0, G.ARENA.h), r: rand(260, 460), vx: rand(8, 20), ph: rand(0, TAU) }));
  for (const m of G.mist) { m.x += m.vx * dt; m.ph += dt * 0.3; if (m.x > G.ARENA.w + 500) m.x = -500; }
}
function drawWeather(ctx) {
  if (!G.opts.fancy || !G.biome || !G.weather) return;
  const B = G.biome;
  ctx.globalCompositeOperation = 'source-over';
  for (const f of G.weather) {
    const px = f.x + (f.x - G.cam.x) * (f.d - 1) * 0.35, py = f.y + (f.y - G.cam.y) * (f.d - 1) * 0.35;
    const s = f.s * f.d;
    if (f.ember) { ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, px, py, 7 * s, f.col, 0.8); ctx.globalCompositeOperation = 'source-over'; continue; }
    ctx.globalAlpha = 0.55 + 0.3 * (f.d - 0.6); ctx.fillStyle = f.col;
    ctx.save(); ctx.translate(px, py); ctx.rotate(f.rot);
    if (B.weather === 'petal') { ctx.scale(1, 0.45 + 0.4 * Math.abs(Math.sin(f.ph * 1.7))); ctx.beginPath(); ctx.ellipse(0, 0, 4.5 * s, 2.8 * s, 0, 0, TAU); ctx.fill(); }
    else if (B.weather === 'leaf') { ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(f.ph * 1.3))); leafPath(ctx, 6.5 * s); ctx.fill(); ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.8; ctx.beginPath(); ctx.moveTo(0, -5 * s); ctx.lineTo(0, 5 * s); ctx.stroke(); }
    else if (B.weather === 'snow') { ctx.beginPath(); ctx.arc(0, 0, 2.4 * s, 0, TAU); ctx.fill(); }
    else { ctx.fillRect(-1.6 * s, -1.6 * s, 3.2 * s, 3.2 * s); }
    ctx.restore();
  }
  ctx.globalAlpha = 1;
}

// ---------- shadows ----------
let _shadowTex = null;
function shadowTex() {
  if (_shadowTex) return _shadowTex; const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(0,0,0,0.62)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.38)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64); return (_shadowTex = c);
}
function drawShadow(ctx, x, y, rx, ry, a = 1) { ctx.globalAlpha = a; ctx.drawImage(shadowTex(), x - rx, y - ry, rx * 2, ry * 2); ctx.globalAlpha = 1; }

// ---------- cinematic hits ----------
function camPunch(n) { if (G.opts.shake) G.cam.punch = Math.min(0.12, Math.max(G.cam.punch || 0, n)); }
function parryFlare(x, y, chain = 0) {
  const k = 1 + Math.min(4, chain) * 0.22;
  addPart({ k: 'flare', x, y, vx: 0, vy: 0, r: 70 * k, life: 0.22 + chain * 0.02, col: chain >= 2 ? '#ffe9a0' : '#ffffff', rot: rand(0, Math.PI / 4), drag: 0 });
  addLight(x, y, 260 * k, '#ffe2a0', 0.3, 1.2);
  camPunch(0.025 + Math.min(4, chain) * 0.008);
}
// cut the dying foe in two along the deathblow line
function sliceFx(e, ang) {
  if (!G.opts.fancy) return;
  const half = Math.ceil(e.r + 34); const S = 2; const c = document.createElement('canvas'); c.width = c.height = half * 2 * S; const g = c.getContext('2d');
  g.scale(S, S); g.translate(half - e.x, half - e.y);
  const st = e.state, fl = e.flash, bt = e.brokenT; e.state = 'recover'; e.flash = 0; try { drawEnemy(g, e); } catch (err) { } e.state = st; e.flash = fl; e.brokenT = bt;
  for (const side of [-1, 1]) {
    const na = ang + side * Math.PI / 2; const sp = rand(70, 130);
    addPart({ k: 'half', x: e.x, y: e.y, vx: Math.cos(na) * sp + Math.cos(ang) * 40, vy: Math.sin(na) * sp + Math.sin(ang) * 40, img: c, half, ang, side, rot: 0, vr: side * rand(0.8, 2.2), life: 0.85, drag: 3.2, layer: 1 });
  }
}
function inkSlash(x, y, ang, len, col = '#ff2a3a', w = 16) { addPart({ k: 'inkslash', x, y, vx: 0, vy: 0, ang, len, col, w, life: 0.55, drag: 0, layer: 1 }); }
function dustPuff(x, y) { if (!G.opts.fancy || !G.biome) return; addPart({ k: 'smoke', x: x + rand(-4, 4), y: y + rand(-2, 4), vx: rand(-20, 20), vy: rand(-14, 4), r: rand(4, 8), col: G.biome.weather === 'snow' ? '#dfe8f2' : mixHex(G.biome.stone[2], '#ffffff', 0.25), life: rand(0.35, 0.6), drag: 3, a: 0.28, layer: 0 }); }

// ---------- location card ----------
function showLocation(B) { G.locCard = { B, t: 0, life: 3.6 }; }
function drawLocation() {
  const L = G.locCard; if (!L) return; const u = G.ui; const t = L.t; const a = Math.min(1, t * 2.5, (L.life - t) * 1.8); if (a <= 0) return;
  const x = W / 2, y = H * 0.2;
  ctx.save(); ctx.globalAlpha = a * 0.85;
  const sw = 340 * u * Math.min(1, t * 2.2); ctx.fillStyle = 'rgba(8,6,10,0.7)';
  ctx.beginPath(); ctx.moveTo(x - sw / 2, y - 22 * u); ctx.lineTo(x + sw / 2, y - 26 * u); ctx.lineTo(x + sw / 2 - 14 * u, y + 24 * u); ctx.lineTo(x - sw / 2 + 10 * u, y + 20 * u); ctx.closePath(); ctx.fill();
  ctx.globalAlpha = a; hudText(L.B.kanji, x - 92 * u, y, 26 * u, L.B.accent, 'center', 800, FONT_SERIF);
  hudText(L.B.name.toUpperCase(), x + 28 * u, y - 3 * u, 16 * u, '#f4eee0', 'center', 800, FONT_SERIF);
  hudText('WAVE ' + G.wave, x + 28 * u, y + 14 * u, 9 * u, '#a49b88', 'center', 700);
  ctx.restore();
}

// ---------- film grain ----------
let _grain = null;
function drawGrain() {
  return;
  if (!_grain) { const c = document.createElement('canvas'); c.width = c.height = 160; const g = c.getContext('2d'); const id = g.createImageData(160, 160); for (let i = 0; i < id.data.length; i += 4) { const v = Math.random() * 255; id.data[i] = id.data[i + 1] = id.data[i + 2] = v; id.data[i + 3] = 255; } g.putImageData(id, 0, 0); _grain = ctx.createPattern(c, 'repeat'); }
  ctx.save(); ctx.globalAlpha = 0.035; ctx.globalCompositeOperation = 'overlay'; ctx.translate(Math.floor(Math.random() * 160), Math.floor(Math.random() * 160)); ctx.fillStyle = _grain; ctx.fillRect(-160, -160, W + 320, H + 320); ctx.restore();
}
function drawLetterbox() {
  const want = (G.slow.t > 0 && G.slow.s < 0.3) || (G.boss && G.boss.state === 'intro') ? 1 : 0;
  G.lb = lerp(G.lb || 0, want, 0.12); if (G.lb < 0.01) return;
  const h = H * 0.065 * G.lb; ctx.fillStyle = '#030204'; ctx.fillRect(0, 0, W, h); ctx.fillRect(0, H - h, W, h);
}
