"""Thomasnet adapter (real example).

Thomasnet (https://www.thomasnet.com) is a directory of North American
industrial suppliers — a good fit for Suplymate's categories.

IMPORTANT / COMPLIANCE
----------------------
* This adapter checks robots.txt before every request and self-disables on any
  path that is disallowed (returns nothing instead of forcing access).
* It applies the global crawl delay + jitter.
* It does NOT log in, solve CAPTCHAs, or evade bot protection. If Thomasnet
  serves an interstitial/anti-bot challenge, parsing simply yields no rows and
  logs a warning — by design. For reliable, ToS-clean access at scale, use an
  official data/partner agreement.
* Site markup changes often; the CSS selectors below are best-effort and
  centralized so they're easy to update.
"""
from __future__ import annotations

import logging
from typing import Iterable, List
from urllib.parse import quote_plus, urljoin

from bs4 import BeautifulSoup

from app.categories import keywords_for
from app.record import SupplierRecord
from app.scrapers.base import BaseScraper, RobotsDisallowed
from config import settings

logger = logging.getLogger("scraper")

BASE = "https://www.thomasnet.com"

# Best-effort selectors — update here if the site markup changes.
SEL_CARD = "article.supplier-search-results__card, div.profile-card, article"
SEL_NAME = "h2 a, h3 a, .company-name a, a.profile-card__title"
SEL_LOCATION = ".profile-card__location, .supplier-location, .company-location"
SEL_LOGO = "img.company-logo, img.profile-card__logo, .logo img, img[alt*='logo'], img"


class ThomasnetScraper(BaseScraper):
    name = "thomasnet"
    allowed_domains = ["thomasnet.com", "www.thomasnet.com"]

    def _search_url(self, keyword: str, page: int) -> str:
        return f"{BASE}/suppliers/?cov=NA&heading=&searchterm={quote_plus(keyword)}&pg={page}"

    def _fetch_html(self, url: str):
        # Prefer a plain HTTP fetch; fall back to a rendered page for JS content.
        resp = self.get(url)
        if resp is not None and resp.text:
            return resp.text
        return self.render(url)

    def _parse(self, html: str, keyword: str, category: str, source_url: str):
        soup = BeautifulSoup(html, "lxml")
        cards = soup.select(SEL_CARD)
        if not cards:
            logger.info(
                "[thomasnet] no cards parsed for '%s' (markup change or anti-bot page)",
                keyword,
            )
        for card in cards:
            name_el = card.select_one(SEL_NAME)
            if not name_el:
                continue
            name = name_el.get_text(strip=True)
            if not name:
                continue
            href = name_el.get("href")
            profile_url = urljoin(BASE, href) if href else None

            loc_el = card.select_one(SEL_LOCATION)
            country = None
            if loc_el:
                text = loc_el.get_text(strip=True)
                # Thomasnet is North America focused
                country = "United States" if text else None

            # Logo/photo straight from the card markup (no extra request).
            logo_url = None
            logo_el = card.select_one(SEL_LOGO)
            if logo_el:
                logo_url = (
                    logo_el.get("src")
                    or logo_el.get("data-src")
                    or logo_el.get("data-lazy-src")
                )
                if logo_url:
                    logo_url = urljoin(BASE, logo_url)

            # If the card had no usable image, fall back to the supplier's
            # public profile page (og:image). This is an extra, rate-limited,
            # robots-checked request — only made when needed.
            if not logo_url and profile_url:
                logo_url = self.extract_profile_image(profile_url)

            # "Verified"/"Supplier" badges vary; detect generically.
            badge_text = card.get_text(" ", strip=True).lower()
            verified = "verified" in badge_text or "certified" in badge_text

            yield SupplierRecord(
                company_name=name,
                source_site=self.name,
                source_url=source_url,
                category=category,
                profile_url=profile_url,
                logo_url=logo_url,
                image_url=logo_url,
                country=country,
                products=[keyword],
                is_verified=verified,
            )

    def scrape(
        self, categories: List[str], limit: int = 50
    ) -> Iterable[SupplierRecord]:
        seen = 0
        for category in categories:
            for keyword in keywords_for(category):
                for page in range(1, settings.max_pages + 1):
                    if seen >= limit:
                        return
                    url = self._search_url(keyword, page)
                    try:
                        html = self._fetch_html(url)
                    except RobotsDisallowed:
                        logger.warning(
                            "[thomasnet] robots.txt disallows search; skipping source."
                        )
                        return
                    if not html:
                        break
                    for rec in self._parse(html, keyword, category, url):
                        if seen >= limit:
                            return
                        seen += 1
                        yield rec
