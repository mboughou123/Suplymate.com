"""SQLAlchemy ORM models for scraped supplier data."""
from __future__ import annotations

import datetime as dt
from typing import Optional

from sqlalchemy import (
    Boolean,
    DateTime,
    Float,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class ScrapedSupplier(Base):
    __tablename__ = "scraped_suppliers"
    __table_args__ = (
        UniqueConstraint("dedupe_key", name="uq_scraped_supplier_dedupe_key"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)

    # Identity / provenance
    dedupe_key: Mapped[str] = mapped_column(String(255), index=True)
    source_site: Mapped[str] = mapped_column(String(64), index=True)
    source_url: Mapped[str] = mapped_column(Text)  # ALWAYS stored for verification
    profile_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Core fields
    company_name: Mapped[str] = mapped_column(String(512), index=True)
    website_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    logo_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    image_url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    country: Mapped[Optional[str]] = mapped_column(String(96), index=True, nullable=True)
    category: Mapped[str] = mapped_column(String(64), index=True)
    products: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # comma/JSON list

    # Commercial
    min_order_quantity: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    price_min: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    price_max: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    currency: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    shipping_countries: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    fast_shipping_days: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    # Trust signals
    rating: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    review_count: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    is_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    years_in_business: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    certifications: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    # Contact (only if publicly listed)
    contact_email: Mapped[Optional[str]] = mapped_column(String(256), nullable=True)
    contact_phone: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)

    # Derived
    score: Mapped[float] = mapped_column(Float, default=0.0, index=True)

    first_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=dt.datetime.utcnow
    )
    last_seen_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=dt.datetime.utcnow, onupdate=dt.datetime.utcnow
    )


class ScrapeRun(Base):
    """Audit log of each scrape run for observability/debugging."""

    __tablename__ = "scrape_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    source_site: Mapped[str] = mapped_column(String(64), index=True)
    categories: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    started_at: Mapped[dt.datetime] = mapped_column(
        DateTime, default=dt.datetime.utcnow
    )
    finished_at: Mapped[Optional[dt.datetime]] = mapped_column(DateTime, nullable=True)
    found: Mapped[int] = mapped_column(Integer, default=0)
    inserted: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(32), default="running")
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
