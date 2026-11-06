// ================= RENDERING: clean cel-shaded units, honest telegraphs =================
const FONT_SERIF = "'Shippori Mincho B1', 'Noto Serif JP', 'Yu Mincho', serif";
const FONT_SANS = "'Zen Kaku Gothic New', 'Hiragino Sans', system-ui, sans-serif";
const OUT = '#0d0f15';
const easeOut = (t) => 1 - (1 - t) * (1 - t);
function shadeHex(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => clamp(Math.round(v * k), 0, 255); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`; }
function tintHex(hex, k) { const n = parseInt(hex.slice(1), 16); const f = (v) => clamp(Math.round(v + (255 - v) * k), 0, 255); return `rgb(${f((n >> 16) & 255)},${f((n >> 8) & 255)},${f(n & 255)})`; }

const _bodyCache = new Map();
function bodySprite(col, r) {
  const key = col + '|' + Math.round(r * 2); let c = _bodyCache.get(key); if (c) return c;
  const S = 2, pad = 4, half = r + pad; c = document.createElement('canvas'); c.width = c.height = Math.ceil(half * 2 * S); c.half = half;
  const g = c.getContext('2d'); g.scale(S, S); g.translate(half, half);
  g.fillStyle = OUT; g.beginPath(); g.arc(0, 0, r + 2.8, 0, TAU); g.fill();
  g.fillStyle = shadeHex(col, 0.55); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
  g.save(); g.beginPath(); g.arc(0, 0, r, 0, TAU); g.clip();
  const body = g.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, -r * 0.1, -r * 0.1, r * 1.05); body.addColorStop(0, tintHex(col, 0.18)); body.addColorStop(0.55, col); body.addColorStop(1, shadeHex(col, 0.72));
  g.fillStyle = body; g.beginPath(); g.arc(-r * 0.1, -r * 0.12, r * 0.94, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(200,220,255,0.38)'; g.lineWidth = Math.max(1.2, r * 0.09); g.beginPath(); g.arc(0, 0, r - g.lineWidth * 0.5, Math.PI * 1.05, Math.PI * 1.62); g.stroke();
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.beginPath(); g.arc(r * 0.22, r * 0.26, r * 0.86, -0.4, Math.PI * 0.9); g.arc(r * 0.05, r * 0.05, r * 0.86, Math.PI * 0.9, -0.4, true); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.32)'; g.beginPath(); g.ellipse(-r * 0.38, -r * 0.44, r * 0.3, r * 0.18, -0.6, 0, TAU); g.fill();
  g.restore();
  _bodyCache.set(key, c); return c;
}
function drawBody(ctx, x, y, r, col, flash) {
  const c = bodySprite(col, r); ctx.drawImage(c, x - c.half, y - c.half, c.half * 2, c.half * 2);
  if (flash > 0) { ctx.globalAlpha = Math.min(1, flash * 12); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x, y, r + 1, 0, TAU); ctx.fill(); ctx.globalAlpha = 1; }
}
function oline(ctx, x0, y0, x1, y1, w, col) {
  ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = w + 3.5; ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.stroke();
  ctx.strokeStyle = col; ctx.lineWidth = w; ctx.stroke();
}
function ocirc(ctx, x, y, r, col, lw = 2.5) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(x, y, r + lw, 0, TAU); ctx.fill(); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill(); }
function circ(ctx, x, y, r, fill, stroke, lw = 2) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); } }
function blade(ctx, x, y, ang, len, col = '#d9dee6', w = 2.5) { oline(ctx, x, y, x + Math.cos(ang) * len, y + Math.sin(ang) * len, w, col); }
function eyesFwd(ctx, r, angry, glow) {
  const ex = r * 0.44, ey = r * 0.3, er = Math.max(2.2, r * 0.2);
  for (const s of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(ex, s * ey, er + 1.2, 0, TAU); ctx.fill(); ctx.fillStyle = angry ? '#ffe2dc' : '#ffffff'; ctx.beginPath(); ctx.arc(ex, s * ey, er, 0, TAU); ctx.fill(); ctx.fillStyle = angry ? '#e8222a' : OUT; ctx.beginPath(); ctx.arc(ex + er * 0.35, s * ey, er * 0.55, 0, TAU); ctx.fill(); }
  if (glow) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, ex, -ey, er * 5, '#ff3030', 0.7); drawGlow(ctx, ex, ey, er * 5, '#ff3030', 0.7); ctx.restore(); }
}
function weaponPose(e) {
  let pose = 0.9; const s = e.step;
  if (e.state === 'windup' && s) { const p = clamp(1 - e.t / e.windTotal, 0, 1); pose = s.shape === 'thrust' ? 0.15 : lerp(0.9, -1.9, easeOut(p)); }
  else if (e.state === 'active' && s) pose = s.shape === 'thrust' ? 0 : 1.8;
  else if (e.state === 'recover') pose = 1.4;
  else if (e.state === 'broken' || e.state === 'stagger') pose = 2.4;
  if ((e.swingSide || 1) < 0 && e.state !== 'windup') pose = -pose * 0.6;
  return pose;
}
// features drawn in the unit's rotated frame (+x = facing). "under" features are drawn before the body.
const ENEMY_DRAW = {
  grunt: { over(ctx, e, r, pose, angry) { blade(ctx, r * 0.25, r * 0.8, pose, r * 2.1, '#dfe4ec', 3.5); ocirc(ctx, r * 0.25, r * 0.8, 3, '#7a4a2a', 1.5); eyesFwd(ctx, r, angry); } },
  skitter: {
    under(ctx, e, r) { for (let s = -1; s <= 1; s += 2) for (let i = 0; i < 3; i++) { const a = s * (0.75 + i * 0.7) + Math.sin(e.anim * 24 + i * 2) * 0.28; const kx = Math.cos(a) * r * 1.3, ky = Math.sin(a) * r * 1.3; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(kx * 1.55, ky * 1.55); ctx.stroke(); } },
    over(ctx, e, r, pose, angry) { eyesFwd(ctx, r, angry); }
  },
  archer: {
    over(ctx, e, r, pose, angry) {
      const pull = e.state === 'windup' ? clamp(1 - e.t / e.windTotal, 0, 1) * r * 0.9 : 0;
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.beginPath(); ctx.arc(r * 0.5, 0, r * 1.15, -1.05, 1.05); ctx.stroke(); ctx.strokeStyle = '#9a6a3a'; ctx.lineWidth = 3; ctx.stroke();
      ctx.strokeStyle = '#f4ead2'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(r * 0.5 + Math.cos(-1.05) * r * 1.15, Math.sin(-1.05) * r * 1.15); ctx.lineTo(r * 0.95 - pull, 0); ctx.lineTo(r * 0.5 + Math.cos(1.05) * r * 1.15, Math.sin(1.05) * r * 1.15); ctx.stroke();
      if (pull > 0) oline(ctx, r * 0.95 - pull, 0, r * 2.2 - pull, 0, 2, '#fff');
      eyesFwd(ctx, r * 0.9, angry);
    }
  },
  bomber: {
    over(ctx, e, r, pose, angry) {
      const fuse = e.state === 'windup'; const blink = fuse && Math.floor(G.clock * (8 + (1 - e.t / e.windTotal) * 22)) % 2 === 0;
      ctx.fillStyle = blink ? '#ffffff' : '#2b2f3a'; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.62, 0, TAU); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.stroke();
      oline(ctx, -r * 0.6, 0, -r * 1.25, -r * 0.3, 2, '#e8d6b0');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, -r * 1.25, -r * 0.3, fuse ? 22 : 12, '#ffb347', 1); ctx.restore();
      eyesFwd(ctx, r, true);
    }
  },
  lancer: { over(ctx, e, r, pose, angry) { const a = pose * 0.22; const ext = e.state === 'windup' ? -8 * (1 - e.t / e.windTotal) : e.state === 'active' ? 14 : 0; ctx.save(); ctx.rotate(a); oline(ctx, -r * 0.8 + ext, r * 0.6, r * 3.4 + ext, r * 0.6, 3, '#a77b4a'); ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 3.4 + ext + 13, r * 0.6); ctx.lineTo(r * 3.4 + ext - 3, r * 0.6 - 7); ctx.lineTo(r * 3.4 + ext - 3, r * 0.6 + 7); ctx.fill(); ctx.fillStyle = '#eef2f8'; ctx.beginPath(); ctx.moveTo(r * 3.4 + ext + 9, r * 0.6); ctx.lineTo(r * 3.4 + ext - 1, r * 0.6 - 4); ctx.lineTo(r * 3.4 + ext - 1, r * 0.6 + 4); ctx.fill(); ctx.restore(); eyesFwd(ctx, r, angry); } },
  brute: {
    over(ctx, e, r, pose, angry) {
      ctx.save(); ctx.rotate(pose * 0.85); oline(ctx, r * 0.3, r * 0.7, r * 2.2, r * 0.7, 10, '#7a5236'); ctx.fillStyle = '#d8c8a8'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(r * (1.45 + i * 0.26), r * 0.7, 2.4, 0, TAU); ctx.fill(); } ctx.restore();
      for (const s of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.35, s * r * 0.4); ctx.lineTo(r * 1.35, s * r * 1.05); ctx.lineTo(r * 0.62, s * r * 0.12); ctx.closePath(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = '#f4ecd8'; ctx.fill(); }
      eyesFwd(ctx, r * 0.95, angry, angry);
    }
  },
  shaman: {
    over(ctx, e, r, pose, angry) {
      oline(ctx, r * 0.2, r * 0.85, r * 0.2 + Math.cos(0.4) * r * 1.9, r * 0.85 + Math.sin(0.4) * r * 1.9, 3, '#8a6a48');
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 0.2 + Math.cos(0.4) * r * 1.9, r * 0.85 + Math.sin(0.4) * r * 1.9, e.state === 'windup' ? 22 : 12, '#ff5ad1', 1); ctx.restore();
      for (let i = 0; i < 3; i++) { const a = e.anim * 1.8 + i * TAU / 3; ctx.save(); ctx.translate(Math.cos(a) * r * 1.75, Math.sin(a) * r * 1.75); ctx.rotate(a); ctx.fillStyle = OUT; ctx.fillRect(-4.5, -6.5, 9, 13); ctx.fillStyle = '#f4e8c8'; ctx.fillRect(-3, -5, 6, 10); ctx.fillStyle = '#d02a2a'; ctx.fillRect(-1, -3, 2, 6); ctx.restore(); }
      eyesFwd(ctx, r, angry);
    }
  },
  wraith: {
    under(ctx, e, r) { ctx.fillStyle = hexA('#58c9f2', 0.35); ctx.beginPath(); ctx.moveTo(-r * 0.2, -r * 0.9); for (let i = 0; i <= 8; i++) { const t = i / 8; ctx.lineTo(-r * 0.4 - t * r * 2, Math.sin(e.anim * 8 + t * 5) * r * 0.45 * t + (i < 4 ? -1 : 1) * r * 0.2 * (1 - t)); } ctx.lineTo(-r * 0.2, r * 0.9); ctx.closePath(); ctx.fill(); },
    over(ctx, e, r, pose, angry) { for (let i = -1; i <= 1; i++) oline(ctx, r * 0.65, r * 0.55, r * 0.65 + Math.cos(pose + i * 0.18) * r * 1.35, r * 0.55 + Math.sin(pose + i * 0.18) * r * 1.35, 1.6, '#e8faff'); eyesFwd(ctx, r, angry, true); }
  },
  shield: {
    over(ctx, e, r, pose, angry) {
      blade(ctx, -r * 0.2, -r * 0.75, -0.15 + pose * 0.15, r * 2.3, '#dfe4ec', 2.5);
      const up = e.blockFlash > 0 ? 1.15 : 1;
      ctx.lineCap = 'butt'; ctx.strokeStyle = OUT; ctx.lineWidth = 14; ctx.beginPath(); ctx.arc(0, 0, r * 1.2, -1.05 * up, 1.05 * up); ctx.stroke();
      ctx.strokeStyle = e.blockFlash > 0 ? '#ffffff' : '#9fb0c8'; ctx.lineWidth = 9; ctx.stroke();
      ctx.strokeStyle = '#e8eef8'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, r * 1.2 + 3, -0.9, 0.9); ctx.stroke();
      eyesFwd(ctx, r * 0.9, angry);
    }
  },
  duelist: {
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.35, r * 0.6, pose, r * 2.9, e.type === 'shadow' ? '#d8c8ff' : '#f2f6ff', 2.5);
      const hat = e.type === 'shadow' ? '#3a2a66' : '#c9a05a';
      ocirc(ctx, 0, 0, r * 1.35, hat, 2.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.stroke(); }
      ocirc(ctx, 0, 0, r * 0.22, e.d.accent || '#d6294a', 1.5);
      if (angry) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 1.1, 0, 16, '#ff3030', 0.8); ctx.restore(); }
    }
  },
  ninja: {
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.3, r * 0.7, pose, r * 1.9, '#dfe4ec', 3);
      ctx.fillStyle = OUT; ctx.fillRect(r * 0.1, -r * 0.55, r * 0.9, r * 1.1); ctx.fillStyle = '#c8243a'; ctx.fillRect(r * 0.18, -r * 0.47, r * 0.74, r * 0.94);
      for (const sgn of [-1, 1]) { ctx.fillStyle = angry ? '#ff4a4a' : '#ffffff'; ctx.fillRect(r * 0.5, sgn * r * 0.28 - 1.8, r * 0.32, 3.6); }
      oline(ctx, -r * 0.8, 0, -r * 1.6, Math.sin(e.anim * 8) * r * 0.5, 3, '#c8243a');
    }
  },
  monk: {
    over(ctx, e, r, pose, angry) {
      const ext = e.state === 'windup' && e.step && e.step.shape === 'thrust' ? -4 : e.state === 'active' ? 14 : 0;
      for (const sg of [-1, 1]) ocirc(ctx, r * 0.85 + ext, sg * r * 0.45, r * 0.3, '#f2c98a', 2);
      ctx.fillStyle = OUT; for (let i = 0; i < 10; i++) { const a = Math.PI * 0.6 + i / 9 * Math.PI * 0.8; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, 3.4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#5a3a1a'; for (let i = 0; i < 10; i++) { const a = Math.PI * 0.6 + i / 9 * Math.PI * 0.8; ctx.beginPath(); ctx.arc(Math.cos(a) * r * 0.78, Math.sin(a) * r * 0.78, 2.2, 0, TAU); ctx.fill(); }
      eyesFwd(ctx, r * 0.9, angry);
    }
  },
  tengu: {
    under(ctx, e, r) { const f = Math.sin(e.anim * (e.air ? 22 : 6)) * 0.35; for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * (1.9 + f)); ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(r * 1.1, 0, r * 1.2, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#2b2f3a'; ctx.beginPath(); ctx.ellipse(r * 1.1, 0, r * 1.05, r * 0.42, 0, 0, TAU); ctx.fill(); ctx.restore(); } },
    over(ctx, e, r, pose, angry) {
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 1.75, 0); ctx.lineTo(r * 0.45, -r * 0.3); ctx.lineTo(r * 0.45, r * 0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ff6a5a'; ctx.beginPath(); ctx.moveTo(r * 1.55, 0); ctx.lineTo(r * 0.55, -r * 0.18); ctx.lineTo(r * 0.55, r * 0.18); ctx.closePath(); ctx.fill();
      eyesFwd(ctx, r * 0.85, angry); blade(ctx, r * 0.1, -r * 0.8, -pose * 0.7, r * 1.6, '#e8d6b0', 3);
    }
  },
  gunner: {
    over(ctx, e, r, pose, angry) {
      const aim = e.state === 'windup'; oline(ctx, r * 0.1, r * 0.35, r * 2.6, r * 0.2, 4, '#5a3a22'); oline(ctx, r * 1.6, r * 0.24, r * 2.7, r * 0.18, 2.5, '#9aa0aa');
      if (aim) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 2.75, r * 0.18, 10 + 14 * (1 - e.t / e.windTotal), '#fff4c0', 0.9); ctx.restore(); }
      ocirc(ctx, 0, 0, r * 1.25, '#c9a86a', 2.5); ctx.fillStyle = 'rgba(0,0,0,0.2)'; for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 1.2, Math.sin(a) * r * 1.2); ctx.lineWidth = 1; ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.stroke(); }
      ocirc(ctx, 0, 0, r * 0.18, '#8a6a3a', 1.5);
    }
  },
  spider: {
    under(ctx, e, r) {
      for (let sg = -1; sg <= 1; sg += 2) for (let i = 0; i < 4; i++) {
        const a = sg * (0.55 + i * 0.55) + Math.sin(e.anim * 9 + i * 1.7) * 0.12; const kx = Math.cos(a) * r * 1.3, ky = Math.sin(a) * r * 1.3; const fx = Math.cos(a + sg * 0.35) * r * 2.3, fy = Math.sin(a + sg * 0.35) * r * 2.3;
        ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(kx, ky); ctx.lineTo(fx, fy); ctx.stroke();
        ctx.strokeStyle = '#3a2450'; ctx.lineWidth = 4.5; ctx.stroke();
      }
      ocirc(ctx, -r * 1.05, 0, r * 0.95, '#4a2a6a', 3); ctx.fillStyle = '#ffcf5a'; ctx.beginPath(); ctx.moveTo(-r * 1.6, 0); ctx.lineTo(-r * 1.05, -r * 0.35); ctx.lineTo(-r * 0.5, 0); ctx.lineTo(-r * 1.05, r * 0.35); ctx.closePath(); ctx.fill();
    },
    over(ctx, e, r, pose, angry) { ocirc(ctx, r * 0.45, 0, r * 0.42, '#f2e6f0', 2.5); ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [x, y] of [[r * 0.62, -r * 0.16], [r * 0.62, r * 0.16], [r * 0.72, -r * 0.05], [r * 0.72, r * 0.05]]) drawGlow(ctx, x, y, 8, angry ? '#ff3030' : '#c86bff', 1); ctx.restore(); }
  },
  raijin: {
    under(ctx, e, r) { for (let i = 0; i < 7; i++) { const a = Math.PI * 0.62 + i / 6 * Math.PI * 0.76; const x = Math.cos(a) * r * 1.45, y = Math.sin(a) * r * 1.45; ocirc(ctx, x, y, r * 0.3, '#c8402e', 2.5); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(x, y, r * 0.12, 0, TAU); ctx.fill(); } ctx.strokeStyle = OUT; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(0, 0, r * 1.45, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke(); },
    over(ctx, e, r, pose, angry) {
      for (const sg of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.3, sg * r * 0.5); ctx.lineTo(r * 1.15, sg * r * 0.95); ctx.lineTo(r * 0.55, sg * r * 0.2); ctx.closePath(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke(); ctx.fillStyle = '#ffe27a'; ctx.fill(); }
      const ext = e.state === 'active' ? 12 : 0; for (const sg of [-1, 1]) ocirc(ctx, r * 0.95 + ext, sg * r * 0.62, r * 0.32, '#2a4fa8', 2.5);
      eyesFwd(ctx, r * 0.85, angry, angry);
      if (Math.random() < 0.08) { const a = rand(0, TAU); lightningFx([[e.x, e.y], [e.x + Math.cos(a) * r * 1.6, e.y + Math.sin(a) * r * 1.6]], '#ffe27a', 0.08, 1.5); }
    }
  },
  kitsune: {
    under(ctx, e, r) {
      const n = e.type === 'foxclone' ? 3 : 9;
      for (let i = 0; i < n; i++) { const a = Math.PI + (i - (n - 1) / 2) * 0.28 + Math.sin(e.anim * 3 + i) * 0.1; const L = r * (1.9 + (i % 2) * 0.3); const x = Math.cos(a) * L, y = Math.sin(a) * L;
        ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 11; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(Math.cos(a + 0.3) * L * 0.6, Math.sin(a + 0.3) * L * 0.6, x, y); ctx.stroke();
        ctx.strokeStyle = '#f6efe2'; ctx.lineWidth = 7; ctx.stroke(); ocirc(ctx, x, y, 4.5, '#ff8a3a', 1.5); }
    },
    over(ctx, e, r, pose, angry) {
      for (const sg of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.1, sg * r * 0.45); ctx.lineTo(r * 0.55, sg * r * 1.2); ctx.lineTo(r * 0.75, sg * r * 0.35); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#ff8a3a'; ctx.beginPath(); ctx.moveTo(r * 0.22, sg * r * 0.47); ctx.lineTo(r * 0.55, sg * r * 1.0); ctx.lineTo(r * 0.66, sg * r * 0.4); ctx.closePath(); ctx.fill(); }
      ctx.strokeStyle = '#e8222a'; ctx.lineWidth = 2.5; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.3, sg * r * 0.15); ctx.lineTo(r * 0.75, sg * r * 0.42); ctx.stroke(); }
      eyesFwd(ctx, r * 0.85, angry); if (e.type !== 'foxclone') blade(ctx, r * 0.3, r * 0.7, pose, r * 2.4, '#ffe0c0', 2.5);
    }
  },
  kagero: {
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.35, r * 0.65, pose, r * 3, '#f6f8ff', 3); blade(ctx, r * 0.35, -r * 0.65, -pose * 0.8 - 0.4, r * 2.5, '#f6f8ff', 3);
      ocirc(ctx, 0, 0, r * 1.4, '#e8dcc0', 2.5);
      ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 1.35, Math.sin(a) * r * 1.35); ctx.stroke(); }
      ocirc(ctx, 0, 0, r * 0.25, '#e8432e', 1.5);
      if (angry) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 1.2, 0, 20, '#ff3030', 0.8); ctx.restore(); }
    }
  },
  nue: {
    under(ctx, e, r) {
      // a serpent for a tail, coiling behind
      const t = e.anim * 3; ctx.lineCap = 'round';
      const pts = []; for (let i = 0; i <= 10; i++) { const k = i / 10; pts.push([-r * 0.8 - k * r * 2.2, Math.sin(t + k * 4) * r * 0.5 * k]); }
      for (const [w, c] of [[r * 0.42, OUT], [r * 0.3, '#5a7a3a']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); pts.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke(); }
      const [hx, hy] = pts[pts.length - 1]; ocirc(ctx, hx, hy, r * 0.26, '#6a8a44', 2); ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(hx - r * 0.1, hy - r * 0.08, 2.2, 0, TAU); ctx.fill();
      for (const s of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.1, s * r * 0.95); ctx.lineTo(r * 0.55, s * r * 1.35); ctx.lineTo(r * 0.7, s * r * 0.75); ctx.fill(); }
    },
    over(ctx, e, r, pose, angry) {
      ctx.strokeStyle = 'rgba(20,12,6,0.55)'; ctx.lineWidth = r * 0.1; ctx.lineCap = 'round';
      for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(-r * 0.55 + i * r * 0.22, -r * 0.85); ctx.quadraticCurveTo(-r * 0.2 + i * r * 0.22, 0, -r * 0.55 + i * r * 0.22, r * 0.85); ctx.stroke(); }
      for (const s of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.25, s * r * 0.55); ctx.lineTo(r * 0.05, s * r * 1.15); ctx.lineTo(r * 0.65, s * r * 0.7); ctx.fill(); ctx.fillStyle = '#c9a072'; ctx.beginPath(); ctx.moveTo(r * 0.28, s * r * 0.6); ctx.lineTo(r * 0.14, s * r * 1.0); ctx.lineTo(r * 0.55, s * r * 0.7); ctx.fill(); }
      ocirc(ctx, r * 0.78, 0, r * 0.32, '#a8845a', 2);
      if (angry) for (const s of [-1, 1]) for (let k = 0; k < 3; k++) blade(ctx, r * 0.9, s * r * (0.45 + k * 0.12), pose * 0.4 + s * (0.2 + k * 0.12), r * 0.7, '#f4efe4', 2);
      eyesFwd(ctx, r, angry, angry);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, r * 1.8, '#c9b6ff', 0.16 + 0.1 * Math.sin(e.anim * 9)); ctx.restore();
    }
  },
  yuki: {
    under(ctx, e, r) {
      // long sleeves trailing like drifting snow
      for (const s of [-1, 1]) { const sw = Math.sin(e.anim * 2.2 + s) * r * 0.25; ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(0, s * r * 0.5); ctx.quadraticCurveTo(-r * 1.4, s * (r * 1.6 + sw), -r * 2.3, s * (r * 1.1 + sw)); ctx.quadraticCurveTo(-r * 1.2, s * r * 0.9, -r * 0.2, s * r * 0.2); ctx.fill();
        ctx.fillStyle = '#cfe2f4'; ctx.beginPath(); ctx.moveTo(0, s * r * 0.48); ctx.quadraticCurveTo(-r * 1.35, s * (r * 1.5 + sw), -r * 2.1, s * (r * 1.08 + sw)); ctx.quadraticCurveTo(-r * 1.1, s * r * 0.85, -r * 0.2, s * r * 0.24); ctx.fill(); }
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-r * 0.75, 0, r * 0.95, r * 0.55, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.ellipse(-r * 0.72, 0, r * 0.88, r * 0.48, 0, 0, TAU); ctx.fill();
    },
    over(ctx, e, r, pose, angry) {
      ctx.fillStyle = '#141820'; ctx.beginPath(); ctx.arc(-r * 0.15, 0, r * 0.86, Math.PI * 0.55, Math.PI * 1.45); ctx.fill();
      for (let i = 0; i < 5; i++) { const a = -0.9 + i * 0.45; ctx.fillStyle = '#bfeaff'; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.75 - r * 0.1, Math.sin(a) * r * 0.75); ctx.lineTo(Math.cos(a) * r * 1.25 - r * 0.1, Math.sin(a) * r * 1.25); ctx.lineTo(Math.cos(a + 0.12) * r * 0.8 - r * 0.1, Math.sin(a + 0.12) * r * 0.8); ctx.fill(); }
      eyesFwd(ctx, r * 0.9, angry, false);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, r * 2.4, '#7fd8ff', 0.2 + 0.08 * Math.sin(e.anim * 3)); if (angry) drawGlow(ctx, r * 0.6, 0, r * 1.1, '#bfeaff', 0.6); ctx.restore();
    }
  },
  ryujin: {
    under(ctx, e, r) {
      // a long coiling body
      const t = e.anim * 1.6; const seg = 9;
      for (let i = seg; i >= 1; i--) { const k = i / seg; const x = -r * 0.6 - i * r * 0.52, y = Math.sin(t - i * 0.7) * r * 0.55; const rr = r * (0.72 - k * 0.38);
        ocirc(ctx, x, y, rr, i % 2 ? '#3a8470' : '#45977f', 2.4); ctx.fillStyle = '#ffd36b'; ctx.beginPath(); ctx.arc(x, y - rr * 0.6, rr * 0.22, 0, TAU); ctx.fill(); }
      for (const s of [-1, 1]) { ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-r * 1.4, s * r * 0.3); ctx.lineTo(-r * 1.7, s * r * 1.05); ctx.stroke(); ctx.strokeStyle = '#2f6a5a'; ctx.lineWidth = 2.2; ctx.stroke(); }
    },
    over(ctx, e, r, pose, angry) {
      for (const s of [-1, 1]) { oline(ctx, r * 0.1, s * r * 0.55, -r * 0.7, s * r * 1.25, 5, '#e8d9a8'); oline(ctx, -r * 0.3, s * r * 0.9, -r * 0.2, s * r * 1.35, 3, '#e8d9a8');
        ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(r * 0.85, s * r * 0.3); ctx.quadraticCurveTo(r * 1.5, s * r * (0.6 + 0.2 * Math.sin(e.anim * 3)), r * 1.9, s * r * 0.2); ctx.stroke(); }
      ocirc(ctx, r * 0.72, 0, r * 0.4, '#4fa88e', 2.4);
      eyesFwd(ctx, r, angry, angry);
      const px = r * 1.15, py = 0; ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, px, py, r * 0.9, '#ffe9a0', 0.75); ctx.restore(); ocirc(ctx, px, py, r * 0.16, '#fff6d8', 1.5);
    }
  },
  mother: {
    under(ctx, e, r) {
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * TAU + Math.sin(e.anim + i) * 0.2; const L = r * (1.9 + Math.sin(e.anim * 2 + i) * 0.3);
        ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.quadraticCurveTo(Math.cos(a + 0.4) * L * 0.8, Math.sin(a + 0.4) * L * 0.8, Math.cos(a - 0.2) * L, Math.sin(a - 0.2) * L); ctx.stroke();
        ctx.strokeStyle = '#7d5ab8'; ctx.lineWidth = 5; ctx.stroke();
      }
    },
    over(ctx, e, r, pose, angry) {
      ocirc(ctx, r * 0.3, 0, r * 0.48, '#f2e8f8', 2.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; for (const [x, y] of [[r * 0.45, -r * 0.2], [r * 0.45, r * 0.2], [r * 0.2, 0]]) drawGlow(ctx, x, y, 14, angry ? '#ff3030' : '#ffcf5a', 1); ctx.restore();
      for (const [x, y] of [[r * 0.45, -r * 0.2], [r * 0.45, r * 0.2], [r * 0.2, 0]]) ocirc(ctx, x, y, 3.2, angry ? '#ff3a3a' : '#2b1840', 1.2);
    }
  },
  ronin: {
    under(ctx, e, r) { const sw = Math.sin(e.anim * 5) * r * 0.25; ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = r * 0.42; ctx.beginPath(); ctx.moveTo(-r * 0.3, 0); ctx.quadraticCurveTo(-r * 1.3, sw, -r * 2.0, sw * 1.6); ctx.stroke(); ctx.strokeStyle = '#8a3a2a'; ctx.lineWidth = r * 0.26; ctx.stroke(); },
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.3, r * 0.7, pose, r * 2.8, '#e8ecf2', 3);
      ocirc(ctx, 0, 0, r * 1.35, '#c8a868', 2.5); ctx.strokeStyle = 'rgba(80,50,20,0.45)'; ctx.lineWidth = 1.2; for (let i = 0; i < 16; i++) { const a = i / 16 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r * 1.3, Math.sin(a) * r * 1.3); ctx.stroke(); }
      ocirc(ctx, 0, 0, r * 0.22, '#a88848', 1.5); if (angry) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 1.1, 0, 16, '#ffd37a', 0.6); ctx.restore(); }
    }
  },
  tengu: {
    under(ctx, e, r) {
      // crow wings beating behind it
      const lord = e.type === 'karasu', fl = Math.sin(e.anim * (lord ? 9 : 12)) * 0.25, span = r * (lord ? 2.6 : 2.1);
      for (const sg of [-1, 1]) { ctx.save(); ctx.rotate(sg * (0.35 + fl)); ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-r * 0.2, sg * r * 0.3); ctx.quadraticCurveTo(-r * 0.6, sg * span, -r * 1.6, sg * span * 0.95); ctx.lineTo(-r * 1.2, sg * span * 0.55); ctx.lineTo(-r * 1.5, sg * span * 0.5); ctx.lineTo(-r * 0.9, sg * r * 0.4); ctx.closePath(); ctx.fill();
        ctx.fillStyle = lord ? '#1a1c28' : '#2c3040'; ctx.beginPath(); ctx.moveTo(-r * 0.2, sg * r * 0.36); ctx.quadraticCurveTo(-r * 0.6, sg * span * 0.92, -r * 1.5, sg * span * 0.88); ctx.lineTo(-r * 1.15, sg * span * 0.55); ctx.lineTo(-r * 1.4, sg * span * 0.5); ctx.lineTo(-r * 0.85, sg * r * 0.45); ctx.closePath(); ctx.fill();
        if (lord) { ctx.strokeStyle = 'rgba(255,74,58,0.55)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-r * 0.5, sg * r * 0.6); ctx.lineTo(-r * 1.4, sg * span * 0.86); ctx.stroke(); } ctx.restore(); }
    },
    over(ctx, e, r, pose, angry) {
      const lord = e.type === 'karasu';
      blade(ctx, r * 0.3, r * 0.75, pose, r * (lord ? 3.0 : 2.4), '#eef2f8', lord ? 3 : 2.5);
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.62, 0, TAU); ctx.fill(); ctx.fillStyle = '#121218'; ctx.beginPath(); ctx.arc(-r * 0.1, 0, r * 0.52, 0, TAU); ctx.fill();
      if (lord) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.55, -r * 0.3); ctx.lineTo(r * 1.45, 0); ctx.lineTo(r * 0.55, r * 0.3); ctx.fill(); ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.22); ctx.lineTo(r * 1.3, 0); ctx.lineTo(r * 0.6, r * 0.22); ctx.fill(); }
      else { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.6, -r * 0.2); ctx.lineTo(r * 1.65, 0); ctx.lineTo(r * 0.6, r * 0.2); ctx.fill(); ctx.fillStyle = '#e8432e'; ctx.beginPath(); ctx.moveTo(r * 0.64, -r * 0.13); ctx.lineTo(r * 1.5, 0); ctx.lineTo(r * 0.64, r * 0.13); ctx.fill(); }
      eyesFwd(ctx, r * 0.8, angry, lord && angry);
    }
  },
  skeleton: {
    under(ctx, e, r) {
      // two enormous bone arms reaching forward
      const reach = e.state === 'windup' ? 0.3 : e.state === 'active' ? 0.6 : 0; ctx.lineCap = 'round';
      for (const sg of [-1, 1]) { const sx = r * 0.1, sy = sg * r * 0.85, ex = r * (1.0 + reach), ey = sg * r * (1.35 - reach * 0.5); for (const [w, c] of [[r * 0.32, OUT], [r * 0.2, '#e8e0cc']]) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(ex, ey); ctx.stroke(); }
        for (let k = -1; k <= 1; k++) { oline(ctx, ex, ey, ex + r * 0.45, ey + k * r * 0.2 + sg * r * 0.05, r * 0.07, '#e8e0cc'); } }
    },
    over(ctx, e, r, pose, angry) {
      ctx.strokeStyle = 'rgba(40,36,28,0.5)'; ctx.lineWidth = r * 0.06; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(-r * 0.25, 0, r * (0.35 + i * 0.13), Math.PI * 0.6, Math.PI * 1.4); ctx.stroke(); }
      ocirc(ctx, r * 0.45, 0, r * 0.55, '#f2ecdc', 2.5);
      for (const sg of [-1, 1]) { ctx.fillStyle = '#16140f'; ctx.beginPath(); ctx.ellipse(r * 0.62, sg * r * 0.22, r * 0.15, r * 0.12, 0, 0, TAU); ctx.fill(); ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 0.62, sg * r * 0.22, r * 0.4, '#7fe0a0', angry ? 0.9 : 0.5); ctx.restore(); }
      ctx.fillStyle = '#16140f'; for (let k = -2; k <= 2; k++) ctx.fillRect(r * 0.88, k * r * 0.07 - r * 0.025, r * 0.1, r * 0.05);
    }
  },
  oni: {
    under(ctx, e, r) { ocirc(ctx, -r * 0.7, r * 0.75, r * 0.3, '#c89048', 2); ocirc(ctx, -r * 0.7, r * 0.42, r * 0.18, '#c89048', 2); },
    over(ctx, e, r, pose, angry) {
      // the kanabo: a studded iron club
      const cx = r * 0.3, cy = r * 0.75, L = r * 2.4, ex = cx + Math.cos(pose) * L, ey = cy + Math.sin(pose) * L;
      oline(ctx, cx, cy, ex, ey, r * 0.34, '#3a3438'); for (let k = 3; k <= 9; k++) { const t = k / 10; ocirc(ctx, cx + Math.cos(pose) * L * t + Math.cos(pose + 1.57) * r * 0.16, cy + Math.sin(pose) * L * t + Math.sin(pose + 1.57) * r * 0.16, r * 0.06, '#c8c0b0', 1); ocirc(ctx, cx + Math.cos(pose) * L * t - Math.cos(pose + 1.57) * r * 0.16, cy + Math.sin(pose) * L * t - Math.sin(pose + 1.57) * r * 0.16, r * 0.06, '#c8c0b0', 1); }
      for (const sg of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(r * 0.2, sg * r * 0.42); ctx.quadraticCurveTo(r * 0.5, sg * r * 1.1, r * 1.05, sg * r * 1.05); ctx.lineTo(r * 0.55, sg * r * 0.35); ctx.fill(); ctx.fillStyle = '#ffe2a0'; ctx.beginPath(); ctx.moveTo(r * 0.27, sg * r * 0.44); ctx.quadraticCurveTo(r * 0.52, sg * r * 0.98, r * 0.92, sg * r * 0.98); ctx.lineTo(r * 0.53, sg * r * 0.4); ctx.fill(); }
      ctx.fillStyle = '#1a0e0a'; ctx.beginPath(); ctx.arc(-r * 0.25, 0, r * 0.7, Math.PI * 0.6, Math.PI * 1.4); ctx.fill();
      eyesFwd(ctx, r * 0.85, true, angry); ctx.fillStyle = '#fff4dc'; for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(r * 0.78, sg * r * 0.14); ctx.lineTo(r * 0.98, sg * r * 0.1); ctx.lineTo(r * 0.8, sg * r * 0.02); ctx.fill(); }
    }
  },
  reaper: {
    under(ctx, e, r) {
      // tattered robe trailing like smoke
      for (let i = 0; i < 7; i++) { const a = Math.PI + (i - 3) * 0.32, L = r * (1.4 + 0.3 * Math.sin(e.anim * 6 + i)); ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.2) * r * 0.6, Math.sin(a - 0.2) * r * 0.6); ctx.lineTo(Math.cos(a) * L, Math.sin(a) * L); ctx.lineTo(Math.cos(a + 0.2) * r * 0.6, Math.sin(a + 0.2) * r * 0.6); ctx.fill(); ctx.fillStyle = '#20202c'; ctx.beginPath(); ctx.moveTo(Math.cos(a - 0.14) * r * 0.6, Math.sin(a - 0.14) * r * 0.6); ctx.lineTo(Math.cos(a) * (L - 4), Math.sin(a) * (L - 4)); ctx.lineTo(Math.cos(a + 0.14) * r * 0.6, Math.sin(a + 0.14) * r * 0.6); ctx.fill(); }
    },
    over(ctx, e, r, pose, angry) {
      // the scythe: a long pole and a great curved blade
      const cx = -r * 0.1, cy = r * 0.7, L = r * 3.2, ex = cx + Math.cos(pose) * L, ey = cy + Math.sin(pose) * L; oline(ctx, cx - Math.cos(pose) * r * 0.8, cy - Math.sin(pose) * r * 0.8, ex, ey, 3, '#4a3a2a');
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(pose + Math.PI / 2); ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-r * 1.0, 0, r * 1.0, -0.05, 1.4); ctx.stroke(); ctx.strokeStyle = '#dff8ff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore();
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill(); ctx.fillStyle = '#16161e'; ctx.beginPath(); ctx.arc(0, 0, r * 0.82, 0, TAU); ctx.fill();
      ctx.fillStyle = '#05050a'; ctx.beginPath(); ctx.ellipse(r * 0.35, 0, r * 0.45, r * 0.5, 0, 0, TAU); ctx.fill();
      for (const sg of [-1, 1]) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, r * 0.5, sg * r * 0.18, r * 0.5, '#9ff0ff', angry ? 0.95 : 0.6); ctx.restore(); ocirc(ctx, r * 0.5, sg * r * 0.18, r * 0.07, '#e8ffff', 1); }
    }
  },
  hannya: {
    under(ctx, e, r) { const sw = Math.sin(e.anim * 4) * r * 0.2; for (let i = -2; i <= 2; i++) { ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.3, i * r * 0.22); ctx.quadraticCurveTo(-r * 1.3, i * r * 0.4 + sw, -r * 2.1, i * r * 0.6 - sw); ctx.stroke(); ctx.strokeStyle = '#141018'; ctx.lineWidth = 4; ctx.stroke(); } },
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.3, r * 0.7, pose, r * 2.2, '#ffe6ea', 2.5); blade(ctx, r * 0.3, -r * 0.7, -pose * 0.7 - 0.5, r * 1.6, '#ffe6ea', 2.5);
      ocirc(ctx, r * 0.15, 0, r * 0.95, '#f4ecdc', 2.5);
      for (const sg of [-1, 1]) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(-r * 0.1, sg * r * 0.55); ctx.quadraticCurveTo(-r * 0.6, sg * r * 1.5, r * 0.2, sg * r * 1.6); ctx.quadraticCurveTo(-r * 0.2, sg * r * 1.1, r * 0.25, sg * r * 0.6); ctx.fill(); ctx.fillStyle = '#e8c04a'; ctx.beginPath(); ctx.moveTo(-r * 0.02, sg * r * 0.6); ctx.quadraticCurveTo(-r * 0.48, sg * r * 1.42, r * 0.12, sg * r * 1.48); ctx.quadraticCurveTo(-r * 0.12, sg * r * 1.08, r * 0.2, sg * r * 0.64); ctx.fill(); }
      ctx.fillStyle = '#b01828'; ctx.beginPath(); ctx.ellipse(r * 0.82, 0, r * 0.14, r * 0.42, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffffff'; for (let k = -2; k <= 2; k++) ctx.fillRect(r * 0.74, k * r * 0.13 - 1.5, r * 0.12, 3);
      eyesFwd(ctx, r * 0.78, true, true);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, r * 2.2, '#ff3a5a', 0.18 + 0.12 * Math.sin(e.anim * 8)); ctx.restore();
    }
  },
  susanoo: {
    under(ctx, e, r) { const sw = Math.sin(e.anim * 3) * r * 0.3; for (let i = -1; i <= 1; i++) { ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-r * 0.4, i * r * 0.3); ctx.quadraticCurveTo(-r * 1.5, i * r * 0.5 + sw, -r * 2.3, i * r * 0.8 - sw); ctx.stroke(); ctx.strokeStyle = '#eef6ff'; ctx.lineWidth = 5.5; ctx.stroke(); } },
    over(ctx, e, r, pose, angry) {
      // Kusanagi, crackling with storm light
      const cx = r * 0.35, cy = r * 0.8, L = r * 3.6; blade(ctx, cx, cy, pose, L, '#e8f6ff', 4.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.6; ctx.strokeStyle = '#9fd8ff'; ctx.lineWidth = 10; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(pose) * L, cy + Math.sin(pose) * L); ctx.stroke(); ctx.restore();
      for (const sg of [-1, 1]) { ctx.fillStyle = OUT; ctx.fillRect(-r * 0.6, sg > 0 ? r * 0.55 : -r * 1.05, r * 1.2, r * 0.5); ctx.fillStyle = '#3a5aa0'; ctx.fillRect(-r * 0.52, sg > 0 ? r * 0.62 : -r * 0.98, r * 1.04, r * 0.36); ctx.fillStyle = '#e8c04a'; ctx.fillRect(-r * 0.52, sg > 0 ? r * 0.62 : -r * 0.66, r * 1.04, r * 0.06); }
      eyesFwd(ctx, r * 0.85, angry, true);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, r * 2.6, '#9fd8ff', 0.2 + 0.15 * Math.sin(e.anim * 11)); ctx.restore();
      if (Math.random() < 0.08) lightningFx([[e.x, e.y], [e.x + rand(-60, 60), e.y + rand(-60, 60)]], '#cfeaff', 0.08, 1.5);
    }
  },
  kensei: {
    under(ctx, e, r) { ctx.fillStyle = OUT; ctx.beginPath(); ctx.ellipse(-r * 0.8, 0, r * 0.5, r * 0.3, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.ellipse(-r * 0.8, 0, r * 0.42, r * 0.22, 0, 0, TAU); ctx.fill(); },
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.35, r * 0.75, pose, r * 3.3, '#ffffff', 3.5); blade(ctx, r * 0.1, -r * 0.8, -1.9, r * 1.4, '#d8d4c8', 2.5);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 7; ctx.beginPath(); ctx.moveTo(r * 0.35, r * 0.75); ctx.lineTo(r * 0.35 + Math.cos(pose) * r * 3.3, r * 0.75 + Math.sin(pose) * r * 3.3); ctx.stroke(); ctx.restore();
      ctx.fillStyle = '#1a1a20'; ctx.beginPath(); ctx.arc(-r * 0.2, 0, r * 0.7, Math.PI * 0.55, Math.PI * 1.45); ctx.fill(); ocirc(ctx, -r * 0.55, 0, r * 0.22, '#1a1a20', 2);
      eyesFwd(ctx, r * 0.82, angry, false);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, r * 2.4, '#ffd36b', 0.14 + 0.08 * Math.sin(e.anim * 5)); ctx.restore();
    }
  },
  shogun: {
    under(ctx, e, r) { ctx.fillStyle = OUT; ctx.fillRect(-r * 1.7, -r * 0.6, r * 0.7, r * 1.2); ctx.fillStyle = '#b8241a'; ctx.fillRect(-r * 1.6, -r * 0.5, r * 0.5, r); },
    over(ctx, e, r, pose, angry) {
      blade(ctx, r * 0.35, r * 0.8, pose, r * 3.4, '#fff4d6', 4);
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.55; ctx.strokeStyle = '#f2b544'; ctx.lineWidth = 9; ctx.beginPath(); ctx.moveTo(r * 0.35, r * 0.8); ctx.lineTo(r * 0.35 + Math.cos(pose) * r * 3.4, r * 0.8 + Math.sin(pose) * r * 3.4); ctx.stroke(); ctx.restore();
      for (const s of [-1, 1]) { ctx.fillStyle = OUT; ctx.fillRect(-r * 0.55, s > 0 ? r * 0.6 : -r * 1.05, r * 1.1, r * 0.45); ctx.fillStyle = '#4a5064'; ctx.fillRect(-r * 0.48, s > 0 ? r * 0.66 : -r * 0.99, r * 0.96, r * 0.33); }
      ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(r * 0.15, 0, r * 0.95, -1.25, 1.25); ctx.stroke(); ctx.strokeStyle = '#f2b544'; ctx.lineWidth = 4; ctx.stroke();
      eyesFwd(ctx, r * 0.85, angry, angry);
    }
  }
};

function drawEnemy(ctx, e) {
  if (e.vanishT > 0) return;
  const d = e.d, r = e.r, fr = e.st.frozen > 0;
  let lift = 0, liftS = 1;
  if (e.air) { const k = Math.min(1, e.air.t / e.air.dur); lift = Math.sin(k * Math.PI) * 80; liftS = 1 + Math.sin(k * Math.PI) * 0.25; }
  const pose = weaponPose(e);
  const angry = e.state === 'windup' || e.state === 'active';
  const col = e.state === 'broken' ? '#8a8f9c' : d.col;
  let sq = 1; if (e.state === 'windup') sq = 1 + 0.06 * Math.sin(G.clock * 30) * (e.t < 0.2 ? 1 : 0.3); if (e.squash > 0) sq = 1.08;
  const jo = e.jolt || 0; sq *= 1 + jo * 0.1;
  ctx.save(); ctx.translate(e.x + Math.cos(e.joltA || 0) * jo * 5, e.y - lift + Math.sin(e.joltA || 0) * jo * 5); ctx.scale(liftS, liftS);
  ctx.globalCompositeOperation = 'lighter';
  if (e.elite) drawGlow(ctx, 0, 0, r * 2.4, '#ffc94a', 0.35);
  if (e.exposeT > 0) drawGlow(ctx, 0, 0, r * 2.6, '#ffe27a', 0.3);
  if (e.state === 'broken') drawGlow(ctx, 0, 0, r * 2.8, '#ff2a2a', 0.35 + 0.2 * Math.sin(G.clock * 12));
  if (e.state === 'windup' && e.step && e.step.perilous) drawGlow(ctx, 0, 0, r * 3, '#ff2020', 0.3 + 0.4 * (1 - e.t / e.windTotal));
  if (e.isBoss && e.state === 'intro') drawGlow(ctx, 0, 0, r * 4, '#ff2a2a', 0.4);
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = d.ghost ? 0.85 : (d.stealth && e.state === 'move' && e.flash <= 0 && e.exposeT <= 0) ? 0.28 : 1;
  if (e.state === 'broken') ctx.rotate(Math.sin(e.brokenT * 3) * 0.1);
  ctx.save(); ctx.rotate(e.face); ctx.scale(sq, sq);
  const D = ENEMY_DRAW[d.draw] || ENEMY_DRAW.grunt;
  if (D.under) D.under(ctx, e, r);
  ctx.rotate(-e.face); drawBody(ctx, 0, 0, r, col, e.flash); ctx.rotate(e.face);
  if (e.elite) { ctx.strokeStyle = '#ffd36b'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, r + 5, 0, TAU); ctx.stroke(); }
  if (D.over) D.over(ctx, e, r, pose, angry);
  ctx.restore(); ctx.restore(); ctx.globalAlpha = 1;
  if (e.state === 'broken') { for (let i = 0; i < 3; i++) { const a = G.clock * 4 + i * TAU / 3; ctx.fillStyle = '#ffe27a'; ctx.beginPath(); ctx.arc(e.x + Math.cos(a) * r * 0.9, e.y - r - 6 + Math.sin(a) * 4, 2.5, 0, TAU); ctx.fill(); } }
  if (fr) {
    ctx.fillStyle = 'rgba(170,225,255,0.4)'; ctx.strokeStyle = '#e8f8ff'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU + 0.3; ctx.lineTo(e.x + Math.cos(a) * r * 1.35, e.y + Math.sin(a) * r * 1.35); } ctx.closePath(); ctx.fill(); ctx.stroke();
  }
  if (e.st.shock > 0 && Math.random() < 0.3) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = '#d9ccff'; ctx.lineWidth = 1.5; ctx.beginPath(); const a = rand(0, TAU); ctx.moveTo(e.x + Math.cos(a) * r, e.y + Math.sin(a) * r); ctx.lineTo(e.x + Math.cos(a + 0.4) * r * 1.6 + rand(-4, 4), e.y + Math.sin(a + 0.4) * r * 1.6 + rand(-4, 4)); ctx.stroke(); ctx.restore(); }
  if (e.st.chill > 0 && !fr) { ctx.strokeStyle = hexA('#8fd8ff', 0.5 + e.st.chill * 0.1); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(e.x, e.y, r + 5, -Math.PI / 2, -Math.PI / 2 + TAU * e.st.chill / 5); ctx.stroke(); }
}
function sectorPath(ctx, x, y, r, a, arc) { ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y, r, a - arc / 2, a + arc / 2); ctx.closePath(); }
function drawTelegraph(ctx, e) {
  if (e.air && e.step) {
    const s = e.step, A = e.air, p = clamp(A.t / A.dur, 0, 1), cue = A.dur - A.t < 0.16; const rgb = s.perilous ? '255,59,59' : '255,206,84';
    ctx.save(); ctx.fillStyle = `rgba(${rgb},0.1)`; ctx.beginPath(); ctx.arc(A.x1, A.y1, s.radius, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${0.18 + 0.25 * p})`; ctx.beginPath(); ctx.arc(A.x1, A.y1, s.radius * p, 0, TAU); ctx.fill();
    ctx.strokeStyle = cue ? '#ffffff' : s.perilous ? '#ff4a4a' : '#ffd25a'; ctx.lineWidth = cue ? 3.5 : 2.5; ctx.beginPath(); ctx.arc(A.x1, A.y1, s.radius, 0, TAU); ctx.stroke();
    ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(e.x, e.y + 6, e.r, e.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); return;
  }
  if (e.state !== 'windup' || !e.step || e.vanishT > 0) return;
  const s = e.step, p = clamp(1 - e.t / e.windTotal, 0, 1), per = !!s.perilous, cue = e.t <= 0.16;
  const rgb = per ? '255,59,59' : '255,206,84';
  const edge = cue ? '#ffffff' : per ? '#ff4a4a' : '#ffd25a';
  ctx.save();
  if (s.shape === 'slash') { const fa = e.face + (s.off || 0);
    ctx.fillStyle = `rgba(${rgb},0.09)`; sectorPath(ctx, e.x, e.y, s.range, fa, s.arc); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${0.16 + 0.22 * p})`; sectorPath(ctx, e.x, e.y, Math.max(e.r, s.range * p), fa, s.arc); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = cue ? 3.5 : 2; ctx.globalAlpha = 0.55 + 0.45 * p; sectorPath(ctx, e.x, e.y, s.range, fa, s.arc); ctx.stroke();
  } else if (s.shape === 'thrust') {
    ctx.translate(e.x, e.y); ctx.rotate(e.face + (s.off || 0)); const w = s.width;
    ctx.fillStyle = `rgba(${rgb},0.09)`; ctx.fillRect(0, -w / 2, s.len, w);
    ctx.fillStyle = `rgba(${rgb},${0.18 + 0.22 * p})`; ctx.fillRect(0, -w / 2, s.len * p, w);
    ctx.strokeStyle = edge; ctx.lineWidth = cue ? 3.5 : 2; ctx.globalAlpha = 0.55 + 0.45 * p; ctx.strokeRect(0, -w / 2, s.len, w);
    ctx.beginPath(); ctx.moveTo(s.len - 14, -w / 2 + 4); ctx.lineTo(s.len - 2, 0); ctx.lineTo(s.len - 14, w / 2 - 4); ctx.stroke();
  } else if (s.shape === 'slam') {
    ctx.fillStyle = `rgba(${rgb},0.09)`; ctx.beginPath(); ctx.arc(e.x, e.y, s.radius, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(${rgb},${0.16 + 0.22 * p})`; ctx.beginPath(); ctx.arc(e.x, e.y, s.radius * p, 0, TAU); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = cue ? 3.5 : 2.5; ctx.globalAlpha = 0.6 + 0.4 * p; ctx.beginPath(); ctx.arc(e.x, e.y, s.radius, 0, TAU); ctx.stroke();
  } else if (s.shape === 'shot') {
    const n = s.count || 1; ctx.strokeStyle = cue ? '#ffffff' : '#ffd25a'; ctx.lineWidth = cue ? 2.5 : 1.5; ctx.globalAlpha = 0.25 + 0.6 * p; ctx.setLineDash([10, 8]);
    for (let i = 0; i < n; i++) { const a = e.face + (n > 1 ? (i - (n - 1) / 2) * (s.spread || 0.2) : 0); ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r); ctx.lineTo(e.x + Math.cos(a) * 420, e.y + Math.sin(a) * 420); ctx.stroke(); }
    ctx.setLineDash([]);
  } else if (s.shape === 'breath') {
    // the whole cone the breath will sweep, with an arrow showing which way it turns
    const dir = e.breathDir || 1, tot = s.sweep + s.arc;
    ctx.fillStyle = `rgba(${rgb},${0.07 + 0.12 * p})`; sectorPath(ctx, e.x, e.y, s.range, e.face, tot); ctx.fill();
    ctx.strokeStyle = edge; ctx.lineWidth = cue ? 3.5 : 2; ctx.globalAlpha = 0.5 + 0.5 * p; sectorPath(ctx, e.x, e.y, s.range, e.face, tot); ctx.stroke();
    const a1 = e.face - dir * tot / 2, a2 = e.face + dir * tot / 2, rr = s.range * 0.78; ctx.beginPath();
    for (let k = 0; k <= 12; k++) { const a = a1 + (a2 - a1) * k / 12 * p; const x = e.x + Math.cos(a) * rr, y = e.y + Math.sin(a) * rr; k ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.lineWidth = 3; ctx.stroke();
  } else if (s.shape === 'flashstep') {
    // a thin line straight through you: where the dash will cut
    const a = Math.atan2(G.player.y - e.y, G.player.x - e.x), L = Math.min(s.len, dist(e.x, e.y, G.player.x, G.player.y) + (s.over || 150));
    ctx.translate(e.x, e.y); ctx.rotate(a); ctx.fillStyle = `rgba(${rgb},${0.06 + 0.14 * p})`; ctx.fillRect(0, -s.width / 2, L, s.width);
    ctx.strokeStyle = edge; ctx.lineWidth = cue ? 3 : 1.6; ctx.globalAlpha = 0.5 + 0.5 * p; ctx.setLineDash([14, 8]); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(L, 0); ctx.stroke(); ctx.setLineDash([]);
  } else if (s.shape === 'blink' || s.shape === 'teleport' || s.shape === 'whiteout') {
    const col = e.d.accent || '#ffffff'; ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.35 + 0.55 * p; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6 + 34 * (1 - p), 0, TAU); ctx.stroke();
    ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, e.y, e.r * 2.6, col, 0.25 + 0.35 * p);
  } else if (s.shape === 'boltstep') {
    ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, e.y, e.r * 3, '#9fd8ff', 0.3 + 0.4 * p); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#cfeaff'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { const a = rand(0, TAU); ctx.beginPath(); ctx.moveTo(e.x + Math.cos(a) * e.r, e.y + Math.sin(a) * e.r); ctx.lineTo(e.x + Math.cos(a + 0.3) * e.r * 1.8, e.y + Math.sin(a + 0.3) * e.r * 1.8); ctx.stroke(); }
  } else if (s.shape === 'stance') {
    ctx.strokeStyle = '#f2b544'; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.4 + 0.5 * p; ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 8 + 26 * (1 - p), 0, TAU); ctx.stroke();
  }
  ctx.restore();
}
function drawEnemyOverlay(ctx, e) {
  if (e.dead || e.spawning > 0 || e.vanishT > 0) return;
  const r = e.r;
  // Resolve shimmer: a pale hexagonal ward that flickers while raw burst is being softened
  if (e.resolveT > 0) {
    const k = Math.min(1, e.resolveT / 0.35); ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.35 * k; ctx.strokeStyle = '#dfe8ff'; ctx.lineWidth = 2;
    ctx.beginPath(); for (let i = 0; i <= 6; i++) { const an = i / 6 * TAU + G.clock * 0.8, R2 = r + 10 + Math.sin(G.clock * 9 + i) * 1.5; const px = e.x + Math.cos(an) * R2, py = e.y + Math.sin(an) * R2; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); ctx.restore();
  }
  if (e.stanceT > 0) {
    // Mikiri stance: a golden guard ring with a gap facing you; striking into it gets you cut
    ctx.save(); const k = 0.6 + 0.4 * Math.sin(G.clock * 14); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, e.y, r * 3, '#f2b544', 0.35 * k); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffd37a'; ctx.lineWidth = 3; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(e.x, e.y, r + 14, e.face + 0.5, e.face + TAU - 0.5); ctx.stroke();
    ctx.font = `700 ${Math.round(r * 0.9)}px "Shippori Mincho B1", serif`; ctx.textAlign = 'center'; ctx.fillStyle = '#ffd37a'; ctx.globalAlpha = 0.9; ctx.fillText('見切', e.x, e.y - r - 22); ctx.restore();
  }
  if (e.form && e.d.forms) {
    const f = e.d.forms.find(x => x.id === e.form); if (f) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, e.y + 4, r * 2.4, f.col, 0.28 + 0.08 * Math.sin(G.clock * 6)); ctx.restore();
      ctx.save(); ctx.font = `700 ${Math.round(r * 0.7)}px "Shippori Mincho B1", serif`; ctx.textAlign = 'center'; ctx.fillStyle = f.col; ctx.globalAlpha = 0.85; ctx.fillText(f.g, e.x, e.y - r - 14); ctx.restore(); }
  }
  if (e.state === 'windup' && e.step && e.t <= 0.18 && (MELEE_SHAPES[e.step.shape] || e.step.shape === 'shot')) {
    const k = 1 - e.t / 0.18; const gx = e.x + Math.cos(e.face) * (r + 12), gy = e.y + Math.sin(e.face) * (r + 12) - 6; const per = e.step.perilous;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.translate(gx, gy); ctx.rotate(G.clock * 3);
    const L = (16 + 10 * Math.sin(k * Math.PI)) * (e.isBoss ? 1.4 : 1); ctx.fillStyle = per ? '#ff4a3a' : '#fff6d8'; ctx.globalAlpha = 0.95;
    ctx.beginPath(); for (let i = 0; i < 4; i++) { const an = i * Math.PI / 2; ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an - 0.35) * 3, Math.sin(an - 0.35) * 3); ctx.lineTo(Math.cos(an) * L, Math.sin(an) * L); ctx.lineTo(Math.cos(an + 0.35) * 3, Math.sin(an + 0.35) * 3); ctx.closePath(); } ctx.fill();
    drawGlow(ctx, 0, 0, L * 1.3, per ? '#ff3a2a' : '#ffe9a0', 0.9); ctx.restore();
  }
  if (e.state === 'windup' && e.step && e.step.perilous) {
    const y = e.y - r - 26, pulse = 1 + 0.12 * Math.sin(G.clock * 20);
    ctx.save(); ctx.translate(e.x, y); ctx.scale(pulse, pulse); ctx.rotate(Math.PI / 4);
    ctx.fillStyle = OUT; ctx.fillRect(-12, -12, 24, 24); ctx.fillStyle = '#ff3b3b'; ctx.fillRect(-9.5, -9.5, 19, 19); ctx.restore();
    ctx.font = `900 16px ${FONT_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#fff'; ctx.fillText('!', e.x, y + 1);
  }
  if (e.exposeT > 0 && !e.untargetable) {
    const pulse = 1 + 0.15 * Math.sin(G.clock * 18); const s = 9 * pulse;
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, e.y, 34 * pulse, '#ffe27a', 0.9); ctx.restore();
    ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(Math.PI / 4 + G.clock * 2); ctx.fillStyle = OUT; ctx.fillRect(-s - 2.5, -s - 2.5, (s + 2.5) * 2, (s + 2.5) * 2); ctx.fillStyle = '#ffe27a'; ctx.fillRect(-s, -s, s * 2, s * 2); ctx.fillStyle = '#ffffff'; ctx.fillRect(-s * 0.4, -s * 0.4, s * 0.8, s * 0.8); ctx.restore();
    ctx.strokeStyle = '#ffe27a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(e.x, e.y, r + 10, -Math.PI / 2, -Math.PI / 2 + TAU * clamp(e.exposeT / 1.2, 0, 1)); ctx.stroke();
    if (G.player && G.player.focus > 0) { ctx.font = `800 12px ${FONT_SANS}`; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeText('Q', e.x + r + 14, e.y - r - 4); ctx.fillStyle = '#ffe27a'; ctx.fillText('Q', e.x + r + 14, e.y - r - 4); }
  }
  if (e.isBoss) return;
  const y = e.y - r - 12;
  if (e.affixes && e.affixes.length) { ctx.font = `800 10px ${FONT_SANS}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; let ty = y - 12; for (const a of e.affixes) { const A = AFFIXES[a]; ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.strokeText(A.name.toUpperCase(), e.x, ty); ctx.fillStyle = A.col; ctx.fillText(A.name.toUpperCase(), e.x, ty); ty -= 11; } }
  if (e.state === 'broken') {
    const pulse = 0.75 + 0.25 * Math.sin(G.clock * 14);
    ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, e.x, y - 8, 26 * pulse, '#ff2a2a', 0.9); ctx.restore();
    ocirc(ctx, e.x, y - 8, 6.5, '#ff2a2a', 2); return;
  }
  const showHp = e.hp < e.maxHp, showP = e.posture > 1;
  if (!showHp && !showP) return;
  const w = Math.max(28, r * 2 + 10);
  if (showHp) { ctx.fillStyle = OUT; ctx.fillRect(e.x - w / 2 - 2, y - 2, w + 4, 7); ctx.fillStyle = '#3a1a1e'; ctx.fillRect(e.x - w / 2, y, w, 3); ctx.fillStyle = e.elite ? '#ffd36b' : '#ff4a4a'; ctx.fillRect(e.x - w / 2, y, w * clamp(e.hp / e.maxHp, 0, 1), 3); }
  if (showP) { const k = clamp(e.posture / e.maxPosture, 0, 1); const pw = w * k; ctx.fillStyle = OUT; ctx.fillRect(e.x - pw / 2 - 2, y + 5, pw + 4, 6); ctx.fillStyle = k > 0.75 ? '#ff5a2a' : k > 0.45 ? '#ffa23a' : '#ffd23f'; ctx.fillRect(e.x - pw / 2, y + 6, pw, 3); }
}

function drawShadowDouble(ctx, P) {
  const sh = P.shadow; if (!sh) return; ctx.save(); ctx.translate(sh.x, sh.y);
  ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, 0, 0, 46, '#8a6aff', 0.35 + 0.15 * Math.sin(G.clock * 5)); ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 0.72; ctx.fillStyle = '#05040a'; ctx.beginPath(); ctx.arc(0, 0, 18, 0, TAU); ctx.fill(); ctx.strokeStyle = '#8a6aff'; ctx.lineWidth = 2; ctx.stroke();
  const a = sh.ang ?? P.ang; ctx.strokeStyle = '#b8a4ff'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 10, Math.sin(a) * 10); ctx.lineTo(Math.cos(a) * (28 + (sh.swingT > 0 ? 14 : 0)), Math.sin(a) * (28 + (sh.swingT > 0 ? 14 : 0))); ctx.stroke();
  ctx.globalAlpha = 1; ctx.restore();
}
function drawPlayer(ctx) {
  const P = G.player; if (!P || P.dead) return;
  if (P.shadow) drawShadowDouble(ctx, P);
  const blink = P.iframes > 0 && !P.dashing && P.hurtT > -0.3 && Math.floor(G.clock * 22) % 2 === 0;
  const inWin = G.clock - P.deflectPress <= P.deflectWin;
  // ground ring + aim tick
  ctx.strokeStyle = inWin ? 'rgba(255,226,122,0.85)' : 'rgba(140,220,255,0.35)'; ctx.lineWidth = inWin ? 3 : 2; ctx.beginPath(); ctx.arc(P.x, P.y, 25, 0, TAU); ctx.stroke();
  ctx.fillStyle = 'rgba(140,220,255,0.75)'; ctx.beginPath(); ctx.moveTo(P.x + Math.cos(P.ang) * 34, P.y + Math.sin(P.ang) * 34); ctx.lineTo(P.x + Math.cos(P.ang + 0.18) * 27, P.y + Math.sin(P.ang + 0.18) * 27); ctx.lineTo(P.x + Math.cos(P.ang - 0.18) * 27, P.y + Math.sin(P.ang - 0.18) * 27); ctx.fill();
  if (P.hitFrom) { const a = Math.atan2(P.hitFrom.y - P.y, P.hitFrom.x - P.x); ctx.strokeStyle = `rgba(255,60,60,${P.hitFrom.t / 0.35})`; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(P.x, P.y, 28, a - 0.6, a + 0.6); ctx.stroke(); }
  ctx.globalAlpha = blink ? 0.45 : 1;
  ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  for (let i = P.scarf.length - 1; i > 0; i--) { const a = P.scarf[i], b = P.scarf[i - 1]; const w = 7 * (1 - i / P.scarf.length) + 2; ctx.strokeStyle = OUT; ctx.lineWidth = w + 3; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  for (let i = P.scarf.length - 1; i > 0; i--) { const a = P.scarf[i], b = P.scarf[i - 1]; ctx.strokeStyle = '#ef3b2c'; ctx.lineWidth = 7 * (1 - i / P.scarf.length) + 2; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
  ctx.save(); ctx.translate(P.x, P.y);
  let bx, by, ba, bl = 38;
  const perp = P.ang + Math.PI / 2;
  if (P.guarding || inWin) { bx = Math.cos(P.ang) * 15 - Math.cos(perp) * 17; by = Math.sin(P.ang) * 15 - Math.sin(perp) * 17; ba = perp; bl = 34; }
  else if (P.state === 'swing') { const B = curBlade(); const arc = (B.arc || 1) * (P.finisher ? 2.4 : 1.8); const pr = clamp(P.swingT / 0.08, 0, 1); ba = P.ang + P.swingSide * lerp(-arc / 2, arc / 2, easeOut(pr)); bx = Math.cos(ba) * 9; by = Math.sin(ba) * 9; bl = 32 + B.reach * 0.25; }
  else if (P.state === 'drink') { ba = P.ang + 2.6; bx = Math.cos(ba) * 6; by = Math.sin(ba) * 6; }
  else { ba = P.ang + 0.8; bx = Math.cos(P.ang + 0.95) * 10; by = Math.sin(P.ang + 0.95) * 10; }
  const glowing = inWin || P.deflectFlash > 0 || P.riposteT > 0 || P.riposte || P.lotus;
  if (glowing) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = 0.7; ctx.strokeStyle = P.lotus ? '#c9b6ff' : '#ffc94a'; ctx.lineWidth = 10; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx + Math.cos(ba) * bl, by + Math.sin(ba) * bl); ctx.stroke(); ctx.restore(); }
  blade(ctx, bx, by, ba, bl, glowing ? '#fff2c0' : '#e8eef6', 3.5);
  ocirc(ctx, bx + Math.cos(ba) * 5, by + Math.sin(ba) * 5, 3.2, '#3a2818', 1.5);
  if (P.state === 'drink') ocirc(ctx, Math.cos(P.ang) * 13, Math.sin(P.ang) * 13, 6, '#d68a3a', 2);
  ctx.restore();
  drawBody(ctx, P.x, P.y, 12, P.hurtT > 0 ? '#ff8a7a' : '#f4efe4', 0);
  ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.ang);
  ocirc(ctx, 0, 0, 17, P.hurtT > 0 ? '#ff7a6a' : '#e0b868', 2.5);
  ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.arc(-4, -4, 9, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(80,50,20,0.4)'; ctx.lineWidth = 1; for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; ctx.beginPath(); ctx.moveTo(Math.cos(a) * 4, Math.sin(a) * 4); ctx.lineTo(Math.cos(a) * 16, Math.sin(a) * 16); ctx.stroke(); }
  ocirc(ctx, 0, 0, 3.2, '#8a5e2e', 1.5);
  ctx.restore(); ctx.globalAlpha = 1;
  if (P.ward) { ctx.strokeStyle = hexA('#4fd1a5', 0.6 + 0.3 * Math.sin(G.clock * 6)); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 21, 0, TAU); ctx.stroke(); }
  if (P.rageT > 0) { ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, P.x, P.y, 44, '#ff4a2a', 0.4); ctx.restore(); }
  const S = G.S;
  if (P.posture > 1) {
    const k = clamp(P.posture / S.maxPosture, 0, 1), w = 56 * k; const y = P.y + 31;
    ctx.fillStyle = OUT; ctx.fillRect(P.x - w / 2 - 2, y - 2, w + 4, 8); ctx.fillStyle = k > 0.75 ? '#ff4a2a' : k > 0.45 ? '#ffa23a' : '#ffd23f'; ctx.fillRect(P.x - w / 2, y, w, 4);
  }
}

function drawProj(ctx, p) {
  if (p.held) return;
  const a = Math.atan2(p.vy, p.vx); const sp = Math.hypot(p.vx, p.vy); const fade = Math.min(1, p.life / 0.08);
  if (p.team === 'e') {
    ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y, p.r * 3.4, p.perilous ? '#ff2a2a' : p.col, 0.7);
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    if (p.style === 'bullet') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); oline(ctx, -26, 0, 4, 0, 3, '#fff4c0'); ctx.restore(); return; }
    if (p.style === 'star') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin); ctx.fillStyle = OUT; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? 4 : 10; const aa = i / 8 * TAU; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.fill(); ctx.fillStyle = '#e8eeff'; ctx.beginPath(); for (let i = 0; i < 8; i++) { const rr = i % 2 ? 2.5 : 7.5; const aa = i / 8 * TAU; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } ctx.fill(); ctx.restore(); return; }
    if (p.style === 'scythe') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 1.6); ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 9; ctx.beginPath(); ctx.arc(0, 0, p.r, -0.2, 2.6); ctx.stroke(); ctx.strokeStyle = '#dff8ff'; ctx.lineWidth = 4.5; ctx.stroke(); oline(ctx, 0, 0, -p.r * 0.9, p.r * 0.5, 3, '#4a3a2a'); ctx.restore(); return; }
    if (p.style === 'gale') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); ctx.lineCap = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.beginPath(); ctx.arc(-p.r * 0.6, 0, p.r * 1.3, -1.1, 1.1); ctx.stroke(); ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = 4; ctx.stroke(); ctx.restore(); return; }
    if (p.style === 'crow') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); const fl = Math.sin(p.age * 30) * 0.5; ctx.fillStyle = '#14141c'; ctx.strokeStyle = OUT; ctx.lineWidth = 2;
      for (const sg of [-1, 1]) { ctx.beginPath(); ctx.moveTo(2, 0); ctx.lineTo(-8, sg * (12 + fl * 6)); ctx.lineTo(-4, sg * 2); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      ctx.beginPath(); ctx.ellipse(0, 0, 8, 4, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ff4a3a'; ctx.beginPath(); ctx.arc(4, -1, 1.6, 0, TAU); ctx.fill(); ctx.restore(); return; }
    if (p.style === 'silk') { if (p.owner && !p.owner.dead) { ctx.save(); ctx.strokeStyle = 'rgba(242,238,250,0.75)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(p.owner.x, p.owner.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.restore(); } ocirc(ctx, p.x, p.y, 5, '#f2eefa', 2); return; }
    if (p.style === 'arrow' || p.style === 'kunai' || p.style === 'ice' || p.style === 'feather') {
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      oline(ctx, -18, 0, 4, 0, 2.5, p.col);
      ctx.fillStyle = OUT; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(1, -6); ctx.lineTo(1, 6); ctx.fill(); ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(3, -3.5); ctx.lineTo(3, 3.5); ctx.fill(); ctx.restore();
    } else { ocirc(ctx, p.x, p.y, p.r, p.col, 2.5); circ(ctx, p.x, p.y, p.r * 0.45, '#ffffff'); }
    return;
  }
  ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = fade;
  const c = p.col, r = p.r;
  switch (p.style) {
    case 'spark': case 'needle': {
      const L = Math.min(p.style === 'needle' ? 20 : 26, sp * 0.028) * Math.max(1, Math.sqrt(p.size));
      drawGlow(ctx, p.x, p.y, r * 3.2, c, 0.7 * fade); ctx.globalAlpha = fade; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(2, r * 0.7); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - Math.cos(a) * L, p.y - Math.sin(a) * L); ctx.stroke(); break;
    }
    case 'wave': {
      drawGlow(ctx, p.x, p.y, r * 2, c, 0.5 * fade); ctx.globalAlpha = fade * Math.min(1, p.life / p.maxLife * 2.2);
      ctx.strokeStyle = c; ctx.lineWidth = r * 0.45; ctx.beginPath(); ctx.arc(p.x - Math.cos(a) * r * 0.7, p.y - Math.sin(a) * r * 0.7, r, a - 1.15, a + 1.15); ctx.stroke();
      ctx.strokeStyle = '#ffffff'; ctx.lineWidth = r * 0.15; ctx.stroke(); break;
    }
    case 'fire': case 'flame': {
      const k = p.style === 'flame' ? p.life / p.maxLife : 1;
      drawGlow(ctx, p.x, p.y, r * 3.6 * (0.5 + k * 0.5), c, 0.85 * fade); drawGlow(ctx, p.x, p.y, r * 1.4 * (0.5 + k * 0.5), '#ffe7a0', 0.9 * fade); break;
    }
    case 'void': case 'sing': {
      drawGlow(ctx, p.x, p.y, r * 3.4 + (p.pull ? 6 * Math.sin(p.age * 10) : 0), c, 0.6 * fade);
      ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = fade; circ(ctx, p.x, p.y, r * 0.75, '#05020a', c, 2);
      ctx.globalCompositeOperation = 'lighter'; ctx.strokeStyle = c; ctx.lineWidth = 2; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, r * (1.1 + i * 0.25), p.spin * (i % 2 ? -1 : 1) + i, p.spin * (i % 2 ? -1 : 1) + i + 1.6); ctx.stroke(); }
      if (p.pull) { ctx.globalAlpha = 0.1; ctx.beginPath(); ctx.arc(p.x, p.y, p.pull, 0, TAU); ctx.stroke(); }
      break;
    }
    case 'thorn': case 'star': {
      drawGlow(ctx, p.x, p.y, r * 2.8, c, 0.5 * fade); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.style === 'star' ? p.spin : a); ctx.fillStyle = p.style === 'star' ? '#eef2f8' : c; ctx.beginPath();
      if (p.style === 'star') { for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.45 : r * 1.4; const aa = i / 8 * TAU; ctx.lineTo(Math.cos(aa) * rr, Math.sin(aa) * rr); } }
      else { ctx.moveTo(r * 1.8, 0); ctx.lineTo(-r, -r * 0.6); ctx.lineTo(-r, r * 0.6); }
      ctx.fill(); ctx.restore(); break;
    }
    case 'ghost': {
      drawGlow(ctx, p.x, p.y, r * 3.5, c, 0.5 * fade); ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a);
      ctx.strokeStyle = '#f4efff'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(-r * 2, 0); ctx.lineTo(r * 2.2, 0); ctx.stroke();
      ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-r * 1.2, -r * 0.8); ctx.lineTo(-r * 1.2, r * 0.8); ctx.stroke(); ctx.restore(); break;
    }
    case 'disc': {
      drawGlow(ctx, p.x, p.y, r * 3, c, 0.6 * fade); ctx.strokeStyle = c; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x, p.y, r, p.spin, p.spin + TAU * 0.8); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(p.x, p.y, r * 0.5, 0, TAU); ctx.stroke(); break;
    }
    case 'mine': {
      const armed = p.age > 0.4; const bl = armed && Math.floor(p.age * 4) % 2 === 0;
      drawGlow(ctx, p.x, p.y, r * 2.4, c, bl ? 0.8 : 0.35); ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
      ocirc(ctx, p.x, p.y, r, '#2b2f3a', 2); circ(ctx, p.x, p.y, r * 0.4, bl ? '#ffffff' : c); break;
    }
    case 'paper': {
      ctx.globalCompositeOperation = 'source-over'; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 0.3);
      ctx.fillStyle = OUT; ctx.fillRect(-r * 0.7 - 2, -r * 1.1 - 2, r * 1.4 + 4, r * 2.2 + 4); ctx.fillStyle = '#efe3c2'; ctx.fillRect(-r * 0.7, -r * 1.1, r * 1.4, r * 2.2); ctx.fillStyle = '#c8241a'; ctx.fillRect(-r * 0.15, -r * 0.8, r * 0.3, r * 1.6); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y, r * 2.5, '#ff9a4a', 0.3 + 0.5 * (p.age / p.maxLife)); break;
    }
    case 'spear': {
      drawGlow(ctx, p.x, p.y, r * 3.5, c, 0.6 * fade); ctx.strokeStyle = c; ctx.lineWidth = r * 0.9; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p.x + Math.cos(a) * 10, p.y + Math.sin(a) * 10); ctx.lineTo(p.x - Math.cos(a) * 34, p.y - Math.sin(a) * 34); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = r * 0.3; ctx.stroke(); break;
    }
    case 'gale': {
      ctx.strokeStyle = c; ctx.lineWidth = 2.5; ctx.globalAlpha = 0.7 * fade;
      for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(p.x, p.y, r * (0.5 + i * 0.25), p.spin + i * 2, p.spin + i * 2 + 2.2); ctx.stroke(); } break;
    }
    case 'hook': {
      const P = G.player; ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = 2; ctx.setLineDash([5, 4]); ctx.beginPath(); ctx.moveTo(P.x, P.y); ctx.lineTo(p.x, p.y); ctx.stroke(); ctx.setLineDash([]);
      ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(a); oline(ctx, -6, 0, 6, 0, 3, '#e8e2d6'); ctx.strokeStyle = '#e8e2d6'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(2, 5, 6, -1.6, 1); ctx.stroke(); ctx.restore(); break;
    }
    case 'cloud': {
      ctx.globalCompositeOperation = 'source-over'; const k = Math.min(1, p.life / 0.5); ctx.globalAlpha = 0.22 * k;
      for (let i = 0; i < 5; i++) { const an = p.spin * 0.2 + i * 1.3; ctx.fillStyle = i % 2 ? '#9acd32' : '#6a9a22'; ctx.beginPath(); ctx.arc(p.x + Math.cos(an) * r * 0.4, p.y + Math.sin(an) * r * 0.4, r * 0.7, 0, TAU); ctx.fill(); }
      break;
    }
    case 'petal': {
      ctx.globalCompositeOperation = 'source-over'; ctx.fillStyle = c; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.spin * 0.4); ctx.beginPath(); ctx.ellipse(0, 0, r * 1.2, r * 0.6, 0, 0, TAU); ctx.fill(); ctx.restore();
      ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y, r * 2.5, c, 0.3); break;
    }
    default: {
      if (p.reflected) { drawGlow(ctx, p.x, p.y, r * 4, '#ffd36b', 0.9); circ(ctx, p.x, p.y, r * 0.8, '#fff7d6'); }
      else { drawGlow(ctx, p.x, p.y, r * 3, c, 0.7); circ(ctx, p.x, p.y, r * 0.6, '#ffffff'); }
    }
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}
function projTrail(p) {
  if (p.team !== 'p' || p.held) return;
  if ((p.style === 'fire') && Math.random() < 0.7) addPart({ k: 'ember', x: p.x, y: p.y, vx: rand(-30, 30), vy: rand(-30, 30), r: rand(2, 4), col: '#ff9a4a', life: rand(0.2, 0.4), drag: 2 });
  else if (p.style === 'sing' && Math.random() < 0.5) { const a = rand(0, TAU); addPart({ k: 'spark', x: p.x + Math.cos(a) * 90, y: p.y + Math.sin(a) * 90, vx: -Math.cos(a) * 300, vy: -Math.sin(a) * 300, life: 0.3, col: '#8a5cff', w: 1.5, drag: 0, len: 0.04 }); }
  else if ((p.style === 'ghost' || p.style === 'spear') && Math.random() < 0.5) addPart({ k: 'ember', x: p.x, y: p.y, vx: 0, vy: 0, r: 3, col: p.col, life: 0.2, drag: 0 });
}

function drawHazards(ctx) {
  for (const h of G.hazards) {
    if (h.k === 'ground') {
      const p = clamp(h.t / h.delay, 0, 1); const rgb = h.lightning ? '255,214,90' : h.ember ? '255,128,48' : '255,59,59'; const cue = h.delay - h.t < 0.15;
      if (h.ember && h.delay - h.t > 1.0) { ctx.save(); ctx.globalAlpha = 0.35 + 0.15 * Math.sin(G.clock * 7 + h.x); ctx.fillStyle = 'rgba(255,110,40,0.22)'; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * 0.8, 0, TAU); ctx.fill(); ctx.strokeStyle = 'rgba(255,140,60,0.6)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke(); ctx.restore(); continue; }
      ctx.fillStyle = `rgba(${rgb},0.1)`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgba(${rgb},${0.2 + 0.25 * p})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.r * p, 0, TAU); ctx.fill();
      ctx.strokeStyle = cue ? '#ffffff' : `rgb(${rgb})`; ctx.lineWidth = cue ? 3.5 : 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, h.r, 0, TAU); ctx.stroke();
    } else if (h.k === 'ring') {
      const per = h.perilous; const P = G.player; const near = P && !h.hit && Math.abs(dist(P.x, P.y, h.x, h.y) - h.rad) < 60;
      ctx.strokeStyle = OUT; ctx.lineWidth = h.thick + 5; ctx.beginPath(); ctx.arc(h.x, h.y, h.rad, 0, TAU); ctx.stroke();
      ctx.strokeStyle = per ? '#ff3b3b' : (near ? '#ffffff' : '#ffd25a'); ctx.lineWidth = h.thick; ctx.stroke();
      ctx.strokeStyle = per ? '#ffb0a0' : '#fff6d0'; ctx.lineWidth = 2; ctx.stroke();
    } else if (h.k === 'zone') {
      const p = clamp(h.t / h.delay, 0, 1), cue = h.delay - h.t < 0.16; const rgb = h.perilous ? '255,59,59' : (h.mirage || h.flash) ? '255,206,84' : h.tail ? '255,170,90' : h.mirrorCut ? '255,120,160' : '201,182,255';
      ctx.save();
      if (h.shape === 'slash') {
        ctx.fillStyle = `rgba(${rgb},0.1)`; sectorPath(ctx, h.x, h.y, h.range, h.ang, h.arc); ctx.fill();
        ctx.fillStyle = `rgba(${rgb},${0.15 + 0.25 * p})`; sectorPath(ctx, h.x, h.y, h.range * p, h.ang, h.arc); ctx.fill();
        ctx.strokeStyle = cue ? '#ffffff' : `rgb(${rgb})`; ctx.lineWidth = cue ? 3.5 : 2; sectorPath(ctx, h.x, h.y, h.range, h.ang, h.arc); ctx.stroke();
      } else {
        ctx.translate(h.x, h.y); ctx.rotate(h.ang);
        ctx.fillStyle = `rgba(${rgb},0.1)`; ctx.fillRect(0, -h.width / 2, h.len, h.width);
        ctx.fillStyle = `rgba(${rgb},${0.18 + 0.25 * p})`; ctx.fillRect(0, -h.width / 2 * p, h.len, h.width * p);
        ctx.strokeStyle = cue ? '#ffffff' : `rgb(${rgb})`; ctx.lineWidth = cue ? 3.5 : 2.5; ctx.strokeRect(0, -h.width / 2, h.len, h.width);
      }
      ctx.restore();
    } else if (h.k === 'breath') {
      const a = h.cur ?? h.a0; ctx.save(); ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(200,236,255,0.28)'; sectorPath(ctx, h.x, h.y, h.range, a, h.arc); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.22)'; sectorPath(ctx, h.x, h.y, h.range * 0.75, a, h.arc * 0.6); ctx.fill();
      ctx.globalCompositeOperation = 'source-over'; ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.7; sectorPath(ctx, h.x, h.y, h.range, a, h.arc); ctx.stroke(); ctx.restore();
    } else if (h.k === 'wave') {
      const A = G.ARENA, span = h.axis === 'x' ? A.h : A.w, g0 = h.gapC - h.gapW / 2, g1 = h.gapC + h.gapW / 2; ctx.save();
      const seg = (from, to) => { if (to <= from) return; if (h.axis === 'x') ctx.fillRect(h.pos - h.thick / 2, from, h.thick, to - from); else ctx.fillRect(from, h.pos - h.thick / 2, to - from, h.thick); };
      if (h.t < h.delay) {
        // warning: the wave gathers at the edge, gap already visible
        const k = clamp(h.t / h.delay, 0, 1); ctx.globalAlpha = 0.25 + 0.45 * k; ctx.fillStyle = h.delay - h.t < 0.16 ? '#ffffff' : '#ff4a4a'; seg(0, g0); seg(g1, span);
        ctx.globalAlpha = 0.9; ctx.fillStyle = '#9fe6ff'; const gx = h.axis === 'x' ? h.pos + h.dir * 40 : h.gapC, gy = h.axis === 'x' ? h.gapC : h.pos + h.dir * 40; ctx.beginPath(); ctx.arc(gx, gy, 7, 0, TAU); ctx.fill();
      } else {
        ctx.fillStyle = 'rgba(70,170,220,0.55)'; seg(0, g0); seg(g1, span);
        ctx.fillStyle = 'rgba(220,245,255,0.85)'; const lip = h.pos + h.dir * h.thick * 0.3; if (h.axis === 'x') { ctx.fillRect(lip - 4, 0, 8, g0); ctx.fillRect(lip - 4, g1, 8, span - g1); } else { ctx.fillRect(0, lip - 4, g0, 8); ctx.fillRect(g1, lip - 4, span - g1, 8); }
        ctx.strokeStyle = '#ff4a4a'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8; if (h.axis === 'x') { ctx.strokeRect(h.pos - h.thick / 2, 0, h.thick, g0); ctx.strokeRect(h.pos - h.thick / 2, g1, h.thick, span - g1); } else { ctx.strokeRect(0, h.pos - h.thick / 2, g0, h.thick); ctx.strokeRect(g1, h.pos - h.thick / 2, span - g1, h.thick); }
      }
      ctx.restore();
    } else if (h.k === 'whirl') {
      const p = clamp(h.t / h.delay, 0, 1), cue = h.delay - h.t < 0.16; ctx.save();
      ctx.strokeStyle = 'rgba(120,210,255,0.5)'; ctx.lineWidth = 2; for (let k = 0; k < 3; k++) { ctx.beginPath(); for (let q = 0; q <= 40; q++) { const tt = q / 40, a = tt * TAU * 1.5 + G.clock * 4 + k * TAU / 3, rr = h.r * (1 - tt * 0.85); const x = h.x + Math.cos(a) * rr, y = h.y + Math.sin(a) * rr; q ? ctx.lineTo(x, y) : ctx.moveTo(x, y); } ctx.stroke(); }
      ctx.fillStyle = `rgba(255,59,59,${0.12 + 0.25 * p})`; ctx.beginPath(); ctx.arc(h.x, h.y, h.burstR * p, 0, TAU); ctx.fill();
      ctx.strokeStyle = cue ? '#ffffff' : '#ff4a4a'; ctx.lineWidth = cue ? 3.5 : 2.5; ctx.beginPath(); ctx.arc(h.x, h.y, h.burstR, 0, TAU); ctx.stroke(); ctx.restore();
    } else if (h.k === 'web') {
      const a = Math.min(1, h.t * 4, (h.life - h.t) * 2) * 0.55;
      ctx.save(); ctx.globalAlpha = a; ctx.strokeStyle = '#e8e4f0'; ctx.lineWidth = 1.5; ctx.translate(h.x, h.y);
      ctx.fillStyle = 'rgba(232,228,240,0.08)'; ctx.beginPath(); ctx.arc(0, 0, h.r, 0, TAU); ctx.fill();
      for (let i = 0; i < 8; i++) { const an = i / 8 * TAU; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(an) * h.r, Math.sin(an) * h.r); ctx.stroke(); }
      for (let k = 1; k <= 3; k++) { ctx.beginPath(); for (let i = 0; i <= 8; i++) { const an = i / 8 * TAU; ctx.lineTo(Math.cos(an) * h.r * k / 3, Math.sin(an) * h.r * k / 3); } ctx.stroke(); }
      ctx.restore();
    }
  }
}
function drawSilk(ctx) {
  const P = G.player; if (!P || !P.yank || !P.yank.src) return; const e = P.yank.src;
  ctx.save(); ctx.strokeStyle = '#f2eefa'; ctx.lineWidth = 2; ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.moveTo(e.x, e.y); ctx.quadraticCurveTo((e.x + P.x) / 2, (e.y + P.y) / 2 + 12, P.x, P.y); ctx.stroke(); ctx.restore();
}
function drawPickups(ctx) {
  for (const p of G.pickups) {
    const bob = Math.sin(G.clock * 6 + p.x) * 2;
    if (p.k === 'ash') {
      const s = p.v > 1 ? 7 : 4.5; ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y + bob, s * 3, '#ffb35a', 0.5); ctx.restore();
      ctx.save(); ctx.translate(p.x, p.y + bob); ctx.rotate(Math.PI / 4 + G.clock * 2); ctx.fillStyle = OUT; ctx.fillRect(-s / 2 - 1.5, -s / 2 - 1.5, s + 3, s + 3); ctx.fillStyle = '#ffd36b'; ctx.fillRect(-s / 2, -s / 2, s, s); ctx.restore();
    } else if (p.k === 'heart') {
      ctx.save(); ctx.translate(p.x, p.y + bob); ctx.fillStyle = OUT; ctx.beginPath(); ctx.arc(-4, -2, 6.5, 0, TAU); ctx.arc(4, -2, 6.5, 0, TAU); ctx.moveTo(-10, 0); ctx.lineTo(0, 11); ctx.lineTo(10, 0); ctx.fill();
      ctx.fillStyle = '#ff4a6a'; ctx.beginPath(); ctx.arc(-4, -2, 4.5, 0, TAU); ctx.arc(4, -2, 4.5, 0, TAU); ctx.moveTo(-8, 0); ctx.lineTo(0, 8.5); ctx.lineTo(8, 0); ctx.fill(); ctx.restore();
    } else if (p.k === 'chest') {
      ctx.save(); ctx.globalCompositeOperation = 'lighter'; drawGlow(ctx, p.x, p.y + bob, 40, '#ffd36b', 0.6 + 0.2 * Math.sin(G.clock * 8)); ctx.restore();
      ctx.fillStyle = OUT; ctx.fillRect(p.x - 14, p.y + bob - 11, 28, 22); ctx.fillStyle = '#b8742a'; ctx.fillRect(p.x - 11, p.y + bob - 8, 22, 16); ctx.fillStyle = '#ffd36b'; ctx.fillRect(p.x - 11, p.y + bob - 2, 22, 3); ctx.fillRect(p.x - 2, p.y + bob - 4, 4, 7);
    }
  }
}
function drawSpawns(ctx) {
  for (const s of G.spawns) {
    const p = clamp(s.t / s.dur, 0, 1); const col = s.elite ? '#ffd36b' : ENEMIES[s.type].col;
    ctx.save(); ctx.translate(s.x, s.y);
    ctx.fillStyle = hexA(col, 0.12 + 0.2 * p); ctx.beginPath(); ctx.arc(0, 0, 6 + 18 * p, 0, TAU); ctx.fill();
    ctx.strokeStyle = col; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + TAU * p); ctx.stroke();
    ctx.restore();
  }
}
function drawWisps(ctx) {
  ctx.globalCompositeOperation = 'lighter';
  for (const w of G.wisps) { drawGlow(ctx, w.x, w.y, 18, '#7fffd4', 0.8); ctx.globalAlpha = 1; circ(ctx, w.x, w.y, 3.5, '#e8fff8'); }
  ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
}
