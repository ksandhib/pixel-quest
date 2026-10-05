from pydantic import BaseModel, Field


class ScoreIn(BaseModel):
    player_name: str = Field("PLAYER", max_length=12)
    score: int = Field(ge=0, le=10_000_000)
    level: str = Field("1-1", max_length=10)
    coins: int = Field(0, ge=0, le=100000)
