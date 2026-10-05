// UI, scenes, input, main loop
const now = () => performance.now() / 1000;
const MENUS = { menu: ['START GAME', 'HOW TO PLAY', 'HIGH SCORES', 'SETTINGS'], pause: ['RESUME', 'RESTART', 'SETTINGS', 'MAIN MENU'], over: ['TRY AGAIN', 'MAIN MENU'], win: ['NEXT LEVEL', 'MAIN MENU'] };
const settingRows = () => [['SOUND', cfg.sound ? 'ON' : 'OFF'], ['MUSIC', cfg.music ? 'ON' : 'OFF'], ['DIFFICULTY', ['EASY', 'NORMAL', 'HARD'][cfg.diff]], ['SCREEN', ['FIT', '1X', '2X'][cfg.screen]], ['CONTROLS', cfg.touch ? 'TOUCH' : 'KEYBOARD'], ['BACK', '']];
const go = s => { G.scene = s; G.idx = 0; };
const clearKeys = () => { for (const k in K) K[k] = 0; };
const toMenu = () => { clearKeys(); go('menu'); Audio_.music(); };
function applyCfg() {
  cv.style.width = ['min(100vw,177.78vh)', '960px', '1920px'][cfg.screen];
  document.getElementById('touch').classList.toggle('on', !!cfg.touch);
}
async function newGame() {
  G.lives = [5, 3, 1][cfg.diff]; G.score = 0; G.coins = 0; G.kills = 0; G.levelNo = 0;
  if (await loadLevel(G.levels[0])) beginLevel(); else toMenu();
}
async function nextLevel() {
  G.levelNo++;
  if (G.levelNo >= G.levels.length) { G.msg = 'ALL WORLDS CLEARED!'; G.levelNo = 0; return toMenu(); }
  if (await loadLevel(G.levels[G.levelNo])) beginLevel(); else toMenu();
}
function restart() { G.score = G.s0.score; G.coins = G.s0.coins; beginLevel(); }
async function askName() {
  const sc = await API.scores();
  if (G.score > 0 && (sc.length < 10 || G.score > sc[sc.length - 1].score)) {
    const n = prompt('NEW HIGH SCORE! Enter your name:', 'PLAYER');
    if (n !== null) await API.save({ player_name: (n || 'PLAYER').slice(0, 12), score: G.score, level: G.L.world, coins: G.coins });
    clearKeys();
  }
}
function setting(i, d) {
  if (i === 0) cfg.sound ^= 1; else if (i === 1) { cfg.music ^= 1; Audio_.music(); }
  else if (i === 2) cfg.diff = (cfg.diff + d + 3) % 3; else if (i === 3) cfg.screen = (cfg.screen + d + 3) % 3;
  else if (i === 4) cfg.touch ^= 1; else { go(G.back); return; }
  saveCfg(); applyCfg();
}
function act(i, d) {
  Audio_.play('select'); const s = G.scene; G.msg = '';
  if (s === 'menu') [newGame, () => go('how'), async () => { G.scores = await API.scores(); go('scores'); }, () => { G.back = 'menu'; go('settings'); }][i]();
  else if (s === 'pause') [() => { G.scene = 'play'; }, restart, () => { G.back = 'pause'; go('settings'); }, toMenu][i]();
  else if (s === 'over') i ? toMenu() : newGame();
  else if (s === 'win') i ? toMenu() : nextLevel();
  else if (s === 'settings') setting(i, d || 1);
}
function onKey(c) {
  const s = G.scene;
  if (s === 'play') { if (c === 'KeyP') go('pause'); else if (c === 'KeyR') restart(); else if (c === 'Escape') toMenu(); return; }
  if (s === 'how' || s === 'scores') { if (['Escape', 'Enter', 'Space', 'Backspace'].includes(c)) go('menu'); return; }
  if (s === 'pause' && c === 'KeyP') { G.scene = 'play'; return; }
  if (s === 'over' && c === 'KeyR') return act(0);
  if (c === 'Escape') return s === 'settings' ? go(G.back) : toMenu();
  const n = s === 'settings' ? 6 : MENUS[s].length;
  if (c === 'ArrowUp') { G.idx = (G.idx + n - 1) % n; Audio_.play('select'); }
  else if (c === 'ArrowDown') { G.idx = (G.idx + 1) % n; Audio_.play('select'); }
  else if (c === 'Enter' || c === 'Space' || c === 'ArrowRight') act(G.idx, 1);
  else if (c === 'ArrowLeft' && s === 'settings') act(G.idx, -1);
}
addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault(); if (!e.repeat) onKey(e.code); K[e.code] = 1; });
addEventListener('keyup', e => { K[e.code] = 0; });
addEventListener('blur', () => { clearKeys(); if (G.scene === 'play') go('pause'); });
cv.addEventListener('pointerdown', e => {
  const r = cv.getBoundingClientRect(), y = (e.clientY - r.top) * H / r.height;
  if (G.scene === 'how' || G.scene === 'scores') return go('menu');
  G.rects.forEach((ry, i) => { if (Math.abs(y - ry) < 24) { G.idx = i; act(i, 1); } });
});
document.querySelectorAll('#touch button[data-k]').forEach(b => {
  const k = b.dataset.k, up = () => { K[k] = 0; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); K[k] = 1; onKey(k); });
  ['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => b.addEventListener(ev, up));
});

function menuBg(dark) {
  bg(now() * 60); R(0, GY, W, 60, '#b8692a'); R(0, GY, W, 8, '#3cb043');
  if (dark) R(0, 0, W, H, 'rgba(0,0,0,.6)');
}
function drawMenu(items, y0) {
  G.rects = [];
  items.forEach((t, i) => { const y = y0 + i * 48; G.rects.push(y - 8); T(i === G.idx ? '[ ' + t + ' ]' : t, W / 2, y, 28, i === G.idx ? '#ffd23f' : '#fff', 'center'); });
}
function render() {
  cx.imageSmoothingEnabled = false; cx.clearRect(0, 0, W, H); const s = G.scene;
  if (s === 'menu') {
    menuBg(0); T('PIXEL QUEST', W / 2, 140, 76, '#ffd23f', 'center'); T('RETRO ADVENTURE', W / 2, 190, 28, '#fff', 'center');
    drawMenu(MENUS.menu, 260); if (G.msg) T(G.msg, W / 2, 500, 22, '#ff8a8a', 'center');
  } else if (s === 'how') {
    menuBg(1); T('HOW TO PLAY', W / 2, 90, 44, '#ffd23f', 'center');
    ['ARROWS / WASD  MOVE', 'UP / SPACE  JUMP', 'SHIFT  RUN', 'P  PAUSE      R  RESTART', 'ESC  MAIN MENU', '', 'STOMP ENEMIES, HIT ? BLOCKS FROM BELOW', 'ORB = POWER (BREAKS BRICKS, KILLS ARMOR)', 'CRYSTAL = SPEED. REACH THE FLAG!', '', 'PRESS ENTER'].forEach((l, i) => T(l, W / 2, 150 + i * 32, 22, '#fff', 'center'));
  } else if (s === 'scores') {
    menuBg(1); T('HIGH SCORES', W / 2, 80, 44, '#ffd23f', 'center');
    if (!G.scores.length) T('NO SCORES YET', W / 2, 270, 24, '#fff', 'center');
    G.scores.forEach((r, i) => T((i + 1 + '.').padEnd(4) + r.player_name.padEnd(13) + String(r.score).padStart(8), 250, 135 + i * 36, 24));
    T('PRESS ENTER', W / 2, 520, 18, '#aaa', 'center');
  } else if (s === 'settings') {
    menuBg(1); T('SETTINGS', W / 2, 100, 44, '#ffd23f', 'center'); G.rects = [];
    settingRows().forEach(([a, b], i) => { const y = 190 + i * 52; G.rects.push(y - 8); T((i === G.idx ? '> ' : '  ') + a, 250, y, 26, i === G.idx ? '#ffd23f' : '#fff'); T(b, 700, y, 26, i === G.idx ? '#ffd23f' : '#fff', 'right'); });
  } else {
    drawWorld(); hud();
    if (s === 'pause') { R(0, 0, W, H, 'rgba(0,0,0,.6)'); T('PAUSED', W / 2, 170, 56, '#ffd23f', 'center'); drawMenu(MENUS.pause, 250); }
    if (s === 'over') {
      R(0, 0, W, H, 'rgba(0,0,0,.7)'); T('GAME OVER', W / 2, 140, 64, '#ff5c5c', 'center');
      T('SCORE ' + pad(G.score, 6), W / 2, 210, 28, '#fff', 'center'); T('COINS ×' + G.coins, W / 2, 250, 28, '#ffd23f', 'center'); T('LEVEL ' + G.L.world, W / 2, 290, 28, '#fff', 'center'); drawMenu(MENUS.over, 370);
    }
    if (s === 'win') {
      R(0, 0, W, H, 'rgba(0,0,0,.7)'); T('LEVEL COMPLETE!', W / 2, 110, 56, '#ffd23f', 'center'); T('WORLD ' + G.L.world, W / 2, 160, 26, '#fff', 'center');
      T('SCORE ' + pad(G.score, 6), W / 2, 215, 26, '#fff', 'center'); T('COINS ×' + G.coins, W / 2, 250, 26, '#ffd23f', 'center');
      T('TIME BONUS ' + G.bonus, W / 2, 285, 26, '#fff', 'center'); T('ENEMIES DEFEATED ' + G.kills, W / 2, 320, 26, '#fff', 'center'); drawMenu(MENUS.win, 390);
    }
  }
}
let last = 0;
function loop(t) {
  const dt = Math.min((t - last) / 1000 || 0, .05); last = t;
  if (G.scene === 'play') update(dt);
  render(); requestAnimationFrame(loop);
}
applyCfg(); cv.focus();
API.levels().then(l => { G.levels = l; });
requestAnimationFrame(loop);
