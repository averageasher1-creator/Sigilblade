// ================= FX =================
// cosmetic particles thin out when the screen is already busy, so huge builds stay smooth
const THIN = { spark: 1, ember: 1, smoke: 1, chunk: 1, petal: 1, shard: 1 };
function addPart(p) { const n = G.parts.length; if (n > 600 && THIN[p.k] && Math.random() < (n - 600) / 700) return p; if (n < 1800) { p.t = 0; G.parts.push(p); } return p; }
function sparks(x, y, n, col, o = {}) {
  const base = o.ang, spr = o.spread ?? Math.PI;
  for (let i = 0; i < n; i++) {
    const a = (base === undefined ? rand(0, TAU) : base + rand(-spr, spr)); const sp = rand(o.min || 160, o.max || 560);
    addPart({ k: 'spark', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.12, 0.32) * (o.life || 1), col, w: o.w || 2.2, drag: o.drag || 7, len: o.len || 0.03 });
  }
}
function shardBurst(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) {
    const a = (o.ang === undefined ? rand(0, TAU) : o.ang + rand(-(o.spread || 1), o.spread || 1)); const sp = rand(o.min || 120, o.max || 460);
    addPart({ k: 'chunk', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(2.5, o.r || 5.5), col, rot: rand(0, TAU), vr: rand(-14, 14), life: rand(0.3, 0.6), drag: 5, layer: 1 });
  }
}
function glowPuff(x, y, r, col, life = 0.25, layer = 1) { addPart({ k: 'glow', x, y, vx: 0, vy: 0, r, col, life, layer, drag: 0 }); }
function embers(x, y, n, col, o = {}) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(o.min || 20, o.max || 140); addPart({ k: 'ember', x: x + rand(-4, 4), y: y + rand(-4, 4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (o.rise || 0), r: rand(2, o.r || 5), col, life: rand(0.3, 0.8) * (o.life || 1), drag: o.drag || 2.5 }); }
}
function inkBurst(x, y, n, o = {}) { shardBurst(x, y, Math.min(14, Math.ceil(n * 0.5)), o.col || '#3a3f4f', { ang: o.ang, spread: o.spread, min: o.min, max: o.max }); }
function smoke(x, y, n, col = '#3a3f4f', o = {}) {
  for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(10, o.max || 90); addPart({ k: 'smoke', x: x + rand(-6, 6), y: y + rand(-6, 6), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, r: rand(8, o.r || 20), col, life: rand(0.4, 0.8) * (o.life || 1), drag: 2, a: o.a || 0.25, layer: o.layer ?? 1 }); }
}
function ring(x, y, r0, r1, col, life = 0.35, w = 3, layer = 1) { addPart({ k: 'ring', x, y, vx: 0, vy: 0, r0, r1, col, life, w, layer, drag: 0 }); }
function shards(x, y, n, col) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(80, 380); addPart({ k: 'shard', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-12, 12), r: rand(3, 7), col, life: rand(0.3, 0.7), drag: 4 }); } }
function petals(x, y, n) { for (let i = 0; i < n; i++) { const a = rand(0, TAU), sp = rand(30, 160); addPart({ k: 'petal', x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: rand(0, TAU), vr: rand(-6, 6), r: rand(3, 5), col: '#ffb7d5', life: rand(0.6, 1.2), drag: 2 }); } }
function lightningFx(pts, col = '#c9b6ff', life = 0.2, w = 2.5) { const L = pts[pts.length - 1]; addLight(L[0], L[1], 160 + w * 30, col, life + 0.1, 0.9); addPart({ k: 'bolt', x: pts[0][0], y: pts[0][1], vx: 0, vy: 0, pts, col, life, w, drag: 0 }); }
function beamFx(x1, y1, x2, y2, w, col, life = 0.22) { addPart({ k: 'beam', x: x1, y: y1, x2, y2, vx: 0, vy: 0, w, col, life, drag: 0 }); }
function markFx(x, y, r, col, life) { addPart({ k: 'mark', x, y, vx: 0, vy: 0, r, col, life, layer: 0, drag: 0 }); }
function streakFx(x0, y0, x1, y1, col, life) { addPart({ k: 'streak', x: x0, y: y0, x0, y0, x1, y1, vx: 0, vy: 0, col, life, drag: 0 }); }
function slashFx(x, y, ang, arc, reach, col, side = 1, life = 0.16, w = 1) { addPart({ k: 'slash', x, y, vx: 0, vy: 0, ang, arc, reach, col, side, life, w, drag: 0 }); }
function cutLine(x, y, ang, len, col = '#ff2a2a', life = 0.5, w = 6) { addPart({ k: 'cut', x, y, vx: 0, vy: 0, ang, len, col, life, w, drag: 0 }); }
function ghostFx(x, y, ang, col = '#cfefff') { addPart({ k: 'ghost', x, y, vx: 0, vy: 0, ang, col, life: 0.2, drag: 0, layer: 0 }); }
function callout(x, y, txt, col = '#ff3a2a', size = 46, life = 0.9, o = {}) {
  if (size < 20 && G.clock < (G.calloutLock || 0)) return;
  for (const c of G.callouts) if (c.txt0 === txt && c.t < 0.45 && Math.abs(c.x - x) < 140 && Math.abs(c.y - y) < 90) { c.n = (c.n || 1) + 1; c.txt = `${txt} ×${c.n}`; c.t = Math.min(c.t, 0.05); c.bump = 1; return; }
  for (let k = 0; k < 4; k++) { let hit = false; for (const c of G.callouts) { const cy = c.y - c.rise * (c.t / c.life); if (Math.abs(c.x - x) < (c.size + size) * 2.2 && Math.abs(cy - y) < (c.size + size) * 0.55) { hit = true; break; } } if (!hit) break; y -= size * 1.05; }
  if (G.callouts.length > 24) G.callouts.shift(); G.callouts.push({ txt0: txt, x, y, txt, col, size, life, t: 0, rise: o.rise ?? 30, serif: o.serif ?? false, pop: o.pop ?? 1 }); }
function textPop(x, y, v, kind, col, key) {
  if (kind === 'dot') return;
  if (key && typeof v === 'number') {
    for (const t of G.texts) if (t.key === key && t.kind === kind && t.t < 0.32) { t.v += v; t.t = Math.min(t.t, 0.04); t.pop = 1; t.x = lerp(t.x, x, 0.3); return; }
  }
  if (G.texts.length > 70) G.texts.shift();
  G.texts.push({ x: x + rand(-8, 8), y, v, kind, col, key, t: 0, life: kind === 'crit' ? 0.8 : 0.62, vx: rand(-30, 30), vy: kind === 'crit' ? -200 : -150 });
}
function shake(n) { G.cam.shake = Math.min(24, Math.max(G.cam.shake, n) * (G.opts.shake ? 1 : 0)); }
function kick(ang, n) { if (!G.opts.shake) return; G.cam.kx += Math.cos(ang) * n; G.cam.ky += Math.sin(ang) * n; }
function hitstop(t) { G.hitstop = Math.max(G.hitstop, t); }
function slowmo(t, s) { if (G.slow.t <= 0 || s <= G.slow.s) { G.slow.t = t; G.slow.s = s; G.slow.max = t; } }
function screenFlash(col, a = 0.35) { G.flash.col = col; G.flash.a = Math.max(G.flash.a, a); }
function invertFrames(t) { G.invert = Math.max(G.invert, t); }

// fading floor decals (no permanent mess)
function decalSplat(x, y, r, col = '#000000', drops = 6, life = 4) {
  if (G.decals.length > 90) G.decals.shift();
  const blobs = [[0, 0, r * 0.8]]; for (let i = 0; i < drops; i++) { const a = rand(0, TAU), d = rand(r * 0.6, r * 1.7); blobs.push([Math.cos(a) * d, Math.sin(a) * d, rand(r * 0.12, r * 0.32)]); }
  G.decals.push({ x, y, col: col.startsWith('#') ? col : '#000000', blobs, t: 0, life, a: col.startsWith('#') ? 0.35 : 0.3 });
}
function decalDot() { }
function scorch(x, y, r) { decalSplat(x, y, r * 0.7, '#000000', 0, 2.5); }
function drawDecals(ctx) {
  for (const d of G.decals) {
    const a = d.a * (1 - Math.pow(d.t / d.life, 2)); if (a <= 0.01) continue;
    ctx.globalAlpha = a; ctx.fillStyle = d.col;
    ctx.beginPath(); for (const [x, y, r] of d.blobs) { ctx.moveTo(d.x + x + r, d.y + y); ctx.arc(d.x + x, d.y + y, r, 0, TAU); } ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function updateFX(dt) {
  const P = G.parts;
  for (let i = P.length - 1; i >= 0; i--) {
    const p = P[i]; p.t += dt;
    if (p.t >= p.life) { P[i] = P[P.length - 1]; P.pop(); continue; }
    if (p.drag) { const f = Math.exp(-p.drag * dt); p.vx *= f; p.vy *= f; }
    p.x += p.vx * dt; p.y += p.vy * dt;
    if (p.vr) p.rot += p.vr * dt;
  }
  for (let i = G.decals.length - 1; i >= 0; i--) { const d = G.decals[i]; d.t += dt; if (d.t >= d.life) G.decals.splice(i, 1); }
  for (let i = G.texts.length - 1; i >= 0; i--) { const t = G.texts[i]; t.t += dt; t.x += t.vx * dt; t.y += t.vy * dt; t.vy += 420 * dt; if (t.t >= t.life) G.texts.splice(i, 1); }
  for (let i = G.callouts.length - 1; i >= 0; i--) { const c = G.callouts[i]; c.t += dt; if (c.t >= c.life) G.callouts.splice(i, 1); }
}

function drawParts(ctx, layer) {
  for (const p of G.parts) {
    if ((p.layer === undefined ? 1 : p.layer) !== layer) continue;
    const u = p.t / p.life, a = 1 - u;
    switch (p.k) {
      case 'spark': {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.w * (0.4 + a * 0.6); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * p.len, p.y - p.vy * p.len); ctx.stroke(); break;
      }
      case 'chunk': {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a * 1.6); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const s = p.r * (0.5 + a * 0.5); ctx.fillStyle = '#0d0f15'; ctx.fillRect(-s - 1.2, -s - 1.2, s * 2 + 2.4, s * 2 + 2.4); ctx.fillStyle = p.col; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.restore(); break;
      }
      case 'glow': ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y, p.r * (0.6 + u * 0.6), p.col, a); break;
      case 'ember': ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y, p.r * 2.4 * a, p.col, a); break;
      case 'smoke': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = p.a * a; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * (0.6 + u), 0, TAU); ctx.fill(); break;
      case 'ring': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.w * a + 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, lerp(p.r0, p.r1, 1 - (1 - u) * (1 - u)), 0, TAU); ctx.stroke(); break;
      case 'shard': ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(p.r, 0); ctx.lineTo(-p.r * 0.6, p.r * 0.5); ctx.lineTo(-p.r * 0.6, -p.r * 0.5); ctx.fill(); ctx.restore(); break;
      case 'petal': ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a; ctx.fillStyle = p.col; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.r, p.r * 0.55, 0, 0, TAU); ctx.fill(); ctx.restore(); break;
      case 'bolt': {
        ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = p.col; ctx.lineCap = 'round';
        for (let pass = 0; pass < 2; pass++) {
          ctx.globalAlpha = pass ? a : a * 0.35; ctx.lineWidth = pass ? p.w : p.w * 4;
          ctx.beginPath(); ctx.moveTo(p.pts[0][0], p.pts[0][1]);
          for (let i = 1; i < p.pts.length; i++) {
            const [x0, y0] = p.pts[i - 1], [x1, y1] = p.pts[i]; const segs = 5;
            for (let s = 1; s <= segs; s++) { const t = s / segs; const j = s === segs ? 0 : 12; ctx.lineTo(lerp(x0, x1, t) + rand(-j, j), lerp(y0, y1, t) + rand(-j, j)); }
          }
          ctx.stroke();
        }
        break;
      }
      case 'beam': {
        ctx.globalCompositeOperation = 'lighter'; ctx.lineCap = 'round'; ctx.strokeStyle = p.col;
        ctx.globalAlpha = a * 0.35; ctx.lineWidth = p.w * 3 * a; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke();
        ctx.globalAlpha = a; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = p.w * 0.6 * a; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x2, p.y2); ctx.stroke(); break;
      }
      case 'mark': {
        ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = p.col; ctx.globalAlpha = 0.4 + 0.5 * u; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke();
        ctx.globalAlpha = 0.18 + 0.2 * u; ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(p.x, p.y, p.r * u, 0, TAU); ctx.fill(); break;
      }
      case 'streak': {
        ctx.globalCompositeOperation = 'lighter'; const x = lerp(p.x0, p.x1, u * u), y = lerp(p.y0, p.y1, u * u);
        ctx.strokeStyle = p.col; ctx.globalAlpha = 0.8; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - (p.x1 - p.x0) * 0.18, y - (p.y1 - p.y0) * 0.18); ctx.stroke();
        drawGlow(ctx, x, y, 26, p.col, 0.9); break;
      }
      case 'slash': {
        const e = 1 - Math.pow(1 - Math.min(1, u * 2.6), 3); const a0 = p.ang - p.side * p.arc / 2, a1 = p.ang + p.side * p.arc / 2;
        const head = lerp(a0, a1, e), tail = lerp(a0, a1, Math.max(0, e - 0.75 - u * 0.25));
        const R = p.reach * 1.02, th = p.reach * 0.42 * Math.min(1.6, p.w);
        const N = 18; const crescent = (thick, rOut) => {
          ctx.beginPath();
          for (let i = 0; i <= N; i++) { const t = i / N; const an = lerp(tail, head, t); ctx.lineTo(p.x + Math.cos(an) * rOut, p.y + Math.sin(an) * rOut); }
          for (let i = N; i >= 0; i--) { const t = i / N; const an = lerp(tail, head, t); const w = thick * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.08)), 0.8) * (0.25 + 0.75 * t); ctx.lineTo(p.x + Math.cos(an) * (rOut - w), p.y + Math.sin(an) * (rOut - w)); }
          ctx.closePath();
        };
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.28; ctx.fillStyle = '#05040a'; crescent(th * 1.15, R + 3); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.75; ctx.fillStyle = p.col; crescent(th, R); ctx.fill();
        ctx.globalAlpha = a; ctx.fillStyle = '#ffffff'; crescent(th * 0.32, R); ctx.fill();
        const hx = p.x + Math.cos(head) * R, hy = p.y + Math.sin(head) * R; drawGlow(ctx, hx, hy, 26 * p.w, p.col, a);
        break;
      }
      case 'flare': {
        ctx.globalCompositeOperation = 'lighter'; const s2 = p.r * (1 - u * 0.55); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        const star = (len, wid, off) => { ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = off + i * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an - 0.5) * wid, Math.sin(an - 0.5) * wid); ctx.lineTo(Math.cos(an) * len, Math.sin(an) * len); ctx.lineTo(Math.cos(an + 0.5) * wid, Math.sin(an + 0.5) * wid); ctx.closePath(); } ctx.fill(); };
        ctx.globalAlpha = a; ctx.fillStyle = p.col; star(s2, s2 * 0.08, 0); ctx.globalAlpha = a * 0.6; star(s2 * 0.5, s2 * 0.06, Math.PI / 4);
        drawGlow(ctx, 0, 0, s2 * 0.7, '#ffe2a0', a); ctx.restore(); break;
      }
      case 'half': {
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = Math.min(1, a * 1.8);
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.ang); ctx.beginPath(); ctx.rect(-p.half * 2, p.side > 0 ? 0 : -p.half * 2, p.half * 4, p.half * 2); ctx.clip(); ctx.rotate(-p.ang);
        ctx.drawImage(p.img, -p.half, -p.half, p.half * 2, p.half * 2); ctx.restore();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.strokeStyle = '#ff5a3a'; ctx.lineWidth = 3.5 * a + 0.5; ctx.lineCap = 'round';
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot + p.ang); ctx.beginPath(); ctx.moveTo(-p.half * 0.75, 0); ctx.lineTo(p.half * 0.75, 0); ctx.stroke(); ctx.restore(); break;
      }
      case 'inkslash': {
        const e = Math.min(1, u * 7); const cx = Math.cos(p.ang), cy = Math.sin(p.ang); const nx = -cy, ny = cx; const L = p.len;
        const path = (wk) => { ctx.beginPath(); const N = 16; for (let i = 0; i <= N; i++) { const t = i / N * e; const w = p.w * wk * Math.pow(Math.sin(Math.PI * (i / N)), 0.6) * (0.4 + 0.6 * (1 - i / N)); ctx.lineTo(p.x + cx * (t - 0.5) * L + nx * w, p.y + cy * (t - 0.5) * L + ny * w); }
          for (let i = N; i >= 0; i--) { const t = i / N * e; const w = p.w * wk * Math.pow(Math.sin(Math.PI * (i / N)), 0.6) * (0.4 + 0.6 * (1 - i / N)); ctx.lineTo(p.x + cx * (t - 0.5) * L - nx * w * 0.5, p.y + cy * (t - 0.5) * L - ny * w * 0.5); } ctx.closePath(); };
        ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = a * 0.85; ctx.fillStyle = '#07050a'; path(1.25); ctx.fill();
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a; ctx.fillStyle = p.col; path(0.6); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.globalAlpha = a * 0.9; path(0.18); ctx.fill(); break;
      }
      case 'cut': {
        ctx.globalCompositeOperation = 'lighter'; const e = Math.min(1, u * 5); const L = p.len * e;
        const cx = Math.cos(p.ang), cy = Math.sin(p.ang);
        ctx.globalAlpha = a; ctx.strokeStyle = p.col; ctx.lineWidth = p.w * a * 2.5; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(p.x - cx * p.len / 2, p.y - cy * p.len / 2); ctx.lineTo(p.x - cx * p.len / 2 + cx * L, p.y - cy * p.len / 2 + cy * L); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = p.w * a * 0.7; ctx.stroke(); break;
      }
      case 'ghost': {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = a * 0.45; ctx.fillStyle = p.col;
        ctx.beginPath(); ctx.arc(p.x, p.y, 17, 0, TAU); ctx.fill(); ctx.globalAlpha = a * 0.6; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; ctx.stroke(); break;
      }
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

function drawTexts(ctx) {
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  for (const t of G.texts) {
    const a = 1 - Math.pow(t.t / t.life, 3);
    const crit = t.kind === 'crit', hurt = t.kind === 'hurt';
    const mag = typeof t.v === 'number' ? Math.min(9, Math.log10(Math.max(1, t.v)) * 3.2) : 0;
    const s = (crit ? 18 : hurt ? 18 : 12) + mag; const sc = t.t < 0.08 ? 1 + (0.08 - t.t) * 8 : 1;
    ctx.globalAlpha = a; ctx.font = `800 ${Math.round(s * sc)}px ${FONT_SANS}`;
    ctx.lineWidth = 4; ctx.strokeStyle = '#0d0f15'; ctx.strokeText(t.v, t.x, t.y);
    ctx.fillStyle = crit ? '#ffd23f' : hurt ? '#ff4a4a' : (t.col || '#ffffff'); ctx.fillText(t.v, t.x, t.y);
  }
  for (const c of G.callouts) {
    const u = c.t / c.life; const a = u < 0.7 ? 1 : 1 - (u - 0.7) / 0.3; const sc = c.pop ? (u < 0.1 ? 1.5 - u * 5 : 1) : 1;
    ctx.globalAlpha = a; ctx.font = `800 ${Math.round(c.size * sc)}px ${c.serif ? FONT_SERIF : FONT_SANS}`;
    const y = c.y - c.rise * u;
    if (c.size >= 20) { const tw = ctx.measureText(c.txt).width; const hh = c.size * 0.62; const ex = Math.min(1, u * 9); ctx.globalAlpha = a * 0.72; ctx.fillStyle = '#07050a';
      ctx.beginPath(); ctx.moveTo(c.x - tw / 2 - 18, y - hh * 0.7); ctx.lineTo(c.x - tw / 2 - 18 + (tw + 44) * ex, y - hh); ctx.lineTo(c.x - tw / 2 - 30 + (tw + 52) * ex, y + hh * 0.8); ctx.lineTo(c.x - tw / 2 - 26, y + hh * 0.55); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = a * 0.9; ctx.fillStyle = c.col; ctx.fillRect(c.x - tw / 2 - 14, y + hh * 0.62, (tw + 30) * ex, Math.max(2, c.size * 0.07)); ctx.globalAlpha = a; }
    ctx.lineWidth = Math.max(4, c.size * 0.22); ctx.strokeStyle = '#0d0f15'; ctx.strokeText(c.txt, c.x, y);
    ctx.fillStyle = c.col; ctx.fillText(c.txt, c.x, y);
  }
  ctx.globalAlpha = 1;
}
