"""Scraper registry. Import adapters and register them here."""
from __future__ import annotations

from typing import Dict, Type

from app.scrapers.base import BaseScraper
from app.scrapers.sample import SampleScraper
from app.scrapers.thomasnet import ThomasnetScraper

REGISTRY: Dict[str, Type[BaseScraper]] = {
    SampleScraper.name: SampleScraper,
    ThomasnetScraper.name: ThomasnetScraper,
}


def get_scraper(name: str) -> BaseScraper:
    if name not in REGISTRY:
        available = ", ".join(sorted(REGISTRY))
        raise KeyError(f"Unknown scraper '{name}'. Available: {available}")
    return REGISTRY[name]()


def available_sources() -> list:
    return sorted(REGISTRY.keys())
