"""BaseScraper: polite, compliant crawling primitives.

Every adapter inherits from this and only implements ``scrape()``. The base
class enforces:
  * robots.txt compliance (can_fetch + crawl-delay) — controlled by settings
  * per-host rate limiting with jitter
  * a shared, properly-identified HTTP client with timeouts
  * an easy hook for JS-rendered pages via Playwright (lazy import)

It NEVER attempts to bypass logins, CAPTCHAs, or anti-bot systems.
"""
from __future__ import annotations

import logging
import random
import time
from typing import Dict, Iterable, List, Optional
from urllib.parse import urlparse
from urllib.robotparser import RobotFileParser

import httpx

from config import settings
from app.record import SupplierRecord

logger = logging.getLogger("scraper")


class RobotsDisallowed(Exception):
    """Raised when robots.txt forbids fetching a URL and compliance is on."""


class BaseScraper:
    # Adapters MUST override these
    name: str = "base"
    allowed_domains: List[str] = []

    def __init__(self) -> None:
        self._robots_cache: Dict[str, RobotFileParser] = {}
        self._last_request_at: Dict[str, float] = {}
        self._client = httpx.Client(
            headers={"User-Agent": settings.user_agent},
            timeout=settings.timeout_seconds,
            follow_redirects=True,
        )

    # ----- robots.txt -----
    def _robots_for(self, url: str) -> RobotFileParser:
        parsed = urlparse(url)
        base = f"{parsed.scheme}://{parsed.netloc}"
        if base not in self._robots_cache:
            rp = RobotFileParser()
            rp.set_url(f"{base}/robots.txt")
            try:
                rp.read()
            except Exception as exc:  # treat unreadable robots as "allow" but log
                logger.warning("Could not read robots.txt for %s: %s", base, exc)
            self._robots_cache[base] = rp
        return self._robots_cache[base]

    def can_fetch(self, url: str) -> bool:
        if not settings.respect_robots:
            return True
        rp = self._robots_for(url)
        try:
            return rp.can_fetch(settings.user_agent, url)
        except Exception:
            return True

    def _crawl_delay(self, url: str) -> float:
        rp = self._robots_for(url)
        try:
            delay = rp.crawl_delay(settings.user_agent)
        except Exception:
            delay = None
        return max(float(delay or 0.0), settings.min_delay_seconds)

    # ----- rate-limited fetch -----
    def _throttle(self, host: str, url: str) -> None:
        delay = self._crawl_delay(url)
        last = self._last_request_at.get(host)
        if last is not None:
            elapsed = time.monotonic() - last
            wait = delay - elapsed
            if wait > 0:
                time.sleep(wait + random.uniform(0, 0.75))  # jitter
        self._last_request_at[host] = time.monotonic()

    def get(self, url: str) -> Optional[httpx.Response]:
        if not self.can_fetch(url):
            logger.warning("[%s] robots.txt disallows %s — skipping", self.name, url)
            raise RobotsDisallowed(url)
        host = urlparse(url).netloc
        self._throttle(host, url)
        try:
            resp = self._client.get(url)
            resp.raise_for_status()
            return resp
        except httpx.HTTPError as exc:
            logger.warning("[%s] request failed for %s: %s", self.name, url, exc)
            return None

    # ----- optional JS rendering -----
    def render(self, url: str) -> Optional[str]:
        """Fetch a JS-rendered page's HTML via Playwright (lazy import).

        Still honours robots.txt. Returns None if Playwright isn't installed.
        """
        if not self.can_fetch(url):
            raise RobotsDisallowed(url)
        try:
            from playwright.sync_api import sync_playwright
        except Exception:
            logger.warning(
                "[%s] Playwright not installed; cannot render %s", self.name, url
            )
            return None

        host = urlparse(url).netloc
        self._throttle(host, url)
        try:
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page(user_agent=settings.user_agent)
                page.goto(url, timeout=int(settings.timeout_seconds * 1000))
                page.wait_for_load_state("networkidle")
                html = page.content()
                browser.close()
                return html
        except Exception as exc:
            logger.warning("[%s] render failed for %s: %s", self.name, url, exc)
            return None

    def extract_profile_image(self, profile_url: Optional[str]) -> Optional[str]:
        """Fetch a supplier's public profile page and return its primary image
        (og:image / twitter:image / first logo-like <img>). robots.txt + rate
        limiting are enforced via self.get(). Returns None on any issue.
        """
        if not profile_url:
            return None
        try:
            resp = self.get(profile_url)
        except RobotsDisallowed:
            return None
        if resp is None or not resp.text:
            return None
        try:
            from bs4 import BeautifulSoup

            soup = BeautifulSoup(resp.text, "lxml")
            for selector, attr in (
                ('meta[property="og:image"]', "content"),
                ('meta[name="twitter:image"]', "content"),
                ('link[rel="icon"]', "href"),
                ("img[class*=logo]", "src"),
            ):
                el = soup.select_one(selector)
                if el and el.get(attr):
                    return el.get(attr)
        except Exception:
            return None
        return None

    def close(self) -> None:
        self._client.close()

    # ----- to implement -----
    def scrape(
        self, categories: List[str], limit: int = 50
    ) -> Iterable[SupplierRecord]:
        raise NotImplementedError

    # convenience wrapper used by the pipeline
    def run(self, categories: List[str], limit: int = 50) -> List[SupplierRecord]:
        try:
            return list(self.scrape(categories, limit))
        finally:
            self.close()
