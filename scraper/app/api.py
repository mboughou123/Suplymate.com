"""FastAPI service exposing scraped suppliers to the Suplymate frontend.

Run with:  uvicorn app.api:app --reload --port 8000
"""
from __future__ import annotations

from typing import List, Optional

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.categories import CATEGORIES, label_for
from app.db import get_session, init_db
from app.models import ScrapedSupplier
from app.schemas import CategoryOut, SupplierListOut, SupplierOut

app = FastAPI(
    title="Suplymate Supplier Research API",
    version="1.0.0",
    description="Query verified, ranked suppliers scraped from public directories.",
)

# Allow the Next.js frontend (localhost + production) to call this API.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://suplymate.com",
        "https://www.suplymate.com",
    ],
    allow_methods=["GET"],
    allow_headers=["*"],
)


@app.on_event("startup")
def _startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok"}


@app.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_session)) -> List[CategoryOut]:
    counts = dict(
        db.execute(
            select(ScrapedSupplier.category, func.count(ScrapedSupplier.id)).group_by(
                ScrapedSupplier.category
            )
        ).all()
    )
    return [
        CategoryOut(slug=slug, label=str(meta["label"]), supplier_count=counts.get(slug, 0))
        for slug, meta in CATEGORIES.items()
    ]


@app.get("/suppliers", response_model=SupplierListOut)
def list_suppliers(
    category: Optional[str] = Query(None, description="Category slug"),
    country: Optional[str] = Query(None, description="Country (case-insensitive contains)"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    max_price: Optional[float] = Query(None, ge=0, description="Filter on price_min <= max_price"),
    verified: Optional[bool] = Query(None),
    source: Optional[str] = Query(None),
    sort: str = Query("score", pattern="^(score|rating|reviews|name)$"),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_session),
) -> SupplierListOut:
    stmt = select(ScrapedSupplier)

    if category:
        stmt = stmt.where(ScrapedSupplier.category == category)
    if country:
        stmt = stmt.where(ScrapedSupplier.country.ilike(f"%{country}%"))
    if min_rating is not None:
        stmt = stmt.where(ScrapedSupplier.rating >= min_rating)
    if max_price is not None:
        stmt = stmt.where(ScrapedSupplier.price_min <= max_price)
    if verified is not None:
        stmt = stmt.where(ScrapedSupplier.is_verified.is_(verified))
    if source:
        stmt = stmt.where(ScrapedSupplier.source_site == source)

    total = db.scalar(select(func.count()).select_from(stmt.subquery())) or 0

    sort_map = {
        "score": ScrapedSupplier.score.desc(),
        "rating": ScrapedSupplier.rating.desc().nullslast(),
        "reviews": ScrapedSupplier.review_count.desc().nullslast(),
        "name": ScrapedSupplier.company_name.asc(),
    }
    stmt = stmt.order_by(sort_map[sort]).limit(limit).offset(offset)

    rows = db.execute(stmt).scalars().all()
    return SupplierListOut(
        total=total,
        limit=limit,
        offset=offset,
        items=[SupplierOut.model_validate(r) for r in rows],
    )


@app.get("/suppliers/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: int, db: Session = Depends(get_session)):
    row = db.get(ScrapedSupplier, supplier_id)
    if row is None:
        from fastapi import HTTPException

        raise HTTPException(status_code=404, detail="Supplier not found")
    return SupplierOut.model_validate(row)
