// ================= DATA =================
const RAR = [null,
  { name: 'Common', col: '#cfc6b4' },
  { name: 'Rare', col: '#59b8ff' },
  { name: 'Epic', col: '#b48cff' },
  { name: 'Legendary', col: '#f2b544' }];
const TYPE_COL = { proj: '#ff5b45', mod: '#59b8ff', multi: '#f2b544', util: '#4fd1a5' };
const TYPE_NAME = { proj: 'Projectile', mod: 'Modifier', multi: 'Multicast', util: 'Utility' };

// ---------- SIGILS ----------
const SIG = {};
const defS = (o) => { o.col = o.col || TYPE_COL[o.type]; SIG[o.id] = o; };

// Projectiles
defS({ id: 'spark', name: 'Spark Bolt', type: 'proj', rar: 1, ki: 3, g: '閃', col: '#9feaff', desc: 'A swift bolt of ki. 7 damage.', fire: c => bolt(c, { style: 'spark', speed: 950, r: 5, life: 0.5, dmg: 7, col: '#9feaff' }) });
defS({ id: 'spark_t', name: 'Trigger Bolt', type: 'proj', rar: 2, ki: 6, g: '繋', col: '#c4f4ff', trigger: true, desc: 'A bolt (6 dmg) that casts the NEXT sigil from wherever it hits.', fire: c => bolt(c, { style: 'spark', speed: 880, r: 6, life: 0.6, dmg: 6, col: '#c4f4ff' }) });
defS({ id: 'wave', name: 'Crescent Wave', type: 'proj', rar: 1, ki: 7, g: '弧', col: '#fff1cf', desc: 'A blade of wind that pierces everything. 11 damage, heavy posture.', fire: c => bolt(c, { style: 'wave', speed: 640, r: 24, life: 0.42, dmg: 11, post: 12, pierce: 99, col: '#fff1cf' }) });
defS({ id: 'ember', name: 'Ember', type: 'proj', rar: 1, ki: 9, g: '炎', col: '#ff7a2f', desc: 'Fireball that bursts (radius 65): 8 + 10 damage, Burns.', fire: c => bolt(c, { style: 'fire', speed: 520, r: 9, life: 0.8, dmg: 8, col: '#ff7a2f', burn: 2, blast: { r: 65, dmg: 10 } }) });
defS({ id: 'frost', name: 'Frost Needles', type: 'proj', rar: 1, ki: 6, g: '氷', col: '#8fd8ff', desc: 'Three needles, 4 damage each, apply Chill. 5 Chill freezes a foe solid.', fire: c => bolt(c, { style: 'needle', speed: 820, r: 4, life: 0.5, dmg: 4, col: '#8fd8ff', chill: 1, count: 3, spread: 0.16 }) });
defS({ id: 'chain', name: 'Chain Lightning', type: 'proj', rar: 2, ki: 10, g: '雷', col: '#c9b6ff', desc: 'Instantly arcs between up to 4 foes. 8 damage each, Shocks.', fire: c => chainLightning(c, 4, 8) });
defS({ id: 'orb', name: 'Void Orb', type: 'proj', rar: 3, ki: 16, g: '虚', col: '#b06cff', desc: 'A slow orb that drags foes in and grinds them. 4 damage per tick.', fire: c => bolt(c, { style: 'void', speed: 170, r: 18, life: 2.4, dmg: 4, col: '#b06cff', pierce: 99, tick: 0.22, pull: 150, post: 3 }) });
defS({ id: 'thorns', name: 'Thorn Ring', type: 'proj', rar: 2, ki: 9, g: '棘', col: '#ff4d6d', desc: 'Ten thorns burst outward from the caster. 5 damage each, Bleed.', fire: c => bolt(c, { style: 'thorn', speed: 620, r: 5, life: 0.34, dmg: 5, col: '#ff4d6d', bleed: 1, count: 10, ring: true }) });
defS({ id: 'ghost', name: 'Phantom Blades', type: 'proj', rar: 2, ki: 9, g: '霊', col: '#d9c8ff', desc: 'Two spectral swords that hunt the nearest foe. 8 damage.', fire: c => bolt(c, { style: 'ghost', speed: 540, r: 7, life: 1.4, dmg: 8, col: '#d9c8ff', homing: 2.4, count: 2, spread: 0.8 }) });
defS({ id: 'disc', name: 'Ricochet Disc', type: 'proj', rar: 1, ki: 6, g: '輪', col: '#ffd36b', desc: 'A spinning disc that bounces 4 times off walls and foes. 6 damage.', fire: c => bolt(c, { style: 'disc', speed: 700, r: 7, life: 1.6, dmg: 6, col: '#ffd36b', bounce: 4 }) });
defS({ id: 'mine', name: 'Ink Mine', type: 'proj', rar: 1, ki: 7, g: '墨', col: '#ff5a4a', desc: 'Lays a mine that detonates on contact. 22 damage, radius 85.', fire: c => layMine(c) });
defS({ id: 'meteor', name: 'Falling Star', type: 'proj', rar: 3, ki: 18, g: '星', col: '#ffcf5a', desc: 'A star crashes onto the target after 0.55s. 32 damage, radius 95, Burns.', fire: c => fallingStar(c) });
defS({ id: 'echo', name: 'Phantom Slash', type: 'proj', rar: 2, ki: 6, g: '影', col: '#e9e3ff', desc: 'A ghost of your blade cuts at the target. 10 damage, heavy posture.', fire: c => phantomSlash(c) });
defS({ id: 'wisp', name: 'Spirit Wisp', type: 'proj', rar: 3, ki: 14, g: '魂', col: '#7fffd4', desc: 'Summons a wisp that orbits you for 8s, firing bolts (4 dmg). Max 6.', fire: c => summonWisp(c) });
defS({ id: 'lance', name: 'Sunlance', type: 'proj', rar: 2, ki: 12, g: '光', col: '#fff07a', desc: 'An instant beam that pierces everything in a line. 14 damage.', fire: c => sunlance(c) });
defS({ id: 'shuriken', name: 'Shuriken Fan', type: 'proj', rar: 1, ki: 6, g: '手', col: '#d5dde8', desc: 'Five stars in a fan. 3 damage each, Bleed.', fire: c => bolt(c, { style: 'star', speed: 780, r: 5, life: 0.45, dmg: 3, col: '#d5dde8', count: 5, spread: 0.2, bleed: 1 }) });
defS({ id: 'bomb_t', name: 'Paper Bomb', type: 'proj', rar: 2, ki: 7, g: '符', col: '#f0e0b0', timer: true, desc: 'A talisman that bursts after 0.5s (10 dmg) and casts the NEXT sigil from there.', fire: c => bolt(c, { style: 'paper', speed: 470, r: 8, life: 0.5, dmg: 4, col: '#f0e0b0', drag: 2.4, blast: { r: 70, dmg: 10 } }) });
defS({ id: 'bloodspear', name: 'Blood Spear', type: 'proj', rar: 2, ki: 0, hp: 3, g: '血', col: '#ff2a4f', desc: 'Costs 3 HP instead of Ki. A piercing spear: 26 damage, Bleeds.', fire: c => bolt(c, { style: 'spear', speed: 950, r: 7, life: 0.55, dmg: 26, col: '#ff2a4f', pierce: 3, bleed: 2 }) });
defS({ id: 'geyser', name: 'Ash Geyser', type: 'proj', rar: 2, ki: 9, g: '灰', col: '#d9c3a9', desc: 'Erupts beneath up to 2 foes near the target. 13 damage, stuns.', fire: c => ashGeyser(c) });
defS({ id: 'gale', name: 'Gale', type: 'proj', rar: 2, ki: 8, g: '風', col: '#bff5e6', desc: 'A slow gust that shoves foes away. 3 damage per tick, pierces.', fire: c => bolt(c, { style: 'gale', speed: 400, r: 26, life: 1, dmg: 3, col: '#bff5e6', pierce: 99, tick: 0.18, knock: 520 }) });
defS({ id: 'breath', name: 'Dragon Breath', type: 'proj', rar: 3, ki: 11, g: '龍', col: '#ff5a1f', desc: 'A cone of flame: 7 gouts, 4 damage each, Burns.', fire: c => bolt(c, { style: 'flame', speed: 520, r: 10, life: 0.36, dmg: 4, col: '#ff6a2a', burn: 1, count: 7, spread: 0.11, jitter: 0.06, spdVar: 0.25, pierce: 1 }) });
defS({ id: 'singularity', name: 'Singularity', type: 'proj', rar: 4, ki: 32, g: '冥', col: '#8a5cff', desc: 'A crawling black star that devours everything near it, then implodes for 60 damage.', fire: c => bolt(c, { style: 'sing', speed: 110, r: 16, life: 1.7, dmg: 3, col: '#8a5cff', pierce: 99, tick: 0.2, pull: 250, blast: { r: 140, dmg: 60, post: 60 } }) });
defS({ id: 'storm', name: "Raijin's Wrath", type: 'proj', rar: 4, ki: 26, g: '神', col: '#b9a6ff', desc: 'Calls 6 lightning strikes on foes near the target. 18 damage each, Shocks.', fire: c => raijin(c, 6) });
defS({ id: 'sakura', name: 'Petal Storm', type: 'proj', rar: 2, ki: 8, g: '桜', col: '#ffb7d5', desc: 'Six petals spiral out and drift toward foes. 5 damage each.', fire: c => bolt(c, { style: 'petal', speed: 380, r: 5, life: 1.3, dmg: 5, col: '#ffb7d5', count: 6, ring: true, homing: 1.3, curve: 2.6 }) });

// Modifiers (apply to every projectile in the same cast)
defS({ id: 'm_heavy', name: 'Heavy Edge', type: 'mod', rar: 1, ki: 2, g: '重', desc: '+60% damage, -15% speed.', mod: M => { M.dmg *= 1.6; M.speed *= 0.85; } });
defS({ id: 'm_swift', name: 'Swift', type: 'mod', rar: 1, ki: 1, g: '速', desc: '+50% speed, +20% range.', mod: M => { M.speed *= 1.5; M.life *= 1.2; } });
defS({ id: 'm_seek', name: 'Seeking', type: 'mod', rar: 1, ki: 3, g: '追', desc: 'Projectiles home in on foes.', mod: M => { M.homing += 1.8; } });
defS({ id: 'm_pierce', name: 'Piercing', type: 'mod', rar: 1, ki: 3, g: '貫', desc: '+3 pierce.', mod: M => { M.pierce += 3; } });
defS({ id: 'm_bounce', name: 'Rebound', type: 'mod', rar: 1, ki: 2, g: '反', desc: '+3 bounces off walls and foes.', mod: M => { M.bounce += 3; } });
defS({ id: 'm_scatter', name: 'Scatter', type: 'mod', rar: 2, ki: 4, g: '散', desc: 'Every projectile is cast 3 times in a spread, each at 60% damage.', mod: M => { M.scatter *= 3; M.dmg *= 0.6; } });
defS({ id: 'm_volatile', name: 'Volatile', type: 'mod', rar: 2, ki: 5, g: '爆', desc: 'Projectiles explode when they expire (radius 55, 60% damage).', mod: M => { M.explode += 1; } });
defS({ id: 'm_ignite', name: 'Igniting', type: 'mod', rar: 1, ki: 2, g: '焔', desc: 'Projectiles apply 2 Burn.', mod: M => { M.burn += 2; } });
defS({ id: 'm_freeze', name: 'Freezing', type: 'mod', rar: 1, ki: 2, g: '凍', desc: 'Projectiles apply 1 Chill.', mod: M => { M.chill += 1; } });
defS({ id: 'm_shock', name: 'Electrify', type: 'mod', rar: 1, ki: 2, g: '電', desc: 'Projectiles Shock: each hit arcs to a nearby foe.', mod: M => { M.shock += 1; } });
defS({ id: 'm_crush', name: 'Crushing', type: 'mod', rar: 2, ki: 3, g: '砕', desc: 'Double posture damage.', mod: M => { M.post *= 2; } });
defS({ id: 'm_vamp', name: 'Vampiric', type: 'mod', rar: 3, ki: 4, g: '吸', desc: 'Heal for 4% of the damage these projectiles deal.', mod: M => { M.vamp += 0.04; } });
defS({ id: 'm_giant', name: 'Colossal', type: 'mod', rar: 2, ki: 4, g: '巨', desc: '+80% size, +30% damage, -25% speed.', mod: M => { M.size *= 1.8; M.dmg *= 1.3; M.speed *= 0.75; } });
defS({ id: 'm_orbit', name: 'Orbiting', type: 'mod', rar: 2, ki: 3, g: '廻', desc: 'Projectiles circle around you for much longer instead of flying off.', mod: M => { M.orbit = true; } });
defS({ id: 'm_boomer', name: 'Boomerang', type: 'mod', rar: 1, ki: 2, g: '戻', desc: 'Projectiles fly back to you, piercing on the return.', mod: M => { M.boomer = true; } });
defS({ id: 'm_keen', name: 'Keen', type: 'mod', rar: 2, ki: 2, g: '鋭', desc: '+25% critical chance.', mod: M => { M.crit += 25; } });
defS({ id: 'm_link', name: 'Linked', type: 'mod', rar: 3, ki: 4, g: '結', desc: 'Every projectile in this cast becomes a trigger: on hit, it casts the NEXT sigil.', mod: M => { } });
defS({ id: 'm_serrate', name: 'Serrated', type: 'mod', rar: 1, ki: 2, g: '裂', desc: 'Projectiles apply 2 Bleed. 5 Bleed causes a Hemorrhage.', mod: M => { M.bleed += 2; } });
defS({ id: 'm_echo', name: 'Echoing', type: 'mod', rar: 3, ki: 6, g: '響', desc: 'The whole cast repeats once, 0.25s later.', mod: M => { M.echo = true; } });

// Multicast
defS({ id: 'x2', name: 'Double Cast', type: 'multi', rar: 1, ki: 0, g: '二', draw: 2, desc: 'Draws the next 2 sigils into this cast.' });
defS({ id: 'x3', name: 'Triple Cast', type: 'multi', rar: 2, ki: 2, g: '三', draw: 3, desc: 'Draws the next 3 sigils into this cast.' });
defS({ id: 'x4', name: 'Quad Cast', type: 'multi', rar: 3, ki: 4, g: '四', draw: 4, desc: 'Draws the next 4 sigils into this cast.' });
defS({ id: 'dup2', name: 'Mirror Image', type: 'multi', rar: 3, ki: 5, g: '双', dup: 2, dupMul: 0.7, desc: 'The NEXT sigil is cast twice, each at 70% damage, posture and status.' });
defS({ id: 'dup4', name: 'Myriad', type: 'multi', rar: 4, ki: 10, g: '千', dup: 4, dupMul: 0.55, desc: 'The NEXT sigil is cast four times, each at 55% damage, posture and status.' });

// Utility
defS({ id: 'u_well', name: 'Ki Well', type: 'util', rar: 1, ki: 0, g: '泉', free: true, desc: 'Restores 6 Ki when cast. Does not use a draw.', use: c => gainKi(6) });
defS({ id: 'u_mend', name: 'Mending', type: 'util', rar: 2, ki: 14, g: '癒', desc: 'Heals 4 HP.', use: c => healPlayer(4, true) });
defS({ id: 'u_ward', name: 'Ward', type: 'util', rar: 3, ki: 16, g: '守', desc: 'Gain a ward that negates the next hit you take (max 1).', use: c => giveWard() });
defS({ id: 'u_infuse', name: 'Steel Infusion', type: 'util', rar: 1, ki: 3, g: '鋼', free: true, desc: 'This swing: +80% blade damage, +35% reach, +50% posture. Does not use a draw.', use: c => { if (c.melee) { c.melee.dmg *= 1.8; c.melee.reach *= 1.35; c.melee.post *= 1.5; c.melee.infused = true; } } });
defS({ id: 'u_step', name: 'Wind Step', type: 'util', rar: 2, ki: 5, g: '歩', free: true, desc: 'Dash toward your aim, untouchable. Does not use a draw.', use: c => windStep(c) });
defS({ id: 'u_frenzy', name: 'Frenzy', type: 'util', rar: 3, ki: 0, hp: 4, g: '狂', free: true, desc: 'Costs 4 HP. This cast deals double damage. Does not use a draw.', use: c => { c.M.dmg *= 2; if (c.melee) c.melee.dmg *= 1.5; } });

// ---- expansion sigils ----
defS({ id: 'kunai', name: 'Kunai Volley', type: 'proj', rar: 1, ki: 5, g: '苦', col: '#e8eef8', desc: 'Three fast kunai in a tight spread. 5 damage, pierce 1.', fire: c => bolt(c, { style: 'needle', speed: 1050, r: 4, life: 0.42, dmg: 5, col: '#e8eef8', count: 3, spread: 0.08, pierce: 1 }) });
defS({ id: 'crimson', name: 'Crimson Moon', type: 'proj', rar: 3, ki: 16, g: '紅', col: '#ff3a4a', desc: 'A huge, slow crescent that cleaves everything. 22 damage, heavy posture.', fire: c => bolt(c, { style: 'wave', speed: 430, r: 44, life: 0.8, dmg: 22, post: 30, pierce: 99, col: '#ff3a4a' }) });
defS({ id: 'tornado', name: 'Whirlwind', type: 'proj', rar: 2, ki: 12, g: '旋', col: '#cfe8ff', desc: 'A wandering cyclone that drags foes in. 3 damage per tick.', fire: c => bolt(c, { style: 'gale', speed: 170, r: 34, life: 2.2, dmg: 3, col: '#cfe8ff', pierce: 99, tick: 0.15, pull: 130, knock: 0, curve: rand(-1.5, 1.5) }) });
defS({ id: 'icelance', name: 'Ice Lance', type: 'proj', rar: 2, ki: 9, g: '槍', col: '#bfeaff', desc: 'A piercing shard. 12 damage, 3 Chill.', fire: c => bolt(c, { style: 'needle', speed: 1100, r: 6, life: 0.55, dmg: 12, col: '#bfeaff', pierce: 2, chill: 3 }) });
defS({ id: 'hook', name: 'Chain Hook', type: 'proj', rar: 1, ki: 5, g: '鉤', col: '#d9c49a', desc: 'Hooks the first foe: light foes are yanked to you, heavy ones yank YOU to them. 6 damage.', fire: c => bolt(c, { style: 'hook', speed: 950, r: 7, life: 0.4, dmg: 6, col: '#d9c49a', hook: true }) });
defS({ id: 'arrows', name: 'Spirit Arrows', type: 'proj', rar: 2, ki: 10, g: '矢', col: '#9fe8ff', desc: 'Six arrows rain onto the target area. 7 damage each.', fire: c => arrowRain(c, 6) });
defS({ id: 'blackflame', name: 'Black Flame', type: 'proj', rar: 3, ki: 13, g: '黒', col: '#a24dff', desc: 'Piercing dark fire. 10 damage + burst, applies 4 Burn.', fire: c => bolt(c, { style: 'fire', speed: 400, r: 11, life: 1, dmg: 10, col: '#a24dff', burn: 4, pierce: 2, blast: { r: 60, dmg: 8 } }) });
defS({ id: 'blades3', name: 'Spinning Blades', type: 'proj', rar: 2, ki: 11, g: '刀', col: '#d9c8ff', desc: 'Three blades orbit you for 4s, cutting anything they touch.', fire: c => bolt(c, { style: 'ghost', speed: 520, r: 8, life: 1.6, dmg: 5, col: '#d9c8ff', count: 3, ring: true, pierce: 99, tick: 0.3, forceOrbit: true }) });
defS({ id: 'shockwave', name: 'Ground Shock', type: 'proj', rar: 1, ki: 6, g: '震', col: '#f2d48a', desc: 'An instant cone shockwave. 10 damage, huge knockback, posture.', fire: c => groundShock(c) });
defS({ id: 'tspear', name: 'Thunder Spear', type: 'proj', rar: 3, ki: 14, g: '鳴', col: '#c9b6ff', desc: 'A fast spear that bursts into Chain Lightning where it lands. 16 damage.', fire: c => bolt(c, { style: 'spear', speed: 1000, r: 7, life: 0.5, dmg: 16, col: '#c9b6ff', pierce: 1, shock: 1, onDie: 'chain' }) });
defS({ id: 'spiritball', name: 'Spirit Ball', type: 'proj', rar: 2, ki: 8, g: '玉', col: '#7fffd4', desc: 'A big ball that bounces 8 times. 7 damage.', fire: c => bolt(c, { style: 'void', speed: 520, r: 12, life: 3, dmg: 7, col: '#7fffd4', bounce: 8 }) });
defS({ id: 'shikigami', name: 'Paper Shikigami', type: 'proj', rar: 3, ki: 15, g: '式', col: '#f0e0b0', desc: 'Plants a talisman turret for 6s that fires bolts (5 dmg).', fire: c => plantShikigami(c) });
defS({ id: 'needles8', name: 'Needle Storm', type: 'proj', rar: 1, ki: 7, g: '針', col: '#e8eef8', desc: 'Eight needles in a wild spray. 3 damage each.', fire: c => bolt(c, { style: 'needle', speed: 850, r: 3, life: 0.45, dmg: 3, col: '#e8eef8', count: 8, spread: 0.09, jitter: 0.12, spdVar: 0.25 }) });
defS({ id: 'miasma', name: 'Miasma', type: 'proj', rar: 2, ki: 10, g: '瘴', col: '#9acd32', desc: 'A lingering toxic cloud. 2 damage per tick, applies Bleed.', fire: c => bolt(c, { style: 'cloud', speed: 140, r: 52, life: 3, dmg: 2, col: '#9acd32', pierce: 99, tick: 0.3, bleed: 1, drag: 1.5, knock: 0 }) });
defS({ id: 'wild', name: 'Wild Magic', type: 'proj', rar: 2, ki: 6, g: '乱', col: '#ff8ad8', desc: 'Casts a random projectile sigil.', fire: c => { const pool = SIG_LIST.filter(s => s.type === 'proj' && s.id !== 'wild' && s.rar <= 3); pick(pool).fire(c); } });
defS({ id: 'm_split', name: 'Splitting', type: 'mod', rar: 3, ki: 5, g: '分', desc: 'On their first hit, projectiles split into 3 smaller copies (40% damage).', mod: M => { M.split = true; } });
defS({ id: 'm_accel', name: 'Accelerating', type: 'mod', rar: 2, ki: 2, g: '加', desc: 'Projectiles speed up and hit harder the longer they fly (up to +150%).', mod: M => { M.accel = true; } });
defS({ id: 'm_spectral', name: 'Spectral', type: 'mod', rar: 2, ki: 3, g: '幽', desc: '+2 pierce. Ignores guards, shields and Warded foes.', mod: M => { M.pierce += 2; M.spectral = true; } });
defS({ id: 'm_timer', name: 'Delayed Release', type: 'mod', rar: 3, ki: 4, g: '遅', desc: 'Projectiles in this cast cast the NEXT sigil when they expire.', mod: M => { } });
defS({ id: 'm_ring', name: 'Ringcast', type: 'mod', rar: 2, ki: 4, g: '環', desc: 'Every projectile is cast 6 times in a full ring, each at 40% damage.', mod: M => { M.ringcast = true; M.dmg *= 0.4; } });
defS({ id: 'm_exec', name: 'Executioner', type: 'mod', rar: 3, ki: 3, g: '処', desc: '+10% crit. Crits from these projectiles deal triple damage.', mod: M => { M.crit += 10; M.critMul = 3; } });
defS({ id: 'm_chain', name: 'Arcing', type: 'mod', rar: 1, ki: 3, g: '弧', desc: 'Every hit arcs lightning to a nearby foe for 50% damage.', mod: M => { M.arc += 1; } });
defS({ id: 'm_trail', name: 'Burning Trail', type: 'mod', rar: 2, ki: 3, g: '跡', desc: 'Projectiles leave a trail of fire that burns foes.', mod: M => { M.trail = true; } });
defS({ id: 'alpha', name: 'Alpha', type: 'multi', rar: 3, ki: 4, g: '始', alpha: true, desc: 'Also casts a copy of the FIRST sigil in this chain.' });
defS({ id: 'omega', name: 'Omega', type: 'multi', rar: 4, ki: 14, g: '終', omega: true, desc: 'Also casts a copy of EVERY projectile sigil in this chain.' });
defS({ id: 'u_haste', name: 'Haste', type: 'util', rar: 2, ki: 6, g: '急', free: true, desc: '+40% attack speed for 3s. Does not use a draw.', use: c => { G.player.hasteT = 3; } });
defS({ id: 'u_focus', name: 'Focus Seal', type: 'util', rar: 3, ki: 12, g: '眼', desc: 'Gain 1 Focus pip.', use: c => gainFocus(1) });
defS({ id: 'u_blink', name: 'Shadow Blink', type: 'util', rar: 2, ki: 7, free: true, g: '瞬', desc: 'Teleport toward your aim and leave a ghost slash behind (10 dmg). Does not use a draw.', use: c => shadowBlink(c) });

// ---- Frost & Blood additions ----
defS({ id: 'hail', name: 'Hailstorm', type: 'proj', rar: 2, ki: 9, g: '雹', col: '#bfeaff', desc: 'Eight hailstones pelt the target area. 5 damage each, Chill.', fire: c => arrowRain(c, 8, { col: '#bfeaff', dmg: 5, chill: 1, r: 30 }) });
defS({ id: 'glacier', name: 'Glacier Spikes', type: 'proj', rar: 3, ki: 13, g: '凍', col: '#9fe6ff', desc: 'A line of ice spikes erupts forward. 12 damage each, 2 Chill.', fire: c => glacierSpikes(c) });
defS({ id: 'leech', name: 'Leech Bolt', type: 'proj', rar: 1, ki: 4, g: '蛭', col: '#ff4a6a', desc: 'A blood bolt that heals you for 15% of its damage. 6 damage, Bleed.', fire: c => bolt(c, { style: 'spear', speed: 900, r: 5, life: 0.5, dmg: 6, col: '#ff4a6a', bleed: 1, vamp: 0.15 }) });
defS({ id: 'bloodburst', name: 'Blood Nova', type: 'proj', rar: 2, ki: 0, hp: 4, g: '爆', col: '#ff2a4f', desc: 'Costs 4 HP. A nova of blood around you: 18 damage, 2 Bleed.', fire: c => { const M = c.M; const P = G.player; explosion(P.x, P.y, 125 * Math.sqrt(M.size), sigDmg(18, M), { col: '#ff2a4f', bleed: 2 + M.bleed, burn: M.burn, chill: M.chill, shock: M.shock, post: 20 * M.post, knock: 300 }); ring(P.x, P.y, 20, 130, '#ff2a4f', 0.35, 6); } });

// ---- deflect, aggression and mobility sigils ----
defS({ id: 'iaido', name: 'Iaido', type: 'proj', rar: 2, ki: 8, g: '抜', col: '#f4efe4', school: 'steel', base: 16, coef: 1, desc: 'An instant draw-cut along a line ahead: 16 damage to everything it crosses, unblockable, Bleed.', fire: c => iaidoCut(c) });
defS({ id: 'ripseal', name: 'Riposte Seal', type: 'util', rar: 2, ki: 3, g: '返', col: '#ffd36b', school: 'steel', desc: 'In the Guard chain: your riposte window lasts 2s longer and the riposte deals +50%. Elsewhere it only extends an open riposte.', use: c => { const P = G.player; if (c.src === 'guard' || P.riposteT > 0) { P.riposteT = Math.max(P.riposteT, 0) + 2; P.ripBoost = 1.5; } } });
defS({ id: 'parrylance', name: 'Parry Lance', type: 'proj', rar: 3, ki: 6, g: '槍', col: '#ffe9a0', school: 'steel', base: 10, coef: 0.9, desc: 'A spear of force (10 damage). Cast from a deflect it deals triple damage, heavy posture, and pierces 4.', fire: c => { const gd = c.src === 'guard'; bolt(c, { style: 'spear', speed: gd ? 1250 : 1000, r: gd ? 9 : 6, life: 0.5, dmg: gd ? 30 : 10, post: gd ? 46 : 8, pierce: gd ? 4 : 1, col: gd ? '#ffe9a0' : '#d8e4f0' }); } });
defS({ id: 'bloodlet', name: 'Bloodletting', type: 'util', rar: 2, ki: 0, hp: 5, g: '刺', col: '#ff3a5a', school: 'blood', desc: 'Costs 5 HP: restore 35 Ki and add 10 HP of Rally you can win back by striking.', use: c => { const P = G.player; P.ki = Math.min(G.S.kiMax, P.ki + 35); P.rally = Math.min(G.S.maxHp, (P.rally || 0) + 10); P.rallyT = 0; } });
defS({ id: 'windcutter', name: 'Wind Cutter', type: 'proj', rar: 1, ki: 5, g: '颪', col: '#bfe8ff', school: 'storm', base: 6, coef: 0.6, desc: 'A spinning crescent that flies out and returns. 6 damage, Shock.', fire: c => bolt(Object.assign({}, c, { M: Object.assign({}, c.M, { boomer: true }) }), { style: 'disc', speed: 760, r: 9, life: 0.45, dmg: 6, shock: 1, col: '#bfe8ff', pierce: 2 }) });
defS({ id: 'emberstep', name: 'Ember Step', type: 'util', rar: 2, ki: 6, g: '踏', col: '#ff7a2a', school: 'flame', desc: 'Your next dash within 4s leaves a trail of fire: 8 damage bursts and Burn along the path.', use: c => { G.player.emberStepT = 4; } });

// ================= THE ELEMENTAL GRIMOIRE: six new sigils for every school =================
// --- Flame ---
defS({ id: 'firewheel', name: 'Blazing Wheel', type: 'proj', rar: 1, ki: 6, g: '輪', col: '#ff8a3a', school: 'flame', base: 9, coef: 0.8, desc: 'A rolling wheel of fire that ricochets 3 times. 9 damage, Burn.', fire: c => bolt(c, { style: 'disc', speed: 640, r: 10, life: 0.9, dmg: 9, col: '#ff8a3a', burn: 1, bounce: 3 }) });
defS({ id: 'feathers', name: 'Phoenix Feathers', type: 'proj', rar: 2, ki: 10, g: '羽', col: '#ffb24a', school: 'flame', base: 5, coef: 0.5, desc: 'Five seeking feathers that each burst in flame. 5 + 5 damage, Burn.', fire: c => bolt(c, { style: 'flame', speed: 520, r: 6, life: 1.1, dmg: 5, col: '#ffb24a', burn: 1, count: 5, spread: 0.32, homing: 4, blast: { r: 40, dmg: 5 } }) });
defS({ id: 'pillar', name: 'Pillar of Flame', type: 'proj', rar: 2, ki: 11, g: '柱', col: '#ff6a2a', school: 'flame', base: 10, coef: 0.8, desc: 'Fire erupts at the target three times. 10 damage each, heavy Burn.', fire: c => firePillar(c) });
defS({ id: 'cinders', name: 'Cinder Storm', type: 'proj', rar: 2, ki: 12, g: '燼', col: '#ff7a2a', school: 'flame', base: 6, coef: 0.4, desc: 'Ten burning cinders rain on the target area. 6 damage each, Burn.', fire: c => arrowRain(c, 10, { col: '#ff7a2a', dmg: 6, r: 34, burn: 1 }) });
defS({ id: 'kindling', name: 'Kindling Jar', type: 'proj', rar: 1, ki: 8, g: '壺', col: '#ff9a4a', school: 'flame', base: 9, coef: 0.7, desc: 'A jar of oil: 9 damage burst, then the ground burns for 2.4s.', fire: c => kindling(c) });
defS({ id: 'roar', name: "Dragon's Roar", type: 'proj', rar: 3, ki: 14, g: '咆', col: '#ff5a2a', school: 'flame', base: 5, coef: 0.3, desc: 'A cone of nine gouts of flame. 5 damage each, pierce, Burn.', fire: c => bolt(c, { style: 'flame', speed: 720, r: 9, life: 0.34, dmg: 5, col: '#ff5a2a', burn: 1, count: 9, spread: 0.09, pierce: 2 }) });
// --- Frost ---
defS({ id: 'icicle', name: 'Icicle', type: 'proj', rar: 1, ki: 4, g: '柱', col: '#bfeaff', school: 'frost', base: 9, coef: 0.8, desc: 'A fast piercing icicle. 9 damage, Chill.', fire: c => bolt(c, { style: 'needle', speed: 1100, r: 5, life: 0.5, dmg: 9, col: '#bfeaff', chill: 1, pierce: 2 }) });
defS({ id: 'snowball', name: 'Avalanche', type: 'proj', rar: 2, ki: 10, g: '崩', col: '#e8f4ff', school: 'frost', base: 14, coef: 1, desc: 'A heavy rolling ball: 14 damage, huge knockback, bursts for 10 more. 2 Chill.', fire: c => bolt(c, { style: 'round', speed: 420, r: 16, life: 1.0, dmg: 14, col: '#e8f4ff', chill: 2, knock: 380, post: 24, blast: { r: 70, dmg: 10 } }) });
defS({ id: 'frostnova', name: 'Frost Nova', type: 'proj', rar: 2, ki: 9, g: '冴', col: '#9fe6ff', school: 'frost', base: 10, coef: 0.8, desc: 'A burst of cold around you: 10 damage, 3 Chill, shoves foes away.', fire: c => frostNova(c) });
defS({ id: 'iceprison', name: 'Ice Prison', type: 'proj', rar: 3, ki: 12, g: '獄', col: '#bfeaff', school: 'frost', base: 8, coef: 0.6, desc: 'Encase the nearest foe: 8 damage and 6 Chill (enough to freeze most foes).', fire: c => icePrison(c) });
defS({ id: 'blizzard', name: 'Blizzard', type: 'proj', rar: 3, ki: 14, g: '吹', col: '#d6f0ff', school: 'frost', base: 3, coef: 0.15, desc: 'A slow freezing vortex that pulls foes in. 3 damage per tick, Chill.', fire: c => bolt(c, { style: 'gale', speed: 150, r: 38, life: 2.4, dmg: 3, col: '#d6f0ff', chill: 1, pierce: 99, tick: 0.18, pull: 110, knock: 0 }) });
defS({ id: 'mirrorice', name: 'Mirror Shards', type: 'proj', rar: 1, ki: 7, g: '鏡', col: '#cfefff', school: 'frost', base: 4, coef: 0.3, desc: 'Six ice shards burst outward and ricochet twice. 4 damage, Chill.', fire: c => bolt(c, { style: 'needle', speed: 720, r: 4, life: 0.6, dmg: 4, col: '#cfefff', chill: 1, count: 6, ring: true, bounce: 2 }) });
// --- Storm ---
defS({ id: 'stormorb', name: 'Storm Orb', type: 'proj', rar: 2, ki: 11, g: '球', col: '#c9b6ff', school: 'storm', base: 4, coef: 0.3, desc: 'A crackling orb drifts forward, shocking everything it touches. 4 damage per tick.', fire: c => bolt(c, { style: 'void', speed: 210, r: 20, life: 2.0, dmg: 4, col: '#c9b6ff', shock: 1, pierce: 99, tick: 0.2, post: 3 }) });
defS({ id: 'forked', name: 'Forked Bolt', type: 'proj', rar: 1, ki: 6, g: '岐', col: '#d9ccff', school: 'storm', base: 7, coef: 0.7, desc: 'Three bolts that split in two on hit. 7 damage, Shock.', fire: c => bolt(Object.assign({}, c, { M: Object.assign({}, c.M, { split: true }) }), { style: 'spark', speed: 900, r: 5, life: 0.5, dmg: 7, col: '#d9ccff', shock: 1, count: 3, spread: 0.22 }) });
defS({ id: 'static', name: 'Static Field', type: 'proj', rar: 1, ki: 5, g: '静', col: '#c9b6ff', school: 'storm', base: 6, coef: 0.5, desc: 'A crackle around you: 6 damage and 2 Shock to everything close.', fire: c => staticField(c) });
defS({ id: 'skyfall', name: 'Skyfall', type: 'proj', rar: 3, ki: 15, g: '霹', col: '#e6dcff', school: 'storm', base: 14, coef: 1.1, desc: 'Lightning strikes up to 4 foes near the target. 14 damage each, unblockable.', fire: c => skyfall(c) });
defS({ id: 'thunderstep', name: 'Thunder Step', type: 'util', rar: 2, ki: 7, g: '跳', col: '#c9b6ff', school: 'storm', desc: 'A free dash forward that leaves a thunderclap where you left and where you land.', use: c => thunderStep(c) });
defS({ id: 'm_galvan', name: 'Galvanize', type: 'mod', rar: 2, ki: 3, g: '帯', school: 'storm', desc: 'Projectiles Shock and accelerate as they fly.', mod: M => { M.shock += 1; M.accel = true; } });
// --- Steel ---
defS({ id: 'kunaifan', name: 'Kunai Fan', type: 'proj', rar: 1, ki: 6, g: '扇', col: '#e6ecf4', school: 'steel', base: 4, coef: 0.35, desc: 'Seven kunai in a tight fan. 4 damage each, pierce.', fire: c => bolt(c, { style: 'kunai', speed: 980, r: 4, life: 0.42, dmg: 4, col: '#e6ecf4', count: 7, spread: 0.11, pierce: 1 }) });
defS({ id: 'chakram', name: 'Chakram', type: 'proj', rar: 2, ki: 8, g: '環', col: '#f4efe4', school: 'steel', base: 8, coef: 0.8, desc: 'A steel ring that flies out and back, slicing through 6 foes. 8 damage.', fire: c => bolt(Object.assign({}, c, { M: Object.assign({}, c.M, { boomer: true }) }), { style: 'disc', speed: 820, r: 11, life: 0.42, dmg: 8, col: '#f4efe4', pierce: 4, post: 12 }) });
defS({ id: 'swordrain', name: 'Rain of Swords', type: 'proj', rar: 3, ki: 14, g: '剣', col: '#f4efe4', school: 'steel', base: 9, coef: 0.6, desc: 'Nine blades fall on the target area. 9 damage each, heavy posture.', fire: c => arrowRain(c, 9, { col: '#f4efe4', dmg: 9, r: 34, post: 16 }) });
defS({ id: 'crossslash', name: 'Cross Slash', type: 'proj', rar: 2, ki: 9, g: '十', col: '#ffffff', school: 'steel', base: 10, coef: 0.8, desc: 'Two crescent waves that cross ahead of you. 10 damage each, pierce.', fire: c => bolt(c, { style: 'wave', speed: 760, r: 16, life: 0.42, dmg: 10, col: '#ffffff', count: 2, spread: 0.5, pierce: 3, post: 14 }) });
defS({ id: 'flyingsword', name: 'Flying Sword', type: 'proj', rar: 3, ki: 12, g: '飛', col: '#e6ecf4', school: 'steel', base: 14, coef: 1.2, desc: 'A spectral sword flies out and returns through everything. 14 damage.', fire: c => bolt(Object.assign({}, c, { M: Object.assign({}, c.M, { boomer: true }) }), { style: 'spear', speed: 900, r: 9, life: 0.5, dmg: 14, col: '#e6ecf4', pierce: 99, post: 20 }) });
defS({ id: 'm_edge', name: 'Honed Edge', type: 'mod', rar: 2, ki: 3, g: '研', school: 'steel', desc: '+40% damage and +50% posture.', mod: M => { M.dmg *= 1.4; M.post *= 1.5; } });
// --- Blood ---
defS({ id: 'bloodwhip', name: 'Blood Whip', type: 'proj', rar: 1, ki: 5, g: '鞭', col: '#ff3a5a', school: 'blood', base: 7, coef: 0.6, desc: 'A short lash of five blood barbs. 7 damage, 2 Bleed.', fire: c => bolt(c, { style: 'thorn', speed: 980, r: 5, life: 0.17, dmg: 7, col: '#ff3a5a', bleed: 2, count: 5, spread: 0.24 }) });
defS({ id: 'heartseeker', name: 'Heartseeker', type: 'proj', rar: 2, ki: 0, hp: 3, g: '心', col: '#ff2a4f', school: 'blood', base: 16, coef: 1.2, desc: 'Costs 3 HP. A homing blood spear: 16 damage, Bleed.', fire: c => bolt(c, { style: 'spear', speed: 880, r: 6, life: 0.9, dmg: 16, col: '#ff2a4f', bleed: 1, homing: 6 }) });
defS({ id: 'sanguine', name: 'Sanguine Orbs', type: 'proj', rar: 2, ki: 9, g: '珠', col: '#ff4a6a', school: 'blood', base: 5, coef: 0.4, desc: 'Three blood orbs circle you, draining what they touch. 5 damage, Bleed, lifesteal.', fire: c => bolt(c, { style: 'round', speed: 360, r: 8, life: 1.4, dmg: 5, col: '#ff4a6a', bleed: 1, vamp: 0.12, count: 3, ring: true, forceOrbit: true, pierce: 4 }) });
defS({ id: 'exsang', name: 'Exsanguinate', type: 'proj', rar: 3, ki: 10, g: '絞', col: '#ff2a4f', school: 'blood', base: 7, coef: 0.4, desc: 'Rip out every Bleed stack nearby: 7 damage per stack, and heal a little.', fire: c => exsanguinate(c) });
defS({ id: 'bloodmoon', name: 'Blood Moon', type: 'proj', rar: 3, ki: 0, hp: 6, g: '月', col: '#ff2a4f', school: 'blood', base: 26, coef: 1.5, desc: 'Costs 6 HP. A crimson moon crashes onto the target: 26 damage, 3 Bleed.', fire: c => bloodMoon(c) });
defS({ id: 'm_fang', name: 'Vampire Fang', type: 'mod', rar: 2, ki: 2, g: '牙', school: 'blood', desc: '+1 Bleed and 10% lifesteal on these projectiles.', mod: M => { M.bleed += 1; M.vamp += 0.1; } });
// --- Spirit ---
defS({ id: 'foxfire', name: 'Foxfire', type: 'proj', rar: 1, ki: 6, g: '狐', col: '#6ac8ff', school: 'spirit', base: 6, coef: 0.5, desc: 'Three slow blue flames that hunt foes. 6 damage each.', fire: c => bolt(c, { style: 'ghost', speed: 300, r: 8, life: 2.0, dmg: 6, col: '#6ac8ff', count: 3, spread: 0.6, homing: 5 }) });
defS({ id: 'phantoms', name: 'Phantom Edges', type: 'proj', rar: 2, ki: 9, g: '幻', col: '#7fffd4', school: 'spirit', desc: 'Four phantom blades burst out and seek foes.', fire: c => phantomBlades(c.x, c.y, c.ang) });
defS({ id: 'soulburst', name: 'Soul Burst', type: 'proj', rar: 2, ki: 10, g: '爆', col: '#7fffd4', school: 'spirit', base: 14, coef: 1, desc: 'A spirit detonation at the target: 14 damage. A kill grants a Focus pip.', fire: c => soulBurst(c) });
defS({ id: 'cranes', name: 'Paper Cranes', type: 'proj', rar: 1, ki: 7, g: '鶴', col: '#f4efe4', school: 'spirit', base: 4, coef: 0.35, desc: 'Four folded cranes glide after foes and burst. 4 + 5 damage.', fire: c => bolt(c, { style: 'paper', speed: 380, r: 7, life: 1.6, dmg: 4, col: '#f4efe4', count: 4, spread: 0.4, homing: 3.5, blast: { r: 40, dmg: 5 } }) });
defS({ id: 'harvest', name: 'Soul Harvest', type: 'util', rar: 2, ki: 4, g: '刈', col: '#7fffd4', school: 'spirit', desc: 'Draw on every foe near you: heal 1 HP and restore 6 Ki per foe.', use: c => soulHarvest(c) });
defS({ id: 'm_haunt', name: 'Haunting', type: 'mod', rar: 2, ki: 3, g: '祟', school: 'spirit', desc: 'Projectiles seek foes, pass through walls, and deal +20% damage.', mod: M => { M.homing += 4; M.spectral = true; M.dmg *= 1.2; } });

const SIG_LIST = Object.values(SIG);

// ---------- BLADES ----------
const BLADES = {};
const defB = (o) => { BLADES[o.id] = o; };
defB({ id: 'katana', name: 'Rusted Katana', rar: 1, slots: 4, draw: 1, dmg: 10, reach: 80, swing: 1, desc: 'A dependable blade.' });
defB({ id: 'wakizashi', name: 'Wakizashi', rar: 1, slots: 3, draw: 1, dmg: 7, reach: 66, swing: 0.72, desc: 'Short and very quick.' });
defB({ id: 'staff', name: 'Temple Staff', rar: 1, slots: 4, draw: 1, dmg: 8, reach: 98, swing: 0.95, post: 1.25, desc: 'Long reach and good posture damage.' });
defB({ id: 'nodachi', name: 'Nodachi', rar: 2, slots: 6, draw: 1, dmg: 17, reach: 112, swing: 1.4, desc: 'Huge reach and damage. Slow.' });
defB({ id: 'fangs', name: 'Twin Fangs', rar: 2, slots: 4, draw: 2, dmg: 8, reach: 70, swing: 0.85, ki: -10, desc: 'Casts 2 sigils per swing.' });
defB({ id: 'chaos', name: 'Chaos Edge', rar: 2, slots: 8, draw: 1, dmg: 10, reach: 84, swing: 0.95, kiRegen: 4, shuffle: true, desc: 'Huge capacity. Its order reshuffles every cycle.' });
defB({ id: 'kusari', name: 'Kusarigama', rar: 2, slots: 5, draw: 1, dmg: 9, reach: 152, swing: 1.15, arc: 0.75, desc: 'Chain-sickle: extreme reach, narrow arc.' });
defB({ id: 'kanabo', name: 'Oni Kanabo', rar: 2, slots: 3, draw: 1, dmg: 24, reach: 92, swing: 1.6, post: 2, desc: 'Crushes posture. Very slow.' });
defB({ id: 'thunder', name: 'Thunder Tachi', rar: 3, slots: 5, draw: 1, dmg: 12, reach: 88, swing: 0.95, always: ['m_shock'], desc: 'Always casts Electrify.' });
defB({ id: 'sunfire', name: 'Sunfire Glaive', rar: 3, slots: 5, draw: 1, dmg: 12, reach: 124, swing: 1.2, always: ['m_ignite'], desc: 'Always casts Igniting.' });
defB({ id: 'prism', name: 'Prism Fan', rar: 3, slots: 6, draw: 3, dmg: 6, reach: 72, swing: 1.1, ki: 20, desc: 'Casts 3 sigils per swing.' });
defB({ id: 'frostfang', name: 'Hoarfrost Saber', rar: 3, slots: 6, draw: 2, dmg: 11, reach: 86, swing: 1, always: ['m_freeze'], desc: 'Casts 2 per swing. Always casts Freezing.' });
defB({ id: 'moonveil', name: 'Moonveil', rar: 4, slots: 7, draw: 2, dmg: 15, reach: 98, swing: 0.9, ki: 30, kiRegen: 4, always: ['wave'], desc: 'Casts 2 per swing and always looses a Crescent Wave.' });
defB({ id: 'reaver', name: 'Soul Reaver', rar: 4, slots: 10, draw: 2, dmg: 11, reach: 90, swing: 1, shuffle: true, kiRegen: 6, always: ['m_vamp'], desc: 'Ten slots, shuffled. Always casts Vampiric.' });
defB({ id: 'bellblade', name: 'Bell of Echoes', rar: 4, slots: 5, draw: 1, dmg: 13, reach: 90, swing: 1, always: ['m_echo'], desc: 'Every cast rings out a second time.' });
defB({ id: 'tanto', name: 'Tanto', rar: 1, slots: 2, draw: 1, dmg: 6, reach: 60, swing: 0.58, crit: 15, desc: 'Tiny and blindingly fast. +15% crit.' });
defB({ id: 'fan', name: 'War Fan', rar: 2, slots: 5, draw: 2, dmg: 7, reach: 74, swing: 0.9, arc: 1.4, desc: 'Wide sweeping arcs. Casts 2 per swing.' });
defB({ id: 'yari', name: 'Yari', rar: 2, slots: 5, draw: 1, dmg: 11, reach: 168, swing: 1.05, arc: 0.55, desc: 'A spear: enormous reach, narrow thrust.' });
defB({ id: 'scythe', name: 'Reaper Scythe', rar: 3, slots: 6, draw: 1, dmg: 14, reach: 126, swing: 1.3, arc: 1.75, always: ['m_serrate'], desc: 'Huge spinning arcs. Always casts Serrated.' });
defB({ id: 'muramasa', name: 'Muramasa', rar: 4, slots: 8, draw: 2, dmg: 17, reach: 96, swing: 0.88, crit: 10, always: ['m_keen'], desc: 'A cursed masterpiece. Casts 2 per swing, always Keen.' });

defB({ id: 'offhand', name: 'Off-hand Wakizashi', rar: 1, slots: 3, draw: 1, dmg: 7, reach: 72, swing: 0.7, noShop: true, desc: 'The short off-hand blade.' });
defB({ id: 'jitte', name: 'Jitte', rar: 2, slots: 3, draw: 1, dmg: 7, reach: 68, swing: 0.78, deflect: 60, deflectPost: 1, school: 'steel', desc: 'A parrying truncheon. Deflect window +60ms, deflects deal double posture.' });
defB({ id: 'zanbato', name: 'Zanbato', rar: 3, slots: 5, draw: 1, dmg: 26, reach: 118, swing: 1.55, finMul: 3, dbHeal: 0.06, school: 'blood', desc: 'A horse-cleaver. Finishers deal triple damage; deathblows heal 6%.' });
defB({ id: 'kama', name: 'Storm Kama', rar: 2, slots: 4, draw: 1, dmg: 6, reach: 72, swing: 0.6, storm: 0.22, school: 'storm', desc: 'Blindingly fast. Each hit has a 22% chance to call lightning on the target.' });

// ================= THE ARMORY: blades with a will of their own =================
defB({ id: 'kagutsuchi', name: 'Kagutsuchi', rar: 3, slots: 5, draw: 1, dmg: 12, reach: 92, swing: 1, killCast: 'ember', school: 'flame', desc: 'Every kill hurls an Ember at the next foe.' });
defB({ id: 'emberwhip', name: 'Ember Whip', rar: 2, slots: 4, draw: 1, dmg: 8, reach: 150, arc: 0.9, swing: 0.95, always: ['m_ignite'], school: 'flame', desc: 'A burning chain-whip. Always casts Igniting.' });
defB({ id: 'starfall', name: 'Starfall Odachi', rar: 4, slots: 6, draw: 1, dmg: 16, reach: 110, swing: 1.2, nth: { n: 4, sig: 'meteor' }, school: 'flame', desc: 'Every 4th swing calls down a Falling Star.' });
defB({ id: 'glacierblade', name: 'Glacier Greatsword', rar: 3, slots: 6, draw: 1, dmg: 20, reach: 116, swing: 1.35, post: 1.4, nth: { n: 3, sig: 'frostnova' }, school: 'frost', desc: 'Every 3rd swing erupts in a Frost Nova.' });
defB({ id: 'snowpath', name: 'Snowpath', rar: 2, slots: 4, draw: 2, dmg: 8, reach: 80, swing: 0.9, kiHit: 2, school: 'frost', desc: 'Casts 2 per swing. Each hit restores 2 Ki.' });
defB({ id: 'icefang', name: 'Icefang', rar: 1, slots: 3, draw: 1, dmg: 8, reach: 76, swing: 0.8, always: ['m_freeze'], school: 'frost', desc: 'A cold little blade. Always casts Freezing.' });
defB({ id: 'tidecaller', name: 'Tidecaller', rar: 3, slots: 5, draw: 1, dmg: 11, reach: 96, swing: 1, nth: { n: 2, sig: 'wave' }, always: ['m_bounce'], school: 'frost', desc: 'Every other swing looses a Crescent Wave. Everything it casts ricochets.' });
defB({ id: 'raikiri', name: 'Raikiri', rar: 4, slots: 6, draw: 2, dmg: 13, reach: 92, swing: 0.75, crit: 12, critCast: 'chain', school: 'storm', desc: 'The Lightning Cutter. Casts 2 per swing; critical hits cast Chain Lightning.' });
defB({ id: 'tempestspear', name: 'Tempest Spear', rar: 3, slots: 5, draw: 1, dmg: 12, reach: 170, arc: 0.55, swing: 1, always: ['m_swift'], storm: 0.12, school: 'storm', desc: 'Enormous reach. Always Swift; hits sometimes call lightning.' });
defB({ id: 'galebrand', name: 'Galebrand', rar: 2, slots: 5, draw: 1, dmg: 9, reach: 84, swing: 0.85, nth: { n: 3, sig: 'static' }, school: 'storm', desc: 'Every 3rd swing crackles a Static Field around you.' });
defB({ id: 'kurogane', name: 'Kurogane', rar: 2, slots: 5, draw: 1, dmg: 14, reach: 86, swing: 1.05, post: 1.5, school: 'steel', desc: 'Black iron. +50% posture damage.' });
defB({ id: 'senbon', name: 'Thousand-Needle Sword', rar: 3, slots: 7, draw: 1, dmg: 9, reach: 84, swing: 0.85, nth: { n: 2, sig: 'needles8' }, school: 'steel', desc: 'Every other swing sprays a Needle Storm.' });
defB({ id: 'masamune', name: 'Masamune', rar: 4, slots: 7, draw: 2, dmg: 18, reach: 98, swing: 0.85, crit: 15, deflect: 30, finMul: 2.5, school: 'steel', desc: 'The perfect blade. Casts 2 per swing, brutal finishers, a wider deflect window.' });
defB({ id: 'ninjato', name: 'Ninjatō', rar: 1, slots: 3, draw: 1, dmg: 9, reach: 76, swing: 0.72, crit: 10, school: 'steel', desc: 'Short, fast and sharp. +10% crit.' });
defB({ id: 'chikage', name: 'Chikage', rar: 3, slots: 6, draw: 1, dmg: 13, reach: 92, swing: 0.95, lifeHit: 1, lowHp: 0.8, school: 'blood', desc: 'Each hit heals 1 HP. Up to +80% damage as your HP falls.' });
defB({ id: 'leechfang', name: 'Leech Fang', rar: 2, slots: 4, draw: 2, dmg: 7, reach: 76, swing: 0.8, grow: { per: 10, max: 20 }, school: 'blood', desc: 'Casts 2 per swing. Grows +1 damage for every 10 kills you make with it (max +20).' });
defB({ id: 'hungering', name: 'The Hungering', rar: 4, slots: 9, draw: 2, dmg: 15, reach: 96, swing: 0.95, drain: 2.5, killHeal: 2, school: 'blood', desc: 'Nine slots, casts 2. It feeds on you (1 HP every 2.5s in battle) and on them (kills heal 2).' });
defB({ id: 'kotodama', name: 'Kotodama Brush', rar: 3, slots: 8, draw: 1, dmg: 6, reach: 78, swing: 0.9, ki: 25, kiRegen: 5, killCast: 'foxfire', school: 'spirit', desc: 'A calligraphy brush-blade with eight slots. Kills release Foxfire.' });
defB({ id: 'yurei', name: 'Yūrei Blade', rar: 2, slots: 5, draw: 1, dmg: 10, reach: 88, swing: 0.95, always: ['m_seek'], school: 'spirit', desc: 'A ghost blade. Everything it casts seeks foes.' });
defB({ id: 'gourdstaff', name: 'Drunken Gourd-Staff', rar: 2, slots: 5, draw: 1, dmg: 9, reach: 100, swing: 1, shuffle: true, twice: 0.25, desc: 'Shuffled every cycle, and a quarter of its swings cast twice.' });
defB({ id: 'origami', name: 'Origami Fan', rar: 1, slots: 6, draw: 1, dmg: 5, reach: 70, swing: 0.85, kiRegen: 3, desc: 'A flimsy edge with plenty of room for sigils. +3 Ki/s.' });
defB({ id: 'butterfly', name: 'Butterfly Swords', rar: 2, slots: 4, draw: 1, dmg: 6, reach: 70, swing: 0.55, arc: 1.2, desc: 'Two short blades. Swings in a blink.' });

const BLADE_LIST = Object.values(BLADES).filter(b => !b.noShop);

// ---------- RELICS ----------
const RELICS = {};
const defR = (o) => { if (o.unique === undefined) o.unique = !o.stat || o.rar >= 2; RELICS[o.id] = o; };
defR({ id: 'whetstone', name: 'Whetstone', rar: 1, g: '砥', desc: '+3 Steel power (your blade and Steel sigils).', stat: s => { s.pow.steel += 3; } });
defR({ id: 'brush', name: 'Ink Brush', rar: 1, g: '筆', desc: '+1 power in every school.', stat: s => { for (const k in s.pow) s.pow[k] += 1; } });
defR({ id: 'sandals', name: 'Straw Sandals', rar: 1, g: '草', desc: '+8% Move speed.', stat: s => { s.move += 8; } });
defR({ id: 'plate', name: 'Iron Plate', rar: 1, g: '鉄', desc: '+3 Armor, -3% Move speed.', stat: s => { s.armor += 3; s.move -= 3; } });
defR({ id: 'riceball', name: 'Rice Ball', rar: 1, g: '飯', desc: '+10 Max HP.', stat: s => { s.maxHp += 10; } });
defR({ id: 'kettle', name: 'Tea Kettle', rar: 1, g: '茶', desc: '+3 HP regeneration.', stat: s => { s.regen += 3; } });
defR({ id: 'coin', name: 'Copper Coin', rar: 1, g: '銭', desc: '+8 Harvest (bonus ash after each wave).', stat: s => { s.harvest += 8; } });
defR({ id: 'lodestone', name: 'Lodestone', rar: 1, g: '磁', desc: '+50% Pickup range.', stat: s => { s.pickup += 50; } });
defR({ id: 'bone', name: 'Bone Charm', rar: 1, g: '骨', desc: '+15% Posture damage.', stat: s => { s.posture += 15; } });
defR({ id: 'sash', name: "Ronin's Sash", rar: 1, g: '帯', desc: '+6% Damage, +6% Attack speed.', stat: s => { s.dmg += 6; s.atkSpd += 6; } });
defR({ id: 'hungry', name: 'Hungry Ghost', rar: 1, g: '餓', desc: 'Deathblows drop double ash.' });
defR({ id: 'stillwater', name: 'Still Water', rar: 1, g: '静', desc: 'While guarding, Ki regenerates 3x faster.' });
defR({ id: 'crane', name: 'Crane Feather', rar: 2, g: '鶴', desc: '+1 Dash charge.', stat: s => { s.dashes += 1; } });
defR({ id: 'oni', name: 'Oni Mask', rar: 2, g: '鬼', desc: '+25% Damage, -2 Armor.', stat: s => { s.dmg += 25; s.armor -= 2; } });
defR({ id: 'glass', name: 'Glass Edge', rar: 2, g: '硝', desc: '+15% Crit chance. You take 10% more damage.', stat: s => { s.crit += 15; s.dmgTaken += 10; } });
defR({ id: 'cat', name: 'Beckoning Cat', rar: 2, g: '猫', desc: '+25 Luck.', stat: s => { s.luck += 25; } });
defR({ id: 'spring', name: 'Spirit Spring', rar: 2, g: '源', desc: '+30 Max Ki, +3 Ki regen.', stat: s => { s.kiMax += 30; s.kiRegen += 3; } });
defR({ id: 'drum', name: 'War Drum', rar: 2, g: '鼓', desc: '+15% Attack speed.', stat: s => { s.atkSpd += 15; } });
defR({ id: 'lantern', name: 'Paper Lantern', rar: 2, g: '灯', desc: 'Burning foes explode on death (radius 75, 16 damage).' });
defR({ id: 'mirror', name: 'Mirror Shard', rar: 2, g: '鏡', desc: 'Perfect deflects also loose a Crescent Wave at the attacker.' });
defR({ id: 'bell', name: 'Thunder Bell', rar: 2, g: '鐘', desc: 'Every 4th swing casts a free Chain Lightning.' });
defR({ id: 'riposte', name: 'Riposte Scroll', rar: 2, g: '返', desc: 'After a perfect deflect, your next swing deals +150% damage and +100% posture.' });
defR({ id: 'frostbite', name: 'Frostbite Charm', rar: 2, g: '冬', desc: 'Chilled foes take +50% posture damage. Frozen foes take +40% damage.' });
defR({ id: 'coil', name: 'Static Coil', rar: 2, g: '電', desc: 'Shock arcs to 2 extra foes. Shocked foes take +15% damage.' });
defR({ id: 'sakura', name: 'Sakura Branch', rar: 2, g: '桜', desc: 'Kills release 2 homing petals (6 damage).' });
defR({ id: 'hourglass', name: 'Sand Hourglass', rar: 2, g: '砂', desc: 'Art cooldown -25%.', stat: s => { s.artCd -= 25; } });
defR({ id: 'pouch', name: 'Talisman Pouch', rar: 2, g: '袋', desc: '+1 Art chain slot.', stat: s => { s.artSlots += 1; } });
defR({ id: 'tsuba', name: 'Second Tsuba', rar: 2, g: '鍔', desc: '+1 Guard chain slot.', stat: s => { s.guardSlots += 1; } });
defR({ id: 'shadowstep', name: 'Shadow Step', rar: 2, g: '影', desc: 'Dashing through foes cuts them (blade damage) and applies 2 Bleed.' });
defR({ id: 'dice', name: "Gambler's Dice", rar: 2, g: '賽', desc: 'The first reroll in every shop is free.' });
defR({ id: 'gourdseed', name: 'Gourd Seed', rar: 2, g: '瓢', desc: '+1 Healing Gourd charge.', stat: s => { s.gourds += 1; } });
defR({ id: 'ancient', name: 'Ancient Guard', rar: 2, g: '古', desc: '+35ms Deflect window.', stat: s => { s.deflect += 35; } });
defR({ id: 'thread', name: 'Crimson Thread', rar: 3, g: '糸', desc: '+3% Lifesteal on all damage.', stat: s => { s.lifesteal += 3; } });
defR({ id: 'oath', name: 'Blood Oath', rar: 3, g: '誓', desc: 'Deathblows heal 3% of your Max HP (12% on elites and bosses).' });
defR({ id: 'plague', name: 'Plague Doll', rar: 3, g: '疫', desc: 'When a foe dies, its Burn and Bleed spread to nearby foes.' });
defR({ id: 'moons', name: 'Twin Moons', rar: 3, g: '月', desc: 'Finisher swings (the last of each chain cycle) cast twice.' });
defR({ id: 'echostone', name: 'Echo Stone', rar: 3, g: '響', desc: 'Perfect deflects also cast your next Strike sigils.' });
defR({ id: 'kitsune', name: 'Kitsune Tail', rar: 3, g: '狐', desc: 'Hits have a 10% chance to cast a random projectile sigil.' });
defR({ id: 'execute', name: "Executioner's Seal", rar: 3, g: '処', desc: 'Sword hits instantly kill normal foes below 15% HP.' });
defR({ id: 'gem', name: 'Overcharge Gem', rar: 3, g: '晶', desc: 'Every 60 Ki you spend releases a ki nova (25 damage).' });
defR({ id: 'curse', name: 'Cursed Coin', rar: 3, g: '呪', desc: '+35% ash from kills. Foes have +15% HP.', stat: s => { s.ashGain += 35; s.enemyHp += 15; } });
defR({ id: 'ashheart', name: 'Ashen Heart', rar: 3, g: '心', desc: 'Gain +3 Max HP at the end of every wave.' });
defR({ id: 'dragonscale', name: 'Dragon Scale', rar: 4, g: '鱗', desc: 'Blocking costs 60% less posture, and your guard can never break.' });
defR({ id: 'wrath', name: 'Wrath Pearl', rar: 4, g: '怒', desc: 'When hit, unleash a fire nova (30 dmg) and gain +50% damage for 4s.' });
defR({ id: 'stormeye', name: 'Eye of the Storm', rar: 4, g: '眼', desc: "Every 8th perfect deflect calls down Raijin's Wrath for free." });
defR({ id: 'lotus', name: 'Black Lotus', rar: 4, g: '蓮', desc: 'After a perfect deflect, your next swing costs no Ki and casts twice.' });
defR({ id: 'banner', name: 'Ancestral Banner', rar: 4, g: '旗', desc: 'At the start of each wave, gain a random sigil.' });
defR({ id: 'phoenix', name: 'Phoenix Feather', rar: 4, g: '鳳', desc: 'Once per run, revive with 50% HP.' });
defR({ id: 'crown', name: 'Shogun Seal', rar: 4, g: '将', desc: '+1 sigil drawn per swing.', stat: s => { s.draw += 1; } });
defR({ id: 'focuslens', name: 'Focus Lens', rar: 2, g: '鏡', desc: '+1 max Focus pip. Start each wave with 1 extra.', stat: s => { s.focusMax += 1; s.focusStart += 1; } });
defR({ id: 'anatomy', name: "Anatomist's Scroll", rar: 3, g: '解', desc: 'Focus Thrusts deal +60% damage.' });
defR({ id: 'windscroll', name: 'Wind Scroll', rar: 2, g: '颯', desc: 'Dash strikes deal +80% damage.' });
defR({ id: 'calm', name: 'Breath of Calm', rar: 2, g: '凪', desc: 'Perfect parries heal 1 HP.' });
defR({ id: 'tempo', name: 'Rising Tempo', rar: 2, g: '拍', desc: 'Style rank damage bonus is 70% stronger and your rank fades 30% slower.' });
defR({ id: 'ironwill', name: 'Iron Will', rar: 3, g: '耐', desc: 'Once per wave, survive a lethal blow at 1 HP.' });
defR({ id: 'bramble', name: 'Bramble Guard', rar: 1, g: '茨', desc: 'Blocking a hit deals 15 damage back to the attacker.' });
defR({ id: 'trophy', name: 'Trophy Belt', rar: 2, g: '首', desc: '+35% damage against elites and bosses.' });
defR({ id: 'kisiphon', name: 'Ki Siphon', rar: 1, g: '吸', desc: 'Critical hits restore 2 Ki.' });
defR({ id: 'thunderclap', name: 'Thunderclap Seal', rar: 3, g: '轟', desc: 'Deathblows release a shockwave (30 damage, posture).' });
defR({ id: 'timesilk', name: 'Time Silk', rar: 3, g: '時', desc: 'Mikiri grants +1 extra Focus. Focus Thrusts slow time longer.' });
defR({ id: 'gambit', name: 'Opening Gambit', rar: 3, g: '初', desc: 'The first swing of each chain cycle casts twice.' });
defR({ id: 'gilded', name: 'Gilded Guard', rar: 1, g: '金', desc: 'Perfect parries drop 2 ash.' });
defR({ id: 'prism', name: 'Elemental Prism', rar: 3, g: '彩', desc: 'Foes take +12% damage for each different status on them.' });
defR({ id: 'glassheart', name: 'Glass Heart', rar: 3, g: '璃', desc: '+40% damage. Healing Gourds heal half as much.', stat: s => { s.dmg += 40; } });
defR({ id: 'sheath', name: 'Swift Sheath', rar: 2, g: '鞘', desc: 'Dashes recharge 30% faster.', stat: s => { s.dashCd *= 0.7; } });
defR({ id: 'bloodink', name: 'Blood Ink', rar: 2, g: '朱', desc: 'When Ki runs short, sigils cost HP instead (1 HP per 6 Ki).' });
defR({ id: 'hunterseye', name: "Hunter's Eye", rar: 2, g: '狙', desc: 'Exposed weak points stay open 60% longer.' });

// ---- playstyle relics ----
defR({ id: 'mirrorward', name: 'Mirror Ward', rar: 3, g: '鏡', school: 'steel', desc: 'Perfect deflects return 250% of the blocked blow to the attacker.' });
defR({ id: 'rhythm', name: 'Iron Rhythm', rar: 2, g: '律', school: 'storm', desc: 'Each chained deflect grants +10% attack speed for 4s (up to 5 stacks).' });
defR({ id: 'stillmind', name: 'Still Mind', rar: 3, g: '心', school: 'frost', desc: 'You can no longer block. Deflect window +70ms and deflects deal +80% posture.', stat: s => { s.noBlock = true; s.deflect += 70; s.deflectPost *= 1.8; } });
defR({ id: 'berserk', name: "Berserker's Vow", rar: 4, g: '狂', school: 'blood', desc: '+45% damage and +15% attack speed. Your dash no longer grants invulnerability.', stat: s => { s.dmg += 45; s.atkSpd += 15; s.noDashIframes = true; } });
defR({ id: 'galestep', name: 'Gale Step', rar: 3, g: '疾', school: 'storm', desc: 'Dash strikes also cast your Art chain for free (once every 2s).' });
defR({ id: 'thousand', name: 'Thousand Cuts', rar: 3, g: '千', school: 'steel', desc: 'Every 6th sword hit on the same foe casts your Strike chain again for free.' });
defR({ id: 'unbroken', name: 'Unbroken Streak', rar: 3, g: '連', school: 'spirit', desc: '+4% damage for every 8 kills since you were last hit (max +60%).' });
defR({ id: 'rallybell', name: 'Rally Bell', rar: 2, g: '鈴', school: 'blood', desc: 'Rally: more of each wound can be won back, it recovers twice as fast, and it fades slower.' });
defR({ id: 'bloodhound', name: 'Bloodhound Sash', rar: 2, g: '狩', school: 'flame', desc: 'During Frenzy you deal +25% damage and kills drop double ash.' });
defR({ id: 'kamae', name: 'High Stance', rar: 2, g: '構', school: 'steel', desc: 'Hold guard for 0.8s without being hit to ready a stance strike: next swing +120% damage and +60% reach.' });

const RELIC_LIST = Object.values(RELICS);

// ---------- STATS ----------
function baseStats() {
  return {
    maxHp: 50, regen: 0, armor: 0, dmg: 0, blade: 0, sigil: 0, atkSpd: 0, crit: 5, move: 0, deflect: 225, posture: 0,
    pow: { flame: 0, frost: 0, storm: 0, steel: 0, blood: 0, spirit: 0 },
    kiMax: 110, kiRegen: 8, pickup: 0, luck: 0, harvest: 0, lifesteal: 0, dashes: 2, gourds: 2, artCd: 0,
    guardSlots: 2, artSlots: 3, draw: 0, dmgTaken: 0, ashGain: 0, enemyHp: 0,
    bladeMul: 1, burnMul: 1, deflectPost: 1, blockPost: 1, guardCasts: 1, priceMul: 1, shopSlots: 5, dashCd: 1.15, dashKi: 14, noDash: false, noDashIframes: false, noBlock: false, deflectAoE: false, perfectDodgeAll: false, dashBleed: false, focusMax: 3, focusStart: 1
  };
}
const STAT_UPS = [
  { k: 'maxHp', aff: 'blood', name: 'Vitality', g: '命', vals: [4, 6, 9, 13], f: v => `+${v} Max HP` },
  { k: 'regen', aff: 'spirit', name: 'Breath', g: '息', vals: [1, 2, 3, 4], f: v => `+${v} HP Regen` },
  { k: 'armor', aff: 'steel', name: 'Iron Skin', g: '鎧', vals: [1, 2, 3, 4], f: v => `+${v} Armor` },
  { k: 'dmg', aff: 'flame', name: 'Ferocity', g: '猛', vals: [5, 8, 12, 16], f: v => `+${v}% Damage` },
  { k: 'atkSpd', aff: 'storm', name: 'Tempo', g: '迅', vals: [5, 8, 12, 16], f: v => `+${v}% Attack speed` },
  { k: 'crit', aff: 'storm', name: 'Precision', g: '的', vals: [3, 5, 7, 10], f: v => `+${v}% Crit chance` },
  { k: 'move', aff: 'spirit', name: 'Swiftness', g: '疾', vals: [3, 5, 7, 10], f: v => `+${v}% Move speed` },
  { k: 'deflect', aff: 'frost', name: 'Composure', g: '鍔', vals: [10, 15, 22, 30], f: v => `+${v}ms Deflect window` },
  { k: 'posture', aff: 'steel', name: 'Pressure', g: '圧', vals: [6, 10, 15, 20], f: v => `+${v}% Posture damage` },
  { k: 'kiMax', aff: 'spirit', name: 'Reservoir', g: '器', vals: [10, 15, 22, 30], f: v => `+${v} Max Ki` },
  { k: 'kiRegen', aff: 'frost', name: 'Flow', g: '流', vals: [1.5, 2.5, 3.5, 5], f: v => `+${v} Ki/s` },
  { k: 'pickup', name: 'Pull', g: '引', vals: [15, 25, 35, 50], f: v => `+${v}% Pickup range` },
  { k: 'luck', name: 'Fortune', g: '運', vals: [5, 8, 12, 16], f: v => `+${v} Luck` },
  { k: 'harvest', name: 'Harvest', g: '穫', vals: [3, 5, 7, 10], f: v => `+${v} Harvest` },
  { k: 'lifesteal', aff: 'blood', name: 'Thirst', g: '渇', vals: [1, 1.5, 2, 3], f: v => `+${v}% Lifesteal` }
];
const STAT_SHOW = [
  ['maxHp', 'Max HP', v => Math.round(v)], ['regen', 'HP Regen', v => v], ['armor', 'Armor', v => v], ['dmg', 'Damage', v => v + '%'],
  ['atkSpd', 'Attack speed', v => v + '%'], ['crit', 'Crit', v => v + '%'],
  ['move', 'Move speed', v => v + '%'], ['deflect', 'Deflect window', v => v + 'ms'], ['posture', 'Posture dmg', v => v + '%'],
  ['kiMax', 'Max Ki', v => Math.round(v)], ['kiRegen', 'Ki/s', v => +v.toFixed(1)], ['lifesteal', 'Lifesteal', v => v + '%'],
  ['pickup', 'Pickup', v => v + '%'], ['luck', 'Luck', v => v], ['harvest', 'Harvest', v => v], ['dashes', 'Dashes', v => v], ['gourds', 'Gourds', v => v]
];

// ---------- VESSELS ----------
const VESSELS = [
  { id: 'ronin', name: 'Ronin', title: 'The Wandering Blade', g: '浪', col: '#efe6d2', blade: 'katana', strike: ['spark', 'm_swift', 'spark', 'wave'], guard: ['thorns'], art: ['ember'], satchel: ['m_seek'],
    perks: ['Balanced. Steel +1 Resonance.', 'Starts with a Seeking sigil in the satchel.'], stat: s => { } },
  { id: 'hexwright', name: 'Hexwright', title: 'Who Writes in Fire', g: '呪', col: '#b48cff', blade: 'chaos', strike: ['x2', 'spark', 'm_seek', 'ember', 'spark_t', 'frost', 'disc', 'u_well'], guard: ['spark'], art: ['chain'], satchel: ['m_scatter', 'm_volatile', 'm_heavy', 'm_bounce'],
    perks: ['Starts with the 8-slot Chaos Edge and a full satchel. Spirit +1 Resonance.', 'Max Ki x2, +6 Ki/s, +2 power in every school.', 'Blade damage -50%.'], stat: s => { s.kiMax *= 2; s.kiRegen += 6; for (const k in s.pow) s.pow[k] += 2; s.bladeMul *= 0.5; } },
  { id: 'pilgrim', name: 'Pilgrim', title: 'Follows No Road', g: '巡', col: '#4fd1a5', random: true, blade: 'katana', strike: [], guard: [], art: [], satchel: [],
    perks: ['Everything is random: blade, sigils and a starting relic.', '+10 Luck.'], stat: s => { s.luck += 10; } },
  { id: 'ember', name: 'Ember Monk', title: 'Ash on the Prayer Beads', g: '焔', col: '#ff7a2f', blade: 'staff', strike: ['m_ignite', 'spark', 'ember', 'spark'], guard: ['breath'], art: ['meteor'], satchel: [],
    perks: ['Starts at Flame II: Burn hits harder and burning foes explode.', 'Burn deals +60% damage; +3 Flame power.', 'Blade damage -20%.'], stat: s => { s.burnMul = 1.6; s.bladeMul *= 0.8; s.pow.flame += 3; }, burnBurst: true,
    unlock: { key: 'bestWave', n: 6, text: 'Reach wave 6 (defeat the first boss).' } },
  { id: 'duelist', name: 'Glass Duelist', title: 'Answers Every Blow', g: '弾', col: '#f2b544', blade: 'wakizashi', strike: ['m_crush', 'spark', 'spark'], guard: ['wave', 'm_swift'], art: ['echo'], satchel: [],
    perks: ['+60ms Deflect window. Deflects deal double posture.', 'Guard chain casts twice per deflect.', 'Max HP -40%.'], stat: s => { s.deflect += 60; s.deflectPost *= 2; s.guardCasts = 2; s.maxHp *= 0.6; },
    unlock: { key: 'deflects', n: 150, text: 'Perform 150 perfect deflects (total).' } },
  { id: 'oni', name: 'Iron Oni', title: 'The Wall That Walks', g: '鬼', col: '#e8432e', blade: 'kanabo', strike: ['m_heavy', 'wave', 'geyser'], guard: ['gale'], art: ['geyser', 'm_crush'], satchel: [],
    perks: ['+60% Max HP, +4 Armor.', 'Blocking costs 40% less posture.', '-12% Move speed, -1 Dash.'], stat: s => { s.maxHp *= 1.6; s.armor += 4; s.blockPost *= 0.6; s.move -= 12; s.dashes -= 1; },
    unlock: { key: 'deathblows', n: 40, text: 'Land 40 deathblows (total).' } },
  { id: 'shade', name: 'Shade', title: 'Never Where You Strike', g: '影', col: '#7fe0ff', blade: 'fangs', strike: ['shuriken', 'm_serrate', 'spark', 'spark'], guard: ['ghost'], art: ['shuriken', 'm_scatter'], satchel: [],
    perks: ['3 Dashes that recharge faster.', 'Dodging ANY attack at the last moment counts as a perfect deflect.', 'Dashing through foes makes them Bleed. Max HP -25%.'], stat: s => { s.dashes += 1; s.dashCd = 0.45; s.perfectDodgeAll = true; s.dashBleed = true; s.maxHp *= 0.75; },
    unlock: { key: 'mikiri', n: 15, text: 'Perform 15 Mikiri counters (dash through perilous attacks).' } },
  { id: 'maneki', name: 'Maneki', title: 'The Lucky Cat', g: '招', col: '#ffd36b', blade: 'katana', strike: ['spark', 'm_keen', 'kunaifan'], guard: ['frost'], art: ['arrows'], satchel: [],
    perks: ['+100 luck: rarer shops, chests and level-ups. Shop prices -20%.', 'Every hit has a chance to be a LUCKY STRIKE (triple damage, coins).', 'Any kill can hit the JACKPOT: a golden explosion, a shower of ash and a free sigil pick.'], stat: s => { s.luck += 100; s.lucky = true; s.priceMul *= 0.8; s.crit += 8; } },
  { id: 'taiko', name: 'Taiko', title: 'The Storm Drummer', g: '太', col: '#ff6a4a', blade: 'staff', strike: ['spark', 'shockwave', 'm_swift'], guard: ['static'], art: ['chain'], satchel: [],
    perks: ['A drumbeat rolls twice a second. Swings that start ON THE BEAT deal +80% damage and cast twice; off-beat swings deal 25% less.', 'Deflects on the beat deal +50% posture.', 'Auto-strike plays on the beat for you.'], stat: s => { s.taiko = true; } },
  { id: 'sumi', name: 'Sumi', title: 'The Living Inkblot', g: '墨', col: '#9a8cff', blade: 'origami', strike: ['spark', 'ember', 'frost', 'chain'], guard: ['thorns'], art: ['meteor'], satchel: ['m_seek', 'x2', 'wave', 'kunai'],
    perks: ['Ignores chain order: every swing casts 2 random sigils from everything you own, free of Ki.', '+30% sigil power. Owning more sigils means more chaos.', '1 in 10 casts spills: an ink blast that hurts foes and you.'], stat: s => { s.inkblot = true; s.sigil += 30; } },
  { id: 'daruma', name: 'Daruma', title: 'Seven Falls, Eight Risings', g: '達', col: '#e8432e', blade: 'kanabo', strike: ['shockwave', 'm_heavy'], guard: ['wave'], art: ['bloodburst'], satchel: [],
    perks: ['Each hit you take this wave grants +4% damage and +2% attack speed (up to 15 stacks).', 'Once per wave, a killing blow knocks you down instead: you rise at 40% HP.', '+20% Max HP, +2 armor.'], stat: s => { s.daruma = true; s.maxHp *= 1.2; s.armor += 2; } },
  { id: 'hitodama', name: 'Hitodama', title: 'A Soul Flame', g: '霊', col: '#7fd8ff', blade: 'yurei', strike: ['foxfire', 'spark'], guard: ['ghost'], art: ['phantoms'], satchel: [],
    perks: ['No health: you carry 5 soul flames. Any hit snuffs exactly one.', 'Deathblows and every 15 kills rekindle a flame. Healing barely works on you.', '+60% damage, +20% speed.'], stat: s => { s.flames = true; s.dmg += 60; s.move += 20; } },
  { id: 'twin', name: 'Nitō', title: 'Two Blades, Two Minds', g: '双', col: '#7fd8ff', blade: 'katana', strike: ['spark', 'm_swift', 'wave'], strike2: ['kunai', 'm_ignite', null], guard: ['frost'], art: ['chain'], satchel: [],
    perks: ['Two blades: swings alternate between your main blade and an off-hand Wakizashi, each with its own Strike chain.', 'The off-hand chain starts with 3 slots and grows by 1 after every boss.', 'Swings 20% faster.'], stat: s => { } },
  { id: 'iai', name: 'Kensai', title: 'Master of the Single Draw', g: '居', col: '#f4efe4', blade: 'nodachi', strike: ['spark', 'm_heavy', 'wave'], guard: ['iaido'], art: ['shockwave'], satchel: [],
    perks: ['Every swing is a full draw: your whole Strike chain casts at once, and every swing is a finisher.', 'Swings 70% slower. Sigils cost 25% less Ki.', '+50% blade damage.'], stat: s => { s.drawAll = true; s.bladeMul *= 1.5; } },
  { id: 'priest', name: 'Chi-no-Miko', title: 'The Blood Priestess', g: '巫', col: '#ff3a5a', blade: 'katana', strike: ['leech', 'thorns', 'm_serrate'], guard: ['bloodburst'], art: ['crimson'], satchel: ['bloodlet'],
    perks: ['Blood magic: sigils cost HP instead of Ki (about 1 HP per 5 Ki). Dashing costs 3 HP.', '+80% Max HP and +5% lifesteal. Rally wins back 50% more.', 'Starts with Blood sigils.'], stat: s => { s.bloodMagic = true; s.maxHp *= 1.8; s.lifesteal += 5; s.rallyMul = 1.5; } },
  { id: 'kage', name: 'Kagemusha', title: 'The Shadow Double', g: '影', col: '#8a6aff', blade: 'katana', strike: ['spark', 'shuriken', 'm_seek'], guard: ['ghost'], art: ['wisp'], satchel: [],
    perks: ['Each dash leaves your shadow double behind where it began.', 'Every swing, your double also strikes and casts your drawn sigils at 50% toward the foe nearest it.', 'Dash to set it up, then catch foes between you.'], stat: s => { s.shadow = true; } },
  { id: 'gambler', name: 'Bakuto', title: 'The Gambler', g: '博', col: '#ffd36b', blade: 'katana', strike: ['spark', 'wild', 'x2'], guard: ['frost'], art: ['arrows'], satchel: ['m_scatter'],
    perks: ['Each wave rolls a random Fortune: a blessing, a curse, or both.', 'Every chain is shuffled each cycle. +30 luck.', 'Shop rerolls cost half.'], stat: s => { s.shuffleAll = true; s.luck += 30; s.rerollMul = 0.5; } },
  { id: 'monk', name: 'Iron Monk', title: 'The Unmoving Bell', g: '鐘', col: '#d9b46a', blade: 'jitte', strike: ['spark', 'iaido'], guard: ['parrylance'], art: ['shockwave'], satchel: ['ripseal'],
    perks: ['Cannot dash: your dash is a short step with no invulnerability.', 'Deflect window +80ms. Perfect deflects stagger and shove every foe around you.', '+30% Max HP. Starts with the Jitte and a Parry Lance.'], stat: s => { s.noDash = true; s.deflect += 80; s.deflectAoE = true; s.maxHp *= 1.3; } },
  { id: 'tengu', name: 'Merchant Tengu', title: 'Everything Has a Price', g: '商', col: '#ffd36b', blade: 'katana', strike: ['disc', 'disc', 'm_bounce'], guard: ['spark'], art: ['gale'], satchel: [], relics: ['cat'],
    perks: ['Shop prices -25%. Shop has 6 offers.', '+15 Harvest.', 'Damage -10%.'], stat: s => { s.priceMul *= 0.75; s.shopSlots = 6; s.harvest += 15; s.dmg -= 10; },
    unlock: { key: 'wins', n: 1, text: 'Win a run.' } }
];
const VESSEL = Object.fromEntries(VESSELS.map(v => [v.id, v]));

// ---------- ENEMIES ----------
// Every attack is HONEST: the hit area is drawn on the ground and resolves the instant it fills.
// shapes: slash | thrust | slam | shot | lob | ring | spikes | spiral | summon | teleport | clone | leap | retreat | xcuts | drum | web | drop | illusion
// a step list may contain { branch: [[...steps], [...steps]] } — one branch is chosen at random each time (mixups).
const SL = (windup, o = {}) => Object.assign({ shape: 'slash', range: 82, arc: 2, windup, dmg: 9, post: 22, approach: 0.8, gap: 0.04 }, o);
const TH = (windup, o = {}) => Object.assign({ shape: 'thrust', len: 300, width: 32, windup, dmg: 12, post: 28 }, o);
const ENEMIES = {
  grunt: { name: 'Husk', hp: 20, post: 20, pregen: 12, speed: 155, r: 16, ash: 1, cost: 1, from: 1, ai: 'melee', flinch: 0.25, col: '#e0783c', draw: 'grunt',
    atks: [{ w: 3, steps: [{ shape: 'slash', range: 64, arc: 2.0, windup: 0.52, dmg: 6, post: 22, recover: 0.45 }] },
      { w: 1, steps: [{ shape: 'slash', range: 64, arc: 2.0, windup: 0.5, dmg: 5, post: 18, gap: 0.04 }, { shape: 'slash', range: 64, arc: 2.0, windup: 0.3, dmg: 5, post: 18, recover: 0.5 }] }], cd: [0.4, 1] },
  skitter: { name: 'Skitter', hp: 8, post: 8, pregen: 10, speed: 255, r: 11, ash: 1, cost: 0.6, from: 1, ai: 'melee', flinch: 0.3, col: '#b4d43c', draw: 'skitter',
    atks: [{ w: 1, steps: [{ shape: 'thrust', len: 120, width: 22, windup: 0.42, dmg: 4, post: 12, recover: 0.5 }] }], cd: [0.4, 1] },
  archer: { name: 'Bowman', hp: 14, post: 14, pregen: 10, speed: 140, r: 14, ash: 2, cost: 1.8, from: 2, ai: 'ranged', keep: [150, 330], flinch: 0.25, col: '#f2c94c', draw: 'archer', ranged: true,
    atks: [{ w: 2, steps: [{ shape: 'shot', style: 'arrow', speed: 660, count: 1, windup: 0.65, dmg: 5, post: 18, recover: 0.5 }] },
      { w: 1, steps: [{ shape: 'shot', style: 'arrow', speed: 640, count: 3, spread: 0.2, windup: 0.75, dmg: 4, post: 14, recover: 0.6 }] }], cd: [1, 1.9] },
  bomber: { name: 'Powder Monk', hp: 10, post: 999, pregen: 0, speed: 190, r: 14, ash: 1, cost: 1.4, from: 3, ai: 'bomber', col: '#ff6a3a', draw: 'bomber', noToken: true,
    atks: [{ w: 1, steps: [{ shape: 'slam', radius: 84, windup: 0.75, dmg: 12, post: 0, perilous: true, selfDestruct: true }] }], cd: [0, 0] },
  lancer: { name: 'Lancer', hp: 32, post: 34, pregen: 16, speed: 165, r: 16, ash: 3, cost: 2.6, from: 3, ai: 'melee', flinch: 0.15, col: '#36c2ae', draw: 'lancer',
    atks: [{ w: 2, steps: [{ shape: 'thrust', len: 150, width: 26, windup: 0.52, dmg: 8, post: 24, recover: 0.5 }] },
      { w: 1, steps: [{ shape: 'thrust', len: 140, width: 26, windup: 0.45, dmg: 7, post: 20, gap: 0.04 }, { branch: [[{ shape: 'thrust', len: 150, width: 26, windup: 0.28, dmg: 7, post: 20, recover: 0.55 }], [{ shape: 'thrust', len: 300, width: 30, windup: 0.6, dmg: 12, post: 30, perilous: true, recover: 0.7 }]] }] },
      { w: 1, steps: [{ shape: 'thrust', len: 300, width: 30, windup: 0.72, dmg: 12, post: 30, perilous: true, recover: 0.75, expose: 0.8 }] }], cd: [0.5, 1.2] },
  brute: { name: 'Oni Brute', hp: 80, post: 70, pregen: 20, speed: 120, r: 26, ash: 4, cost: 4.5, from: 4, ai: 'melee', heavy: true, col: '#c9463b', draw: 'brute',
    atks: [{ w: 3, steps: [{ shape: 'slash', range: 98, arc: 2.2, windup: 0.78, dmg: 13, post: 40, recover: 0.65, expose: 0.6 }] },
      { w: 2, steps: [{ shape: 'slash', range: 92, arc: 2, windup: 0.6, dmg: 10, post: 30, gap: 0.05 }, { branch: [[{ shape: 'slash', range: 92, arc: 2, windup: 0.34, dmg: 10, post: 30, recover: 0.75 }], [{ shape: 'slash', range: 96, arc: 2.2, windup: 0.85, dmg: 13, post: 40, recover: 0.75, expose: 0.6 }]] }] },
      { w: 1.2, steps: [{ shape: 'slam', radius: 122, windup: 0.82, dmg: 15, post: 40, perilous: true, recover: 0.9, expose: 0.9 }] }], cd: [0.6, 1.3] },
  shaman: { name: 'Ash Shaman', hp: 26, post: 26, pregen: 12, speed: 125, r: 15, ash: 3, cost: 3, from: 5, ai: 'ranged', keep: [170, 320], flinch: 0.25, col: '#a46ae4', draw: 'shaman', ranged: true,
    atks: [{ w: 3, steps: [{ shape: 'shot', style: 'orb', count: 3, spread: 0.38, speed: 300, homing: 1.3, life: 3, windup: 0.72, dmg: 6, post: 28, recover: 0.6 }] },
      { w: 1, steps: [{ shape: 'summon', what: 'skitter', n: 2, windup: 0.8, recover: 0.6 }] }], cd: [1.3, 2.2] },
  ninja: { name: 'Shinobi', hp: 22, post: 22, pregen: 14, speed: 225, r: 14, ash: 2, cost: 2.2, from: 5, ai: 'melee', flinch: 0.2, col: '#4c5a82', draw: 'ninja', stealth: true,
    atks: [{ w: 2, far: true, steps: [{ shape: 'teleport', windup: 0.24 }, { shape: 'slash', range: 64, arc: 2.1, windup: 0.42, dmg: 8, post: 22, recover: 0.45 }] },
      { w: 1.2, far: true, steps: [{ shape: 'shot', style: 'star', count: 3, spread: 0.22, speed: 600, windup: 0.5, dmg: 5, post: 16, recover: 0.45 }] },
      { w: 1.5, steps: [{ shape: 'slash', range: 64, arc: 2, windup: 0.42, dmg: 7, post: 20, gap: 0.04 }, { shape: 'slash', range: 64, arc: 2, windup: 0.24, dmg: 7, post: 20, recover: 0.45 }] }], cd: [0.4, 1] },
  monk: { name: 'Iron Monk', hp: 46, post: 48, pregen: 18, speed: 175, r: 17, ash: 3, cost: 3, from: 6, ai: 'melee', flinch: 0, col: '#e0a83c', draw: 'monk',
    atks: [{ w: 2, steps: [{ shape: 'thrust', len: 96, width: 34, windup: 0.46, dmg: 6, post: 18, gap: 0.03 }, { shape: 'thrust', len: 96, width: 34, windup: 0.22, dmg: 6, post: 18, gap: 0.03 }, { shape: 'thrust', len: 110, width: 36, windup: 0.3, dmg: 9, post: 28, recover: 0.6, expose: 0.6 }] },
      { w: 1, steps: [{ shape: 'slam', radius: 104, windup: 0.66, dmg: 11, post: 34, recover: 0.65 }] }], cd: [0.5, 1.1] },
  wraith: { name: 'Wraith', hp: 28, post: 28, pregen: 14, speed: 160, r: 15, ash: 2, cost: 2.6, from: 6, ai: 'melee', flinch: 0.2, col: '#58c9f2', draw: 'wraith', ghost: true,
    atks: [{ w: 1, far: true, steps: [{ shape: 'teleport', windup: 0.28 }, { shape: 'slash', range: 66, arc: 2.1, windup: 0.5, dmg: 8, post: 24, recover: 0.5 }] },
      { w: 1, steps: [{ shape: 'slash', range: 66, arc: 2.1, windup: 0.5, dmg: 8, post: 24, recover: 0.5 }] }], cd: [0.5, 1.2] },
  tengu: { name: 'Tengu', hp: 36, post: 34, pregen: 16, speed: 185, r: 16, ash: 3, cost: 3, from: 7, ai: 'melee', flinch: 0.1, col: '#d8453a', draw: 'tengu',
    atks: [{ w: 2, far: true, steps: [{ shape: 'leap', reach: 440, air: 0.6, radius: 84, windup: 0.4, dmg: 10, post: 28, recover: 0.6, expose: 0.7 }] },
      { w: 1.5, steps: [{ shape: 'slash', range: 72, arc: 2.3, windup: 0.48, dmg: 9, post: 24, recover: 0.5 }] }], cd: [0.6, 1.3] },
  shield: { name: 'Shieldbearer', hp: 55, post: 90, pregen: 18, speed: 125, r: 19, ash: 4, cost: 3.6, from: 7, ai: 'melee', guard: 'front', flinch: 0, heavy: true, col: '#6d8fca', draw: 'shield',
    atks: [{ w: 2, steps: [{ shape: 'thrust', len: 115, width: 36, windup: 0.6, dmg: 9, post: 32, recover: 0.6 }] },
      { w: 1, steps: [{ shape: 'slash', range: 72, arc: 1.7, windup: 0.56, dmg: 8, post: 26, recover: 0.55 }] }], cd: [0.6, 1.3] },
  duelist: { name: 'Duelist', hp: 80, post: 70, pregen: 24, speed: 200, r: 16, ash: 6, cost: 6, from: 8, ai: 'melee', block: 0.45, counter: 3, flinch: 0, heavy: true, col: '#ece6da', accent: '#d6294a', draw: 'duelist',
    atks: [{ w: 3, steps: [{ shape: 'slash', range: 72, arc: 1.9, windup: 0.45, dmg: 8, post: 22, gap: 0.04 }, { shape: 'slash', range: 72, arc: 1.9, windup: 0.27, dmg: 8, post: 22, gap: 0.04 }, { branch: [[{ shape: 'slash', range: 78, arc: 2.1, windup: 0.33, dmg: 10, post: 30, recover: 0.6 }], [{ shape: 'slash', range: 80, arc: 2.3, windup: 0.85, dmg: 13, post: 40, recover: 0.6, expose: 0.6 }], [{ shape: 'thrust', len: 260, width: 28, windup: 0.5, dmg: 12, post: 30, perilous: true, recover: 0.7, expose: 0.7 }]] }] },
      { w: 1.5, steps: [{ shape: 'thrust', len: 290, width: 28, windup: 0.6, dmg: 12, post: 30, perilous: true, recover: 0.7, expose: 0.7 }] }], cd: [0.35, 0.8] },
  gunner: { name: 'Teppo Gunner', hp: 20, post: 20, pregen: 10, speed: 120, r: 15, ash: 3, cost: 2.6, from: 9, ai: 'ranged', keep: [240, 420], flinch: 0.3, col: '#8fa86a', draw: 'gunner', ranged: true,
    atks: [{ w: 1, steps: [{ shape: 'shot', style: 'bullet', speed: 1100, windup: 1.0, dmg: 14, post: 40, recover: 1.0 }] }], cd: [1.5, 2.5] },
  shadow: { name: 'Shadow', hp: 120, post: 60, pregen: 24, speed: 210, r: 18, ash: 0, cost: 0, from: 99, ai: 'melee', block: 0.3, flinch: 0, heavy: true, col: '#7b62c9', accent: '#ff3a5a', draw: 'duelist', ghost: true, noToken: true,
    atks: [{ w: 2, steps: [{ shape: 'slash', range: 76, arc: 2, windup: 0.46, dmg: 10, post: 24, gap: 0.04 }, { shape: 'slash', range: 76, arc: 2, windup: 0.3, dmg: 10, post: 24, recover: 0.55 }] },
      { w: 1, steps: [{ shape: 'thrust', len: 300, width: 30, windup: 0.65, dmg: 14, post: 30, perilous: true, recover: 0.75 }] }], cd: [0.4, 0.9] },
  foxclone: { name: 'Illusion', hp: 1, post: 10, pregen: 0, speed: 230, r: 18, ash: 0, cost: 0, from: 99, ai: 'melee', flinch: 0.1, col: '#ffd9b0', draw: 'kitsune', ghost: true, noToken: true,
    atks: [{ w: 1, steps: [{ shape: 'slash', range: 84, arc: 2.2, windup: 0.55, dmg: 9, post: 22, recover: 0.6 }] }], cd: [0.6, 1.2] }
};

// Teleport-and-cut chains used by several of the flashier bosses
const BLINKCUT = (at, w, o = {}) => [{ shape: 'blink', at, dist: o.dist || 100, windup: w }, SL(o.cw ?? 0.34, Object.assign({ range: 100, arc: 2.3, dmg: 12, post: 30, approach: 0.25, gap: 0.04 }, o.sl || {}))];
const REAP = (n, o = {}) => { const out = [{ shape: 'toll', n, windup: 0.5 }]; const sides = ['behind', 'side', 'far', 'behind', 'side', 'random', 'behind', 'far', 'side']; for (let i = 0; i < n; i++) { const last = i === n - 1; out.push({ shape: 'blink', at: sides[i % sides.length], dist: 112, windup: i ? 0.2 : 0.3 }, SL(last ? 0.42 : 0.34, { range: 150, arc: 3.4, dmg: o.dmg || 13, post: 32, approach: 0.2, gap: 0.04, recover: last ? 0.8 : undefined, expose: last ? 1.0 : undefined })); } return out; };
const BOLTS = (n) => { const out = []; for (let i = 0; i < n; i++) { const last = i === n - 1; out.push({ shape: 'boltstep', radius: 62, delay: i ? 0.42 : 0.55, windup: i ? 0.12 : 0.4, dmg: 14 }, SL(last ? 0.36 : 0.26, { range: 112, arc: 2.6, dmg: 13, post: 32, approach: 0.4, gap: 0.04, recover: last ? 0.8 : undefined, expose: last ? 1.0 : undefined })); } return out; };
const BOSSES = {
  // ===================== THE INITIATE'S ROAD =====================
  kenji: { name: 'Kenji', title: 'The Wandering Ronin', g: '浪人', diff: 1, hp: 2600, post: 220, pregen: 22, lives: 1, speed: 200, r: 22, col: '#7a6a58', accent: '#d8c8a0', ash: 30, block: 0.15, pref: 100, draw: 'ronin', heavy: true,
    lore: 'A tired swordsman who still keeps his edge. He teaches the first lesson: answer the blade, do not flee it.',
    atks: [
      { w: 3, range: [0, 150], steps: [SL(0.6, { range: 92, arc: 2.1, dmg: 9, post: 24 }), SL(0.45, { range: 92, arc: 2.1, dmg: 10, post: 26, recover: 0.8, expose: 0.8 })] },
      { w: 1.6, range: [140, 480], steps: [TH(0.7, { len: 380, width: 36, dmg: 11, post: 30, recover: 0.85, expose: 0.9 })] },
      { w: 1.0, range: [0, 170], steps: [SL(0.85, { range: 120, arc: 3.0, dmg: 12, post: 0, perilous: true, approach: 0.2, recover: 0.9, expose: 1.0 })] },
      { w: 1.3, range: [0, 150], steps: [SL(0.5, { range: 92, arc: 2.1, dmg: 9, post: 24 }), SL(0.34, { range: 92, arc: 2.1, dmg: 9, post: 24 }), SL(0.6, { range: 96, arc: 2.3, dmg: 12, post: 32, recover: 0.8, expose: 0.8 })] }
    ] },
  kotengu: { name: 'Kotengu', title: 'The Crow Novice', g: '小天狗', diff: 1, hp: 3000, post: 240, pregen: 24, lives: 2, speed: 230, r: 20, col: '#3a3f52', accent: '#e8432e', ash: 35, block: 0.15, pref: 140, draw: 'tengu', heavy: true,
    lore: 'A young tengu showing off the one trick it has learned. Watch where it lands, then turn and meet it.',
    atks: [
      // Blink Cut: vanishes and reappears behind you with a slow, honest slash
      { w: 2.6, range: [0, 900], steps: [{ shape: 'blink', at: 'behind', dist: 95, windup: 0.45 }, SL(0.55, { range: 96, arc: 2.2, dmg: 10, post: 26, approach: 0.3, recover: 0.8, expose: 0.8 })] },
      { w: 2, range: [150, 900], steps: [{ shape: 'shot', style: 'feather', count: 3, spread: 0.2, speed: 600, windup: 0.5, dmg: 7, post: 22, recover: 0.7 }] },
      { w: 2.2, range: [0, 150], steps: [SL(0.5, { range: 90, arc: 2.0, dmg: 9, post: 24 }), SL(0.32, { range: 90, arc: 2.0, dmg: 9, post: 24, recover: 0.7 })] },
      { w: 1.4, range: [180, 650], steps: [{ shape: 'leap', air: 0.6, radius: 100, windup: 0.45, dmg: 12, post: 30, recover: 0.8, expose: 0.8 }] },
      { w: 2.2, range: [0, 900], phase: 2, steps: [...BLINKCUT('side', 0.4, { cw: 0.45, sl: { dmg: 10, post: 26 } }), ...BLINKCUT('behind', 0.28, { cw: 0.45, sl: { dmg: 10, post: 26, recover: 0.8, expose: 0.9 } })] },
      { w: 1.1, range: [150, 700], phase: 2, steps: [{ shape: 'leap', air: 0.7, radius: 120, windup: 0.5, dmg: 13, perilous: true, recover: 0.9, expose: 1.0 }] }
    ] },
  gashadokuro: { name: 'Gashadokuro', title: 'The Starving Bones', g: '餓者髑髏', diff: 2, hp: 5600, post: 340, pregen: 20, lives: 2, speed: 120, r: 46, col: '#e8e0cc', accent: '#7fe0a0', ash: 50, block: 0, pref: 150, draw: 'skeleton', heavy: true,
    lore: 'A giant made of the unburied. Slow, and every blow shakes the ground. Learn when to leave and when to stay.',
    atks: [
      { w: 3, range: [0, 220], steps: [SL(0.62, { range: 165, arc: 2.4, dmg: 12, post: 30, approach: 0.3 }), SL(0.48, { range: 165, arc: 2.4, dmg: 12, post: 30, approach: 0.3, recover: 0.85, expose: 0.9 })] },
      // Crushing Palm: a red slam, then its shockwaves roll out (yellow: deflect them)
      { w: 2, range: [0, 200], steps: [{ shape: 'slam', radius: 150, windup: 0.85, dmg: 16, perilous: true, shock: 2, recover: 0.95, expose: 1.1 }] },
      { w: 2, range: [0, 900], steps: [{ shape: 'lob', pattern: 'chase', count: 4, radius: 60, delay: 0.8, stagger: 0.32, windup: 0.5, dmg: 13, perilous: true, bone: true, recover: 0.7 }] },
      { w: 1.6, range: [160, 900], steps: [{ shape: 'shot', style: 'bone', count: 5, spread: 0.18, speed: 520, windup: 0.6, dmg: 9, post: 26, recover: 0.7 }] },
      { w: 1.6, range: [0, 900], phase: 2, steps: [{ shape: 'lob', count: 6, scatter: 170, radius: 60, delay: 0.9, windup: 0.5, dmg: 14, perilous: true, bone: true, recover: 0.8 }] },
      { w: 1.8, range: [0, 230], phase: 2, steps: [SL(0.6, { range: 165, arc: 2.4, dmg: 12, post: 30, approach: 0.3 }), SL(0.42, { range: 165, arc: 2.4, dmg: 12, post: 30, approach: 0.3 }), { shape: 'slam', radius: 160, windup: 0.6, dmg: 15, post: 36, shock: 3, recover: 0.9, expose: 1.0 }] }
    ] },
  jorogumo: { name: 'Jorōgumo', title: 'The Silk Widow', g: '絡新婦', diff: 2, hp: 4800, post: 300, pregen: 26, lives: 2, speed: 170, r: 32, col: '#6a3f8f', accent: '#ffcf5a', ash: 45, block: 0, pref: 130, draw: 'spider', heavy: true,
    lore: 'She does not chase. She reels you in. Deflect the silk, or dash to snap it.',
    atks: [
      { w: 3, range: [0, 210], steps: [TH(0.48, { len: 200, width: 30, dmg: 10, post: 24, gap: 0.04 }), { branch: [[TH(0.26, { len: 200, width: 30, dmg: 10, post: 24, gap: 0.04 }), TH(0.26, { len: 210, width: 30, dmg: 10, post: 24, recover: 0.6 })], [TH(0.75, { len: 230, width: 36, dmg: 15, post: 42, recover: 0.65, expose: 0.7 })]] }] },
      { w: 2, range: [0, 900], steps: [{ shape: 'web', n: 3, radius: 78, life: 6, windup: 0.45, gap: 0.05 }, { shape: 'shot', style: 'orb', count: 3, spread: 0.3, speed: 330, windup: 0.3, dmg: 8, post: 26, recover: 0.6 }] },
      { w: 2, range: [190, 700], steps: [{ shape: 'leap', air: 0.65, radius: 108, windup: 0.42, dmg: 14, post: 36, recover: 0.8, expose: 1.0 }] },
      { w: 1, range: [0, 900], cdKey: 'brood', cd: 13, steps: [{ shape: 'summon', what: 'skitter', n: 4, windup: 0.7, recover: 0.4 }] },
      { w: 1.6, range: [0, 190], steps: [{ shape: 'slash', range: 175, arc: 1.25, windup: 0.68, dmg: 14, post: 0, perilous: true, approach: 0, recover: 0.8, expose: 0.8 }] },
      // Silk Tether: a thread shot; if it catches you (or you block it) she reels you into her bite
      { w: 2.2, range: [150, 620], steps: [{ shape: 'shot', style: 'silk', tether: true, count: 1, speed: 660, windup: 0.5, dmg: 5, post: 20, life: 1.3, recover: 0.6 }] },
      { w: 1.8, range: [0, 900], phase: 2, cdKey: 'drop', cd: 10, steps: [{ shape: 'drop', n: 3, radius: 100, gap: 0.6, delay: 0.85, dmg: 16, perilous: true, windup: 0.4, recover: 0.9, expose: 1.0 }] },
      // Silk Cage: webs ring you in, then she spits into the cage
      { w: 1.5, range: [0, 640], phase: 2, cdKey: 'cage', cd: 12, steps: [{ shape: 'web', pattern: 'cage', n: 7, ringR: 150, radius: 62, life: 5, windup: 0.5, gap: 0.1 }, { shape: 'shot', style: 'orb', count: 5, spread: 0.22, speed: 340, windup: 0.4, dmg: 9, post: 26, recover: 0.7 }] }
    ] },
  kagero: { name: 'Kagero', title: 'The Twin-Blade', g: '陽炎', diff: 2, hp: 4400, post: 330, pregen: 30, lives: 2, speed: 250, r: 22, col: '#efe3c8', accent: '#e8432e', ash: 45, block: 0.5, counter: 3, pref: 95, draw: 'kagero', heavy: true,
    lore: 'Her name means heat-haze. Two blades, endless rhythm, and in the end, mirages.',
    atks: [
      { w: 3, range: [0, 150], steps: [SL(0.46), SL(0.26), { branch: [[SL(0.3, { range: 88, arc: 2.2, dmg: 11, post: 28, recover: 0.6 })], [SL(0.85, { range: 96, arc: 2.5, dmg: 15, post: 45, approach: 0.5, recover: 0.65, expose: 0.7 })], [TH(0.5, { len: 300, perilous: true, dmg: 15, recover: 0.75, expose: 0.9 })]] }] },
      // Twin Flurry: five quick alternating cuts on a steady beat
      { w: 2.4, range: [0, 160], steps: [SL(0.44, { range: 90, arc: 2.0, dmg: 8, post: 20, approach: 0.7 }), SL(0.19, { range: 90, arc: 2.0, dmg: 8, post: 20, approach: 0.5 }), SL(0.19, { range: 90, arc: 2.0, dmg: 8, post: 20, approach: 0.5 }), SL(0.19, { range: 90, arc: 2.0, dmg: 8, post: 20, approach: 0.5 }), SL(0.32, { range: 96, arc: 2.3, dmg: 11, post: 28, approach: 0.5, recover: 0.7, expose: 0.8 })] },
      { w: 2, range: [140, 560], steps: [TH(0.55, { len: 420, width: 36, dmg: 11, gap: 0.08 }), TH(0.42, { len: 420, width: 36, dmg: 11, recover: 0.6, expose: 0.5 })] },
      { w: 1.6, range: [200, 900], steps: [{ shape: 'shot', style: 'kunai', count: 5, spread: 0.17, speed: 720, windup: 0.42, dmg: 6, post: 22, gap: 0.1 }, { shape: 'leap', air: 0.55, radius: 96, windup: 0.22, dmg: 13, post: 32, recover: 0.6, expose: 0.8 }] },
      { w: 1.3, range: [0, 140], steps: [{ shape: 'retreat', dist: 240, windup: 0.1 }, { shape: 'shot', style: 'kunai', count: 3, spread: 0.24, speed: 720, windup: 0.32, dmg: 6, post: 22, gap: 0.05 }, TH(0.45, { len: 440, width: 36, dmg: 12, recover: 0.6 })] },
      { w: 2.6, range: [0, 150], phase: 2, steps: [SL(0.42, { echo: 0.42 }), SL(0.28, { echo: 0.42 }), SL(0.34, { echo: 0.42, range: 90, arc: 2.3, dmg: 11, post: 28, recover: 0.75 })] },
      // Mirage Rush: she melts into the shimmer; mirages dash through you one beat apart
      { w: 1.5, range: [0, 900], phase: 2, cdKey: 'mirage', cd: 11, steps: [{ shape: 'mirage', n: 5, len: 440, width: 40, delay: 0.6, stagger: 0.32, windup: 0.35, dmg: 11, post: 30, recover: 0.8, expose: 1.0 }] },
      { w: 1.2, range: [0, 160], phase: 2, steps: [{ shape: 'slam', radius: 140, windup: 0.72, dmg: 16, post: 30, perilous: true, recover: 0.8, expose: 0.9 }] }
    ] },
  nue: { name: 'Nue', title: 'Chimera of the Thunder Night', g: '鵺', diff: 3, hp: 4600, post: 320, pregen: 30, lives: 2, speed: 270, r: 28, col: '#8a6a44', accent: '#c9b6ff', ash: 45, block: 0.15, counter: 2, pref: 110, draw: 'nue', heavy: true,
    forms: [{ id: 'tiger', name: 'TIGER', g: '虎', col: '#ffb347' }, { id: 'serpent', name: 'SERPENT', g: '蛇', col: '#7fe0a0' }, { id: 'ape', name: 'APE', g: '猿', col: '#c9b6ff' }],
    lore: 'Monkey face, tiger limbs, serpent tail. It changes body mid-fight, and its whole fighting style with it.',
    atks: [
      { w: 3, form: 'tiger', range: [0, 150], steps: [SL(0.42, { range: 96, arc: 2.0, dmg: 10, post: 26 }), SL(0.22, { range: 96, arc: 2.0, dmg: 10, post: 26 }), { branch: [[SL(0.26, { range: 100, arc: 2.4, dmg: 12, post: 30, recover: 0.6 })], [TH(0.55, { len: 320, width: 40, perilous: true, dmg: 15, recover: 0.75, expose: 0.8 })]] }] },
      { w: 2.4, form: 'tiger', range: [120, 700], steps: [{ shape: 'leap', air: 0.42, radius: 100, windup: 0.36, dmg: 12, post: 30, gap: 0.04 }, { shape: 'leap', air: 0.4, radius: 100, windup: 0.2, dmg: 12, post: 30, gap: 0.04 }, { shape: 'leap', air: 0.44, radius: 110, windup: 0.22, dmg: 14, post: 34, recover: 0.7, expose: 0.8 }] },
      { w: 2.6, form: 'serpent', range: [0, 420], steps: [TH(0.44, { len: 400, width: 30, dmg: 10, post: 26, noDash: true, off: -0.12, gap: 0.04 }), TH(0.22, { len: 400, width: 30, dmg: 10, post: 26, noDash: true, off: 0.12, gap: 0.04 }), TH(0.26, { len: 420, width: 32, dmg: 11, post: 28, noDash: true, recover: 0.6, expose: 0.6 })] },
      { w: 1.6, form: 'serpent', range: [0, 200], steps: [{ shape: 'slash', range: 175, arc: 6.28, windup: 0.7, dmg: 15, post: 0, perilous: true, approach: 0, recover: 0.8, expose: 0.9 }] },
      { w: 1.4, form: 'serpent', range: [200, 720], steps: [TH(0.6, { len: 540, width: 40, dmg: 13, post: 32, recover: 0.7, expose: 0.7 })] },
      { w: 2.4, form: 'ape', range: [150, 900], steps: [{ shape: 'shot', style: 'star', count: 3, spread: 0.22, speed: 640, windup: 0.45, dmg: 8, post: 24, gap: 0.12 }, { shape: 'shot', style: 'star', count: 5, spread: 0.18, speed: 640, windup: 0.3, dmg: 8, post: 24, recover: 0.6 }] },
      { w: 2, form: 'ape', range: [0, 420], steps: [{ shape: 'ring', speed: 380, thick: 16, max: 720, windup: 0.55, dmg: 10, post: 28, perilous: false, gap: 0.1 }, { shape: 'leap', air: 0.45, radius: 110, windup: 0.2, dmg: 14, post: 34, recover: 0.7, expose: 0.8 }] },
      { w: 1.6, form: 'ape', range: [0, 150], steps: [SL(0.36, { range: 92, arc: 2.6, dmg: 9, post: 22, approach: 0.9 }), SL(0.2, { range: 92, arc: 2.6, dmg: 9, post: 22, approach: 0.9 }), SL(0.2, { range: 92, arc: 2.6, dmg: 9, post: 22, approach: 0.9 }), SL(0.4, { range: 96, arc: 2.8, dmg: 12, post: 30, recover: 0.7, expose: 0.7 })] },
      { w: 1.6, form: 'tiger', phase: 2, range: [120, 760], steps: [{ shape: 'leap', air: 0.4, radius: 100, windup: 0.32, dmg: 12, post: 30, gap: 0.04 }, { shape: 'leap', air: 0.38, radius: 100, windup: 0.18, dmg: 12, post: 30, gap: 0.04 }, { shape: 'leap', air: 0.38, radius: 100, windup: 0.18, dmg: 12, post: 30, gap: 0.04 }, { shape: 'leap', air: 0.44, radius: 115, windup: 0.2, dmg: 14, post: 36, recover: 0.75, expose: 0.9 }] },
      { w: 1.6, form: 'serpent', phase: 2, range: [0, 460], steps: [-0.3, -0.15, 0, 0.15, 0.3].map((o, i) => TH(i ? 0.18 : 0.42, { len: 420, width: 30, dmg: 10, post: 26, noDash: true, off: o, gap: 0.03, recover: i === 4 ? 0.7 : undefined, expose: i === 4 ? 0.8 : undefined })) },
      { w: 1.6, form: 'ape', phase: 2, range: [0, 900], steps: [{ shape: 'shot', style: 'star', count: 5, spread: 0.2, speed: 660, windup: 0.4, dmg: 8, post: 24, gap: 0.1 }, { shape: 'shot', style: 'star', count: 7, spread: 0.16, speed: 660, windup: 0.28, dmg: 8, post: 24, recover: 0.6 }] }
    ] },
  // ===================== THE HAUNTED PROVINCES =====================
  mother: { name: 'Mother of Ash', title: 'Who Weeps Cinders', g: '灰母', diff: 3, hp: 9000, post: 440, pregen: 22, lives: 2, speed: 100, r: 40, col: '#b892e8', accent: '#ffcf5a', ash: 90, block: 0, pref: 260, float: true, draw: 'mother', heavy: true,
    lore: 'Everything she touches keeps burning. Her cinders flare up again where they fell, so remember the ground.',
    atks: [
      { w: 3, range: [0, 900], steps: [{ shape: 'shot', style: 'orb', count: 5, spread: 0.3, speed: 290, homing: 1.1, life: 4, windup: 0.62, dmg: 10, post: 45, recover: 0.7 }] },
      { w: 2, range: [0, 340], steps: [{ shape: 'ring', speed: 360, thick: 18, max: 760, windup: 0.8, dmg: 13, perilous: true, recover: 0.7, expose: 0.8 }] },
      { w: 2.2, range: [0, 180], steps: [SL(0.6, { range: 132, arc: 2.4, dmg: 12, post: 30, approach: 0.3, gap: 0.05 }), { branch: [[SL(0.36, { range: 132, arc: 2.4, dmg: 12, post: 30, approach: 0.3, recover: 0.75 })], [{ shape: 'slam', radius: 150, windup: 0.7, dmg: 15, perilous: true, recover: 0.8, expose: 0.9 }]] }] },
      // Weeping Cinders: they flare up again where they fell
      { w: 1.8, range: [0, 900], steps: [{ shape: 'lob', radius: 62, delay: 0.85, count: 4, scatter: 130, reignite: 2.2, windup: 0.42, dmg: 13, perilous: true, recover: 0.6 }] },
      // Cinder Halo: ash falls in a ring around you; the middle is safe until it flares
      { w: 1.6, range: [0, 900], cdKey: 'halo', cd: 9, steps: [{ shape: 'lob', pattern: 'circle', count: 7, ringR: 150, radius: 58, delay: 0.85, reignite: 1.8, windup: 0.5, dmg: 13, recover: 0.6 }] },
      { w: 1, range: [0, 900], cdKey: 'summon', cd: 14, steps: [{ shape: 'summon', what: 'grunt', n: 3, windup: 0.8, recover: 0.5 }] },
      { w: 2, range: [0, 900], phase: 2, steps: [{ shape: 'spiral', n: 18, speed: 240, windup: 0.72, dmg: 9, post: 35, recover: 0.8 }] },
      { w: 1.5, range: [0, 400], phase: 2, steps: [{ shape: 'ring', speed: 340, thick: 18, max: 760, windup: 0.72, dmg: 13, perilous: true, gap: 0.1 }, { shape: 'ring', speed: 340, thick: 18, max: 760, windup: 0.4, dmg: 13, perilous: true, recover: 0.75, expose: 0.8 }] },
      { w: 1.4, range: [0, 900], phase: 2, steps: [{ shape: 'lob', pattern: 'chase', count: 6, radius: 64, delay: 0.75, stagger: 0.28, windup: 0.4, dmg: 13, perilous: true, recover: 0.6 }] }
    ] },
  raijin: { name: "Raijin's Drummer", title: 'Who Beats the Storm', g: '雷鼓', diff: 3, hp: 9600, post: 420, pregen: 26, lives: 2, speed: 160, r: 34, col: '#3c6fd8', accent: '#ffe27a', ash: 90, block: 0.25, pref: 150, draw: 'raijin', heavy: true,
    lore: 'Every attack lands on his beat. Find the rhythm and the storm becomes a song you can deflect.',
    atks: [
      { w: 3, range: [0, 900], steps: [{ shape: 'drum', n: 4, gap: 0.5, speed: 340, thick: 16, max: 760, dmg: 9, post: 34, windup: 0.6, recover: 1.0, expose: 0.6 }] },
      { w: 2.4, range: [0, 180], steps: [SL(0.55, { range: 122, arc: 2.2, dmg: 13, post: 32, approach: 0.5 }), SL(0.32, { range: 122, arc: 2.2, dmg: 13, post: 32, approach: 0.5 }), { branch: [[{ shape: 'slam', radius: 132, windup: 0.5, dmg: 15, post: 40, recover: 0.7 }], [{ shape: 'slam', radius: 152, windup: 0.75, dmg: 17, perilous: true, recover: 0.8, expose: 0.9 }]] }] },
      { w: 2, range: [0, 900], steps: [{ shape: 'lob', pattern: 'grid', radius: 62, delay: 0.95, windup: 0.45, dmg: 15, perilous: true, lightning: true, recover: 0.6 }] },
      { w: 1.6, range: [180, 650], steps: [TH(0.68, { len: 500, width: 58, dmg: 16, post: 46, recover: 0.8, expose: 0.8 })] },
      { w: 1.5, range: [150, 700], steps: [{ shape: 'leap', air: 0.7, radius: 135, windup: 0.45, dmg: 16, perilous: true, gap: 0.05 }, { shape: 'drum', n: 2, gap: 0.38, speed: 360, thick: 16, max: 700, dmg: 9, post: 34, windup: 0.25, recover: 0.8, expose: 0.6 }] },
      // Syncopation: the beat stumbles, long, short-short, long
      { w: 2, range: [0, 900], steps: [{ shape: 'drum', n: 5, gaps: [0.55, 0.22, 0.55, 0.22], speed: 360, thick: 16, max: 760, dmg: 9, post: 32, windup: 0.55, recover: 1.0, expose: 0.6 }] },
      { w: 2.4, range: [0, 900], phase: 2, steps: [{ shape: 'drum', n: 6, gaps: [0.4, 0.4, 0.2, 0.2, 0.4], speed: 380, thick: 16, max: 760, dmg: 9, post: 30, windup: 0.5, recover: 1.0, expose: 0.7 }] },
      { w: 1.6, range: [0, 900], phase: 2, steps: [{ shape: 'lob', pattern: 'chase', count: 7, radius: 58, delay: 0.7, stagger: 0.24, windup: 0.35, dmg: 14, perilous: true, lightning: true, recover: 0.6 }] }
    ] },
  yukionna: { name: 'Yuki-onna', title: 'The Snow Widow', g: '雪女', diff: 3, hp: 9200, post: 500, pregen: 30, lives: 2, speed: 160, r: 30, col: '#e6eef8', accent: '#7fd8ff', ash: 90, block: 0.2, counter: 2, pref: 200, float: true, draw: 'yuki', heavy: true, frostborn: true,
    lore: 'She glides, spins, and breathes winter. In the whiteout she comes from behind.',
    atks: [
      // Snow Waltz: a gliding cut to close in, then three wide spinning cuts
      { w: 2.8, range: [0, 340], steps: [TH(0.42, { len: 260, width: 44, dmg: 10, post: 24, gap: 0.04 }), SL(0.3, { range: 112, arc: 3.4, dmg: 12, post: 30, approach: 1.0 }), SL(0.26, { range: 112, arc: 3.4, dmg: 12, post: 30, approach: 1.0 }), SL(0.36, { range: 120, arc: 3.6, dmg: 13, post: 34, approach: 0.9, recover: 0.7, expose: 0.8 })] },
      { w: 1.8, range: [0, 900], steps: [{ shape: 'shot', style: 'ice', count: 5, spread: 0.14, speed: 760, windup: 0.55, dmg: 8, post: 26, gap: 0.16 }, { shape: 'shot', style: 'ice', count: 5, spread: 0.14, speed: 760, windup: 0.32, dmg: 8, post: 26, recover: 0.6 }] },
      { w: 2.2, range: [150, 560], steps: [TH(0.5, { len: 400, width: 40, dmg: 12, post: 28, gap: 0.06 }), SL(0.26, { range: 112, arc: 2.4, dmg: 12, post: 30, recover: 0.65, expose: 0.7 })] },
      // Frost Breath: a freezing cone that sweeps across her front
      { w: 1.8, range: [0, 300], steps: [{ shape: 'breath', range: 280, arc: 0.6, sweep: 1.9, dur: 0.95, windup: 0.6, dmg: 14, perilous: true, recover: 0.7, expose: 0.9 }] },
      { w: 1.3, range: [120, 760], steps: [{ shape: 'spikes', n: 8, gapD: 66, radius: 46, delay: 0.45, stagger: 0.06, windup: 0.5, dmg: 13, perilous: true, recover: 0.6 }] },
      // Whiteout: she vanishes into the blizzard and strikes from behind
      { w: 1.6, range: [0, 900], phase: 2, cdKey: 'white', cd: 9, steps: [{ shape: 'whiteout', hide: 1.1, windup: 0.4 }, SL(0.42, { range: 116, arc: 2.6, dmg: 15, post: 40, approach: 0.4, gap: 0.05 }), SL(0.28, { range: 116, arc: 3.0, dmg: 12, post: 30, approach: 0.6, recover: 0.75, expose: 0.9 })] },
      { w: 2.2, range: [0, 340], phase: 2, steps: [TH(0.4, { len: 260, width: 44, dmg: 10, post: 24, gap: 0.04 }), SL(0.28, { range: 112, arc: 3.4, dmg: 12, post: 30, approach: 1.0 }), SL(0.22, { range: 112, arc: 3.4, dmg: 12, post: 30, approach: 1.0 }), SL(0.22, { range: 112, arc: 3.4, dmg: 12, post: 30, approach: 1.0 }), SL(0.34, { range: 120, arc: 3.6, dmg: 13, post: 34, approach: 0.9, recover: 0.75, expose: 0.9 })] },
      { w: 1.3, range: [0, 300], phase: 2, steps: [{ shape: 'breath', range: 280, arc: 0.6, sweep: 1.9, dur: 0.8, windup: 0.55, dmg: 14, perilous: true, gap: 0.1 }, { shape: 'breath', range: 280, arc: 0.6, sweep: 1.9, dur: 0.8, windup: 0.3, dmg: 14, perilous: true, recover: 0.75, expose: 0.9 }] }
    ] },
  kitsune: { name: 'Kuzunoha', title: 'Fox of Nine Tails', g: '九尾', diff: 4, hp: 12500, post: 520, pregen: 34, lives: 3, speed: 280, r: 24, col: '#f4ead8', accent: '#ff8a3a', ash: 160, block: 0.4, counter: 3, pref: 210, draw: 'kitsune', heavy: true,
    lore: 'The trickster. She blinks behind you, splits into illusions, and fans out all nine tails.',
    atks: [
      { w: 3, range: [0, 900], steps: [{ shape: 'shot', style: 'fox', count: 5, spread: 0.36, speed: 310, homing: 1.6, life: 3.5, windup: 0.58, dmg: 9, post: 30, recover: 0.5 }] },
      { w: 2.6, range: [0, 900], steps: [{ shape: 'teleport', windup: 0.24 }, SL(0.42, { range: 92, arc: 2.4, dmg: 12, post: 28, approach: 0.4, gap: 0.05 }), { branch: [[{ shape: 'teleport', windup: 0.2 }, SL(0.4, { range: 92, arc: 2.4, dmg: 12, post: 28, approach: 0.4, recover: 0.6, expose: 0.5 })], [SL(0.26, { range: 92, arc: 2.4, dmg: 12, post: 28, recover: 0.6 })]] }] },
      { w: 2, range: [0, 170], steps: [{ shape: 'slash', range: 124, arc: 6.28, windup: 0.62, dmg: 13, post: 36, approach: 0, recover: 0.7, expose: 0.6 }] },
      { w: 1.4, range: [0, 900], cdKey: 'illus', cd: 15, steps: [{ shape: 'illusion', n: 3, windup: 0.6, recover: 0.4 }] },
      // Foxfire Orbit: flames circle her, then fly at you one at a time
      { w: 1.8, range: [0, 900], steps: [{ shape: 'orbit', n: 6, orbitR: 74, hold: 0.9, stagger: 0.24, speed: 520, homing: 0.6, windup: 0.5, dmg: 9, post: 28, recover: 0.6 }] },
      // Nine Tails: tails lash out in a sweeping fan; deflect the ones that reach you
      { w: 1.8, range: [0, 520], phase: 2, steps: [{ shape: 'fan', n: 9, spread: 2.6, len: 440, width: 34, delay: 0.5, stagger: 0.09, windup: 0.5, dmg: 12, post: 30, recover: 0.8, expose: 0.9 }] },
      { w: 1.6, range: [0, 900], phase: 2, steps: [{ shape: 'orbit', n: 9, orbitR: 84, hold: 0.8, stagger: 0.16, speed: 560, homing: 0.7, windup: 0.5, dmg: 9, post: 26, recover: 0.6 }] },
      { w: 2.2, range: [0, 900], phase: 3, steps: [{ shape: 'teleport', windup: 0.2 }, SL(0.36, { range: 92, arc: 2.4, dmg: 12, post: 26, gap: 0.04 }), { shape: 'teleport', windup: 0.18 }, SL(0.34, { range: 92, arc: 2.4, dmg: 12, post: 26, gap: 0.04 }), { shape: 'teleport', windup: 0.18 }, SL(0.7, { range: 100, arc: 2.6, dmg: 16, post: 44, recover: 0.7, expose: 0.8 })] }
    ] },
  ryujin: { name: 'Ryūjin', title: 'King Beneath the Waves', g: '龍神', diff: 4, hp: 15000, post: 560, pregen: 34, lives: 3, speed: 210, r: 44, col: '#3f8f7a', accent: '#ffd36b', ash: 160, block: 0.2, counter: 2, pref: 170, draw: 'ryujin', heavy: true,
    lore: 'The sea answers him. Tidal walls sweep the courtyard; find the gap, or be dragged into the whirlpool.',
    atks: [
      // Coil and bite: a huge tail sweep, a lunging bite, then a read
      { w: 3, range: [0, 210], steps: [SL(0.6, { range: 165, arc: 4.4, dmg: 14, post: 34, approach: 0.3 }), TH(0.34, { len: 260, width: 64, dmg: 14, post: 34, gap: 0.05 }), { branch: [[{ shape: 'slam', radius: 160, windup: 0.5, dmg: 17, post: 42, recover: 0.7 }], [SL(0.32, { range: 165, arc: 4.4, dmg: 15, post: 36, recover: 0.75, expose: 0.7 })], [TH(0.6, { len: 560, width: 70, perilous: true, dmg: 18, recover: 0.85, expose: 1.0 })]] }] },
      // Tidal Wave: a wall of water with one gap
      { w: 2, range: [0, 900], cdKey: 'wave', cd: 7, steps: [{ shape: 'wave', count: 1, speed: 470, thick: 44, gapW: 130, delay: 0.75, windup: 0.5, dmg: 16, recover: 0.5 }] },
      // Whirlpool: pulls you toward its heart, which bursts
      { w: 1.8, range: [0, 900], cdKey: 'whirl', cd: 8, steps: [{ shape: 'whirl', radius: 220, burstR: 80, life: 1.7, pull: 150, windup: 0.45, dmg: 17, recover: 0.5 }] },
      { w: 1.6, range: [200, 900], steps: [TH(0.7, { len: 640, width: 80, perilous: true, dmg: 18, recover: 0.9, expose: 1.0 })] },
      { w: 2, range: [0, 900], steps: [{ shape: 'shot', style: 'bubble', count: 7, spread: 0.32, speed: 270, curve: 0.9, life: 3.6, windup: 0.6, dmg: 11, post: 36, recover: 0.7 }] },
      { w: 1.2, range: [0, 900], phase: 2, cdKey: 'summon', cd: 15, steps: [{ shape: 'summon', what: 'lancer', n: 2, windup: 0.7, recover: 0.5 }] },
      { w: 1.6, range: [0, 900], phase: 2, cdKey: 'wave', cd: 7, steps: [{ shape: 'wave', count: 2, stagger: 0.9, speed: 500, thick: 44, gapW: 125, delay: 0.7, windup: 0.45, dmg: 16, recover: 0.5 }] },
      { w: 1.8, range: [0, 900], phase: 3, cdKey: 'wave', cd: 7, steps: [{ shape: 'wave', count: 2, cross: true, stagger: 0.25, speed: 480, thick: 44, gapW: 140, delay: 0.75, windup: 0.4, dmg: 17, recover: 0.5 }] }
    ] },
  shogun: { name: 'The Hollow Shogun', title: 'Last Sword of a Dead Realm', g: '将軍', diff: 4, hp: 14000, post: 560, pregen: 36, lives: 3, speed: 235, r: 26, col: '#2b2f3a', accent: '#f2b544', ash: 160, block: 0.55, counter: 3, pref: 100, draw: 'shogun', heavy: true,
    lore: 'A perfect swordsman with nothing left inside. He reads you: strike into his stance and he cuts first.',
    atks: [
      { w: 3, range: [0, 155], steps: [SL(0.52, { range: 94, arc: 2.1, dmg: 12, post: 26 }), SL(0.3, { range: 94, arc: 2.1, dmg: 12, post: 26 }), { branch: [[SL(0.42, { range: 100, arc: 2.3, dmg: 14, post: 34, recover: 0.65 })], [SL(0.9, { range: 104, arc: 2.5, dmg: 18, post: 50, approach: 0.5, recover: 0.7, expose: 0.7 })], [TH(0.5, { len: 300, perilous: true, dmg: 17, recover: 0.75, expose: 0.9 })]] }] },
      { w: 1.4, range: [170, 620], steps: [TH(1.05, { len: 580, width: 36, dmg: 18, post: 46, iaido: true, recover: 0.85, expose: 0.8 })] },
      { w: 1.3, range: [0, 125], steps: [{ shape: 'slam', radius: 88, windup: 0.48, dmg: 15, post: 0, perilous: true, recover: 0.75, expose: 0.8 }] },
      { w: 1.5, range: [220, 900], steps: [{ shape: 'leap', air: 0.6, radius: 110, windup: 0.4, dmg: 16, post: 40, recover: 0.7, expose: 0.8 }] },
      // Mikiri Stance: hit him and he counter-cuts at once; wait and he draws
      { w: 1.6, range: [0, 420], cdKey: 'stance', cd: 7, steps: [{ shape: 'stance', windup: 0.25, hold: 1.3, recover: 0.05 }, TH(0.4, { len: 520, width: 36, dmg: 17, post: 44, iaido: true, recover: 0.8, expose: 0.8 })] },
      { w: 2.4, range: [0, 155], phase: 2, steps: [SL(0.46, { range: 94, arc: 2.1, dmg: 11, post: 24 }), SL(0.24, { range: 94, arc: 2.1, dmg: 11, post: 24 }), SL(0.62, { range: 94, arc: 2.1, dmg: 11, post: 24 }), SL(0.26, { range: 94, arc: 2.1, dmg: 11, post: 24 }), TH(0.48, { len: 280, perilous: true, dmg: 16, recover: 0.75, expose: 0.9 })] },
      { w: 1.6, range: [0, 190], phase: 2, steps: [{ shape: 'slam', radius: 168, windup: 0.82, dmg: 17, post: 0, perilous: true, fire: true, recover: 0.85, expose: 0.9 }] },
      // Iaido Barrage: three draw-cuts, re-aimed each time
      { w: 1.5, range: [160, 700], phase: 2, steps: [TH(0.8, { len: 520, width: 34, dmg: 15, post: 38, iaido: true, gap: 0.08 }), TH(0.42, { len: 520, width: 34, dmg: 15, post: 38, iaido: true, gap: 0.08 }), TH(0.5, { len: 560, width: 36, dmg: 17, post: 44, iaido: true, recover: 0.85, expose: 0.9 })] },
      { w: 1.4, range: [0, 900], phase: 3, cdKey: 'cuts', cd: 11, steps: [{ shape: 'xcuts', n: 7, len: 520, width: 38, delay: 0.66, stagger: 0.14, perilous: true, windup: 0.3, dmg: 16, recover: 0.9, expose: 1.2 }] },
      { w: 1.2, range: [0, 900], phase: 3, cdKey: 'clone', cd: 18, steps: [{ shape: 'clone', windup: 0.8, recover: 0.5 }] }
    ] },
  // ===================== THE DEMON COURT =====================
  shuten: { name: 'Shuten-dōji', title: 'King of the Oni', g: '酒呑童子', diff: 4, hp: 13500, post: 600, pregen: 34, lives: 3, speed: 200, r: 40, col: '#b8322a', accent: '#ffcf5a', ash: 170, block: 0.3, counter: 2, pref: 120, draw: 'oni', heavy: true,
    lore: 'Drunk, enormous, and unpredictable. His swings come early or late; trust the white flash, not the rhythm.',
    atks: [
      // Drunken String: the timing of every swing wanders
      { w: 3, range: [0, 190], steps: [SL(0.55, { range: 140, arc: 2.4, dmg: 14, post: 34, wvar: 0.45, approach: 0.6 }), SL(0.4, { range: 140, arc: 2.4, dmg: 14, post: 34, wvar: 0.5, approach: 0.6 }), { branch: [[SL(0.5, { range: 145, arc: 2.6, dmg: 16, post: 40, wvar: 0.6, recover: 0.7 })], [{ shape: 'slam', radius: 170, windup: 0.7, wvar: 0.4, dmg: 18, perilous: true, shock: 2, recover: 0.85, expose: 1.0 }]] }] },
      // Kanabo Quake: a slam you can deflect, then its shockwaves
      { w: 2, range: [0, 260], steps: [{ shape: 'slam', radius: 150, windup: 0.6, dmg: 15, post: 38, shock: 3, recover: 0.8, expose: 0.8 }] },
      // Sake Fire Breath: a burning cone sweeps across his front
      { w: 1.8, range: [0, 320], steps: [{ shape: 'breath', fire: true, range: 300, arc: 0.6, sweep: 2.2, dur: 1.0, windup: 0.65, dmg: 16, perilous: true, recover: 0.8, expose: 0.9 }] },
      { w: 1.6, range: [200, 800], steps: [TH(0.6, { len: 560, width: 70, dmg: 16, post: 40, wvar: 0.35, gap: 0.05 }), TH(0.45, { len: 560, width: 70, dmg: 16, post: 40, wvar: 0.35, recover: 0.8, expose: 0.8 })] },
      { w: 2.4, range: [0, 200], phase: 2, steps: [SL(0.45, { range: 140, arc: 2.4, dmg: 13, post: 32, wvar: 0.5, approach: 0.7 }), SL(0.3, { range: 140, arc: 2.4, dmg: 13, post: 32, wvar: 0.5, approach: 0.7 }), SL(0.3, { range: 140, arc: 2.4, dmg: 13, post: 32, wvar: 0.5, approach: 0.7 }), SL(0.3, { range: 140, arc: 2.4, dmg: 13, post: 32, wvar: 0.5, approach: 0.7 }), { shape: 'slam', radius: 170, windup: 0.55, wvar: 0.4, dmg: 17, post: 42, shock: 2, recover: 0.85, expose: 1.0 }] },
      // Oni Fire Cyclone: he spins, breathing fire all the way round
      { w: 1.4, range: [0, 300], phase: 3, cdKey: 'cyclone', cd: 10, steps: [{ shape: 'breath', fire: true, range: 260, arc: 0.7, sweep: 6.28, dur: 1.5, windup: 0.75, dmg: 17, perilous: true, recover: 0.9, expose: 1.1 }] }
    ] },
  shinigami: { name: 'Shinigami', title: 'Reaper of the Ninth Bell', g: '死神', diff: 5, hp: 12500, post: 560, pregen: 34, lives: 3, speed: 220, r: 28, col: '#1c1c26', accent: '#9ff0ff', ash: 170, block: 0.35, counter: 2, pref: 160, float: true, draw: 'reaper', heavy: true,
    lore: 'When the bell tolls, he steps out of the dark beside you, once for each toll. At the last life, the bell tolls nine times.',
    atks: [
      { w: 3, range: [0, 900], steps: [{ shape: 'blink', at: 'behind', dist: 108, windup: 0.32 }, SL(0.42, { range: 150, arc: 3.6, dmg: 14, post: 34, approach: 0.2, gap: 0.04 }), SL(0.3, { range: 150, arc: 3.6, dmg: 14, post: 34, approach: 0.2, recover: 0.7, expose: 0.8 })] },
      // The Bell Tolls: one teleport-reap for each toll
      { w: 1.8, range: [0, 900], cdKey: 'bell', cd: 9, steps: REAP(3) },
      // Scythe Throw: it spins out and comes back to his hand; deflect it both ways
      { w: 2, range: [160, 900], steps: [{ shape: 'shot', style: 'scythe', count: 1, speed: 560, boomer: 0.55, windup: 0.5, dmg: 13, post: 34, life: 3, recover: 0.5 }] },
      { w: 1.3, range: [0, 200], steps: [SL(0.75, { range: 175, arc: 5.0, dmg: 17, post: 0, perilous: true, approach: 0.2, recover: 0.9, expose: 1.0 })] },
      { w: 2, range: [0, 900], phase: 2, cdKey: 'bell', cd: 10, steps: REAP(5) },
      { w: 1.6, range: [160, 900], phase: 2, steps: [{ shape: 'shot', style: 'scythe', count: 2, spread: 0.6, speed: 560, boomer: 0.55, windup: 0.5, dmg: 13, post: 34, life: 3, recover: 0.5 }] },
      { w: 2.2, range: [0, 900], phase: 3, cdKey: 'bell', cd: 12, steps: REAP(9, { dmg: 12 }) }
    ] },
  karasu: { name: 'Karasu-Tengu', title: 'Lord of the Crow Wind', g: '烏天狗', diff: 5, hp: 12000, post: 560, pregen: 36, lives: 3, speed: 280, r: 26, col: '#262a3a', accent: '#ff4a3a', ash: 170, block: 0.4, counter: 3, pref: 140, draw: 'tengu', heavy: true,
    lore: 'The master of the trick the novice was so proud of. He is never where you last saw him.',
    atks: [
      // Murder of Crows: four blinks around you, a cut from each
      { w: 3, range: [0, 900], steps: [...BLINKCUT('random', 0.3, { cw: 0.32 }), ...BLINKCUT('side', 0.16, { cw: 0.26 }), ...BLINKCUT('behind', 0.16, { cw: 0.26 }), { shape: 'blink', at: 'far', dist: 130, windup: 0.16 }, TH(0.32, { len: 320, width: 40, dmg: 14, post: 34, recover: 0.7, expose: 0.9 })] },
      // Crow Volley: crows dive at you from the edges of the courtyard
      { w: 2.2, range: [0, 900], steps: [{ shape: 'edgevolley', n: 8, stagger: 0.16, speed: 620, windup: 0.5, dmg: 9, post: 26, recover: 0.6 }] },
      { w: 2, range: [0, 160], steps: [SL(0.42, { range: 98, arc: 2.2, dmg: 12, post: 28, approach: 0.6 }), SL(0.22, { range: 98, arc: 2.2, dmg: 12, post: 28, approach: 0.6 }), { branch: [[{ shape: 'blink', at: 'behind', dist: 100, windup: 0.14 }, SL(0.3, { range: 104, arc: 2.4, dmg: 14, post: 34, recover: 0.7, expose: 0.8 })], [TH(0.5, { len: 340, width: 40, perilous: true, dmg: 16, recover: 0.8, expose: 0.9 })]] }] },
      // Gale Fan: a wall of wind, then a swoop
      { w: 1.6, range: [0, 520], steps: [{ shape: 'ring', speed: 520, thick: 22, max: 760, windup: 0.5, dmg: 11, post: 30, perilous: false, gap: 0.1 }, { shape: 'leap', air: 0.4, radius: 110, windup: 0.18, dmg: 14, post: 34, recover: 0.7, expose: 0.8 }] },
      { w: 2.4, range: [0, 900], phase: 2, steps: [...BLINKCUT('random', 0.26, { cw: 0.3 }), ...BLINKCUT('side', 0.14, { cw: 0.24 }), ...BLINKCUT('behind', 0.14, { cw: 0.24 }), ...BLINKCUT('far', 0.14, { cw: 0.24, dist: 120 }), ...BLINKCUT('side', 0.14, { cw: 0.24 }), { shape: 'blink', at: 'behind', dist: 100, windup: 0.14 }, SL(0.4, { range: 110, arc: 2.8, dmg: 16, post: 40, recover: 0.8, expose: 1.0 })] },
      { w: 1.4, range: [0, 900], phase: 2, cdKey: 'dive', cd: 10, steps: [{ shape: 'drop', n: 1, radius: 130, gap: 0.5, delay: 0.95, dmg: 18, perilous: true, windup: 0.4 }, { shape: 'ring', speed: 520, thick: 22, max: 760, windup: 0.12, dmg: 11, post: 30, perilous: false, recover: 0.8, expose: 1.0 }] },
      { w: 1.6, range: [0, 900], phase: 3, steps: [{ shape: 'edgevolley', n: 14, stagger: 0.1, speed: 660, windup: 0.4, dmg: 9, post: 24, gap: 0.2 }, ...BLINKCUT('behind', 0.2, { cw: 0.3, sl: { recover: 0.8, expose: 0.9 } })] }
    ] },
  // ===================== HEAVEN'S EDGE =====================
  hannya: { name: 'Hannya', title: 'The Jealous Flame', g: '般若', diff: 5, hp: 13000, post: 580, pregen: 36, lives: 3, speed: 290, r: 24, col: '#f0e8e0', accent: '#ff3a5a', ash: 200, block: 0.45, counter: 2, pref: 130, draw: 'hannya', heavy: true,
    lore: 'Jealousy made flesh. Every cut she makes is answered by its mirror from the other side of you.',
    atks: [
      // Mirror Fury: blink, cut, and the mirror of that cut comes from your other side
      { w: 3, range: [0, 900], steps: [{ shape: 'blink', at: 'side', dist: 100, windup: 0.3 }, SL(0.34, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.42, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'behind', dist: 100, windup: 0.18 }, SL(0.3, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.42, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'random', dist: 100, windup: 0.18 }, SL(0.4, { range: 110, arc: 2.6, dmg: 14, post: 36, mirror: 0.42, approach: 0.3, recover: 0.8, expose: 0.9 })] },
      // Flame Serpents: fire that snakes toward you
      { w: 2, range: [0, 900], steps: [{ shape: 'shot', style: 'flame', count: 6, spread: 0.5, speed: 380, snake: 1.6, homing: 0.5, life: 3, windup: 0.55, dmg: 10, post: 28, recover: 0.6 }] },
      // Rage Dash: two flash-steps straight through you; the cut lands a beat later
      { w: 2, range: [120, 700], steps: [{ shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.34, windup: 0.5, dmg: 13, post: 32, gap: 0.1 }, { shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.34, windup: 0.3, dmg: 13, post: 32, recover: 0.75, expose: 0.9 }] },
      { w: 1.6, range: [0, 150], steps: [SL(0.4, { range: 96, arc: 2.4, dmg: 12, post: 28, approach: 0.7 }), SL(0.22, { range: 96, arc: 2.4, dmg: 12, post: 28, approach: 0.7 }), TH(0.5, { len: 320, width: 44, perilous: true, dmg: 17, recover: 0.8, expose: 0.9 })] },
      { w: 2.4, range: [0, 900], phase: 2, steps: [{ shape: 'blink', at: 'side', dist: 100, windup: 0.26 }, SL(0.3, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.38, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'far', dist: 110, windup: 0.14 }, SL(0.26, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.38, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'behind', dist: 100, windup: 0.14 }, SL(0.26, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.38, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'side', dist: 100, windup: 0.14 }, SL(0.26, { range: 104, arc: 2.3, dmg: 12, post: 30, mirror: 0.38, approach: 0.3, gap: 0.04 }), { shape: 'blink', at: 'random', dist: 100, windup: 0.14 }, SL(0.4, { range: 110, arc: 2.6, dmg: 15, post: 38, mirror: 0.38, approach: 0.3, recover: 0.85, expose: 1.0 })] },
      { w: 1.6, range: [0, 900], phase: 3, cdKey: 'rage', cd: 9, steps: [{ shape: 'flashstep', len: 560, over: 170, width: 40, delay: 0.32, windup: 0.45, dmg: 13, post: 32, gap: 0.06 }, { shape: 'flashstep', len: 560, over: 170, width: 40, delay: 0.32, windup: 0.22, dmg: 13, post: 32, gap: 0.06 }, { shape: 'flashstep', len: 560, over: 170, width: 40, delay: 0.32, windup: 0.22, dmg: 13, post: 32, gap: 0.06 }, { shape: 'flashstep', len: 560, over: 170, width: 52, delay: 0.4, windup: 0.3, dmg: 17, perilous: true, recover: 0.9, expose: 1.1 }] }
    ] },
  susanoo: { name: 'Susanoo', title: 'Kami of the Storm', g: '須佐之男', diff: 6, hp: 15000, post: 620, pregen: 38, lives: 3, speed: 260, r: 30, col: '#2a3a6a', accent: '#9fd8ff', ash: 220, block: 0.4, counter: 3, pref: 150, draw: 'susanoo', heavy: true,
    lore: 'He travels as lightning. Dodge the bolt (red), then turn and deflect the god that steps out of it (yellow).',
    atks: [
      // Thunder Step: he strikes as lightning, then steps out of the bolt with a cut
      { w: 3, range: [0, 900], steps: BOLTS(3) },
      // Sword Gale: crescents of wind from the Kusanagi blade
      { w: 2, range: [140, 900], steps: [{ shape: 'shot', style: 'gale', count: 3, spread: 0.32, speed: 540, windup: 0.55, dmg: 12, post: 34, life: 2.2, gap: 0.12 }, { shape: 'shot', style: 'gale', count: 3, spread: 0.32, speed: 540, windup: 0.3, dmg: 12, post: 34, life: 2.2, recover: 0.6 }] },
      // Storm Cage: lightning walls close around you, then he steps inside
      { w: 1.6, range: [0, 900], cdKey: 'cage', cd: 10, steps: [{ shape: 'grid', off: 120, len: 900, width: 30, delay: 0.85, windup: 0.4, dmg: 15, gap: 0.05 }, ...BOLTS(1)] },
      { w: 2, range: [0, 170], steps: [SL(0.42, { range: 112, arc: 2.4, dmg: 13, post: 30, approach: 0.6 }), SL(0.24, { range: 112, arc: 2.4, dmg: 13, post: 30, approach: 0.6 }), { branch: [[SL(0.3, { range: 118, arc: 2.6, dmg: 15, post: 36, recover: 0.7 })], [{ shape: 'slam', radius: 160, windup: 0.6, dmg: 17, perilous: true, lightning: true, recover: 0.85, expose: 1.0 }]] }] },
      { w: 2.4, range: [0, 900], phase: 2, steps: BOLTS(5) },
      { w: 1.4, range: [0, 900], phase: 2, steps: [{ shape: 'lob', pattern: 'grid', radius: 62, delay: 0.85, windup: 0.4, dmg: 15, perilous: true, lightning: true, gap: 0.1 }, ...BOLTS(1)] },
      // Heaven Splitter: flash-steps through you, then a bolt to finish
      { w: 1.8, range: [0, 900], phase: 3, cdKey: 'split', cd: 9, steps: [{ shape: 'flashstep', len: 600, over: 180, width: 44, delay: 0.32, windup: 0.4, dmg: 14, post: 34, gap: 0.05 }, { shape: 'flashstep', len: 600, over: 180, width: 44, delay: 0.32, windup: 0.2, dmg: 14, post: 34, gap: 0.05 }, { shape: 'flashstep', len: 600, over: 180, width: 44, delay: 0.32, windup: 0.2, dmg: 14, post: 34, gap: 0.05 }, ...BOLTS(2)] }
    ] },
  kensei: { name: 'The Sword Saint', title: 'Who Has Never Lost', g: '剣聖', diff: 6, hp: 16000, post: 680, pregen: 40, lives: 3, speed: 300, r: 24, col: '#f4f0e6', accent: '#ffd36b', ash: 260, block: 0.55, counter: 2, pref: 110, draw: 'kensei', heavy: true,
    lore: 'The last gate. Every technique you have learned, used against you faster and better. Deflect everything.',
    atks: [
      { w: 3, range: [0, 160], steps: [SL(0.38, { range: 100, arc: 2.2, dmg: 13, post: 30, approach: 0.7 }), SL(0.2, { range: 100, arc: 2.2, dmg: 13, post: 30, approach: 0.6 }), SL(0.2, { range: 100, arc: 2.2, dmg: 13, post: 30, approach: 0.6 }), { branch: [[{ shape: 'flashstep', len: 480, over: 150, width: 40, delay: 0.3, windup: 0.32, dmg: 14, post: 34, recover: 0.75, expose: 0.9 }], [TH(0.45, { len: 340, width: 44, perilous: true, dmg: 18, recover: 0.8, expose: 0.9 })], [{ shape: 'stance', windup: 0.15, hold: 0.9, recover: 0.05 }, TH(0.32, { len: 520, width: 36, dmg: 17, post: 44, iaido: true, recover: 0.8, expose: 0.9 })]] }] },
      // Flash Step: three passes straight through you, then a turning cut
      { w: 2.4, range: [0, 900], steps: [{ shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.3, windup: 0.42, dmg: 13, post: 32, gap: 0.05 }, { shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.3, windup: 0.2, dmg: 13, post: 32, gap: 0.05 }, { shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.3, windup: 0.2, dmg: 13, post: 32, gap: 0.05 }, SL(0.32, { range: 110, arc: 2.6, dmg: 15, post: 38, approach: 0.8, recover: 0.75, expose: 0.9 })] },
      { w: 1.6, range: [0, 420], cdKey: 'stance', cd: 6, steps: [{ shape: 'stance', windup: 0.2, hold: 1.1, recover: 0.05, counterW: 0.24 }, TH(0.34, { len: 560, width: 36, dmg: 17, post: 44, iaido: true, recover: 0.8, expose: 0.8 })] },
      { w: 1.6, range: [0, 900], steps: [...BLINKCUT('behind', 0.24, { cw: 0.3 }), ...BLINKCUT('side', 0.16, { cw: 0.26, sl: { recover: 0.7, expose: 0.8 } })] },
      // Severing Heaven: cuts that cross the whole courtyard
      { w: 1.6, range: [0, 900], phase: 2, cdKey: 'sever', cd: 10, steps: [{ shape: 'xcuts', n: 4, len: 1700, width: 36, delay: 0.7, stagger: 0.22, perilous: true, windup: 0.3, dmg: 17, gap: 0.05 }, { shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.3, windup: 0.25, dmg: 14, post: 34, recover: 0.8, expose: 1.0 }] },
      { w: 1.6, range: [0, 900], phase: 2, cdKey: 'mirage', cd: 10, steps: [{ shape: 'mirage', n: 6, len: 460, width: 40, delay: 0.55, stagger: 0.26, windup: 0.3, dmg: 12, post: 30, recover: 0.8, expose: 1.0 }] },
      // One Sword: from across the courtyard, a single draw-cut the length of the world
      { w: 1.4, range: [0, 900], phase: 3, cdKey: 'ichi', cd: 9, steps: [{ shape: 'blink', at: 'far', dist: 360, windup: 0.3 }, TH(0.85, { len: 1300, width: 56, perilous: true, dmg: 20, iaido: true, gap: 0.05 }), { shape: 'flashstep', len: 520, over: 160, width: 40, delay: 0.3, windup: 0.3, dmg: 14, post: 34, recover: 0.85, expose: 1.1 }] }
    ] }
};

const BOSS_RESOLVE = 0.045; // fraction of a boss life's HP per second it takes in full before Resolve softens raw burst
const BOSS_TIERS = [['kagero', 'jorogumo', 'nue'], ['mother', 'raijin', 'yukionna'], ['shogun', 'kitsune', 'ryujin']];
// past wave 15 the run's endless bosses come from the demon court and beyond, harder the longer you last
const BOSS_HARD = [{ id: 'shuten', from: 20 }, { id: 'shinigami', from: 20 }, { id: 'karasu', from: 20 }, { id: 'hannya', from: 25 }, { id: 'susanoo', from: 30 }, { id: 'kensei', from: 30 }];
// Boss Rush: four gauntlets, each unlocked by clearing the one before. vw = the wave each fight is scaled as.
const GAUNTLETS = [
  { id: 'road', name: "The Initiate's Road", g: '道', col: '#d8c8a0', bosses: ['kenji', 'kotengu', 'gashadokuro', 'jorogumo', 'kagero', 'nue'], vw: [2, 3, 4, 5, 6, 7],
    kit: { level: 3, picks: 3, ash: 140, sigils: 2, blades: 1 }, desc: 'Six duels to learn the craft: deflect, break, read the blink, and leave when it glows red.' },
  { id: 'provinces', name: 'The Haunted Provinces', g: '国', col: '#9fd8ff', bosses: ['mother', 'raijin', 'yukionna', 'kitsune', 'ryujin', 'shogun'], vw: [8, 9, 10, 11, 12, 13],
    kit: { level: 9, picks: 5, ash: 520, sigils: 3, blades: 1, ups: { maxHp: 18, dmg: 16, posture: 10 } }, desc: 'Cinders, storms, snow and tide. Each spirit fights by its own rules.' },
  { id: 'court', name: 'The Demon Court', g: '鬼', col: '#ff6a5a', biome: 2, bosses: ['shuten', 'shinigami', 'karasu'], vw: [14, 15, 15],
    kit: { level: 15, picks: 6, ash: 900, sigils: 4, blades: 1, ups: { maxHp: 34, dmg: 30, posture: 20, deflect: 15 } }, desc: 'An oni king, the reaper and the crow lord. They do not wait for you to be ready.' },
  { id: 'heaven', name: "Heaven's Edge", g: '天', col: '#ffd36b', biome: 3, bosses: ['hannya', 'susanoo', 'kensei'], vw: [15, 15, 15],
    kit: { level: 19, picks: 7, ash: 1300, sigils: 5, blades: 1, ups: { maxHp: 46, dmg: 40, posture: 28, deflect: 25 } }, desc: 'Mirror flames, the storm god, and the Sword Saint. Master every technique, or fall here.' }
];
// ---------- BOSS ASPECTS: the same boss never fights the same way twice ----------
const BOSS_ASPECTS = {
  frenzied: { name: 'Frenzied', col: '#ff5a4a', desc: 'Attacks come faster and closer together.', apply: b => { b.cdMul *= 0.75; b.wMul *= 0.92; } },
  ironclad: { name: 'Ironclad', col: '#9fb0c8', desc: '+40% posture, -15% health. Its guard is a wall.', apply: b => { b.maxPosture *= 1.4; b.maxHp *= 0.85; b.hp = b.maxHp; } },
  colossal: { name: 'Colossal', col: '#e6ecf4', desc: '+30% size and health, a little slower.', apply: b => { b.r *= 1.3; b.maxHp *= 1.3; b.hp = b.maxHp; b.speed *= 0.88; } },
  relentless: { name: 'Relentless', col: '#ff8a3a', desc: 'Every string ends with one more slash. Keep deflecting.' },
  echoing: { name: 'Echoing', col: '#c9b6ff', desc: 'Every slash repeats a beat later.' },
  vampiric: { name: 'Vampiric', col: '#ff3a5a', desc: 'Heals 3% of its health whenever it hits you.' },
  retinue: { name: 'Retinue', col: '#ffd36b', desc: 'Two elite guards join each time it loses a life.' },
  thunderclap: { name: 'Thunderclap', col: '#c9b6ff', desc: 'Often follows a string with a volley of lightning you can deflect back.' },
};
function rollBossAspects(danger) {
  const ks = Object.keys(BOSS_ASPECTS); const n = [Math.random() < 0.5 ? 1 : 0, 1, 2].map(x => x + (danger >= 3 ? 1 : 0));
  return n.map(c => shuffleArr(ks.slice()).slice(0, c));
}
const AFFIXES = {
  swift: { name: 'Swift', col: '#7fe0ff', desc: 'faster' },
  armored: { name: 'Armored', col: '#9fb0c8', desc: '-40% damage taken until broken' },
  volatile: { name: 'Volatile', col: '#ff6a3a', desc: 'explodes on death' },
  twinned: { name: 'Twinned', col: '#c9b6ff', desc: 'splits on death' },
  frenzied: { name: 'Frenzied', col: '#ff4a6a', desc: 'attacks relentlessly' },
  warded: { name: 'Warded', col: '#4fd1a5', desc: 'immune to sigils until broken' },
  vampiric: { name: 'Vampiric', col: '#d2143a', desc: 'heals when it hits you' }
};
const OMENS = [
  { id: 'calm', name: 'Still Night', g: '静', desc: 'Fewer foes (−25%).', reward: 'No reward.', mods: { spawn: 0.75 } },
  { id: 'blood', name: 'Blood Moon', g: '血', desc: 'Foes deal +35% damage.', reward: '+60% ash from kills.', mods: { dmg: 1.35, ash: 1.6 } },
  { id: 'hunt', name: 'Elite Hunt', g: '狩', desc: 'Two extra elites join the wave.', reward: 'Every elite drops a relic chest.', mods: { elites: 2 } },
  { id: 'swarm', name: 'The Swarm', g: '群', desc: '+60% foes, but they have −35% HP.', reward: '+1 level-up.', mods: { spawn: 1.6, hp: 0.65, levels: 1 } },
  { id: 'cache', name: 'Sigil Cache', g: '印', desc: 'Foes have +25% HP.', reward: 'Pick 1 of 3 sigils.', mods: { hp: 1.25, sigilPick: 1 } },
  { id: 'storm', name: 'Thunderstorm', g: '雷', desc: 'Lightning strikes the arena (red zones).', reward: 'A Rare+ relic chest.', mods: { storm: true, chest: 2 } },
  { id: 'duel', name: 'Challenger', g: '決', desc: 'A Duelist elite hunts you.', reward: 'Pick 1 of 3 blades.', mods: { duel: true, bladePick: 1 } },
  { id: 'greed', name: 'Greed', g: '金', desc: 'Foes are Swift-footed (+20% speed).', reward: '+50 ash now.', mods: { speed: 1.2, ashNow: 50 } },
  { id: 'shrine', name: 'Blood Shrine', g: '社', desc: 'Start the wave at 60% HP.', reward: 'Pick 1 of 3 sigils and +1 level-up.', mods: { startHp: 0.6, sigilPick: 1, levels: 1 } }
];
const BOSS_ORDER = ['kagero', 'mother', 'shogun'];


// ---------- ENGRAVINGS: every blade is rolled, so no two runs wield the same steel ----------
const ENGRAVINGS = {
  keen: { name: 'Keen', g: '鋭', rar: 1, desc: 'Sigils on this blade cost 25% less Ki.' },
  heavy: { name: 'Heavy', g: '重', rar: 1, desc: '+40% blade damage and posture; swings 15% slower.', mod: b => { b.dmg *= 1.4; b.post = (b.post || 1) * 1.4; b.swing *= 1.15; } },
  light: { name: 'Featherweight', g: '軽', rar: 1, desc: 'Swings 25% faster; -15% blade damage.', mod: b => { b.swing *= 0.75; b.dmg *= 0.85; } },
  long: { name: 'Long', g: '長', rar: 1, desc: '+25% reach and a wider arc.', mod: b => { b.reach *= 1.25; b.arc = (b.arc || 1) * 1.15; } },
  warding: { name: 'Warding', g: '護', rar: 1, desc: 'Deflect window +40ms.' },
  ember: { name: 'Emberforged', g: '炉', rar: 1, res: 'flame', desc: 'Everything it casts applies Burn. +1 Flame Resonance.', imbue: M => { M.burn += 1; } },
  rimed: { name: 'Rimed', g: '霜', rar: 1, res: 'frost', desc: 'Everything it casts applies Chill. +1 Frost Resonance.', imbue: M => { M.chill += 1; } },
  charged: { name: 'Charged', g: '電', rar: 1, res: 'storm', desc: 'Everything it casts applies Shock. +1 Storm Resonance.', imbue: M => { M.shock += 1; } },
  thirsting: { name: 'Thirsting', g: '渇', rar: 1, res: 'blood', desc: 'Everything it casts applies Bleed. +1 Blood Resonance.', imbue: M => { M.bleed += 1; } },
  haunted: { name: 'Haunted', g: '霊', rar: 1, res: 'spirit', desc: 'Its projectiles seek foes. +1 Spirit Resonance.', imbue: M => { M.homing += 3; } },
  wild: { name: 'Wild', g: '乱', rar: 2, desc: 'Its chain is shuffled every cycle, but +1 slot and +1 draw.', mod: b => { b.shuffle = true; b.slots += 1; b.draw += 1; } },
  capacious: { name: 'Capacious', g: '容', rar: 2, desc: '+2 slots.', mod: b => { b.slots += 2; } },
  greedy: { name: 'Greedy', g: '貪', rar: 2, desc: '+1 draw per swing, but its sigils cost 30% more Ki.', mod: b => { b.draw += 1; } },
  echoing: { name: 'Echoing', g: '響', rar: 2, desc: 'Every 3rd swing casts its drawn sigils twice.' },
  forked: { name: 'Forked', g: '岐', rar: 2, desc: 'Its projectiles split in two on their first hit.', imbue: M => { M.split = true; } },
  tempest: { name: 'Tempest', g: '颶', rar: 2, desc: '+50% projectile speed and +30% range.', imbue: M => { M.speed *= 1.5; M.life *= 1.3; } },
  hungry: { name: 'Hungry', g: '餓', rar: 2, desc: 'Grows +1 slot for every 35 kills while you wield it (up to +3).' },
  bound: { name: 'Bound', g: '縛', rar: 2, desc: 'Always casts its bound sigil for free.' },
  cyclic: { name: 'Cyclic', g: '巡', rar: 3, desc: 'Each completed chain cycle grants +12% damage for 6s (stacks 3).' },
  duelists: { name: "Duelist's", g: '決', rar: 3, desc: 'Ripostes and dash strikes cast the drawn sigils twice.' },
  overflow: { name: 'Overflowing', g: '溢', rar: 3, desc: 'Finishers also cast your whole Strike chain at 50% damage, free.' },
  twinned: { name: 'Two-faced', g: '双', rar: 3, desc: 'Every swing also casts its drawn sigils behind you.' },
  thunderous: { name: 'Thunderous', g: '雷', rar: 3, desc: 'Finishers call lightning on up to 3 foes near you.' },
};
function rollEngravings(rar, n) {
  const count = n ?? (rar <= 1 ? 1 : rar === 2 ? (Math.random() < 0.55 ? 1 : 2) : rar === 3 ? 2 : 3);
  const pool = Object.keys(ENGRAVINGS).filter(k => ENGRAVINGS[k].rar <= Math.max(1, rar) + (rar >= 3 ? 1 : 0));
  const out = [];
  for (const k of shuffleArr(pool)) {
    if (out.length >= count) break;
    if (out.some(o => o.id === k) || (k === 'light' && out.some(o => o.id === 'heavy')) || (k === 'heavy' && out.some(o => o.id === 'light'))) continue;
    const e = { id: k };
    if (k === 'bound') { const c = SIG_LIST.filter(x => (x.type === 'proj' || x.type === 'mod') && !x.hp && x.rar <= Math.max(2, rar) && x.fire !== undefined || (x.type === 'mod' && x.rar <= 2)); e.sig = pick(c.filter(x => x.type === 'proj' || x.type === 'mod')).id; }
    out.push(e);
  }
  return out;
}
const engLabel = (e) => ENGRAVINGS[e.id].name + (e.sig ? ` (${SIG[e.sig].name})` : '');

// ---------- FORTUNES: the Gambler rolls one every wave ----------
const FORTUNES = {
  lucky7: { name: 'Lucky Seven', g: '七', good: true, desc: '+77% ash this wave.', ash: 1.77 },
  double: { name: 'Double or Nothing', g: '倍', desc: '+60% damage dealt, +60% damage taken.', stat: s => { s.dmg += 60; s.dmgTaken += 60; } },
  freeink: { name: 'Free Ink', g: '墨', desc: 'Sigils cost no Ki or HP this wave, but -30% Max HP.', stat: s => { s.freeInk = true; s.maxHp = Math.round(s.maxHp * 0.7); } },
  loaded: { name: 'Loaded Dice', g: '賽', good: true, desc: '+40% crit chance.', stat: s => { s.crit += 40; } },
  house: { name: 'House Edge', g: '胴', desc: '+2 sigils drawn per swing, but sigils cost 50% more Ki.', stat: s => { s.draw += 2; s.kiCostMul = (s.kiCostMul || 1) * 1.5; } },
  jackpot: { name: 'Jackpot', g: '当', good: true, desc: 'Deathblows drop extra ash and heal 3.', jackpot: true },
  snake: { name: 'Snake Eyes', g: '蛇', desc: 'Elites come twice as often and drop triple ash.', snake: true },
  bust: { name: 'Bust', g: '外', desc: '-25% damage this wave, but +150 ash when it ends.', stat: s => { s.dmg -= 25; }, bonus: 150 },
};

// ---------- SCHOOLS (the connective tissue between sigils, stats, relics, blades and vessels) ----------
const SCHOOLS = {
  flame: { name: 'Flame', g: '炎', col: '#ff8a3a', blurb: 'Burn, explosions, fire on everything.', tiers: ['Burn deals +50% damage.', 'Burning foes explode when they die.', 'Every hit on a burning foe adds +1 Burn. Burn stacks to 20.'] },
  frost: { name: 'Frost', g: '氷', col: '#8fd8ff', blurb: 'Chill, freeze, shatter, control.', tiers: ['Chilled foes wind up their attacks 20% slower.', 'Frozen foes take +50% damage. Deathblows spread 3 Chill nearby.', 'Perfect parries apply 3 Chill. Freezes last twice as long.'] },
  storm: { name: 'Storm', g: '雷', col: '#c9b6ff', blurb: 'Shock, chains, speed, lightning.', tiers: ['Shock arcs to 1 more foe.', 'Every 8th hit calls lightning down on the target.', 'Critical hits Shock.'] },
  steel: { name: 'Steel', g: '鋼', col: '#e6ecf4', blurb: 'The blade itself: posture, crits, ripostes.', tiers: ['+25% posture damage.', 'Finishers loose a free Crescent Wave.', 'Ripostes and dash strikes deal double damage. Parries refund a dash.'] },
  blood: { name: 'Blood', g: '血', col: '#ff3a5a', blurb: 'Bleed, lifesteal, power at a price.', tiers: ['+3% lifesteal.', 'Hemorrhage triggers at 4 Bleed and heals you 2 HP.', 'Below half HP you deal +40% damage. HP-cost sigils are free.'] },
  spirit: { name: 'Spirit', g: '魂', col: '#7fffd4', blurb: 'Summons, homing, triggers, Focus.', tiers: ['Summons last 50% longer; up to 8 wisps.', 'Perfect parries summon a Spirit Wisp.', 'Focus Thrusts and Mikiri release 4 Phantom Blades. +1 max Focus.'] }
};
const SCHOOL_IDS = Object.keys(SCHOOLS);
const RES_T = [2, 4, 6];
const SIG_SCHOOL = {
  flame: ['ember', 'breath', 'blackflame', 'meteor', 'bomb_t', 'geyser', 'mine', 'm_ignite', 'm_trail', 'm_volatile'],
  frost: ['frost', 'icelance', 'gale', 'tornado', 'hail', 'glacier', 'm_freeze', 'u_ward', 'u_mend'],
  storm: ['chain', 'tspear', 'storm', 'lance', 'spark', 'spark_t', 'm_shock', 'm_chain', 'm_accel', 'm_swift', 'u_haste', 'u_well'],
  steel: ['wave', 'shuriken', 'kunai', 'needles8', 'echo', 'shockwave', 'disc', 'hook', 'blades3', 'm_heavy', 'm_keen', 'm_crush', 'm_exec', 'm_pierce', 'm_bounce', 'm_giant', 'm_scatter', 'u_infuse', 'u_step', 'u_blink'],
  blood: ['thorns', 'bloodspear', 'crimson', 'miasma', 'leech', 'bloodburst', 'm_serrate', 'm_vamp', 'm_split', 'u_frenzy'],
  spirit: ['ghost', 'wisp', 'orb', 'singularity', 'shikigami', 'spiritball', 'sakura', 'arrows', 'wild', 'm_seek', 'm_orbit', 'm_boomer', 'm_link', 'm_echo', 'm_timer', 'm_ring', 'm_spectral', 'u_focus']
};
// how strongly each damaging sigil scales with its school's power (multi-hit sigils scale less per hit)
const SIG_COEF = { spark: 0.8, spark_t: 0.7, wave: 0.8, ember: 1, frost: 0.4, chain: 0.7, orb: 0.25, thorns: 0.25, ghost: 0.6, disc: 0.7, mine: 1.2, meteor: 1.5, echo: 0.9, wisp: 0.4, lance: 1, shuriken: 0.3, bomb_t: 0.8,
  bloodspear: 1.2, geyser: 0.9, gale: 0.2, breath: 0.3, singularity: 0.3, storm: 0.6, sakura: 0.35, kunai: 0.5, crimson: 1.3, tornado: 0.15, icelance: 1, hook: 0.6, arrows: 0.4, blackflame: 1, blades3: 0.4,
  shockwave: 0.8, tspear: 1.1, spiritball: 0.6, shikigami: 0.4, needles8: 0.2, miasma: 0.15, hail: 0.3, glacier: 0.5, leech: 0.6, bloodburst: 1, wild: 0.6 };
const SIG_BASE = { spark: 7, spark_t: 6, wave: 11, ember: 8, frost: 4, chain: 8, orb: 4, thorns: 5, ghost: 8, disc: 6, mine: 22, meteor: 32, echo: 10, wisp: 4, lance: 14, shuriken: 3, bomb_t: 10, bloodspear: 26, geyser: 13, gale: 3, breath: 4, singularity: 60, storm: 18, sakura: 5,
  kunai: 5, crimson: 22, tornado: 3, icelance: 12, hook: 6, arrows: 7, blackflame: 10, blades3: 5, shockwave: 10, tspear: 16, spiritball: 7, shikigami: 5, needles8: 3, miasma: 2, hail: 5, glacier: 12, leech: 6, bloodburst: 18 };
for (const k of SCHOOL_IDS) for (const id of SIG_SCHOOL[k]) if (SIG[id]) SIG[id].school = k;
for (const s of SIG_LIST) { if (SIG_COEF[s.id] !== undefined) s.coef = SIG_COEF[s.id]; if (SIG_BASE[s.id] !== undefined) s.base = SIG_BASE[s.id]; }
const RELIC_SCHOOL = { lantern: 'flame', wrath: 'flame', frostbite: 'frost', stillwater: 'frost', dragonscale: 'frost', calm: 'frost', coil: 'storm', bell: 'storm', stormeye: 'storm', kisiphon: 'storm', gem: 'storm', thunderclap: 'storm',
  whetstone: 'steel', riposte: 'steel', anatomy: 'steel', windscroll: 'steel', execute: 'steel', ancient: 'steel', gambit: 'steel', thread: 'blood', oath: 'blood', plague: 'blood', bloodink: 'blood', glassheart: 'blood', hungry: 'blood', bramble: 'blood',
  sakura: 'spirit', kitsune: 'spirit', lotus: 'spirit', echostone: 'spirit', banner: 'spirit', focuslens: 'spirit', timesilk: 'spirit',
  bone: 'steel', sash: 'steel', mirror: 'steel', moons: 'steel', ironwill: 'steel', hunterseye: 'steel', glass: 'storm', drum: 'storm', tempo: 'storm', sheath: 'storm', crane: 'storm',
  phoenix: 'flame', ashheart: 'flame', trophy: 'blood', shadowstep: 'blood', oni: 'blood', spring: 'spirit', hourglass: 'spirit' };
for (const id in RELIC_SCHOOL) if (RELICS[id]) RELICS[id].school = RELIC_SCHOOL[id];
const BLADE_SCHOOL = { thunder: 'storm', sunfire: 'flame', frostfang: 'frost', reaver: 'blood', moonveil: 'steel', bellblade: 'spirit', muramasa: 'blood', scythe: 'blood', yari: 'steel', nodachi: 'steel', kanabo: 'steel', chaos: 'spirit', prism: 'spirit', fan: 'frost', fangs: 'storm', kusari: 'steel' };
for (const id in BLADE_SCHOOL) if (BLADES[id]) BLADES[id].school = BLADE_SCHOOL[id];
const VESSEL_RES = { maneki: { spirit: 1 }, taiko: { storm: 1 }, sumi: { spirit: 1 }, daruma: { steel: 1 }, hitodama: { spirit: 1 }, twin: { steel: 1 }, iai: { steel: 1 }, priest: { blood: 1 }, kage: { spirit: 1 }, gambler: { spirit: 1 }, ronin: { steel: 1 }, hexwright: { spirit: 1 }, duelist: { steel: 1 }, oni: { steel: 1 }, shade: { blood: 1 }, tengu: { storm: 1 } };
for (const v of VESSELS) v.res = VESSEL_RES[v.id] || {};

// ---------- RARITY / PRICES ----------
function rollRarity(wave, luck, min = 1) {
  const l = 1 + Math.max(-50, luck) / 100;
  const leg = clamp((wave - 6) * 0.012, 0, 0.12) * l;
  const epi = clamp((wave - 2) * 0.03, 0, 0.32) * l;
  const rar = clamp(0.14 + wave * 0.035, 0, 0.5) * l;
  const r = Math.random(); let t = 1;
  if (r < leg) t = 4; else if (r < leg + epi) t = 3; else if (r < leg + epi + rar) t = 2;
  return Math.max(min, t);
}
const BASE_PRICE = { sigil: [0, 12, 24, 42, 72], relic: [0, 16, 32, 56, 95], blade: [0, 22, 40, 66, 105] };
function priceOf(kind, rar) { const w = G.run && G.run.rush ? rushWave(G.wave + 1) : (G.wave || 1); return Math.max(1, Math.round(BASE_PRICE[kind][rar] * (1 + 0.09 * (w - 1)) * (G.S ? G.S.priceMul : 1))); }
