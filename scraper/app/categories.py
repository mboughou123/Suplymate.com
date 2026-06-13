"""Canonical supplier categories for Suplymate.

Kept in sync with the website's industry filters. Each category carries a set of
search keywords used by scrapers to query external marketplaces/directories.
"""
from __future__ import annotations

from typing import Dict, List

# slug -> (display label, search keywords)
CATEGORIES: Dict[str, Dict[str, object]] = {
    "metal-steel": {
        "label": "Metal & Steel",
        "keywords": ["steel", "metal fabrication", "aluminum", "steel beams", "metal sheets"],
    },
    "construction-btp": {
        "label": "Construction & BTP",
        "keywords": ["cement", "concrete", "construction materials", "building materials"],
    },
    "industrial-equipment": {
        "label": "Industrial Equipment",
        "keywords": ["industrial machinery", "cnc machine", "pumps", "compressors"],
    },
    "electrotechnical": {
        "label": "Electrotechnical & Cabling",
        "keywords": ["electrical cable", "wiring", "circuit breaker", "transformers"],
    },
    "plastics-packaging": {
        "label": "Plastics & Packaging",
        "keywords": ["plastic packaging", "packaging materials", "plastic film", "containers"],
    },
    "agriculture-agrofood": {
        "label": "Agriculture & Agrofood",
        "keywords": ["agricultural equipment", "fertilizer", "food processing", "grain"],
    },
    "chemicals": {
        "label": "Chemicals",
        "keywords": ["industrial chemicals", "solvents", "polymers", "adhesives"],
    },
    "energy-utilities": {
        "label": "Energy & Utilities",
        "keywords": ["solar panels", "generators", "energy storage", "transformers"],
    },
}

VALID_SLUGS: List[str] = list(CATEGORIES.keys())


def label_for(slug: str) -> str:
    cat = CATEGORIES.get(slug)
    return str(cat["label"]) if cat else slug


def keywords_for(slug: str) -> List[str]:
    cat = CATEGORIES.get(slug)
    return list(cat["keywords"]) if cat else []  # type: ignore[arg-type]


def resolve_categories(slugs: List[str] | None) -> List[str]:
    """Return validated category slugs; defaults to all categories."""
    if not slugs:
        return VALID_SLUGS
    return [s for s in slugs if s in CATEGORIES]
