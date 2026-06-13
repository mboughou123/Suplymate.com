"""Central configuration loaded from environment variables (.env supported)."""
from __future__ import annotations

import os
from dataclasses import dataclass

try:
    from dotenv import load_dotenv

    # Only load THIS project's .env (never walk up into the Next.js app's .env).
    load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
except Exception:  # dotenv is optional at runtime
    pass


def _bool(name: str, default: bool) -> bool:
    val = os.getenv(name)
    if val is None:
        return default
    return val.strip().lower() in {"1", "true", "yes", "on"}


@dataclass(frozen=True)
class Settings:
    database_url: str = (
        os.getenv("SCRAPER_DATABASE_URL")
        or os.getenv("DATABASE_URL")
        or "sqlite:///./suplymate_scraper.db"
    )
    user_agent: str = os.getenv(
        "SCRAPER_USER_AGENT",
        "SuplymateResearchBot/1.0 (+https://suplymate.com/bot)",
    )
    min_delay_seconds: float = float(os.getenv("SCRAPER_MIN_DELAY_SECONDS", "3"))
    max_pages: int = int(os.getenv("SCRAPER_MAX_PAGES", "2"))
    timeout_seconds: float = float(os.getenv("SCRAPER_TIMEOUT_SECONDS", "30"))
    respect_robots: bool = _bool("SCRAPER_RESPECT_ROBOTS", True)


settings = Settings()
