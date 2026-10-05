from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.staticfiles import StaticFiles

from .database import add_score, init_db, top_scores
from .models import ScoreIn

ROOT = Path(__file__).resolve().parent.parent
app = FastAPI(title="Pixel Quest")
init_db()


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/highscores")
def highscores():
    return top_scores()


@app.post("/api/highscores")
def save_score(s: ScoreIn):
    try:
        add_score(s.player_name, s.score, s.level, s.coins)
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"ok": True}


@app.get("/api/levels")
def levels():
    return sorted(p.stem for p in (ROOT / "frontend" / "levels").glob("*.json"))


app.mount("/", StaticFiles(directory=ROOT / "frontend", html=True), name="frontend")
