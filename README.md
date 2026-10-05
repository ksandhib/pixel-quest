# PIXEL QUEST — Retro Adventure
Original 8-bit style side-scrolling platformer. Python + FastAPI + SQLite backend, HTML5 Canvas/JavaScript engine. Fully offline; all art and sound are generated procedurally (no external assets, CDNs or fonts).

## Install & run (Windows)
Double-click `start.bat` (creates `.venv`, installs deps, inits DB, opens http://127.0.0.1:8000).
Manual:
```
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend.main:app --reload
```
## Controls
Arrows/WASD move, Up/Space jump, Shift run, P pause, R restart level, Esc menu. Menus: Up/Down/Enter. Touch: on-screen D-pad, RUN, JUMP, P buttons (shown automatically on touch devices or via Settings > Controls); tap menu items on the canvas.
## Mechanics
3 lives (Easy 5 / Hard 1), 300 s timer, pits and spikes kill, checkpoints save position/score/coins. Score: coin 100, enemy 200, power-up 500, checkpoint 250, finish 1000 + time×10. 10 coins = 1UP. Orb = extra hit point + brick-breaking + can stomp armored enemies. Crystal = 8 s speed boost.
## Layout
- `backend/` main.py (API + static server), database.py (SQLite `data/pixelquest.db`), models.py
- `frontend/js/` api.js, audio.js (Web Audio synth, localStorage settings), game.js (level build, physics, AABB collision, enemies, camera, procedural rendering), main.js (menus, scenes, input, touch, loop)
- `frontend/levels/world1-1.json` level data; `tools/gen_level1.py` regenerates it
## API
`GET /api/health`, `GET /api/highscores` (top 10), `POST /api/highscores` {player_name,score,level,coins}, `GET /api/levels`
## New levels
Copy `world1-1.json` to `world1-2.json` and edit: `width`, `time`, `ground` ([x0,x1] segments; gaps are pits), `platforms`, `blocks` (kind brick|q, reward coin|orb|crystal), `pipes`, `coins`, `enemies` (crawler|bug|armored), `movers` (dx/dy amplitude, speed), `hazards`, `checkpoints`, `goal`. Levels are auto-listed and chained by NEXT LEVEL.
## Tuning
Physics: `update()` in game.js (gravity 1800, jump -650, accel 1500, max 260/380 run). Player look: `drawPlayer()`. Enemies: `ESPEC` and `solidEnemy()`/`drawEnemy()`.
## Troubleshooting
Python missing: install from python.org and tick "Add to PATH". Port busy: change `--port`. Scores not saving: game keeps playing; check `data/` is writable.
## Future
Music tracks, secret pipes, more worlds, fireball/dash attacks, gamepad support.
