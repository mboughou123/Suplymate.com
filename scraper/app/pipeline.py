"""Ingestion pipeline: run a source, normalize, dedupe, score, and upsert."""
from __future__ import annotations

import datetime as dt
import json
import logging
from typing import List, Optional

from app.db import SessionLocal
from app.models import ScrapedSupplier, ScrapeRun
from app.ranking import score_supplier
from app.record import SupplierRecord
from app.scrapers import get_scraper

logger = logging.getLogger("scraper")


def _join(values) -> Optional[str]:
    if not values:
        return None
    return ", ".join(str(v) for v in values)


def _apply(record: SupplierRecord, row: ScrapedSupplier) -> None:
    row.source_site = record.source_site
    row.source_url = record.source_url
    row.profile_url = record.profile_url
    row.company_name = record.company_name
    row.website_url = record.website_url
    row.logo_url = record.logo_url
    row.image_url = record.image_url
    row.country = record.country
    row.category = record.category
    row.products = _join(record.products)
    row.min_order_quantity = record.min_order_quantity
    row.price_min = record.price_min
    row.price_max = record.price_max
    row.currency = record.currency
    row.shipping_countries = _join(record.shipping_countries)
    row.fast_shipping_days = record.fast_shipping_days
    row.rating = record.rating
    row.review_count = record.review_count
    row.is_verified = record.is_verified
    row.years_in_business = record.years_in_business
    row.certifications = _join(record.certifications)
    row.contact_email = record.contact_email
    row.contact_phone = record.contact_phone
    row.score = score_supplier(record)
    row.last_seen_at = dt.datetime.utcnow()


def ingest(records: List[SupplierRecord]) -> dict:
    inserted = updated = 0
    session = SessionLocal()
    try:
        for record in records:
            key = record.dedupe_key()
            row = (
                session.query(ScrapedSupplier)
                .filter(ScrapedSupplier.dedupe_key == key)
                .one_or_none()
            )
            if row is None:
                row = ScrapedSupplier(dedupe_key=key)
                _apply(record, row)
                session.add(row)
                inserted += 1
            else:
                _apply(record, row)
                updated += 1
        session.commit()
    finally:
        session.close()
    return {"inserted": inserted, "updated": updated}


def run_source(
    source: str, categories: List[str], limit: int = 50
) -> dict:
    """Run one scraper end-to-end and persist results. Records an audit row."""
    session = SessionLocal()
    run = ScrapeRun(
        source_site=source,
        categories=json.dumps(categories),
        status="running",
    )
    session.add(run)
    session.commit()
    run_id = run.id
    session.close()

    result = {"found": 0, "inserted": 0, "updated": 0}
    note = None
    status = "success"
    try:
        scraper = get_scraper(source)
        records = scraper.run(categories, limit=limit)
        result["found"] = len(records)
        stats = ingest(records)
        result.update(stats)
        logger.info(
            "[%s] found=%d inserted=%d updated=%d",
            source,
            result["found"],
            result["inserted"],
            result["updated"],
        )
    except Exception as exc:  # noqa: BLE001 — record failure in audit log
        status = "failed"
        note = str(exc)
        logger.exception("[%s] run failed: %s", source, exc)

    session = SessionLocal()
    try:
        run = session.get(ScrapeRun, run_id)
        if run:
            run.finished_at = dt.datetime.utcnow()
            run.found = result["found"]
            run.inserted = result["inserted"]
            run.updated = result["updated"]
            run.status = status
            run.note = note
            session.commit()
    finally:
        session.close()

    return result
