// ================= UI (DOM) =================
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const ROMAN = ['', 'I', 'II', 'III'];
function engChip(e) { const E = ENGRAVINGS[e.id]; return `<span class="eng r${E.rar}" data-tip="eng:${e.id}${e.sig ? ':' + e.sig : ''}"><b>${E.g}</b>${esc(engLabel(e))}</span>`; }
function engList(list) { return (list || []).length ? `<div class="engs">${list.map(engChip).join('')}</div>` : ''; }
function wieldBlade(id, eng) { const R = G.run; R.blade = id; R.eng = eng || []; R.always = []; R.bonusSlots = 0; R.hungerSlots = 0; R.hungerKills = 0; R.bladeKills = 0; recomputeStats(); rebuildDeck(); }
function rollBoon(k) {
  const pr = SIG_LIST.filter(s => s.school === k && s.type === 'proj' && s.rar >= 2 && s.rar <= 3 && !s.hp);
  const md = SIG_LIST.filter(s => (s.type === 'mod' || s.type === 'multi') && s.rar <= 2 && !s.hp && (!s.school || s.school === k));
  const rl = RELIC_LIST.filter(r => r.school === k && r.rar <= 2 && !hasR(r.id));
  const eg = { flame: 'ember', frost: 'rimed', storm: 'charged', blood: 'thirsting', spirit: 'haunted', steel: 'heavy' }[k];
  return { k, sigils: [pick(pr.length ? pr : SIG_LIST.filter(s => s.type === 'proj' && s.rar === 2)).id, pick(md).id], relic: rl.length ? pick(rl).id : null, eng: eg };
}
function schoolPill(k, extra = '') { if (!k) return ''; const S = SCHOOLS[k]; return `<span class="sch" style="--s:${S.col}"><b>${S.g}</b>${S.name}${extra}</span>`; }
const inRun = () => !!G.run && ['menu', 'play', 'paused', 'dying', 'over'].includes(G.state);
const resN = k => (inRun() && G.res && G.res[k]) || 0;
function nextTier(k, n = resN(k)) { const t = resTier(n); if (t >= 3) return null; return { need: RES_T[t], left: RES_T[t] - n, tier: t + 1, text: SCHOOLS[k].tiers[t] }; }
// what a schooled item does for your build right now
function fitLine(k) {
  if (!k || !inRun()) return '';
  const n = resN(k), nt = nextTier(k, n + 1), t1 = resTier(n + 1) > resTier(n);
  if (t1) return `<div class="fit wake" style="--s:${SCHOOLS[k].col}">Awakens ${SCHOOLS[k].name} ${ROMAN[resTier(n + 1)]}: ${esc(SCHOOLS[k].tiers[resTier(n + 1) - 1])}</div>`;
  if (n > 0) return `<div class="fit" style="--s:${SCHOOLS[k].col}">${SCHOOLS[k].name} ${n} → ${n + 1}${nt ? ` · ${nt.left} more for ${ROMAN[nt.tier]}` : ''}</div>`;
  return '';
}
function sigDmgNow(s) { if (!s.base || !G.S) return null; return Math.round(s.base * schoolPw(s) * spellMul() * 10) / 10; }
function sigChip(id, o = {}) {
  if (!id) return `<div class="sig empty"></div>`;
  const s = SIG[id]; const sc = s.school ? SCHOOLS[s.school].col : 'transparent';
  return `<div class="sig t-${s.type} ${o.cls || ''}" data-tip="sig:${id}" style="--c:${s.col};--r:${RAR[s.rar].col};--s:${sc}"><i>${s.hp ? s.hp + '♥' : s.ki}</i><b>${s.g}</b><u></u><s></s>${o.isNew ? '<em>new</em>' : ''}</div>`;
}
function schoolTip(k) {
  const S = SCHOOLS[k], n = resN(k), t = resTier(n), pw = powOf(k);
  const R = G.run; const src = [];
  if (R) {
    const sig = [R.strike, R.guard, R.art].flat().filter(id => id && SIG[id].school === k).length; if (sig) src.push(`${sig} sigil${sig > 1 ? 's' : ''}`);
    const rel = R.relics.filter(id => RELICS[id].school === k).length; if (rel) src.push(`${rel} relic${rel > 1 ? 's' : ''}`);
    if (BLADES[R.blade].school === k) src.push('blade'); if ((VESSEL[R.vessel].res || {})[k]) src.push('vessel ' + VESSEL[R.vessel].res[k]); if ((R.attune || {})[k]) src.push('attunement ' + R.attune[k]);
  }
  return `<div class="tt-h" style="color:${S.col}"><b class="g">${S.g}</b>${S.name} <small style="color:#a49b88">Resonance ${n}</small></div>
    <div class="tt-sub">${esc(S.blurb)}</div>
    <div class="tt-d"><b style="color:${S.col}">${pw} ${S.name} power</b> adds flat damage to every ${S.name} sigil${k === 'steel' ? ' and to each sword hit (+1 per point)' : ''}${k === 'flame' ? ', and Burn ticks harder' : k === 'blood' ? ', and Hemorrhage hits harder' : k === 'storm' ? ', and Shock arcs hit harder' : k === 'frost' ? ', and Shatter hits harder' : ''}.</div>
    <div class="tiers">${S.tiers.map((tx, i) => `<div class="tier ${t > i ? 'on' : ''}" style="--s:${S.col}"><i>${RES_T[i]}</i><span>${esc(tx)}</span></div>`).join('')}</div>
    ${src.length ? `<div class="tt-f">From: ${src.join(' · ')}</div>` : `<div class="tt-f">Equip ${S.name} sigils, relics or blades to resonate.</div>`}`;
}
function resRow(k) {
  const S = SCHOOLS[k], n = resN(k), t = resTier(n), nt = nextTier(k, n);
  let pips = ''; for (let i = 1; i <= 6; i++) pips += `<i class="${i <= n ? 'f' : ''} ${i % 2 === 0 ? 'mk' : ''}"></i>`;
  return `<div class="resr ${n ? '' : 'off'} ${t ? 'act' : ''}" data-tip="school:${k}" style="--s:${S.col}"><b>${S.g}</b><span class="rn">${S.name}${t ? ` <em>${ROMAN[t]}</em>` : ''}</span><span class="rp">${pips}${n > 6 ? `<small>+${n - 6}</small>` : ''}</span><span class="rw">${powOf(k)}<small>pow</small></span></div>`;
}
function resCell(k) {
  const S = SCHOOLS[k], n = resN(k), t = resTier(n), nt = nextTier(k, n);
  let pips = ''; for (let i = 1; i <= 6; i++) pips += `<i class="${i <= n ? 'f' : ''} ${i % 2 === 0 ? 'mk' : ''}"></i>`;
  return `<div class="rcell ${n ? '' : 'off'} ${t ? 'act' : ''}" data-tip="school:${k}" style="--s:${S.col}"><div class="rc1"><b>${S.g}</b><span>${S.name}</span>${t ? `<em>${ROMAN[t]}</em>` : ''}</div><div class="rp">${pips}${n > 6 ? `<small>+${n - 6}</small>` : ''}</div><div class="rc2"><span>${nt ? (n ? `${nt.left} → ${ROMAN[nt.tier]}` : 'asleep') : 'mastered'}</span><u>${powOf(k)}</u></div></div>`;
}
// level-up: offers follow your build
function levelOffers(lvl) {
  const res = G.res || {}; const top = SCHOOL_IDS.slice().sort((a, b) => (res[b] || 0) - (res[a] || 0));
  const cands = [];
  for (const k of SCHOOL_IDS) cands.push({ w: 1.2 + Math.min(8, res[k] || 0) * 2.5, kind: 'pow', k, s: { k: 'pow.' + k, name: SCHOOLS[k].name + ' Power', g: SCHOOLS[k].g, vals: [2, 3, 4, 6], f: v => `+${v} ${SCHOOLS[k].name} power`, aff: k } });
  for (const st of STAT_UPS) cands.push({ w: 1 + (st.aff ? Math.min(6, res[st.aff] || 0) * 0.5 : 0), kind: 'stat', s: st });
  const attK = top.filter(k => (res[k] || 0) >= 1 && resTier(res[k]) < 3).sort((a, b) => nextTier(a).left - nextTier(b).left)[0];
  if (attK && Math.random() < 0.45) cands.push({ w: 99, kind: 'attune', k: attK, s: { k: 'attune', name: 'Attunement', g: '共', aff: attK } });
  const out = [];
  while (out.length < 4 && cands.length) {
    let tw = 0; for (const c of cands) tw += c.w; let r = Math.random() * tw; let i = 0;
    for (; i < cands.length - 1; i++) { r -= cands[i].w; if (r <= 0) break; }
    out.push(cands.splice(i, 1)[0]);
  }
  // always offer at least one power card for your strongest school
  if ((res[top[0]] || 0) >= 2 && !out.some(o => o.kind === 'pow' && o.k === top[0])) { const j = out.findIndex(o => o.kind === 'stat'); if (j >= 0) out[j] = { kind: 'pow', k: top[0], s: { k: 'pow.' + top[0], name: SCHOOLS[top[0]].name + ' Power', g: SCHOOLS[top[0]].g, vals: [2, 3, 4, 6], f: v => `+${v} ${SCHOOLS[top[0]].name} power`, aff: top[0] } }; }
  return out.map(o => { const t = o.kind === 'attune' ? 3 : rollRarity(Math.max(1, Math.floor(lvl * 0.8)), G.S.luck); return Object.assign(o, { t, v: o.s.vals ? o.s.vals[t - 1] : 1 }); });
}
function powUsers(k) {
  const R = G.run; const names = [...new Set([R.strike, R.guard, R.art].flat().filter(id => id && SIG[id].school === k && SIG[id].base).map(id => SIG[id].name))];
  if (k === 'steel') names.unshift('your sword');
  return names;
}
function offerCardHTML(o, i) {
  const col = o.s.aff ? SCHOOLS[o.s.aff].col : '#efe6d2';
  let body;
  if (o.kind === 'attune') {
    const n = resN(o.k); const nt = nextTier(o.k, n);
    body = `<div class="uv">+1 ${SCHOOLS[o.k].name} Resonance</div><div class="ud">${n} → ${n + 1}${nt && nt.left === 1 ? `<br><b style="color:${col}">Awakens ${ROMAN[nt.tier]}:</b> ${esc(nt.text)}` : nt ? ` · ${nt.left - 1} more for ${ROMAN[nt.tier]}` : ''}</div>`;
  } else if (o.kind === 'pow') {
    const u = powUsers(o.k); const ex = Object.values(SIG).find(x => x.school === o.k && x.base && G.run.strike.concat(G.run.guard, G.run.art).includes(x.id));
    body = `<div class="uv">${o.s.f(o.v)}</div><div class="ud">${u.length ? 'Feeds ' + esc(u.slice(0, 3).join(', ')) + (u.length > 3 ? ` +${u.length - 3}` : '') : `No ${SCHOOLS[o.k].name} sigils equipped yet`}${ex ? `<br>${esc(ex.name)}: ${sigDmgNow(ex)} → <b style="color:${col}">${Math.round(ex.base * (1 + (powOf(o.k) + o.v) * ex.coef / ex.base) * spellMul() * 10) / 10}</b>` : o.k === 'steel' ? `<br>Sword: ${Math.round(bladeBase())} → <b style="color:${col}">${Math.round(bladeBase() + o.v * G.S.bladeMul * (1 + G.S.dmg / 100))}</b>` : ''}</div>`;
  } else {
    body = `<div class="uv">${o.s.f(o.v)}</div>${o.s.aff ? `<div class="ud" style="color:${col}">+1 ${SCHOOLS[o.s.aff].name} power</div>` : ''}`;
  }
  return `<button class="ucard ${o.kind}" data-i="${i}" style="--r:${o.kind === 'attune' ? col : RAR[o.t].col};--s:${col}"><div class="ug" style="${o.s.aff ? `color:${col}` : ''}">${o.s.g}</div><div class="un">${o.s.name}</div>${body}<div class="ur">${o.kind === 'attune' ? 'Resonance' : RAR[o.t].name}</div></button>`;
}
// pick weighting toward the schools you already resonate with
function schoolWeight(x) { return x.school && resN(x.school) > 0 ? 1 + Math.min(6, resN(x.school)) * 0.4 : 1; }
function wpick(arr) { let tw = 0; for (const x of arr) tw += schoolWeight(x); let r = Math.random() * tw; for (const x of arr) { r -= schoolWeight(x); if (r <= 0) return x; } return arr[arr.length - 1]; }
function relicChip(id, cnt) { const r = RELICS[id]; return `<div class="relic" data-tip="rel:${id}" style="--r:${RAR[r.rar].col}"><b>${r.g}</b>${cnt > 1 ? `<i>${cnt}</i>` : ''}</div>`; }
function describeNode(node, depth = 0) {
  if (!node) return '—';
  const parts = []; const groups = new Map();
  for (const p of node.projs) {
    let key = p.card.name; if (p.payload) key += ' → [' + describeNode(p.payload, depth + 1) + ']';
    groups.set(key, (groups.get(key) || 0) + 1);
  }
  for (const [k, n] of groups) parts.push(n > 1 ? `${n}× ${k}` : k);
  for (const d of node.dups) parts.push(`(${describeNode(d.node, depth + 1)}) ×${d.times}`);
  for (const u of node.utils) parts.push(u.name);
  const mods = node.mods.filter(m => m.id !== 'm_link').map(m => m.name);
  let s = parts.join(' + ') || (mods.length ? '(no projectile)' : '—');
  if (node.link) s += ` · on hit → [${describeNode(node.link, depth + 1)}]`;
  if (mods.length) s += ` ‹${mods.join(', ')}›`;
  return s;
}
function comboPreview() {
  const R = G.run, B = curBlade(); const cards = R.strike.filter(Boolean).map(id => SIG[id]);
  if (!cards.length) return [{ n: 1, desc: 'Plain sword swings. Slot sigils into the Strike chain.', cost: 0, fin: false }];
  const out = []; let pos = 0, i = 0;
  while (pos < cards.length && i < 14) {
    const d = makeDeck(cards, pos, 1e9, false); const node = buildNode(d, B.draw + G.S.draw);
    out.push({ n: i + 1, desc: describeNode(node), cost: d.spent, hp: d.hpSpent, fin: d.pos >= cards.length }); pos = d.pos; i++;
  }
  return out;
}
function fullCastPreview(arr) {
  const cards = arr.filter(Boolean).map(id => SIG[id]); if (!cards.length) return { desc: 'Empty', cost: 0 };
  const d = makeDeck(cards, 0, 1e9, false); const node = buildNode(d, 999); return { desc: describeNode(node), cost: d.spent };
}
function tipHTML(kind, id) {
  if (kind === 'sig') {
    const s = SIG[id]; let extra = '';
    if (s.trigger) extra += '<span class="ttag">Trigger</span>'; if (s.timer) extra += '<span class="ttag">Timer</span>'; if (s.free) extra += '<span class="ttag">Free draw</span>';
    const sell = Math.floor(priceOf('sigil', s.rar) * 0.4);
    return `<div class="tt-h" style="color:${RAR[s.rar].col}"><b class="g" style="color:${s.col}">${s.g}</b>${esc(s.name)}</div>
      <div class="tt-sub">${s.school ? schoolPill(s.school) + ' · ' : '<span class="sch neutral">Ink · no school</span> · '}<span style="color:${TYPE_COL[s.type]}">${TYPE_NAME[s.type]}</span> · ${RAR[s.rar].name} · ${s.hp ? `<span style="color:#ff5a6a">${s.hp} HP</span>` : `<span style="color:#59b8ff">${s.ki} Ki</span>`} ${extra}</div>
      <div class="tt-d">${esc(s.desc)}</div>
      ${s.base && inRun() ? `<div class="tt-scale" style="--s:${SCHOOLS[s.school].col}">Damage <b>${s.base}</b> + ${s.coef} × ${SCHOOLS[s.school].name} power (${powOf(s.school)}) → <b>${sigDmgNow(s)}</b> now</div>` : ''}
      ${s.school && inRun() ? `<div class="tt-scale" style="--s:${SCHOOLS[s.school].col}">Equipped, it adds +1 ${SCHOOLS[s.school].name} Resonance (${resN(s.school)})</div>` : ''}
      ${G.state === 'menu' ? `<div class="tt-f">Sells for ${sell} ash · drag to rearrange</div>` : ''}`;
  }
  if (kind === 'rel') { const r = RELICS[id]; return `<div class="tt-h" style="color:${RAR[r.rar].col}"><b class="g">${r.g}</b>${esc(r.name)}</div><div class="tt-sub">${r.school ? schoolPill(r.school) + ' · ' : ''}Relic · ${RAR[r.rar].name}${r.unique ? '' : ' · stacks'}</div><div class="tt-d">${esc(r.desc)}</div>${r.school ? `<div class="tt-scale" style="--s:${SCHOOLS[r.school].col}">+1 ${SCHOOLS[r.school].name} Resonance</div>` : ''}`; }
  if (kind === 'school') return schoolTip(id);
  if (kind === 'eng') { const [eid, sid] = id.split(':'); const E = ENGRAVINGS[eid]; return `<div class="tt-h" style="color:${RAR[E.rar].col}"><b class="g">${E.g}</b>${esc(E.name)} <small style="color:#a49b88">engraving</small></div><div class="tt-d">${esc(E.desc)}${sid && SIG[sid] ? ` Bound: <b>${esc(SIG[sid].name)}</b>, ${esc(SIG[sid].desc)}` : ''}</div>`; }
  if (kind === 'blade') {
    const b = BLADES[id];
    return `<div class="tt-h" style="color:${RAR[b.rar].col}"><b class="g">刀</b>${esc(b.name)}</div><div class="tt-sub">${b.school ? schoolPill(b.school) + ' · ' : ''}Blade · ${RAR[b.rar].name}</div>
      <div class="tt-d">${esc(b.desc)}</div><div class="tt-stats">${bladeStats(b)}</div>`;
  }
  if (kind === 'txt') return `<div class="tt-d">${esc(id)}</div>`;
  return '';
}
function bladeStats(b) {
  const sp = (1 / b.swing).toFixed(2);
  let s = `<span>Slots <b>${b.slots}</b></span><span>Draw <b>${b.draw}</b></span><span>Damage <b>${b.dmg}</b></span><span>Reach <b>${b.reach}</b></span><span>Speed <b>×${sp}</b></span>`;
  if (b.post) s += `<span>Posture <b>×${b.post}</b></span>`;
  if (b.ki) s += `<span>Ki <b>${b.ki > 0 ? '+' : ''}${b.ki}</b></span>`;
  if (b.kiRegen) s += `<span>Ki/s <b>+${b.kiRegen}</b></span>`;
  if (b.shuffle) s += `<span><b style="color:#b48cff">Shuffle</b></span>`;
  if (b.always) s += `<span>Always casts <b>${b.always.map(i => SIG[i].name).join(', ')}</b></span>`;
  return s;
}

const UI = {
  root: null, tip: null, sel: null, drag: null, newSigils: new Set(), toastT: null,
  init() {
    this.root = document.getElementById('ui'); this.tip = document.getElementById('tip');
    document.addEventListener('mousemove', (e) => this.moveTip(e));
    document.addEventListener('mouseover', (e) => {
      const t = e.target.closest && e.target.closest('[data-tip]');
      if (t) { const [k, ...rest] = t.dataset.tip.split(':'); this.showTip(tipHTML(k, rest.join(':')), e); } else this.hideTip();
      if (e.target.closest && e.target.closest('button, .vcard, .ucard, .offer')) AudioSys.play('hover');
    });
    this.root.addEventListener('click', (e) => { if (e.target.closest('button')) { AudioSys.init(); AudioSys.play('ui'); } });
    window.addEventListener('pointermove', (e) => this.dragMove(e));
    window.addEventListener('pointerup', (e) => this.dragEnd(e));
  },
  showTip(html, e) { if (!html) return this.hideTip(); this.tip.innerHTML = html; this.tip.style.display = 'block'; this.moveTip(e); },
  hideTip() { if (this.tip) this.tip.style.display = 'none'; },
  moveTip(e) {
    if (!this.tip || this.tip.style.display !== 'block') return;
    const r = this.tip.getBoundingClientRect(); let x = e.clientX + 16, y = e.clientY + 18;
    if (x + r.width > innerWidth - 8) x = e.clientX - r.width - 12; if (y + r.height > innerHeight - 8) y = e.clientY - r.height - 12;
    this.tip.style.left = Math.max(6, x) + 'px'; this.tip.style.top = Math.max(6, y) + 'px';
  },
  screen(html, cls = '') { this.hideTip(); this.root.innerHTML = `<section class="screen ${cls}">${html}</section>`; canvas.style.cursor = 'default'; return this.root.firstElementChild; },
  hideAll() { this.root.innerHTML = ''; this.hideTip(); },
  toast(txt, col = '#efe6d2') {
    let t = document.getElementById('toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
    t.textContent = txt; t.style.color = col; t.classList.add('on'); clearTimeout(this.toastT); this.toastT = setTimeout(() => t.classList.remove('on'), 1800);
  },

  // ---------- TITLE ----------
  showTitle() {
    G.state = 'title'; G.player = null; Music.target = 0;
    const M = G.meta;
    const el = this.screen(`
      <div class="title-wrap">
        <div class="logo">
          <div class="logo-k">印刃</div>
          <h1>SIGILBLADE</h1>
          <p class="tag">Deflect the blow. Break the guard. Inscribe your blade.</p>
        </div>
        <div class="menu">
          <button class="btn primary big" data-a="play">Begin a Run</button>
          <button class="btn rushbtn" data-a="rush">Boss Rush <small>${Math.max(0, G.meta.rushCleared + 1)}/${GAUNTLETS.length}</small></button>
          <button class="btn" data-a="howto">How to Play</button>
          <button class="btn" data-a="settings">Settings</button>
        </div>
        <div class="meta-row">
          <div><b>${M.runs}</b><span>runs</span></div><div><b>${M.bestWave}</b><span>best wave</span></div><div><b>${M.wins}</b><span>victories</span></div>
          <div><b>${M.deflects}</b><span>deflects</span></div><div><b>${M.deathblows}</b><span>deathblows</span></div>
        </div>
        <div class="foot">Trackpad friendly: Space deflect · Shift dash · Click strike · ${SIG_LIST.length} sigils · ${RELIC_LIST.length} relics · ${BLADE_LIST.length} blades · ${VESSELS.length} vessels · ${Object.keys(BOSSES).length} bosses</div>
      </div>`, 'title');
    el.querySelector('[data-a=play]').onclick = () => this.showSelect();
    el.querySelector('[data-a=rush]').onclick = () => this.showRush();
    el.querySelector('[data-a=howto]').onclick = () => this.showHowTo(() => this.showTitle());
    el.querySelector('[data-a=settings]').onclick = () => this.showSettings(() => this.showTitle());
  },
  showSettings(back) {
    const el = this.screen(`<div class="panel narrow"><h2>Settings</h2>
      <label class="tog"><input type="checkbox" data-o="sfx" ${AudioSys.sfxOn ? 'checked' : ''}> Sound effects</label>
      <label class="tog"><input type="checkbox" data-o="music" ${AudioSys.musicOn ? 'checked' : ''}> Music <small>(M to toggle in game)</small></label>
      <label class="tog"><input type="checkbox" data-o="shake" ${G.opts.shake ? 'checked' : ''}> Screen shake</label>
      <label class="tog"><input type="checkbox" data-o="auto" ${G.opts.auto ? 'checked' : ''}> Auto-strike <small>(C in game)</small></label>
      <label class="tog"><input type="checkbox" data-o="fancy" ${G.opts.fancy ? 'checked' : ''}> Lighting, weather &amp; film grain <small>(turn off on slow devices)</small></label>
      <div class="row"><button class="btn" data-a="back">Back</button><button class="btn ghost" data-a="reset">Reset progress</button></div></div>`, 'dim');
    el.querySelectorAll('input[data-o]').forEach(inp => inp.onchange = () => {
      AudioSys.init(); const o = inp.dataset.o;
      if (o === 'sfx') AudioSys.setSfx(inp.checked); if (o === 'music') AudioSys.setMusic(inp.checked); if (o === 'shake') { G.opts.shake = inp.checked; Store.set('shake', inp.checked); } if (o === 'auto') { G.opts.auto = inp.checked; Store.set('auto', inp.checked); } if (o === 'fancy') { G.opts.fancy = inp.checked; Store.set('fancy', inp.checked); }
    });
    el.querySelector('[data-a=back]').onclick = back;
    const rb = el.querySelector('[data-a=reset]'); let armed = false;
    rb.onclick = () => { if (!armed) { armed = true; rb.textContent = 'Click again to confirm'; return; } G.meta = { runs: 0, bestWave: 0, wins: 0, deflects: 0, deathblows: 0, mikiri: 0, kills: 0, maxDanger: 0 }; saveMeta(); rb.textContent = 'Progress reset'; };
  },
  showHowTo(back) {
    const el = this.screen(`<div class="panel howto">
      <h2>How to Play</h2>
      <div class="howgrid">
        <div><h4><span>操</span>Controls</h4>
          <p><kbd>WASD</kbd> move · <kbd>Mouse</kbd> aim</p>
          <p><kbd>Click</kbd> / <kbd>J</kbd> strike · <kbd>C</kbd> toggle auto-strike (swings by itself when a foe is in reach)</p>
          <p><kbd>Space</kbd> / <kbd>K</kbd> guard &amp; deflect · <kbd>Shift</kbd> / <kbd>L</kbd> dash</p>
          <p><kbd>Q</kbd> focus thrust · <kbd>E</kbd> art · <kbd>R</kbd> healing gourd · <kbd>Esc</kbd> pause · <kbd>M</kbd> music</p>
          <p>No right-click needed, so it plays fine on a trackpad.</p></div>
        <div><h4><span>弾</span>Read the ground, then parry</h4>
          <p>Every enemy attack paints its exact hit zone on the floor. It fills up, and the hit lands the instant it's full. If you're outside the zone, you're safe.</p>
          <p><b>Yellow</b> zones can be parried: tap <kbd>Space</kbd> as the edge flashes <b>white</b>. A parry staggers normal foes, cracks their posture, fires your Guard chain, and makes your next strike a <b>Riposte</b> crit. Holding Space blocks instead.</p></div>
        <div><h4><span>斬</span>Break &amp; deathblow</h4>
          <p>Fill a foe's yellow posture bar and it <b>breaks</b> (grey, red dot). Strike it for a <b>deathblow</b>: instant kill and bonus ash. Attacking a broken foe nearby lunges to it, but only once every second.</p>
          <p>Bosses need one deathblow per life. They hit hard, shrug off 30% of spell damage, and their posture is deep: plan on a long string of clean deflects per life. Bosses also have <b>Resolve</b> (a pale ward flickers): raw burst past a point is softened, so no build skips the fight. <b>Ripostes, counter-hits, reflected shots and hits on a broken boss always land in full</b>, and a boss under heavy fire presses its attack harder. Freeze and stun hold a boss only briefly, then it shakes them off for a few seconds. Empty a boss's health and it makes a <b>Last Stand</b>: its posture stops recovering and takes triple damage. Deflects and ripostes finish it fastest.</p>
          <p>Hits and parries build a <b>combo</b> for bonus damage. Getting hit resets it.</p></div>
        <div><h4><span>弾</span>Deflect, don't run</h4>
          <p>A <b>perfect deflect</b> stings the attacker, shoves nearby foes back and interrupts light ones, refunds Ki and dash time, and for a moment turns aside blows from <i>everyone else</i> too. Your next swing within 1.4s is a <b>riposte</b>: double damage, a guaranteed crit and heavy posture.</p>
          <p><b>Clash:</b> swing <i>into</i> a yellow blow just as it lands and your blades meet. It counts as a deflect (a little less posture), so you can stay on the attack and trade cuts with a boss instead of backing off to guard.</p>
          <p><b>Dashing costs 14 Ki.</b> Without the Ki it is a <b>winded</b> dash with no invulnerability, and you cannot deflect for a split second after any dash. Bosses and elites <b>read your dodge</b>: they hold the blow and strike where you land.</p>
          <p><b>Rally:</b> part of every wound (the amber segment) can be won back by hitting back quickly. Ki regenerates slowly on its own; landing blows, deflecting and deathblows refill it. Stop fighting and you are <b>Hunted</b>: Ki stops, foes hit harder and swarm you.</p></div>
        <div class="wide"><h4><span>刀</span>Forging the perfect blade</h4>
          <p>Every blade you find is <b>engraved</b> with random traits: Keen, Heavy, Wild (shuffled, +1 slot and draw), Echoing, Forked, Hungry (grows slots as you kill), <b>Bound</b> (always casts a sigil for free), Overflowing, Two-faced and more. Even your starting blade rolls one, and the Path you pick at the start cuts another.</p>
          <p>At the Forge, <b>Temper</b> the blade you have: hone extra slots, <b>Imprint</b> a sigil (select it first) so it is cast with every swing for free, or re-engrave it. Tempering stays with that blade: swap blades and you start over, so choose when to commit.</p>
          <p>Bosses are drawn from a larger pool each run and carry random <b>aspects</b> (Frenzied, Relentless, Echoing, Vampiric, Retinue, Thunderclap...). The Forge shows what is coming before you face it.</p></div>
        <div class="wide"><h4><span>鬼</span>Boss Rush &amp; reading bosses</h4>
          <p><b>Boss Rush</b> (from the title screen) is four gauntlets of duels with no waves in between, from the wandering Ronin to the Sword Saint. Each starts you with a kit and ash to spend at the Forge; every win gives a level, a sigil and more ash. Clear a gauntlet to open the next, and replay any beaten boss alone as a practice duel. Past wave 15 of a normal run, these demon-court bosses start turning up too.</p>
          <p><b>Blinks</b> flare a ring on the boss before it vanishes; a streak shows where it went, usually behind or beside you. Turn and deflect. <b>Flash-steps</b> draw a dashed line through you: the boss crosses it instantly and the cut lands a beat later along the line. <b>Lightning steps</b> are a red bolt to dodge, then a yellow cut from whoever steps out of it. A <b>Mikiri stance</b> (gold ring, 見切) punishes any blade that touches it, so wait for the draw or strike ready to deflect. Every boss has a short story on the Forge and Boss Rush screens that hints at how it fights.</p></div>
        <div><h4><span>型</span>Style rank</h4>
          <p>Fighting well climbs a rank from <b>D</b> to <b>剣聖 Kensei</b>. Every verb scores: deflects, ripostes, dash strikes, counter-hits, Mikiri, Focus Thrusts, deathblows. <b>Repeating one move scores less</b>, so mix them up.</p>
          <p>Higher ranks give bonus damage and extra ash. Getting hit drops you a rank (two if it was a red attack), and blocking instead of deflecting bleeds the meter.</p></div>
        <div><h4><span>閃</span>Glints, counters &amp; Flawless</h4>
          <p>A <b>white glint</b> flashes on an attacker right before a deflectable blow lands. Press deflect on the glint. A <b>red</b> glint means dodge.</p>
          <p>Hit a foe <i>during</i> its wind-up for a <b>counter-hit</b>: bonus damage and posture, and finishers or dash strikes knock light foes out of the attack. Deflect <b>every hit</b> of an elite's or boss's string for a <b>Flawless</b>: big posture damage, a Focus pip, and a long opening. Chained deflects hit harder each time.</p></div>
        <div><h4><span>眼</span>Focus &amp; weak points</h4>
          <p>Parries, Mikiri and deathblows charge <b>Focus</b> (gold pips). When a foe shows a gold <b>weak point</b> (after you parry it, or after it whiffs a big attack), press <kbd>Q</kbd> to <b>Focus Thrust</b>: you lunge through it for massive damage and posture. Thrusting without a weak point still lunges, but hits far softer.</p>
          <p><b>Dash, then strike</b> for a wide dash strike. Striking near a broken foe lunges you into the deathblow.</p></div>
        <div><h4><span>危</span>Red means move</h4>
          <p><b>Red</b> zones marked <b>!</b> can't be parried. <b>Dash (Shift)</b> out of them, or through them at the last moment for a <b>Mikiri</b> counter.</p></div>
        <div><h4><span>印</span>Sigil chains</h4>
          <p>Your blade holds a <b>Strike chain</b>. Each swing <b>draws</b> the next sigil(s) and casts them. <b>Modifiers</b> boost every projectile in the same cast, <b>Multicasts</b> draw more, <b>Triggers</b> cast the next sigil where they hit. The last cast in a cycle is a heavy <b>finisher</b>.</p>
          <p>The <b>Guard chain</b> fires in full on every deflect (free). The <b>Art chain</b> fires in full on <kbd>E</kbd> (costs Ki, has a cooldown).</p></div>
        <div class="wide"><h4><span>共</span>Schools &amp; Resonance</h4>
          <p>Almost every sigil, relic and blade belongs to one of six <b>Schools</b>: ${SCHOOL_IDS.map(k => schoolPill(k)).join(' ')}. Neutral "ink" sigils (multicasts, Alpha/Omega) shape the others.</p>
          <p><b>Power:</b> each school has a power stat. Every point adds flat damage to that school's sigils (fast multi-hit sigils get less per hit), and Steel power also sharpens your sword. Level-ups offer power for the schools you use, and each basic stat card also grants +1 power in its school.</p>
          <p><b>Resonance:</b> count the sigils you have <i>equipped</i> in chains, plus your relics, blade, vessel and Attunements. At <b>2 / 4 / 6</b> of one school you unlock its passives (hover a school in the Forge). Two schools at II, or one at III: both work.</p></div>
        <div><h4><span>灰</span>The Run</h4>
          <p>Clear 15 waves. A wave ends when you cut down its <b>quota</b> of foes (the ring at the top); running out the clock does nothing. Past par time the survivors <b>frenzy</b>, and if you stop landing blows they grow bold and press harder. Dashes recharge faster while you hit, deflect and deathblow, and every deathblow heals a little.</p>
          <p>Ash dropped by foes is your XP and currency. Between waves the <b>Forge</b> sells sigils, relics and blades, and you <b>choose your path</b>: a risk for a reward. Two possible bosses guard each of waves 5, 10 and 15, then Endless begins. Elites carry modifiers like Warded, Volatile or Twinned.</p></div>
      </div>
      <div class="row"><button class="btn primary" data-a="back">Got it</button></div></div>`, 'dim');
    el.querySelector('[data-a=back]').onclick = back;
  },

  // ---------- VESSEL SELECT ----------
  showSelect(mode = null) {
    G.state = 'select'; let chosen = Store.get('lastVessel', 'ronin'); if (!VESSEL[chosen] || !isUnlocked(VESSEL[chosen])) chosen = 'ronin';
    let danger = Math.min(Store.get('lastDanger', 0), G.meta.maxDanger);
    const render = () => {
      const V = VESSEL[chosen]; const B = BLADES[V.blade];
      const el = this.screen(`<div class="select-wrap">
        <header class="shead"><button class="btn ghost" data-a="back">← Back</button><h2>${mode ? (mode.single ? 'Practice Duel · ' + BOSSES[mode.single].name : GAUNTLETS[mode.rush].name) : 'Choose a Vessel'}</h2><span></span></header>
        <div class="sgrid">
          <div class="vessels">${VESSELS.map(v => { const u = isUnlocked(v); return `<div class="vcard ${v.id === chosen ? 'on' : ''} ${u ? '' : 'locked'}" data-v="${v.id}" style="--vc:${v.col}"><b>${u ? v.g : '鎖'}</b><span>${u ? v.name : '???'}</span>${u ? '' : `<small>${esc(v.unlock.text)}</small>`}</div>`; }).join('')}</div>
          <div class="vdetail" style="--vc:${V.col}">
            <div class="vbig">${V.g}</div>
            <h3>${V.name}</h3><div class="vtitle">${V.title}</div>
            <ul class="perks">${V.perks.map(p => `<li>${esc(p)}</li>`).join('')}</ul>
            ${V.random ? '' : (() => { const r = computeResonance({ vessel: V.id, blade: V.blade, strike: V.strike, guard: V.guard, art: V.art, relics: V.relics || [], attune: {} }); const ks = SCHOOL_IDS.filter(k => r[k] > 0).sort((a, b) => r[b] - r[a]); return ks.length ? `<div class="kit"><div class="kit-l">Schools</div><div class="kit-r">${ks.map(k => schoolPill(k, ` ${r[k]}${resTier(r[k]) ? ' · ' + ROMAN[resTier(r[k])] : ''}`)).join('')}</div></div>` : ''; })()}
            ${V.random ? '<div class="kit"><div class="kit-l">Kit</div><div class="kit-r">Rolled at the start of the run.</div></div>' : `
            <div class="kit"><div class="kit-l">Blade</div><div class="kit-r"><span class="bladechip" data-tip="blade:${B.id}" style="--r:${RAR[B.rar].col}">刀 ${B.name}</span></div></div>
            <div class="kit"><div class="kit-l">Strike</div><div class="kit-r chips">${V.strike.map(id => sigChip(id)).join('')}</div></div>
            <div class="kit"><div class="kit-l">Guard</div><div class="kit-r chips">${V.guard.map(id => sigChip(id)).join('')}</div></div>
            <div class="kit"><div class="kit-l">Art</div><div class="kit-r chips">${V.art.map(id => sigChip(id)).join('')}</div></div>
            ${V.satchel.length ? `<div class="kit"><div class="kit-l">Satchel</div><div class="kit-r chips">${V.satchel.map(id => sigChip(id)).join('')}</div></div>` : ''}
            ${(V.relics || []).length ? `<div class="kit"><div class="kit-l">Relics</div><div class="kit-r chips">${V.relics.map(id => relicChip(id)).join('')}</div></div>` : ''}`}
            <div class="danger"><span>Danger</span>${[0, 1, 2, 3, 4, 5].map(d => `<button class="dbtn ${d === danger ? 'on' : ''}" data-d="${d}" ${d > G.meta.maxDanger ? 'disabled' : ''} data-tip="txt:${esc(DANGER_TXT[d])}">${d}</button>`).join('')}</div>
            ${mode ? `<div class="rushkit">Boss Rush kit: Lv ${GAUNTLETS[mode.rush].kit.level} · ${GAUNTLETS[mode.rush].kit.picks} level picks · ${GAUNTLETS[mode.rush].kit.sigils} sigil picks · a blade pick · ${GAUNTLETS[mode.rush].kit.ash} 灰 to spend at the Forge before the first duel</div>` : ''}
            <button class="btn primary big" data-a="start">${mode ? (mode.single ? 'Begin the Duel' : 'Enter the Gauntlet') : 'Enter the Courtyard'}</button>
          </div>
        </div></div>`, 'dim');
      el.querySelector('[data-a=back]').onclick = () => mode ? this.showRush() : this.showTitle();
      el.querySelectorAll('.vcard').forEach(c => c.onclick = () => { const v = VESSEL[c.dataset.v]; if (!isUnlocked(v)) { AudioSys.play('deny'); return; } chosen = v.id; AudioSys.play('ui'); render(); });
      el.querySelectorAll('.dbtn').forEach(b => b.onclick = () => { danger = +b.dataset.d; render(); });
      el.querySelector('[data-a=start]').onclick = () => { AudioSys.init(); Store.set('lastVessel', chosen); Store.set('lastDanger', danger); this.lastPick = { v: chosen, d: danger, mode }; newRun(chosen, danger, mode || {}); };
    };
    render();
  },

  showRush() {
    G.state = 'select'; const M = G.meta; const beatAll = M.rushBeat || {};
    const el = this.screen(`<div class="rush-wrap">
      <header class="shead"><button class="btn ghost" data-a="back">← Back</button><h2>Boss Rush</h2><span></span></header>
      <p class="rush-intro">Duel after duel, no waves in between. Each gauntlet hands you a kit to spend at the Forge, then rewards every victory with a level, a sigil and ash, so tune your blade for single, deadly foes. Clear a gauntlet to open the next. Any boss you have beaten can be fought again alone.</p>
      <div class="gauntlets">${GAUNTLETS.map((Gt, gi) => { const open = gi <= M.rushCleared + 1, done = gi <= M.rushCleared;
        return `<div class="gcard ${open ? '' : 'locked'} ${done ? 'done' : ''}" style="--gc:${Gt.col}">
          <div class="gtop"><div class="gk">${open ? Gt.g : '鎖'}</div><div><div class="gn">${['I', 'II', 'III', 'IV'][gi]} · ${Gt.name}</div><div class="gd">${open ? esc(Gt.desc) : 'Clear ' + esc(GAUNTLETS[gi - 1].name) + ' to open this gauntlet.'}</div></div></div>
          <div class="glist">${Gt.bosses.map(id => { const B = BOSSES[id], beat = !!beatAll[id]; return `<div class="gboss ${beat ? 'beat' : ''} ${open && beat ? 'can' : ''}" ${open && beat ? `data-duel="${id}" data-g="${gi}" data-tip="txt:${esc('Practice duel. ' + (B.lore || ''))}"` : (open ? `data-tip="txt:${esc(B.lore || '')}"` : '')}><b>${open ? B.g : '?'}</b><span>${open ? B.name : '???'}</span><i>${'★'.repeat(B.diff || 1)}</i>${beat ? '<em>duel</em>' : ''}</div>`; }).join('')}</div>
          <button class="btn ${open ? 'primary' : ''}" data-g="${gi}" ${open ? '' : 'disabled'}>${done ? 'Run it again' : open ? 'Begin the gauntlet' : 'Locked'}</button></div>`; }).join('')}</div></div>`, 'dim');
    el.querySelector('[data-a=back]').onclick = () => this.showTitle();
    el.querySelectorAll('button[data-g]').forEach(b => b.onclick = () => { AudioSys.play('ui'); this.showSelect({ rush: +b.dataset.g }); });
    el.querySelectorAll('[data-duel]').forEach(d => d.onclick = () => { AudioSys.play('ui'); this.showSelect({ rush: +d.dataset.g, single: d.dataset.duel }); });
  },

  // ---------- AFTER WAVE FLOW ----------
  afterWave() {
    G.state = 'menu'; G.banner = null; G.hint = null; canvas.style.cursor = 'default'; Input.clear();
    if (G.pendingLevels > 0) return this.showLevelUp();
    if (G.pendingChests.length) return this.showChest(G.pendingChests.shift());
    if (G.pendingSigilPicks > 0) return this.showSigilPick();
    if (G.pendingBladePicks > 0) return this.showBladePick();
    if (G.run.rush && G.wave >= G.run.rush.list.length) return this.showOver(true);
    if (G.wave === 15 && !G.run.endless && !G.run.rush) return this.showOver(true);
    this.showForge(true);
  },
  showLevelUp() {
    const lvl = G.level - G.pendingLevels + 1; let rerolls = 0;
    const roll = () => levelOffers(lvl);
    let offers = roll();
    const render = () => {
      const cost = 1 + Math.floor(G.wave / 2) + rerolls;
      const el = this.screen(`<div class="lv-wrap"><div class="eyebrow">Level ${lvl}${G.pendingLevels > 1 ? ` · ${G.pendingLevels - 1} more` : ''}</div><h2><span class="k">昇</span> Ascend</h2>
        <div class="ucards">${offers.map((o, i) => offerCardHTML(o, i)).join('')}</div>
        <div class="resmini">${SCHOOL_IDS.filter(k => resN(k) > 0).map(k => resRow(k)).join('')}</div>
        <div class="row"><button class="btn ghost" data-a="reroll" ${G.ash < cost ? 'disabled' : ''}>Reroll · ${cost} 灰</button><span class="ashnote">灰 ${G.ash}</span></div></div>`, 'dim');
      el.querySelectorAll('.ucard').forEach(b => b.onclick = () => {
        const o = offers[+b.dataset.i]; const R = G.run;
        if (o.kind === 'attune') R.attune[o.k] = (R.attune[o.k] || 0) + 1;
        else { R.ups[o.s.k] = (R.ups[o.s.k] || 0) + o.v; if (o.kind === 'stat' && o.s.aff) R.ups['pow.' + o.s.aff] = (R.ups['pow.' + o.s.aff] || 0) + 1; }
        recomputeStats(); this.resToasts(); G.pendingLevels--; AudioSys.play('level'); this.afterWave();
      });
      el.querySelector('[data-a=reroll]').onclick = () => { const c = 1 + Math.floor(G.wave / 2) + rerolls; if (G.ash < c) return; G.ash -= c; rerolls++; offers = roll(); render(); };
    };
    render();
  },
  showChest(minR) {
    const pool = RELIC_LIST.filter(r => !(r.unique && hasR(r.id)));
    const picks = []; let guard = 0;
    while (picks.length < 3 && guard++ < 100) { const t = rollRarity(G.wave + 4, G.S.luck, minR); const c = pool.filter(r => r.rar === t && !picks.includes(r)); if (c.length) picks.push(wpick(c)); }
    while (picks.length < 3) { const c = pool.filter(r => !picks.includes(r)); if (!c.length) break; picks.push(wpick(c)); }
    const skip = 6 + G.wave * 2;
    const el = this.screen(`<div class="lv-wrap"><div class="eyebrow">${minR >= 3 ? 'Spoils of the fallen' : 'Treasure found'}</div><h2><span class="k">宝</span> Choose a Relic</h2>
      <div class="ucards">${picks.map((r, i) => `<button class="ucard relicc" data-i="${i}" style="--r:${RAR[r.rar].col}"><div class="ug">${r.g}</div><div class="un">${r.name}</div>${r.school ? `<div class="usch">${schoolPill(r.school)}</div>` : ''}<div class="ud">${esc(r.desc)}</div>${fitLine(r.school)}<div class="ur">${RAR[r.rar].name}</div></button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-a="skip">Melt for ${skip} 灰</button></div></div>`, 'dim');
    el.querySelectorAll('.ucard').forEach(b => b.onclick = () => { const r = picks[+b.dataset.i]; G.run.relics.push(r.id); recomputeStats(); this.resToasts(); AudioSys.play('buy'); this.afterWave(); });
    el.querySelector('[data-a=skip]').onclick = () => { G.ash += skip; AudioSys.play('coin'); this.afterWave(); };
  },

  showSigilPick() {
    const picks = []; let guard = 0;
    while (picks.length < 3 && guard++ < 80) { const t = rollRarity(G.wave + 3, G.S.luck, 2); const c = SIG_LIST.filter(x => x.rar === t && !picks.includes(x)); if (c.length) picks.push(wpick(c)); }
    const el = this.screen(`<div class="lv-wrap"><div class="eyebrow">Sigil cache</div><h2><span class="k">印</span> Choose a Sigil</h2>
      <div class="ucards">${picks.map((x, i) => `<button class="ucard relicc" data-i="${i}" style="--r:${RAR[x.rar].col}"><div class="ug" style="color:${x.col}">${x.g}</div><div class="un">${x.name}</div><div class="ur" style="color:${TYPE_COL[x.type]}">${TYPE_NAME[x.type]} · ${x.hp ? x.hp + ' HP' : x.ki + ' Ki'}</div>${x.school ? `<div class="usch">${schoolPill(x.school)}</div>` : ''}<div class="ud">${esc(x.desc)}</div>${fitLine(x.school)}<div class="ur">${RAR[x.rar].name}</div></button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-a="skip">Skip</button></div></div>`, 'dim');
    const done = () => { G.pendingSigilPicks--; this.afterWave(); };
    el.querySelectorAll('.ucard').forEach(b => b.onclick = () => { const x = picks[+b.dataset.i]; const R = G.run; const e = R.strike.indexOf(null); if (e >= 0) R.strike[e] = x.id; else R.satchel.push(x.id); this.newSigils.add(x.id); recomputeStats(); this.resToasts(); AudioSys.play('buy'); done(); });
    el.querySelector('[data-a=skip]').onclick = done;
  },
  showBladePick() {
    const pool = BLADE_LIST.filter(b => b.id !== G.run.blade && b.rar >= 2); const picks = shuffleArr(pool.slice()).slice(0, 3).map(b => Object.assign({}, b, { eng: rollEngravings(b.rar) }));
    const el = this.screen(`<div class="lv-wrap"><div class="eyebrow">The challenger's armory</div><h2><span class="k">刀</span> Choose a Blade</h2>
      <div class="ucards">${picks.map((b, i) => `<button class="ucard relicc" data-i="${i}" style="--r:${RAR[b.rar].col}" data-tip="blade:${b.id}"><div class="ug">刀</div><div class="un">${b.name}</div>${b.school ? `<div class="usch">${schoolPill(b.school)}</div>` : ''}<div class="ud">${esc(b.desc)}<br><br>${b.slots} slots · draw ${b.draw} · reach ${b.reach}</div>${engList(b.eng)}${fitLine(b.school)}<div class="ur">${RAR[b.rar].name}</div></button>`).join('')}</div>
      <div class="row"><button class="btn ghost" data-a="skip">Keep my ${BLADES[G.run.blade].name}</button></div></div>`, 'dim');
    const done = () => { G.pendingBladePicks--; this.afterWave(); };
    el.querySelectorAll('.ucard').forEach(b => b.onclick = () => { const pk = picks[+b.dataset.i]; wieldBlade(pk.id, pk.eng); this.resToasts(); AudioSys.play('buy'); done(); });
    el.querySelector('[data-a=skip]').onclick = done;
  },
  // ---------- OPENING DRAFT: your build has a direction from the first swing ----------
  showBoon(cb) {
    const R = G.run; const ks = shuffleArr(SCHOOL_IDS.slice()).slice(0, 3); const boons = ks.map(rollBoon);
    const el = this.screen(`<div class="lv-wrap"><div class="eyebrow">Before the first wave · your blade: ${esc(BLADES[R.blade].name)}${(R.eng || []).length ? ' · ' + R.eng.map(engLabel).join(', ') : ''}</div><h2><span class="k">道</span> Choose your Path</h2>
      <p class="lv-sub">Each path seeds a build: two sigils, a relic, and an engraving cut into your blade.</p>
      <div class="ucards">${boons.map((b, i) => { const S0 = SCHOOLS[b.k], E = ENGRAVINGS[b.eng]; return `<button class="ucard boon" data-i="${i}" style="--r:${S0.col};--s:${S0.col}"><div class="ug" style="color:${S0.col}">${S0.g}</div><div class="un">Path of ${S0.name}</div><div class="usch">${schoolPill(b.k)}</div>
        <div class="boon-items">${b.sigils.map(id => `<div class="bi" data-tip="sig:${id}">${sigChip(id)}<span>${esc(SIG[id].name)}</span></div>`).join('')}${b.relic ? `<div class="bi" data-tip="rel:${b.relic}"><span class="bg">${RELICS[b.relic].g}</span><span>${esc(RELICS[b.relic].name)}</span></div>` : ''}<div class="bi" data-tip="eng:${b.eng}"><span class="bg">${E.g}</span><span>${E.name} engraving</span></div></div>
        <div class="ud">${esc(S0.blurb)}</div></button>`; }).join('')}</div></div>`, 'dim');
    el.querySelectorAll('.ucard').forEach(btn => btn.onclick = () => {
      const b = boons[+btn.dataset.i];
      for (const id of b.sigils) { const e = R.strike.indexOf(null); if (e >= 0) R.strike[e] = id; else R.satchel.push(id); this.newSigils.add(id); }
      if (b.relic) R.relics.push(b.relic); if (!(R.eng || []).some(e => e.id === b.eng)) R.eng = (R.eng || []).concat([{ id: b.eng }]);
      AudioSys.play('buy'); this.hideAll(); G.state = 'play'; cb();
    });
  },
  // ---------- FORGE / SHOP ----------
  genShop() {
    const R = G.run; const keep = (R.shop || []).filter(it => it && it.locked && !it.sold);
    for (const it of keep) it.price = priceOf(it.kind, it.rar);
    const items = [...keep]; let guard = 0;
    while (items.length < G.S.shopSlots + (R.rush ? 2 : 0) && guard++ < 60) { const it = this.rollItem(items); if (it) items.push(it); }
    R.shop = items; R.rerollN = 0;
    if (!R.omenOffer || !R.omenWave || R.omenWave !== G.wave) { R.omenOffer = shuffleArr(OMENS.slice()).slice(0, 2).map(o => o.id); R.omenWave = G.wave; }
  },
  rollItem(existing) {
    const R = G.run; const r = Math.random(); const kind = r < 0.46 ? 'sigil' : r < 0.86 ? 'relic' : 'blade';
    let rar = rollRarity(R.rush ? rushWave(G.wave + 1) : G.wave, G.S.luck);
    for (let tries = 0; tries < 4; tries++, rar = Math.max(1, rar - 1)) {
      let pool;
      if (kind === 'sigil') pool = SIG_LIST.filter(s => s.rar === rar && !existing.some(e => e.id === s.id));
      else if (kind === 'relic') pool = RELIC_LIST.filter(x => x.rar === rar && !(x.unique && hasR(x.id)) && !existing.some(e => e.id === x.id));
      else pool = BLADE_LIST.filter(b => b.rar === rar && b.id !== R.blade && !existing.some(e => e.id === b.id));
      if (pool.length) { const o = kind === 'blade' ? pick(pool) : wpick(pool); return { kind, id: o.id, rar: o.rar, price: priceOf(kind, o.rar), locked: false, sold: false, eng: kind === 'blade' ? rollEngravings(o.rar) : undefined }; }
    }
    return null;
  },
  rerollCost() { const R = G.run; if (hasR('dice') && !R.rerollN) return 0; return Math.ceil((2 + Math.floor(G.wave * 0.8) + R.rerollN * 2) * (G.S.rerollMul || 1)); },
  showForge(fresh) {
    G.state = 'menu';
    if (fresh) { this.genShop(); this.sel = null; }
    this.renderForge();
  },
  arr(chain) { return chain === 'satchel' ? G.run.satchel : G.run[chain]; },
  getCard(ref) { return this.arr(ref.chain)[ref.i] || null; },
  moveCard(a, b) {
    if (a.chain === b.chain && a.i === b.i) return;
    const A = this.arr(a.chain), Bv = this.arr(b.chain); const ca = A[a.i] || null, cb = Bv[b.i] || null;
    if (b.chain === 'satchel' && b.i >= Bv.length) { Bv.push(ca); A[a.i] = null; }
    else { Bv[b.i] = ca; A[a.i] = cb; }
    G.run.satchel = G.run.satchel.filter(Boolean);
    AudioSys.play('ui'); recomputeStats(); this.resToasts();
  },
  resToasts() { for (const k in (G.newResT || {})) { const t = G.newResT[k]; this.toast(`${SCHOOLS[k].g} ${SCHOOLS[k].name} ${ROMAN[t]} awakened: ${SCHOOLS[k].tiers[t - 1]}`, SCHOOLS[k].col); AudioSys.play('level'); } G.newResT = {}; },
  sellRef(ref) {
    const id = this.getCard(ref); if (!id) return; const s = SIG[id]; const v = Math.floor(priceOf('sigil', s.rar) * 0.4);
    const A = this.arr(ref.chain); A[ref.i] = null; G.run.satchel = G.run.satchel.filter(Boolean); G.ash += v; AudioSys.play('coin'); this.toast(`Sold ${s.name} for ${v} 灰`, '#ffb35a'); this.sel = null; recomputeStats();
  },
  buy(i) {
    const R = G.run, it = R.shop[i]; if (!it || it.sold) return;
    if (G.ash < it.price) { AudioSys.play('deny'); this.toast('Not enough ash', '#ff6a5a'); return; }
    G.ash -= it.price; it.sold = true; AudioSys.play('buy');
    if (it.kind === 'sigil') {
      const empty = R.strike.indexOf(null);
      if (empty >= 0) { R.strike[empty] = it.id; this.toast(`${SIG[it.id].name} → Strike chain`, '#ffd36b'); } else { R.satchel.push(it.id); this.toast(`${SIG[it.id].name} → Satchel`, '#ffd36b'); }
      this.newSigils.add(it.id); recomputeStats();
    } else if (it.kind === 'relic') { R.relics.push(it.id); recomputeStats(); this.toast(`Relic: ${RELICS[it.id].name}`, RAR[it.rar].col); }
    else { wieldBlade(it.id, it.eng); this.toast(`Wielding ${BLADES[it.id].name}`, RAR[it.rar].col); }
    this.resToasts();
    this.renderForge();
  },
  temperCosts() { const R = G.run; const n = R.bonusSlots || 0, m = (R.always || []).length; return { hone: n >= 4 ? null : 40 + 35 * n + 15 * n * n, imprint: m >= 2 ? null : 60 + 60 * m, reroll: 25 + 25 * (R.reengraves || 0) }; },
  temperRow() {
    const C = this.temperCosts(); const sel = this.sel ? this.getCard(this.sel) : null; const sc = sel ? SIG[sel] : null; const canImp = sc && (sc.type === 'proj' || sc.type === 'mod') && C.imprint !== null;
    const b = (a, label, cost, ok, tip) => `<button class="tbtn ${ok && G.ash >= cost ? '' : 'off'}" data-temper="${a}" title="${tip}">${label}${cost !== null && cost !== undefined ? `<span>${cost} 灰</span>` : '<span>max</span>'}</button>`;
    return `<div class="temper"><div class="ch-l"><div class="ch-t">Temper</div><div class="ch-s">Invest in this blade · lost if you replace it</div></div><div class="tbtns">
      ${b('hone', '+1 slot', C.hone, C.hone !== null, 'Hone the blade: one more Strike slot')}
      ${b('imprint', canImp ? 'Imprint ' + esc(sc.name) : 'Imprint', C.imprint, canImp, 'Select a projectile or modifier sigil first. It becomes a free always-cast on this blade (the sigil is consumed).')}
      ${b('reroll', 'Re-engrave', C.reroll, true, 'Reroll this blade\'s engravings')}</div></div>`;
  },
  doTemper(a) {
    const R = G.run, C = this.temperCosts(); const cost = C[a]; if (cost === null || cost === undefined || G.ash < cost) { AudioSys.play('deny'); return; }
    if (a === 'hone') { R.bonusSlots = (R.bonusSlots || 0) + 1; this.toast('The blade takes another slot', '#ffd36b'); }
    else if (a === 'imprint') { const id = this.sel ? this.getCard(this.sel) : null; const sc = id && SIG[id]; if (!sc || !(sc.type === 'proj' || sc.type === 'mod')) { AudioSys.play('deny'); this.toast('Select a projectile or modifier sigil to imprint', '#ff9a6a'); return; } const A = this.arr(this.sel.chain); A[this.sel.i] = null; R.satchel = R.satchel.filter(Boolean); R.always = (R.always || []).concat([id]); this.sel = null; this.toast(`${sc.name} is now cast with every swing`, '#ffd36b'); }
    else if (a === 'reroll') { const n = Math.max(1, (R.eng || []).length); R.eng = rollEngravings(BLADES[R.blade].rar, n); R.reengraves = (R.reengraves || 0) + 1; this.toast('New engravings: ' + R.eng.map(engLabel).join(', '), '#b48cff'); }
    G.ash -= cost; AudioSys.play('buy'); recomputeStats(); rebuildDeck(); this.resToasts(); this.renderForge();
  },
  chainRow(chain, title, sub, cls = '') {
    const arr = this.arr(chain);
    return `<div class="chain ${cls}"><div class="ch-l"><div class="ch-t">${title}</div><div class="ch-s">${sub}</div></div>
      <div class="slots">${arr.map((id, i) => `<div class="slot ${this.sel && this.sel.chain === chain && this.sel.i === i ? 'sel' : ''}" data-chain="${chain}" data-i="${i}">${id ? sigChip(id, { isNew: this.newSigils.has(id) }) : '<div class="sig empty"></div>'}${chain === 'strike' && i === arr.length - 1 ? '' : ''}</div>`).join('')}</div></div>`;
  },
  renderForge() {
    const R = G.run, S = G.S, B = curBlade();
    const cp = comboPreview(); const gp = fullCastPreview(R.guard); const ap = fullCastPreview(R.art);
    const rc = this.rerollCost();
    const counts = {}; R.relics.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const selCard = this.sel ? this.getCard(this.sel) : null;
    const el = this.screen(`<div class="forge">
      <header class="fhead">
        <div><div class="eyebrow">${G.run.rush ? `${GAUNTLETS[G.run.rush.g].g} ${GAUNTLETS[G.run.rush.g].name} · ${G.wave ? `duel ${G.wave} of ${G.run.rush.list.length} won` : 'tune your blade for the duels ahead'}` : `${G.run.endless ? 'Endless · ' : ''}Wave ${G.wave} cleared${G.wave === 4 || G.wave === 9 || G.wave === 14 ? ' · <span style="color:#ff6a5a">a boss awaits next</span>' : ''}`}</div><h2>The Forge</h2></div>
        <div class="ashbox"><span class="k">灰</span><b>${G.ash}</b></div>
        <div class="fhead-r"><button class="btn ghost" data-a="howto">?</button>${isBossWave(G.wave + 1) ? `<button class="btn primary big" data-a="next" title="${esc(((G.run.bossAspects || [])[Math.round((G.wave + 1) / 5) - 1] || []).map(a => BOSS_ASPECTS[a].name + ': ' + BOSS_ASPECTS[a].desc).join(' | '))}">Face ${BOSSES[bossFor(G.wave + 1)].name}${((G.run.bossAspects || [])[Math.round((G.wave + 1) / 5) - 1] || []).length ? ' <small>(' + G.run.bossAspects[Math.round((G.wave + 1) / 5) - 1].map(a => BOSS_ASPECTS[a].name).join(', ') + ')</small>' : ''} →</button>` : ''}</div>
      </header>
      <div class="fgrid">
        <div class="fleft">
          <div class="bladecard" data-tip="blade:${B.id}" style="--r:${RAR[B.rar].col}"><div class="bc-g">刀</div><div class="bc-m"><div class="bc-n">${B.name} <small>${RAR[B.rar].name}</small></div><div class="bc-s">${bladeStats(B)}</div>${engList(R.eng)}${(R.always || []).length ? `<div class="engs">${R.always.map(id => `<span class="eng imp" data-tip="sig:${id}"><b>${SIG[id].g}</b>Imprinted: ${esc(SIG[id].name)}</span>`).join('')}</div>` : ''}</div></div>
          ${this.temperRow()}
          <div class="resstrip">${SCHOOL_IDS.map(k => resCell(k)).join('')}</div>
          ${this.chainRow('strike', 'Strike', `Each swing draws <b>${B.draw + S.draw}</b>${B.shuffle ? ' · <span style="color:#b48cff">shuffled</span>' : ''}`)}
          <div class="preview"><div class="pv-t">Combo</div><ol>${cp.map(l => `<li class="${l.fin ? 'fin' : ''}"><span class="pn">${l.fin ? '終' : l.n}</span><span class="pd">${esc(l.desc)}</span><span class="pc">${l.hp ? l.hp + '♥ ' : ''}${l.cost} ki</span></li>`).join('')}</ol></div>
          ${R.strike2 ? this.chainRow('strike2', 'Off-hand', 'Wakizashi · every other swing · draws <b>1</b>', 'off') : ''}
          ${this.chainRow('guard', 'Guard', 'Fires in full on every deflect · free', 'gold')}
          <div class="preview mini"><span class="pd">${esc(gp.desc)}</span></div>
          ${this.chainRow('art', 'Art', `<kbd>E</kbd> fires in full · ${ap.cost} ki`, 'jade')}
          <div class="preview mini"><span class="pd">${esc(ap.desc)}</span></div>
          <div class="satchel"><div class="ch-l"><div class="ch-t">Satchel</div><div class="ch-s">Drag sigils between slots · click two to swap</div></div>
            <div class="slots">${R.satchel.map((id, i) => `<div class="slot ${this.sel && this.sel.chain === 'satchel' && this.sel.i === i ? 'sel' : ''}" data-chain="satchel" data-i="${i}">${sigChip(id, { isNew: this.newSigils.has(id) })}</div>`).join('')}<div class="slot add" data-chain="satchel" data-i="${R.satchel.length}"><div class="sig empty"></div></div></div>
            <div class="sellzone ${selCard ? 'armed' : ''}" data-sell="1">${selCard ? `Sell ${SIG[selCard].name} · +${Math.floor(priceOf('sigil', SIG[selCard].rar) * 0.4)} 灰` : 'Drop here to sell'}</div>
          </div>
        </div>
        <div class="fright">
          ${isBossWave(G.wave + 1) ? `<div class="pathbox boss"><h3>Next · ${G.run.rush ? `Duel ${G.wave + 1} of ${G.run.rush.list.length}` : `Wave ${G.wave + 1}`}</h3><div class="bossnext"><b>${BOSSES[bossFor(G.wave + 1)].g}</b><div><div class="bn">${BOSSES[bossFor(G.wave + 1)].name} <span class="stars">${'★'.repeat(BOSSES[bossFor(G.wave + 1)].diff || 1)}</span></div><div class="bt">${BOSSES[bossFor(G.wave + 1)].title}</div>${G.run.rush && BOSSES[bossFor(G.wave + 1)].lore ? `<div class="blore">${esc(BOSSES[bossFor(G.wave + 1)].lore)}</div>` : ''}</div></div></div>` :
          `<div class="pathbox"><h3>Choose your path · Wave ${G.wave + 1}</h3><div class="paths">${(R.omenOffer || []).map(id => { const o = OMENS.find(x => x.id === id); return `<button class="path" data-omen="${o.id}"><div class="pg">${o.g}</div><div class="pm"><div class="pn">${o.name}</div><div class="pd">${esc(o.desc)}</div><div class="pr">${esc(o.reward)}</div></div></button>`; }).join('')}</div></div>`}
          <div class="shop"><div class="shop-h"><h3>Merchant</h3><button class="btn ghost small" data-a="reroll" ${G.ash < rc ? 'disabled' : ''}>Reroll · ${rc} 灰</button></div>
            <div class="offers">${R.shop.map((it, i) => this.offerHTML(it, i)).join('')}</div></div>
          <div class="box"><h3>Relics <small>${R.relics.length}</small></h3><div class="relic-list">${Object.keys(counts).map(id => relicChip(id, counts[id])).join('') || '<span class="none">None yet</span>'}</div></div>
          <div class="box"><h3>Stats <small>Lv ${G.level}</small></h3><div class="stats-grid">${STAT_SHOW.map(([k, n, f]) => `<div><span>${n}</span><b>${f(Math.round(S[k] * 10) / 10)}</b></div>`).join('')}</div></div>
        </div>
      </div></div>`, 'forge-screen');
    const nb = el.querySelector('[data-a=next]'); if (nb) nb.onclick = () => { this.newSigils.clear(); G.omen = null; G.wave++; startWave(); };
    el.querySelectorAll('[data-omen]').forEach(b => b.onclick = () => { const o = OMENS.find(x => x.id === b.dataset.omen); this.newSigils.clear(); G.omen = o.id; if (o.mods.ashNow) G.ash += o.mods.ashNow; G.wave++; startWave(); });
    el.querySelector('[data-a=howto]').onclick = () => this.showHowTo(() => this.renderForge());
    el.querySelectorAll('[data-temper]').forEach(b => b.onclick = () => this.doTemper(b.dataset.temper));
    el.querySelector('[data-a=reroll]').onclick = () => { const c = this.rerollCost(); if (G.ash < c) return; G.ash -= c; R.shop = R.shop.filter(it => it.locked && !it.sold); const keep = R.shop.slice(); const n = R.rerollN + 1; this.genShop(); R.rerollN = n; AudioSys.play('coin'); this.renderForge(); };
    el.querySelectorAll('[data-buy]').forEach(b => b.onclick = (e) => { e.stopPropagation(); this.buy(+b.dataset.buy); });
    el.querySelectorAll('[data-lock]').forEach(b => b.onclick = (e) => { e.stopPropagation(); const it = R.shop[+b.dataset.lock]; it.locked = !it.locked; AudioSys.play('ui'); this.renderForge(); });
    el.querySelectorAll('.slot').forEach(s => s.addEventListener('pointerdown', (e) => this.dragStart(e, s)));
    const sz = el.querySelector('.sellzone'); sz.onclick = () => { if (this.sel) { this.sellRef(this.sel); this.renderForge(); } };
  },
  offerHTML(it, i) {
    if (it.sold) return `<div class="offer sold"><span>Sold</span></div>`;
    const can = G.ash >= it.price;
    let g, name, sub, desc, tip, col; const sch = (it.kind === 'sigil' ? SIG[it.id] : it.kind === 'relic' ? RELICS[it.id] : BLADES[it.id]).school;
    if (it.kind === 'sigil') { const s = SIG[it.id]; g = s.g; name = s.name; sub = `<span style="color:${TYPE_COL[s.type]}">${TYPE_NAME[s.type]}</span> · ${s.hp ? s.hp + ' HP' : s.ki + ' Ki'}`; desc = s.desc; tip = 'sig:' + it.id; col = s.col; }
    else if (it.kind === 'relic') { const r = RELICS[it.id]; g = r.g; name = r.name; sub = 'Relic' + (hasR(r.id) ? ` · owned ×${hasR(r.id)}` : ''); desc = r.desc; tip = 'rel:' + it.id; col = RAR[r.rar].col; }
    else { const b = BLADES[it.id]; g = '刀'; name = b.name; sub = `Blade · ${b.slots} slots · draw ${b.draw}`; desc = b.desc + (b.always ? ` Always: ${b.always.map(x => SIG[x].name).join(', ')}.` : ''); tip = 'blade:' + it.id; col = RAR[b.rar].col; }
    return `<div class="offer k-${it.kind} ${it.locked ? 'locked' : ''}" style="--r:${RAR[it.rar].col};--c:${col}" data-tip="${tip}">
      <div class="of-g">${g}</div><div class="of-m"><div class="of-n">${esc(name)}${sch ? schoolPill(sch) : ''}</div><div class="of-s">${sub}</div><div class="of-d">${esc(desc)}</div>${it.kind === 'blade' ? engList(it.eng) + '<div class="fit" style="--s:#ff9a6a">Replaces your blade and its tempering</div>' : ''}${fitLine(sch)}</div>
      <div class="of-a"><button class="btn buy ${can ? '' : 'poor'}" data-buy="${i}">${it.price} 灰</button><button class="lockb ${it.locked ? 'on' : ''}" data-lock="${i}" title="Lock (keep for next shop)">${it.locked ? '鎖' : '○'}</button></div></div>`;
  },
  dragStart(e, slotEl) {
    if (e.button !== 0) return;
    const ref = { chain: slotEl.dataset.chain, i: +slotEl.dataset.i };
    this.drag = { ref, x: e.clientX, y: e.clientY, started: false, el: slotEl, has: !!this.getCard(ref) };
    e.preventDefault();
  },
  dragMove(e) {
    const d = this.drag; if (!d) return;
    if (!d.started && d.has && Math.hypot(e.clientX - d.x, e.clientY - d.y) > 6) {
      d.started = true; const chip = d.el.querySelector('.sig'); const gh = chip.cloneNode(true); gh.classList.add('ghost'); document.body.appendChild(gh); d.ghost = gh; d.el.classList.add('lifting'); this.hideTip();
    }
    if (d.started) {
      d.ghost.style.left = e.clientX + 'px'; d.ghost.style.top = e.clientY + 'px';
      document.querySelectorAll('.slot.over, .sellzone.over').forEach(x => x.classList.remove('over'));
      const t = document.elementFromPoint(e.clientX, e.clientY); const s = t && (t.closest('.slot') || t.closest('.sellzone')); if (s) s.classList.add('over');
    }
  },
  dragEnd(e) {
    const d = this.drag; if (!d) return; this.drag = null;
    if (d.started) {
      d.ghost.remove(); const t = document.elementFromPoint(e.clientX, e.clientY);
      const slot = t && t.closest('.slot'); const sell = t && t.closest('.sellzone');
      if (slot) this.moveCard(d.ref, { chain: slot.dataset.chain, i: +slot.dataset.i });
      else if (sell) this.sellRef(d.ref);
      this.sel = null; this.renderForge(); return;
    }
    // click
    if (this.sel) { if (!(this.sel.chain === d.ref.chain && this.sel.i === d.ref.i)) this.moveCard(this.sel, d.ref); this.sel = null; }
    else if (d.has) { this.sel = d.ref; AudioSys.play('ui'); }
    this.renderForge();
  },

  // ---------- PAUSE ----------
  pause() {
    if (G.state !== 'play') return; G.state = 'paused'; Input.clear();
    const R = G.run, B = BLADES[R.blade]; const counts = {}; R.relics.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const el = this.screen(`<div class="panel pause"><h2>Paused</h2>
      <div class="pbuild">
        <div class="kit"><div class="kit-l">Blade</div><div class="kit-r"><span class="bladechip" data-tip="blade:${B.id}" style="--r:${RAR[B.rar].col}">刀 ${B.name}</span></div></div>
        <div class="kit"><div class="kit-l">Strike</div><div class="kit-r chips">${R.strike.map(id => sigChip(id)).join('')}</div></div>
        <div class="kit"><div class="kit-l">Guard</div><div class="kit-r chips">${R.guard.map(id => sigChip(id)).join('')}</div></div>
        <div class="kit"><div class="kit-l">Art</div><div class="kit-r chips">${R.art.map(id => sigChip(id)).join('')}</div></div>
        <div class="kit"><div class="kit-l">Relics</div><div class="kit-r chips">${Object.keys(counts).map(id => relicChip(id, counts[id])).join('') || '<span class="none">None</span>'}</div></div>
      </div>
      <div class="row"><button class="btn primary" data-a="resume">Resume</button><button class="btn" data-a="howto">How to Play</button><button class="btn" data-a="settings">Settings</button><button class="btn ghost" data-a="quit">Abandon run</button></div></div>`, 'dim');
    el.querySelector('[data-a=resume]').onclick = () => this.resume();
    el.querySelector('[data-a=howto]').onclick = () => this.showHowTo(() => { G.state = 'play'; this.pause(); });
    el.querySelector('[data-a=settings]').onclick = () => this.showSettings(() => { G.state = 'play'; this.pause(); });
    const q = el.querySelector('[data-a=quit]'); let armed = false;
    q.onclick = () => { if (!armed) { armed = true; q.textContent = 'Click again to abandon'; return; } finishRun(false); this.showTitle(); };
  },
  resume() { if (G.state !== 'paused') return; this.hideAll(); G.state = 'play'; canvas.style.cursor = 'none'; Input.clear(); lastT = performance.now(); },

  // ---------- GAME OVER / VICTORY ----------
  showOver(win) {
    G.state = 'over'; canvas.style.cursor = 'default'; G.callouts = []; G.banner = null; G.hint = null;
    const R = G.run; const unlocked = finishRun(win || R.endless);
    const tm = Math.floor(R.time / 60) + ':' + String(Math.floor(R.time % 60)).padStart(2, '0');
    const counts = {}; R.relics.forEach(id => counts[id] = (counts[id] || 0) + 1);
    const el = this.screen(`<div class="over ${win ? 'win' : ''}">
      <div class="over-k">${win ? '勝' : '死'}</div>
      <h2>${R.rush ? (win ? (R.rush.single ? `${BOSSES[R.rush.list[0]].name} is beaten` : `${GAUNTLETS[R.rush.g].name} conquered`) : `Fell to ${BOSSES[bossFor(Math.max(1, G.wave))].name} · duel ${G.wave} of ${R.rush.list.length}`) : win ? 'The Hollow Shogun has fallen' : (R.endless ? `Fell in Endless · wave ${G.wave}` : `Fell on wave ${G.wave}`)}</h2>
      <div class="sub">${R.rush ? 'Boss Rush · ' : ''}${VESSEL[R.vessel].name} · Danger ${G.danger} · ${tm}</div>
      <div class="ostats">
        <div><b>${R.kills}</b><span>kills</span></div><div><b>${R.deflects}</b><span>deflects</span></div><div><b>${R.deathblows}</b><span>deathblows</span></div>
        <div><b>${R.mikiri}</b><span>mikiri</span></div><div><b style="color:${STYLE_RANKS[R.bestRank || 0].col}">${STYLE_RANKS[R.bestRank || 0].k}</b><span>best rank</span></div><div><b>${R.flawless || 0}</b><span>flawless</span></div><div><b>${Math.round(R.dmgDealt).toLocaleString()}</b><span>damage</span></div><div><b>${R.ashTotal}</b><span>ash</span></div>
      </div>
      <div class="obuild chips">${R.strike.filter(Boolean).map(id => sigChip(id)).join('')}<span class="sep"></span>${Object.keys(counts).map(id => relicChip(id, counts[id])).join('')}</div>
      ${unlocked.length ? `<div class="unlock">Unlocked: ${unlocked.map(v => `<b style="color:${v.col}">${v.g} ${v.name}</b>`).join(' · ')}</div>` : ''}
      ${win && !R.rush && G.meta.maxDanger > G.danger && G.danger < 5 ? `<div class="unlock">Danger ${G.danger + 1} unlocked</div>` : ''}
      ${R.rush && R.rushNew ? (GAUNTLETS[R.rush.g + 1] ? `<div class="unlock">Unlocked: <b style="color:${GAUNTLETS[R.rush.g + 1].col}">${GAUNTLETS[R.rush.g + 1].g} ${GAUNTLETS[R.rush.g + 1].name}</b></div>` : '<div class="unlock">Every gauntlet conquered. You are the Sword Saint now.</div>') : ''}
      <div class="row">
        ${win && !R.rush ? '<button class="btn primary big" data-a="endless">Continue into Endless</button>' : ''}${R.rush ? '<button class="btn primary big" data-a="rushmenu">Boss Rush</button>' : ''}
        <button class="btn ${win || R.rush ? '' : 'primary big'}" data-a="again">Run it back</button><button class="btn" data-a="select">Choose Vessel</button><button class="btn ghost" data-a="title">Title</button>
      </div></div>`, 'dim over-screen');
    if (win) AudioSys.play('win'); if (win && !R.rush) el.querySelector('[data-a=endless]').onclick = () => { R.endless = true; this.showForge(true); };
    if (R.rush) el.querySelector('[data-a=rushmenu]').onclick = () => this.showRush();
    el.querySelector('[data-a=again]').onclick = () => newRun(R.vessel, G.danger, R.rush ? { rush: R.rush.g, single: R.rush.single } : {});
    el.querySelector('[data-a=select]').onclick = () => this.showSelect();
    el.querySelector('[data-a=title]').onclick = () => this.showTitle();
  }
};
const DANGER_TXT = [
  'Danger 0 — the courtyard as intended.',
  'Danger 1 — foes +18% HP, +12% damage.',
  'Danger 2 — also: foes wind up 8% faster.',
  'Danger 3 — also: one more foe may attack you at once.',
  'Danger 4 — also: a second elite each wave.',
  'Danger 5 — everything above, at full strength.'
];
