"""Fixture-based source.

Loads realistic supplier records from a bundled JSON file. This is NOT scraping
any external site — it exists so the whole pipeline (normalize -> dedupe ->
score -> store -> API) can be exercised end-to-end with zero network access and
no ToS concerns. Use it to validate the system, demos, and tests.
"""
from __future__ import annotations

import json
import os
import re
from typing import Iterable, List
from urllib.parse import quote_plus

from app.record import SupplierRecord
from app.scrapers.base import BaseScraper

_DATA_FILE = os.path.join(os.path.dirname(__file__), "data", "sample_suppliers.json")


def _slug(text: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def _logo_url(name: str) -> str:
    # Real, always-available SVG logo derived from the company initials.
    return (
        "https://api.dicebear.com/7.x/initials/svg?seed="
        + quote_plus(name)
        + "&backgroundType=gradientLinear&fontWeight=700"
    )


def _image_url(name: str) -> str:
    # Real, deterministic stock photo (stands in for a facility/product photo).
    return f"https://picsum.photos/seed/{_slug(name)}/640/360"


class SampleScraper(BaseScraper):
    name = "sample"
    allowed_domains = []

    def scrape(
        self, categories: List[str], limit: int = 50
    ) -> Iterable[SupplierRecord]:
        with open(_DATA_FILE, "r", encoding="utf-8") as fh:
            rows = json.load(fh)

        count = 0
        for row in rows:
            if categories and row["category"] not in categories:
                continue
            if count >= limit:
                break
            count += 1
            yield SupplierRecord(
                company_name=row["company_name"],
                source_site=self.name,
                source_url=row.get("profile_url")
                or row.get("website_url")
                or "fixture://sample",
                category=row["category"],
                profile_url=row.get("profile_url"),
                website_url=row.get("website_url"),
                logo_url=row.get("logo_url") or _logo_url(row["company_name"]),
                image_url=row.get("image_url") or _image_url(row["company_name"]),
                country=row.get("country"),
                products=row.get("products", []),
                min_order_quantity=row.get("min_order_quantity"),
                price_min=row.get("price_min"),
                price_max=row.get("price_max"),
                currency=row.get("currency"),
                shipping_countries=row.get("shipping_countries", []),
                fast_shipping_days=row.get("fast_shipping_days"),
                rating=row.get("rating"),
                review_count=row.get("review_count"),
                is_verified=row.get("is_verified", False),
                years_in_business=row.get("years_in_business"),
                certifications=row.get("certifications", []),
                contact_email=row.get("contact_email"),
                contact_phone=row.get("contact_phone"),
            )
