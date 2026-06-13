"""Pydantic response models for the API."""
from __future__ import annotations

import datetime as dt
from typing import List, Optional

from pydantic import BaseModel, ConfigDict


class SupplierOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    company_name: str
    website_url: Optional[str] = None
    logo_url: Optional[str] = None
    image_url: Optional[str] = None
    profile_url: Optional[str] = None
    source_site: str
    source_url: str
    country: Optional[str] = None
    category: str
    products: Optional[str] = None
    min_order_quantity: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    currency: Optional[str] = None
    shipping_countries: Optional[str] = None
    fast_shipping_days: Optional[int] = None
    rating: Optional[float] = None
    review_count: Optional[int] = None
    is_verified: bool
    years_in_business: Optional[int] = None
    certifications: Optional[str] = None
    contact_email: Optional[str] = None
    contact_phone: Optional[str] = None
    score: float
    last_seen_at: dt.datetime


class SupplierListOut(BaseModel):
    total: int
    limit: int
    offset: int
    items: List[SupplierOut]


class CategoryOut(BaseModel):
    slug: str
    label: str
    supplier_count: int
