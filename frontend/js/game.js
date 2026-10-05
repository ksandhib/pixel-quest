// Engine: level, physics, collision, enemies, camera, rendering
const W = 960, H = 540, GY = 480, cv = document.getElementById('gameCanvas'), cx = cv.getContext('2d');
const K = {}, G = { scene: 'menu', idx: 0, t: 0, cam: 0, levelNo: 0, levels: ['world1-1'], msg: '', score: 0, coins: 0, lives: 3, kills: 0, scores: [], rects: [], solids: [], blocks: [], movers: [], enemies: [], items: [], fx: [], cps: [], coinsL: [] };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v)), wrap = (v, n) => ((v % n) + n) % n, pad = (n, l) => String(n).padStart(l, '0');
const hit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const solidAt = (x, y) => G.solids.some(s => x >= s.x && x <= s.x + s.w && y >= s.y && y <= s.y + s.h);
const R = (x, y, w, h, c) => { cx.fillStyle = c; cx.fillRect(Math.round(x), Math.round(y), w, h); };
function T(s, x, y, sz, c, al) { cx.font = 'bold ' + sz + 'px "Courier New",monospace'; cx.textAlign = al || 'left'; cx.fillStyle = '#000'; cx.fillText(s, x + 2, y + 2); cx.fillStyle = c || '#fff'; cx.fillText(s, x, y); }
const ESPEC = { crawler: { w: 28, h: 24, vx: -60 }, bug: { w: 28, h: 20, vx: -70 }, armored: { w: 32, h: 30, vx: -35 } };

async function loadLevel(n) {
  try {
    const L = await (await fetch('/levels/' + n + '.json')).json();
    if (!L.width || !L.ground || !L.goal) throw 0;
    G.L = L; return true;
  } catch (e) { G.msg = 'COULD NOT LOAD LEVEL'; return false; }
}
function build() {
  const L = G.L, add = o => (G.solids.push(o), o); G.solids = [];
  L.ground.forEach(([a, b]) => add({ x: a, y: GY, w: b - a, h: 60, t: 'g' }));
  (L.platforms || []).forEach(p => add({ x: p.x, y: p.y, w: p.w, h: p.h || 20, t: 'p' }));
  G.blocks = (L.blocks || []).map(b => add({ x: b.x, y: b.y, w: 32, h: 32, t: b.kind === 'q' ? 'q' : 'b', rw: b.reward || 'coin', used: 0, bump: 0 }));
  (L.pipes || []).forEach(p => add({ x: p.x, y: GY - p.h, w: 64, h: p.h, t: 'pipe' }));
  G.movers = (L.movers || []).map(m => add({ ox: m.x, oy: m.y, x: m.x, y: m.y, w: m.w, h: 16, t: 'm', dx: m.dx, dy: m.dy, sp: m.speed, dX: 0, dY: 0 }));
  G.coinsL = (L.coins || []).map(c => ({ x: c.x, y: c.y, w: 16, h: 16, got: 0 }));
  G.enemies = (L.enemies || []).map(e => { const s = ESPEC[e.type] || ESPEC.crawler; return { t: e.type, x: e.x, x0: e.x, y: e.y, y0: e.y, w: s.w, h: s.h, vx: s.vx, vy: 0, g: 0, dead: 0, dt: 0 }; });
  G.items = []; G.fx = []; G.t = 0; G.cps = (L.checkpoints || []).map(x => ({ x, on: 0 }));
}
function respawn() {
  const c = G.cp; G.score = c.score; G.coins = c.coins; G.time = G.L.time || 300;
  G.p = { isP: 1, x: c.x, y: c.y, w: 24, h: 32, vx: 0, vy: 0, g: 0, face: 1, hp: 1, power: 0, spd: 0, inv: 2, dead: 0, dt: 0, jh: 0, land: 0, anim: 'idle', ride: null };
  G.cam = clamp(c.x - W * .4, 0, G.L.width - W);
}
function beginLevel() {
  G.s0 = { score: G.score, coins: G.coins }; build();
  G.cp = { x: G.L.spawn ? G.L.spawn.x : 100, y: GY - 40, score: G.score, coins: G.coins };
  G.scene = 'play'; respawn(); Audio_.music();
}
function fx(x, y, txt) { G.fx.push({ x, y, txt, life: .9 }); }

// Collision: X and Y resolved separately (AABB)
function move(b, dt) {
  b.hw = 0; b.x += b.vx * dt;
  for (const s of G.solids) if (hit(b, s)) { b.x = b.vx > 0 ? s.x - b.w : s.x + s.w; if (b.isP) b.vx = 0; b.hw = 1; }
  b.y += b.vy * dt; b.g = 0; b.ride = null;
  for (const s of G.solids) if (hit(b, s)) {
    if (b.vy > 0) { b.y = s.y - b.h; b.g = 1; if (s.t === 'm') b.ride = s; }
    else { b.y = s.y + s.h; if (b.isP) bump(s); }
    b.vy = 0;
  }
}
function bump(s) {
  if (s.t === 'q' && !s.used) {
    s.used = 1; s.bump = .15;
    if (s.rw === 'coin') addCoin(s.x + 8, s.y - 30);
    else G.items.push({ t: s.rw, x: s.x + 4, y: s.y - 28, w: 24, h: 24, got: 0 });
  } else if (s.t === 'b') {
    if (G.p.power) { s.kill = 1; G.score += 50; for (let i = 0; i < 4; i++) fx(s.x + i * 8, s.y, '▪'); } else s.bump = .15;
  }
}
function addCoin(x, y) {
  G.coins++; G.score += 100; Audio_.play('coin'); fx(x, y, '+100');
  if (G.coins % 10 === 0) { G.lives++; fx(x, y - 20, '1UP'); }
}
function hurt() {
  const p = G.p; if (p.inv > 0 || p.dead) return;
  if (p.hp > 1) { p.hp = 1; p.power = 0; p.inv = 1.5; Audio_.play('damage'); } else die();
}
function die() {
  const p = G.p; if (p.dead) return;
  p.dead = 1; p.dt = 1.4; p.vy = -500; G.lives--; Audio_.play('death');
}
function win() {
  G.bonus = Math.ceil(G.time) * 10; G.score += 1000 + G.bonus; G.scene = 'win'; G.idx = 0; Audio_.play('win');
  setTimeout(askName, 700);
}
function solidEnemy(e, dt) {
  const m = [.8, 1, 1.3][cfg.diff];
  if (e.dead) { e.dt -= dt; return; }
  if (Math.abs(e.x - G.p.x) > 900) return;
  if (e.t === 'bug') {
    e.x += e.vx * m * dt; e.y = e.y0 + Math.sin(G.t * 3 + e.x0 * .01) * 50;
    if (e.x < e.x0 - 150) e.vx = Math.abs(e.vx); else if (e.x > e.x0 + 150) e.vx = -Math.abs(e.vx); return;
  }
  const sp = e.vx; e.vx = sp * m; e.vy = Math.min(e.vy + 1800 * dt, 900); move(e, dt); e.vx = sp;
  if (e.hw) e.vx *= -1;
  else if (e.g && !solidAt(e.vx > 0 ? e.x + e.w + 2 : e.x - 2, e.y + e.h + 4)) e.vx *= -1;
  if (e.y > H + 100) { e.dead = 1; e.dt = 0; }
}

function update(dt) {
  const p = G.p, L = G.L; G.t += dt;
  for (const f of G.fx) { f.y -= 50 * dt; f.life -= dt; } G.fx = G.fx.filter(f => f.life > 0);
  for (const b of G.blocks) if (b.bump > 0) b.bump -= dt;
  if (p.dead) {
    p.dt -= dt; p.vy += 1800 * dt; p.y += p.vy * dt; p.anim = 'death';
    if (p.dt <= 0) { if (G.lives <= 0) { G.scene = 'over'; G.idx = 0; setTimeout(askName, 500); } else respawn(); }
    return;
  }
  G.time -= dt; if (G.time <= 0) { G.time = 0; die(); return; }
  for (const m of G.movers) { const s = Math.sin(G.t * m.sp), x = m.ox + s * m.dx, y = m.oy + s * m.dy; m.dX = x - m.x; m.dY = y - m.y; m.x = x; m.y = y; }
  const ax = (K.ArrowRight || K.KeyD ? 1 : 0) - (K.ArrowLeft || K.KeyA ? 1 : 0), run = K.ShiftLeft || K.ShiftRight;
  const max = (run ? 380 : 260) * (p.spd > 0 ? 1.4 : 1);
  if (ax) { p.vx += ax * (ax * p.vx < 0 ? 3200 : 1500) * dt; p.face = ax; }
  else { const f = 1800 * dt; p.vx = Math.abs(p.vx) < f ? 0 : p.vx - Math.sign(p.vx) * f; }
  p.vx = clamp(p.vx, -max, max);
  const want = K.ArrowUp || K.Space || K.KeyW;
  if (want && !p.jh && p.g) { p.vy = -650; p.g = 0; Audio_.play('jump'); }
  if (!want && p.vy < -250) p.vy = -250;
  p.jh = want; p.vy = Math.min(p.vy + 1800 * dt, 900);
  if (p.ride) { p.x += p.ride.dX; p.y += p.ride.dY; }
  const was = p.g; move(p, dt);
  if (!was && p.g) p.land = .12; p.land = Math.max(0, p.land - dt);
  G.solids = G.solids.filter(s => !s.kill);
  p.x = clamp(p.x, 0, L.width - p.w); p.inv -= dt; p.spd -= dt;
  p.anim = !p.g ? (p.vy < 0 ? 'jump' : 'fall') : p.land > 0 ? 'land' : Math.abs(p.vx) < 10 ? 'idle' : Math.abs(p.vx) > 270 ? 'run' : 'walk';
  if (p.y > H + 60) { die(); return; }
  for (const h of L.hazards || []) if (hit(p, { x: h.x + 4, y: GY - 12, w: h.w - 8, h: 12 })) { die(); return; }
  for (const c of G.coinsL) if (!c.got && hit(p, c)) { c.got = 1; addCoin(c.x, c.y); }
  for (const it of G.items) if (!it.got && hit(p, it)) {
    it.got = 1; G.score += 500; Audio_.play('power');
    if (it.t === 'orb') { p.hp = 2; p.power = 1; fx(it.x, it.y, 'POWER!'); } else { p.spd = 8; fx(it.x, it.y, 'SPEED!'); }
  }
  for (const e of G.enemies) {
    solidEnemy(e, dt); if (e.dead || !hit(p, e)) continue;
    if (p.vy > 0 && p.y + p.h - e.y < 24) {
      if (e.t === 'armored' && !p.power) { p.vy = -400; Audio_.play('enemy'); }
      else { e.dead = 1; e.dt = .4; G.score += 200; G.kills++; p.vy = K.Space || K.ArrowUp ? -600 : -420; Audio_.play('enemy'); fx(e.x, e.y, '+200'); }
    } else hurt();
  }
  G.enemies = G.enemies.filter(e => !(e.dead && e.dt <= 0));
  for (const c of G.cps) if (!c.on && p.x > c.x) { c.on = 1; G.score += 250; G.cp = { x: c.x, y: GY - 40, score: G.score, coins: G.coins }; fx(c.x, GY - 80, 'CHECKPOINT +250'); Audio_.play('power'); }
  if (p.x + p.w > L.goal.x) { win(); return; }
  G.cam += (clamp(p.x - W * .4, 0, L.width - W) - G.cam) * Math.min(1, dt * 8);
  G.cam = clamp(G.cam, 0, L.width - W);
}

// ---------- rendering (procedural pixel art) ----------
function bg(cam) {
  ['#5c94fc', '#6ea0fc', '#82acfc'].forEach((c, i) => R(0, i * 180, W, 180, c));
  for (let i = 0; i < 8; i++) { const x = wrap(i * 330 - cam * .1, 2640) - 150, y = 50 + (i * 37 % 90); R(x, y + 12, 90, 22, '#fff'); R(x + 18, y, 54, 30, '#fff'); R(x, y + 28, 90, 6, '#dfe9ff'); }
  for (let i = 0; i < 6; i++) { const x = wrap(i * 520 - cam * .25, 3120) - 250, h = 140 + (i % 3) * 40; for (let k = 0; k < h / 14; k++) R(x + k * 14, GY - (k + 1) * 14, 2 * h - k * 28, 14, k % 2 ? '#2c9a3a' : '#35b046'); }
  for (let i = 0; i < 14; i++) { const x = wrap(i * 280 - cam * .5, 3920) - 100; R(x, GY - 18, 70, 18, '#2e8b2e'); R(x + 10, GY - 30, 50, 14, '#3cb043'); R(x + 22, GY - 38, 26, 10, '#46c451'); }
}
function drawSolid(s, cam) {
  if (s.x + s.w < cam - 40 || s.x > cam + W + 40) return;
  if (s.t === 'g') {
    for (let x = s.x + Math.floor((Math.max(cam, s.x) - s.x) / 32) * 32; x < Math.min(s.x + s.w, cam + W + 32); x += 32) {
      const w = Math.min(32, s.x + s.w - x); R(x, GY, w, 8, '#3cb043'); R(x, GY + 8, w, 52, '#b8692a'); R(x, GY + 8, w, 3, '#e0944a'); R(x, GY + 34, w, 2, '#8a4b14'); R(x, GY + 8, 2, 52, '#8a4b14');
    }
  } else if (s.t === 'b' || s.t === 'q') {
    const y = s.y - (s.bump > 0 ? Math.sin(s.bump / .15 * Math.PI) * 8 : 0);
    if (s.t === 'b') { R(s.x, y, 32, 32, '#d2691e'); R(s.x, y + 15, 32, 2, '#7a3a10'); R(s.x, y + 30, 32, 2, '#7a3a10'); R(s.x + 15, y, 2, 15, '#7a3a10'); R(s.x + 7, y + 17, 2, 13, '#7a3a10'); R(s.x + 23, y + 17, 2, 13, '#7a3a10'); }
    else { R(s.x, y, 32, 32, s.used ? '#6e6258' : '#a86800'); R(s.x + 2, y + 2, 28, 28, s.used ? '#8a7a6a' : '#f8b800'); if (!s.used) { R(s.x + 3, y + 3, 4, 4, '#fff6b0'); T('?', s.x + 16, y + 24, 22, '#fff', 'center'); } }
  } else if (s.t === 'pipe') {
    R(s.x + 4, s.y + 20, 56, s.h - 20, '#1fa33a'); R(s.x + 8, s.y + 20, 8, s.h - 20, '#5ee07a'); R(s.x + 46, s.y + 20, 10, s.h - 20, '#14762a');
    R(s.x, s.y, 64, 20, '#1fa33a'); R(s.x + 4, s.y + 2, 8, 16, '#5ee07a'); R(s.x + 50, s.y + 2, 10, 18, '#14762a'); R(s.x, s.y, 64, 2, '#0b4a1a'); R(s.x, s.y + 18, 64, 2, '#0b4a1a');
  } else if (s.t === 'p') { R(s.x, s.y, s.w, s.h, '#a0622a'); R(s.x, s.y, s.w, 6, '#3cb043'); for (let x = s.x + 8; x < s.x + s.w - 4; x += 24) R(x, s.y + 11, 4, 4, '#6b3c14'); }
  else if (s.t === 'm') { R(s.x, s.y, s.w, 16, '#5a6fa8'); R(s.x, s.y, s.w, 4, '#8fa4de'); for (let x = s.x + 8; x < s.x + s.w - 4; x += 20) R(x, s.y + 8, 4, 4, '#2c3a66'); }
}
function drawPlayer(p) {
  if (p.inv > 0 && !p.dead && Math.floor(G.t * 20) % 2) return;
  cx.save(); cx.translate(Math.round(p.x + 12), Math.round(p.y + 16)); if (p.dead) cx.rotate(G.t * 9);
  cx.scale(p.face, 1); if (p.land > 0) cx.scale(1.15, .85);
  const fr = Math.floor(G.t * (p.anim === 'run' ? 16 : 10)) % 2, sk = '#f5c38e';
  R(-12, -16, 24, 8, '#1a9e9e'); R(-4, -12, 18, 4, '#127272'); R(-8, -8, 16, 8, sk); R(4, -6, 3, 3, '#222');
  R(-10, 0, 20, 8, '#e8742a'); R(-10, 8, 20, 4, '#2f4fa8');
  if (p.anim === 'jump' || p.anim === 'fall' || p.dead) { R(8, p.anim === 'fall' ? 2 : -6, 4, 6, sk); R(-12, 10, 8, 6, '#6b3c14'); R(4, 12, 8, 4, '#6b3c14'); }
  else if (p.anim === 'walk' || p.anim === 'run') { R(-12 + fr * 4, 12, 8, 4, '#6b3c14'); R(4 - fr * 4, 12, 8, 4, '#6b3c14'); R(8 - fr * 4, 2, 4, 6, sk); }
  else { R(-10, 12, 8, 4, '#6b3c14'); R(2, 12, 8, 4, '#6b3c14'); R(8, 2, 4, 6, sk); }
  if (p.power) { cx.strokeStyle = Math.floor(G.t * 8) % 2 ? '#ffd23f' : '#fff'; cx.lineWidth = 2; cx.strokeRect(-14, -18, 28, 36); }
  if (p.spd > 0) R(-18, 4, 4, 2, '#3cf');
  cx.restore();
}
function drawEnemy(e) {
  const fr = Math.floor(G.t * 6) % 2, x = Math.round(e.x), y = Math.round(e.y);
  if (e.t === 'crawler') {
    if (e.dead) return R(x, y + e.h - 6, 28, 6, '#8b4a2b');
    R(x, y + 4, 28, 16, '#8b4a2b'); R(x + 4, y, 20, 8, '#a05a35'); R(x + 6, y + 6, 6, 6, '#fff'); R(x + 16, y + 6, 6, 6, '#fff'); R(x + 8, y + 8, 3, 4, '#000'); R(x + 18, y + 8, 3, 4, '#000');
    R(x + (fr ? 2 : 6), y + 20, 8, 4, '#3a1c0c'); R(x + (fr ? 18 : 14), y + 20, 8, 4, '#3a1c0c');
  } else if (e.t === 'bug') {
    if (e.dead) return R(x, y + 14, 28, 6, '#8a3fb5');
    R(x + 6, y + 6, 16, 12, '#8a3fb5'); R(x + 2, y + (fr ? 0 : 4), 10, 6, '#cfe8ff'); R(x + 16, y + (fr ? 0 : 4), 10, 6, '#cfe8ff'); R(x + (e.vx < 0 ? 6 : 16), y + 8, 5, 5, '#ff0');
  } else {
    if (e.dead) return R(x, y + 24, 32, 6, '#6b7280');
    R(x, y + 6, 32, 24, '#6b7280'); R(x + 4, y, 6, 8, '#cbd5e1'); R(x + 13, y, 6, 8, '#cbd5e1'); R(x + 22, y, 6, 8, '#cbd5e1'); R(e.vx < 0 ? x + 4 : x + 20, y + 14, 8, 6, '#f33'); R(x + (fr ? 2 : 6), y + 30, 8, 0, '#000');
  }
}
function drawWorld() {
  const cam = Math.round(G.cam), L = G.L; bg(cam);
  cx.save(); cx.translate(-cam, 0);
  for (const s of G.solids) drawSolid(s, cam);
  for (const h of L.hazards || []) { cx.fillStyle = '#cfd6e6'; for (let i = 0; i < h.w / 16; i++) { cx.beginPath(); cx.moveTo(h.x + i * 16, GY); cx.lineTo(h.x + i * 16 + 8, GY - 16); cx.lineTo(h.x + i * 16 + 16, GY); cx.fill(); } }
  for (const c of G.cps) { R(c.x, GY - 60, 4, 60, '#ccc'); R(c.x + 4, GY - 60, 24, 16, c.on ? '#3cdc5c' : '#888'); }
  const gx = L.goal.x; R(gx, GY - 300, 6, 300, '#ddd'); R(gx - 4, GY - 308, 14, 14, '#f8d800'); R(gx - 16, GY - 16, 38, 16, '#777');
  for (let k = 0; k < 6; k++) R(gx + 6, GY - 296 + k * 10, 54 - k * 8 + Math.sin(G.t * 4 + k) * 3, 10, '#e03c3c');
  for (const c of G.coinsL) if (!c.got) { const w = Math.abs(Math.cos(G.t * 6 + c.x)) * 14 + 2; R(c.x + 8 - w / 2, c.y, w, 16, '#ffd23f'); R(c.x + 8 - w / 4, c.y + 3, w / 2, 10, '#fff3a0'); }
  for (const it of G.items) if (!it.got) {
    const y = it.y + Math.sin(G.t * 5) * 3; cx.fillStyle = it.t === 'orb' ? '#ffd23f' : '#33ccff';
    cx.beginPath(); if (it.t === 'orb') cx.arc(it.x + 12, y + 12, 11, 0, 7); else { cx.moveTo(it.x + 12, y); cx.lineTo(it.x + 22, y + 12); cx.lineTo(it.x + 12, y + 24); cx.lineTo(it.x + 2, y + 12); } cx.fill(); R(it.x + 8, y + 6, 5, 5, '#fff');
  }
  for (const e of G.enemies) if (e.x > cam - 60 && e.x < cam + W + 60) drawEnemy(e);
  drawPlayer(G.p);
  for (const f of G.fx) T(f.txt, f.x, f.y, 16, '#fff');
  cx.restore();
}
function hud() {
  R(0, 0, W, 40, 'rgba(0,0,0,.4)');
  T('SCORE ' + pad(G.score, 6), 16, 27, 20); T('COINS ×' + pad(G.coins, 2), 250, 27, 20, '#ffd23f'); T('WORLD ' + G.L.world, 430, 27, 20);
  T('LIVES ×' + Math.max(0, G.lives), 600, 27, 20, '#ff8a8a'); T('TIME ' + Math.ceil(G.time), 790, 27, 20);
}
