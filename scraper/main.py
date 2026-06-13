"""Suplymate scraper CLI.

Examples
--------
  python main.py init-db
  python main.py sources
  python main.py scrape --source sample
  python main.py scrape --source thomasnet --category metal-steel --limit 30
  python main.py top --category metal-steel --limit 10
  python main.py serve
"""
from __future__ import annotations

import argparse
import logging

from app.categories import VALID_SLUGS, label_for, resolve_categories

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")


def cmd_init_db(_args) -> None:
    from app.db import init_db

    init_db()
    print("Database initialized.")


def cmd_sources(_args) -> None:
    from app.scrapers import available_sources

    print("Available sources:")
    for s in available_sources():
        print(f"  - {s}")


def cmd_scrape(args) -> None:
    from app.db import init_db
    from app.pipeline import run_source

    init_db()
    categories = resolve_categories(args.category)
    print(f"Scraping '{args.source}' for: {', '.join(categories)}")
    result = run_source(args.source, categories, limit=args.limit)
    print(
        f"Done. found={result['found']} "
        f"inserted={result['inserted']} updated={result['updated']}"
    )


def cmd_top(args) -> None:
    from app.db import SessionLocal
    from app.models import ScrapedSupplier

    session = SessionLocal()
    try:
        q = session.query(ScrapedSupplier)
        if args.category:
            q = q.filter(ScrapedSupplier.category.in_(resolve_categories(args.category)))
        rows = q.order_by(ScrapedSupplier.score.desc()).limit(args.limit).all()
        if not rows:
            print("No suppliers found. Run a scrape first.")
            return
        print(f"{'SCORE':>6}  {'V':1}  {'RATING':>6}  CATEGORY              COMPANY")
        for r in rows:
            v = "Y" if r.is_verified else "-"
            rating = f"{r.rating:.1f}" if r.rating else "   -"
            print(
                f"{r.score:6.1f}  {v}  {rating:>6}  {label_for(r.category)[:20]:20}  "
                f"{r.company_name}"
            )
    finally:
        session.close()


def cmd_serve(args) -> None:
    import uvicorn

    uvicorn.run("app.api:app", host=args.host, port=args.port, reload=args.reload)


def build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Suplymate supplier research CLI")
    sub = p.add_subparsers(dest="command", required=True)

    sub.add_parser("init-db", help="Create database tables").set_defaults(func=cmd_init_db)
    sub.add_parser("sources", help="List available scraper sources").set_defaults(
        func=cmd_sources
    )

    sp = sub.add_parser("scrape", help="Run a scraper and store results")
    sp.add_argument("--source", required=True, help="Source name (see `sources`)")
    sp.add_argument(
        "--category",
        action="append",
        choices=VALID_SLUGS,
        help="Category slug (repeatable). Defaults to all.",
    )
    sp.add_argument("--limit", type=int, default=50, help="Max suppliers to collect")
    sp.set_defaults(func=cmd_scrape)

    tp = sub.add_parser("top", help="Print top-ranked suppliers from the DB")
    tp.add_argument("--category", action="append", choices=VALID_SLUGS)
    tp.add_argument("--limit", type=int, default=15)
    tp.set_defaults(func=cmd_top)

    srv = sub.add_parser("serve", help="Run the FastAPI server")
    srv.add_argument("--host", default="127.0.0.1")
    srv.add_argument("--port", type=int, default=8000)
    srv.add_argument("--reload", action="store_true")
    srv.set_defaults(func=cmd_serve)

    return p


def main() -> None:
    parser = build_parser()
    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
