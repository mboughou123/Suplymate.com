"""Supplier ranking/scoring.

Produces a 0-100 score from trust & commercial signals. Weights are tuned so
that *verification* and *rating* dominate, with diminishing returns on review
volume and tenure. Missing data contributes zero rather than penalizing.
"""
from __future__ import annotations

import math
from typing import Optional

from app.record import SupplierRecord

# Max points per signal (sums to 100)
W_VERIFIED = 25.0
W_RATING = 22.0
W_REVIEWS = 14.0
W_TENURE = 14.0
W_CERTS = 10.0
W_SHIPPING = 8.0
W_MOQ = 7.0


def _reviews_points(n: Optional[int]) -> float:
    if not n or n <= 0:
        return 0.0
    # log scale: ~1000 reviews approaches full marks
    return min(math.log10(n + 1) / 3.0, 1.0) * W_REVIEWS


def _tenure_points(years: Optional[int]) -> float:
    if not years or years <= 0:
        return 0.0
    return min(years / 20.0, 1.0) * W_TENURE


def _shipping_points(days: Optional[int]) -> float:
    if days is None:
        return 0.0
    if days <= 7:
        return W_SHIPPING
    if days <= 14:
        return W_SHIPPING * 0.6
    if days <= 30:
        return W_SHIPPING * 0.3
    return 0.0


def _moq_points(moq: Optional[str]) -> float:
    """Lower MOQ scores higher. Parses a leading integer from strings like
    '100 pieces' / 'MOQ: 50'."""
    if not moq:
        return 0.0
    import re

    m = re.search(r"\d[\d,]*", moq.replace(" ", ""))
    if not m:
        return 0.0
    try:
        value = int(m.group(0).replace(",", ""))
    except ValueError:
        return 0.0
    if value <= 10:
        return W_MOQ
    if value <= 100:
        return W_MOQ * 0.7
    if value <= 1000:
        return W_MOQ * 0.4
    return W_MOQ * 0.1


def score_supplier(rec: SupplierRecord) -> float:
    total = 0.0
    if rec.is_verified:
        total += W_VERIFIED
    if rec.rating:
        # Only reward ratings at/above neutral; 5.0 -> full marks
        total += max(0.0, (rec.rating - 0.0) / 5.0) * W_RATING
    total += _reviews_points(rec.review_count)
    total += _tenure_points(rec.years_in_business)
    if rec.certifications:
        total += min(len(rec.certifications) / 3.0, 1.0) * W_CERTS
    total += _shipping_points(rec.fast_shipping_days)
    total += _moq_points(rec.min_order_quantity)
    return round(min(total, 100.0), 2)
