"""Normalized supplier record produced by scrapers before persistence."""
from __future__ import annotations

import hashlib
import re
from dataclasses import dataclass, field
from typing import List, Optional
from urllib.parse import urlparse


def _domain(url: Optional[str]) -> Optional[str]:
    if not url:
        return None
    try:
        netloc = urlparse(url).netloc.lower()
        return netloc[4:] if netloc.startswith("www.") else netloc or None
    except Exception:
        return None


def _slugify(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


@dataclass
class SupplierRecord:
    """A single supplier as scraped from a source. All fields optional except the
    essentials so partial data from a source is still useful."""

    company_name: str
    source_site: str
    source_url: str
    category: str

    profile_url: Optional[str] = None
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    country: Optional[str] = None
    products: List[str] = field(default_factory=list)

    min_order_quantity: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    currency: Optional[str] = None
    shipping_countries: List[str] = field(default_factory=list)
    fast_shipping_days: Optional[int] = None

    rating: Optional[float] = None
    review_count: Optional[int] = None
    is_verified: bool = False
    years_in_business: Optional[int] = None
    certifications: List[str] = field(default_factory=list)

    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None

    def dedupe_key(self) -> str:
        """Stable identity: prefer website domain, else name+country."""
        basis = _domain(self.website_url) or _domain(self.profile_url)
        if not basis:
            basis = f"{_slugify(self.company_name)}|{(self.country or '').lower()}"
        return hashlib.sha1(basis.encode("utf-8")).hexdigest()[:24]
