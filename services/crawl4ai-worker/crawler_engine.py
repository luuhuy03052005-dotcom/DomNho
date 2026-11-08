from __future__ import annotations

import asyncio
import hashlib
import html
import json
import os
import re
from datetime import datetime, timezone
from typing import Any, Iterable
from urllib.parse import parse_qs, quote_plus, unquote, urlencode, urlparse, urlunparse

from crawl4ai import AsyncWebCrawler, BrowserConfig, CacheMode, CrawlerRunConfig

PROVIDER = "crawl4ai-v0.9.5"
MIN_MONTHLY_SPOTS = 50
MAX_MONTHLY_SPOTS = 100

PLATFORM_QUERIES: dict[str, list[str]] = {
    "FACEBOOK": [
        "site:facebook.com cứu hộ chó mèo Việt Nam {year}",
        "site:facebook.com tìm chó mèo thất lạc Việt Nam {year}",
        "site:facebook.com nhận nuôi chó mèo Việt Nam {year}",
    ],
    "INSTAGRAM": [
        "site:instagram.com cứu hộ chó mèo Việt Nam {year}",
        "site:instagram.com nhận nuôi chó mèo Việt Nam {year}",
    ],
    "THREADS": [
        "site:threads.net cứu hộ chó mèo Việt Nam {year}",
    ],
    "TIKTOK": [
        "site:tiktok.com cứu hộ chó mèo Việt Nam {year}",
    ],
    "YOUTUBE": [
        "site:youtube.com cứu hộ chó mèo mái ấm Việt Nam {year}",
    ],
    "RESCUE_PORTAL": [
        "trạm cứu hộ chó mèo Việt Nam",
        "mái ấm chó mèo nhận nuôi Việt Nam",
        "phòng khám thú y hỗ trợ cứu hộ động vật Việt Nam",
    ],
    "SOCIAL_MEDIA": [
        "tìm chó mèo thất lạc Việt Nam {year}",
        "cần cứu hộ chó mèo Việt Nam {year}",
        "nhận nuôi chó mèo tìm nhà Việt Nam {year}",
    ],
}

SEARCH_REGIONS = [
    "TP HCM", "Sài Gòn", "Hà Nội", "Bình Dương", "Đồng Nai", "Long An",
    "Tây Ninh", "Hải Phòng", "Quảng Ninh", "Bắc Ninh", "Hải Dương",
    "Hưng Yên", "Đà Nẵng", "Huế", "Quảng Nam", "Nha Trang", "Khánh Hòa",
    "Phú Yên", "Đắk Lắk", "Gia Lai", "Lâm Đồng", "Cần Thơ", "An Giang",
    "Kiên Giang", "Cà Mau", "Bạc Liêu", "Sóc Trăng", "Nghệ An",
    "Hà Tĩnh", "Thanh Hóa", "Thái Nguyên", "Phú Thọ", "Lào Cai",
]

REGIONAL_QUERIES = [
    query
    for region in SEARCH_REGIONS
    for query in (
        f"trạm cứu hộ chó mèo {region}",
        f"mái ấm chó mèo nhận nuôi {region}",
    )
]

NEWS_AND_PORTAL_QUERIES = [
    f"site:{domain} cứu hộ chó mèo trạm cứu hộ"
    for domain in (
        "vnexpress.net", "thanhnien.vn", "tuoitre.vn", "vtv.vn", "kenh14.vn",
        "cand.vn", "dantri.com.vn", "laodong.vn", "vietnamnet.vn", "plo.vn",
        "nld.com.vn", "afamily.vn", "cafef.vn", "doisongphapluat.com.vn",
        "petmart.vn", "hanoizoo.com", "sgaqua.vn", "hc.edu.vn",
        "sannhanhieucho.com", "hanoipetadoption.com",
    )
]

SEED_URLS = [
    "https://www.hanoipetadoption.com/",
    "https://sannhanhieucho.com/",
    "https://www.petmart.vn/tram-cuu-ho-cho-meo",
    "https://paddy.vn/blogs/cac-tram-cuu-ho-cho-dang-tin-cay",
    "https://vietcetera.com/vn/dia-chi-nao-cuu-tro-cac-be-cho-meo-lang-thang",
    "https://vtv.vn/cuu-ho-cho-meo.html",
    "https://cafef.vn/tram-cuu-ho-cho-meo-ha-noi-danh-chien-thang-z-project-tai-wechoice-awards-2024-viet-nam-cua-toi-viet-nam-cua-chung-ta-se-khong-bo-lai-bat-ky-sinh-mang-nao-phia-sau-188250113035000455.chn",
    "https://thanhnien.vn/danh-tien-luong-de-cuu-ho-cho-meo-tinh-yeu-lon-kho-khan-nao-cung-qua-185241206134842374.htm",
    "https://cand.vn/cam-dong-tram-cuu-ho-cho-meo-cua-gioi-tre-ha-noi-post358595.html",
    "https://vnexpress.net/nhung-tram-cuu-ho-cho-meo-bi-xua-duoi-4734726.html",
    "https://kenh14.vn/den-tham-tram-cuu-ho-cho-meo-cua-cac-ban-sinh-vien-o-ha-noi-cac-be-duoc-nhan-ve-day-deu-trong-tinh-trang-hoang-loan-20240116004344214.chn",
]

RELEVANT_RE = re.compile(
    r"(cứu hộ|giải cứu|thất lạc|bị lạc|đi lạc|tìm chủ|tìm nhà|nhận nuôi|"
    r"bỏ rơi|mái ấm|trạm cứu hộ|foster|bắt gặp|thú y|pet adoption)",
    re.IGNORECASE,
)
ANIMAL_RE = re.compile(r"(chó|mèo|thú cưng|cún|pet\b)", re.IGNORECASE)
COMMERCIAL_RE = re.compile(
    r"(phối giống|xả kho|ship toàn quốc|giá sỉ|bảo hành thuần chủng|mua bán chó|mua bán mèo)",
    re.IGNORECASE,
)
CENTER_RE = re.compile(
    r"(trạm cứu hộ|mái ấm|trung tâm cứu|nhóm cứu hộ|pet adoption|bệnh viện thú y|phòng khám thú y)",
    re.IGNORECASE,
)

AREA_NAMES = [
    "TP.HCM", "Sài Gòn", "Thủ Đức", "Hà Nội", "Hải Phòng", "Đà Nẵng",
    "Huế", "Bình Dương", "Đồng Nai", "Long An", "Tây Ninh", "Bắc Ninh",
    "Hưng Yên", "Hải Dương", "Quảng Ninh", "Quảng Nam", "Cần Thơ",
    "An Giang", "Kiên Giang", "Cà Mau", "Bạc Liêu", "Sóc Trăng", "Khánh Hòa",
    "Nha Trang", "Phú Yên", "Đắk Lắk", "Gia Lai", "Lâm Đồng", "Nghệ An",
    "Hà Tĩnh", "Thanh Hóa", "Thái Nguyên", "Phú Thọ", "Lào Cai",
]

BLOCKED_HOST_PARTS = [
    "duckduckgo.com", "google.com", "bing.com", "yahoo.", "wikipedia.org",
    "shopee.", "lazada.", "tiki.vn", "amazon.",
]
IMAGE_BLOCK_RE = re.compile(
    r"(logo|favicon|sprite|avatar|banner|icon|tracking|pixel|placeholder|placehold|unsplash|pexels|pixabay)",
    re.IGNORECASE,
)


def build_queries(target_platform: str) -> list[str]:
    year = datetime.now(timezone.utc).year
    if target_platform == "GOOGLE_MAPS":
        return []
    if target_platform != "ALL":
        templates = PLATFORM_QUERIES.get(target_platform, PLATFORM_QUERIES["SOCIAL_MEDIA"])
    else:
        templates = [
            *REGIONAL_QUERIES,
            *NEWS_AND_PORTAL_QUERIES,
            *PLATFORM_QUERIES["RESCUE_PORTAL"],
            *(queries[0] for queries in PLATFORM_QUERIES.values()),
        ]
    return list(dict.fromkeys(q.replace("{year}", str(year)) for q in templates))


def canonicalize_url(raw_url: str) -> str:
    raw_url = html.unescape((raw_url or "").strip())
    if not raw_url:
        return ""
    parsed = urlparse(raw_url)
    if "duckduckgo.com" in parsed.netloc and parsed.path.startswith("/l/"):
        raw_url = unquote(parse_qs(parsed.query).get("uddg", [""])[0])
        parsed = urlparse(raw_url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        return ""
    kept_query = [
        (key, value)
        for key, values in parse_qs(parsed.query, keep_blank_values=True).items()
        if key.lower() not in {"utm_source", "utm_medium", "utm_campaign", "fbclid", "gclid", "srsltid"}
        for value in values
    ]
    return urlunparse((parsed.scheme, parsed.netloc.lower(), parsed.path or "/", "", urlencode(kept_query), ""))


def is_candidate_url(url: str) -> bool:
    try:
        parsed = urlparse(url)
        host = parsed.netloc.lower()
        return (
            parsed.scheme in {"http", "https"}
            and bool(host)
            and not any(part in host for part in BLOCKED_HOST_PARTS)
            and not re.search(r"\.(pdf|zip|docx?|xlsx?|xml)(?:$|\?)", parsed.path, re.IGNORECASE)
        )
    except ValueError:
        return False


def markdown_text(result: Any) -> str:
    markdown = getattr(result, "markdown", "") or ""
    if isinstance(markdown, str):
        return markdown
    return str(getattr(markdown, "raw_markdown", "") or "")


def metadata_value(metadata: dict[str, Any], *keys: str) -> str:
    lowered = {str(key).lower(): value for key, value in (metadata or {}).items()}
    for key in keys:
        value = lowered.get(key.lower())
        if isinstance(value, str) and value.strip():
            return value.strip()
    return ""


def clean_markdown_story(markdown: str, fallback: str = "") -> str:
    def replace_markdown_link(match: re.Match[str]) -> str:
        label = re.sub(r"\\([\[\]_*`])", r"\1", match.group(1)).strip()
        return f" {label} " if label else " "

    paragraphs: list[str] = []
    for raw_line in markdown.splitlines():
        line = re.sub(
            r"!?\[((?:\\.|[^\]])*)\]\((?:\\.|[^)])*\)",
            replace_markdown_link,
            raw_line,
        )
        line = re.sub(r"https?://\S+", " ", line)
        line = re.sub(r"\bFollow\s+on\s+(?:Facebook|TikTok|Instagram|YouTube)\b", " ", line, flags=re.IGNORECASE)
        line = re.sub(r"\\([\[\]_*`])", r"\1", line)
        line = re.sub(r"^[#>*_`\-\s]+", "", line).strip()
        line = re.sub(r"\s+", " ", line)
        if len(line) < 45 or not (ANIMAL_RE.search(line) or RELEVANT_RE.search(line)):
            continue
        paragraphs.append(line)
        if sum(len(item) for item in paragraphs) >= 900:
            break
    story = " ".join(paragraphs) or fallback.strip()
    story = re.sub(
        r"!?\[((?:\\.|[^\]])*)\]\((?:\\.|[^)])*\)",
        replace_markdown_link,
        story,
    )
    story = re.sub(r"https?://\S+", " ", story)
    story = re.sub(r"\\([\[\]_*`])", r"\1", story)
    return re.sub(r"\s+", " ", story)[:1100].strip()


def parse_date(metadata: dict[str, Any], text: str) -> datetime | None:
    candidates = [
        metadata_value(metadata, "publishedTime", "published_time", "article:published_time", "date", "dc.date"),
    ]
    candidates.extend(re.findall(r"\b\d{4}-\d{2}-\d{2}(?:[T ][0-9:.+Z-]+)?", text[:5000]))
    candidates.extend(re.findall(r"\b\d{1,2}[/-]\d{1,2}[/-]\d{4}\b", text[:5000]))
    for value in candidates:
        value = value.strip()
        try:
            if re.fullmatch(r"\d{1,2}[/-]\d{1,2}[/-]\d{4}", value):
                day, month, year = map(int, re.split(r"[/-]", value))
                parsed = datetime(year, month, day, tzinfo=timezone.utc)
            else:
                parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
                if parsed.tzinfo is None:
                    parsed = parsed.replace(tzinfo=timezone.utc)
            if parsed <= datetime.now(timezone.utc):
                return parsed.astimezone(timezone.utc)
        except (ValueError, TypeError):
            continue
    return None


def extract_images(result: Any, metadata: dict[str, Any]) -> list[str]:
    images: list[str] = []
    media = getattr(result, "media", {}) or {}
    candidates: list[Any] = list(media.get("images", []) if isinstance(media, dict) else [])
    og_image = metadata_value(metadata, "og:image", "ogImage", "twitter:image", "image")
    if og_image:
        candidates.insert(0, {"src": og_image})
    for item in candidates:
        url = item.get("src") if isinstance(item, dict) else str(item)
        url = canonicalize_url(str(url or ""))
        if not url or IMAGE_BLOCK_RE.search(url):
            continue
        if url not in images:
            images.append(url)
        if len(images) >= 3:
            break
    return images


def detect_platform(url: str, entity_category: str) -> str:
    host = urlparse(url).netloc.lower()
    if "facebook.com" in host:
        return "FACEBOOK"
    if "instagram.com" in host:
        return "INSTAGRAM"
    if "threads.net" in host or "threads.com" in host:
        return "THREADS"
    if "tiktok.com" in host:
        return "TIKTOK"
    if "youtube.com" in host or "youtu.be" in host:
        return "YOUTUBE"
    return "RESCUE_PORTAL" if entity_category == "RESCUE_CENTER" else "SOCIAL_MEDIA"


def result_to_spot(
    result: Any,
    rejection_counts: dict[str, int] | None = None,
) -> dict[str, Any] | None:
    def reject(reason: str) -> None:
        if rejection_counts is not None:
            rejection_counts[reason] = rejection_counts.get(reason, 0) + 1
        return None

    if not getattr(result, "success", False):
        return reject("crawl_failed")
    source_url = canonicalize_url(str(getattr(result, "redirected_url", "") or getattr(result, "url", "")))
    if not is_candidate_url(source_url):
        return reject("invalid_url")
    metadata = getattr(result, "metadata", {}) or {}
    markdown = markdown_text(result)
    title = metadata_value(metadata, "og:title", "title", "twitter:title")
    fallback_description = metadata_value(metadata, "og:description", "description", "twitter:description")
    story = clean_markdown_story(markdown, fallback_description)
    relevance_text = f"{title} {story} {markdown[:6000]}"
    if not ANIMAL_RE.search(relevance_text) or not RELEVANT_RE.search(relevance_text) or COMMERCIAL_RE.search(relevance_text):
        return reject("not_relevant")
    images = extract_images(result, metadata)
    if not images:
        return reject("no_image")

    entity_category = "RESCUE_CENTER" if CENTER_RE.search(relevance_text) else "INDIVIDUAL_PET"
    published = parse_date(metadata, markdown)
    if entity_category == "INDIVIDUAL_PET":
        if published is None:
            return reject("unknown_date")
        age_days = (datetime.now(timezone.utc) - published).days
        if age_days > 180:
            return reject("outdated")

    lower = relevance_text.lower()
    if any(term in lower for term in ["khẩn cấp", "nguy kịch", "cấp cứu", "bị thương"]):
        spot_type = "RED_SOS"
    elif any(term in lower for term in ["nhận nuôi", "tìm nhà", "foster", "mái ấm", "trạm cứu hộ"]):
        spot_type = "YELLOW_ADOPT"
    elif any(term in lower for term in ["đoàn tụ", "đã tìm thấy", "bình an"]):
        spot_type = "GREEN_PEACE"
    else:
        spot_type = "ORANGE_SIGHT"

    species = "cat" if re.search(r"\bmèo\b", lower) else "dog" if re.search(r"\b(chó|cún)\b", lower) else "other"
    area = next((name for name in AREA_NAMES if name.lower() in lower), "Việt Nam")
    phone_text = f"{title} {story} {fallback_description}"
    phone_match = re.search(r"(?<!\d)(?:\+?84|0)(?:[ .-]?\d){9,10}(?!\d)", phone_text)
    contact = phone_match.group(0).strip() if phone_match else ""
    author = metadata_value(metadata, "author", "article:author", "og:site_name") or urlparse(source_url).netloc.replace("www.", "")
    digest = hashlib.sha1(source_url.encode("utf-8")).hexdigest()[:10]
    now = datetime.now(timezone.utc)
    published_iso = published.isoformat().replace("+00:00", "Z") if published else None
    created_at = published_iso or now.isoformat().replace("+00:00", "Z")
    hours_ago = max(0, int((now - published).total_seconds() // 3600)) if published else 0

    return {
        "id": f"crawl4ai-{digest}",
        "authorId": f"crawl4ai_{digest}",
        "authorName": author,
        "entityCategory": entity_category,
        "publishedDate": published_iso,
        "spotType": spot_type,
        "status": "RESOLVED" if spot_type == "GREEN_PEACE" else "ACTIVE",
        "visibility": "PUBLIC",
        "title": title or "Thông tin cứu hộ thú cưng",
        "story": story or "Xem nội dung chi tiết tại bài viết gốc.",
        "species": species,
        "breed": "Trung tâm cứu trợ & nhận nuôi" if entity_category == "RESCUE_CENTER" else "Thú cưng cần hỗ trợ",
        "coatColor": "Xem ảnh trong bài gốc",
        "traits": [],
        "images": images,
        "publicLat": 0,
        "publicLng": 0,
        "fuzzRadiusMeters": 0,
        "areaLabel": area,
        "formattedAddress": "",
        "hasExactLocation": False,
        "isSavedToGoogleMaps": False,
        "lightPower": 165,
        "boostCount": 0,
        "allowFoster": entity_category == "RESCUE_CENTER",
        "maskedPhone": f"Liên hệ tại {author}",
        "rawPhoneSecret": contact or f"Liên hệ trực tiếp tại bài gốc trên {author}",
        "sourceType": "CRAWL4AI",
        "sourcePlatform": detect_platform(source_url, entity_category),
        "sourceUrl": source_url,
        "isVerified": True,
        "verificationInfo": {
            "httpStatus": int(getattr(result, "status_code", 200) or 200),
            "imageHttpStatus": 0,
            "verifiedAt": now.isoformat().replace("+00:00", "Z"),
            "provider": PROVIDER,
            "sourceDomain": urlparse(source_url).netloc.replace("www.", ""),
            "canonicalUrl": source_url,
            "imageCount": len(images),
        },
        "hoursAgo": hours_ago,
        "createdAt": created_at,
        "sightings": [],
    }


def links_from_search_result(result: Any, per_query_limit: int) -> list[str]:
    links = getattr(result, "links", {}) or {}
    collected: list[str] = []
    for group in ("external", "internal"):
        for item in links.get(group, []) if isinstance(links, dict) else []:
            href = item.get("href", "") if isinstance(item, dict) else str(item)
            url = canonicalize_url(href)
            if is_candidate_url(url) and url not in collected:
                collected.append(url)
            if len(collected) >= per_query_limit:
                return collected
    return collected


def browser_config() -> BrowserConfig:
    return BrowserConfig(
        browser_type="chromium",
        headless=True,
        verbose=False,
        light_mode=True,
        enable_stealth=True,
        max_pages_before_recycle=40,
        viewport_width=1280,
        viewport_height=900,
    )


def run_config(*, search: bool = False, concurrency: int = 4) -> CrawlerRunConfig:
    return CrawlerRunConfig(
        cache_mode=CacheMode.BYPASS,
        word_count_threshold=1,
        page_timeout=12_000 if not search else 18_000,
        wait_until="domcontentloaded",
        delay_before_return_html=0.1,
        remove_overlay_elements=True,
        remove_consent_popups=True,
        scan_full_page=False,
        semaphore_count=max(1, concurrency),
        excluded_tags=["script", "style", "noscript", "footer", "nav"] if not search else ["script", "style"],
        verbose=False,
    )


async def crawl_urls(urls: Iterable[str], concurrency: int = 4) -> list[Any]:
    unique_urls = list(dict.fromkeys(canonicalize_url(url) for url in urls if is_candidate_url(canonicalize_url(url))))
    if not unique_urls:
        return []
    async with AsyncWebCrawler(config=browser_config()) as crawler:
        results = await crawler.arun_many(unique_urls, config=run_config(concurrency=concurrency))
        return list(results)


async def discover_urls(queries: list[str], per_query_limit: int, concurrency: int) -> list[str]:
    search_urls = [
        f"https://search.yahoo.com/search?p={quote_plus(query)}{page_suffix}"
        for query in queries
        for page_suffix in ("", "&b=11")
    ]
    async with AsyncWebCrawler(config=browser_config()) as crawler:
        results = await crawler.arun_many(search_urls, config=run_config(search=True, concurrency=concurrency))
        discovered: list[str] = []
        for result in results:
            if not getattr(result, "success", False):
                continue
            for url in links_from_search_result(result, per_query_limit):
                if url not in discovered:
                    discovered.append(url)
        return discovered


async def crawl_rescue_posts(payload: dict[str, Any]) -> dict[str, Any]:
    target_platform = str(payload.get("targetPlatform") or "ALL").upper()
    minimum_spots = max(0, int(payload.get("minimumSpots") or 0))
    max_spots = max(minimum_spots, min(150, int(payload.get("maxSpots") or MAX_MONTHLY_SPOTS)))
    per_query_limit = max(1, min(20, int(payload.get("perQueryLimit") or 10)))
    concurrency = max(1, min(8, int(payload.get("concurrency") or 4)))
    exclude_urls = {canonicalize_url(str(url)) for url in payload.get("excludeUrls", [])}
    custom_urls = [canonicalize_url(str(url)) for url in payload.get("customUrls", [])]
    queries = build_queries(target_platform)
    discovered = await discover_urls(queries, per_query_limit, concurrency) if queries else []
    candidates = [*custom_urls, *SEED_URLS, *discovered]
    candidates = [url for url in dict.fromkeys(candidates) if is_candidate_url(url) and url not in exclude_urls]
    social_hosts = ("facebook.com", "instagram.com", "threads.net", "tiktok.com", "youtube.com")
    candidates.sort(key=lambda url: any(host in urlparse(url).netloc.lower() for host in social_hosts))
    desired_candidates = minimum_spots * 3 if minimum_spots else min(max_spots, 40)
    max_candidates = min(len(candidates), max(40, min(150, desired_candidates)))
    results = await crawl_urls(candidates[:max_candidates], concurrency)

    by_url: dict[str, dict[str, Any]] = {}
    rejection_counts: dict[str, int] = {}
    for result in results:
        spot = result_to_spot(result, rejection_counts)
        if spot and spot["sourceUrl"] not in exclude_urls:
            by_url[spot["sourceUrl"]] = spot
    spots = list(by_url.values())[:max_spots]
    diagnostics = {
        "queryCount": len(queries),
        "discoveredUrlCount": len(discovered),
        "crawledUrlCount": min(len(candidates), max_candidates),
        "acceptedSpotCount": len(spots),
        "rejections": rejection_counts,
    }
    return {"provider": PROVIDER, "spots": spots, "diagnostics": diagnostics}


async def scrape_rescue_url(url: str, note: str = "") -> dict[str, Any] | None:
    results = await crawl_urls([url], concurrency=1)
    if not results:
        return None
    spot = result_to_spot(results[0])
    if spot and note and len(spot.get("story", "")) < 60:
        spot["story"] = note[:1100]
    return spot


def run_crawl_sync(payload: dict[str, Any]) -> dict[str, Any]:
    os.environ.setdefault("CRAWL4AI_NO_CLOUD_NOTICE", "1")
    return asyncio.run(crawl_rescue_posts(payload))


def run_scrape_sync(url: str, note: str = "") -> dict[str, Any] | None:
    os.environ.setdefault("CRAWL4AI_NO_CLOUD_NOTICE", "1")
    return asyncio.run(scrape_rescue_url(url, note))
