import sqlite3
from contextlib import closing
from datetime import datetime
from pathlib import Path

DB = Path(__file__).resolve().parent.parent / "data" / "pixelquest.db"


def _conn():
    DB.parent.mkdir(exist_ok=True)
    return sqlite3.connect(DB)


def init_db():
    with closing(_conn()) as c:
        c.execute("""CREATE TABLE IF NOT EXISTS high_scores(
            id INTEGER PRIMARY KEY AUTOINCREMENT, player_name TEXT NOT NULL,
            score INTEGER NOT NULL, level TEXT, coins INTEGER, created_at TEXT)""")
        c.commit()


def add_score(name, score, level, coins):
    init_db()
    with closing(_conn()) as c:
        c.execute("INSERT INTO high_scores(player_name,score,level,coins,created_at) VALUES(?,?,?,?,?)",
                  ((name or "PLAYER").upper()[:12], score, level, coins, datetime.now().isoformat(timespec="seconds")))
        c.commit()


def top_scores(n=10):
    init_db()
    with closing(_conn()) as c:
        rows = c.execute("SELECT id,player_name,score,level,coins,created_at FROM high_scores ORDER BY score DESC LIMIT ?", (n,)).fetchall()
    return [dict(zip(("id", "player_name", "score", "level", "coins", "created_at"), r)) for r in rows]
