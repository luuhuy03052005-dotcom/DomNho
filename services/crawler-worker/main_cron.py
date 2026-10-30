"""
ĐỐM NHỎ — Động Cơ Crawl & AI Chuẩn Hóa (main_cron.py)
Chạy định kỳ mỗi 30–60 phút hoặc chạy trực tiếp qua CLI:
  python services/crawler-worker/main_cron.py --demo
"""
from __future__ import annotations

import argparse
import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Any, Dict, List

from scrapers import SocialRescueScraper
from processors import (
    ContentDeduplicator,
    GeminiSpotExtractor,
    GeoFuzzerGeocoder,
    RuleBasedFilter,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
)
logger = logging.getLogger("dom_nho.cron")


async def run_pipeline(demo_mode: bool = True, output_json: str | None = None) -> List[Dict[str, Any]]:
    scraper = SocialRescueScraper(headless=True)
    tier1_filter = RuleBasedFilter()
    tier2_dedup = ContentDeduplicator(simhash_threshold=6)
    tier3_extractor = GeminiSpotExtractor()
    geocoder = GeoFuzzerGeocoder()

    raw_posts = await scraper.fetch_recent_posts(use_sample_feed=demo_mode)
    logger.info("Đã thu thập %d bài viết thô từ các hội nhóm.", len(raw_posts))

    ready_spots: List[Dict[str, Any]] = []
    stats = {"total": len(raw_posts), "blocked_tier1": 0, "dup_tier2": 0, "accepted": 0}

    for post in raw_posts:
        # TẦNG 1: Rule-based Commercial & Spam Filter
        passed_t1, reason_t1 = tier1_filter.evaluate(post.raw_text)
        if not passed_t1:
            stats["blocked_tier1"] += 1
            logger.info("⛔ [Tầng 1 - Chặn Spam] %s -> %s", post.external_id, reason_t1)
            continue

        # TẦNG 2: SimHash & pHash Deduplication
        is_unique, reason_t2, simhash_hex, phash_hex = tier2_dedup.check_and_register(
            post.external_id, post.raw_text, post.image_urls
        )
        if not is_unique:
            stats["dup_tier2"] += 1
            logger.info("♻️ [Tầng 2 - Lọc Trùng] %s -> %s", post.external_id, reason_t2)
            continue

        # TẦNG 3: Gemini 2.5 Flash JSON Structuring & Contact Masking
        structured = tier3_extractor.extract(post.raw_text)

        # GEOCODING + COORDINATE FUZZING (±200m)
        geo = geocoder.geocode_and_fuzz(structured.address_text)

        spot_payload: Dict[str, Any] = {
            "external_id": post.external_id,
            "author_name": post.author_name,
            "spot_type": structured.spot_type,
            "status": "ACTIVE",
            "visibility": "PUBLIC",
            "title": structured.title,
            "story": structured.story,
            "species": structured.species,
            "breed": structured.breed,
            "coat_color": structured.coat_color,
            "traits": structured.traits,
            "images": post.image_urls,
            "public_lat": geo.public_lat,
            "public_lng": geo.public_lng,
            "fuzz_radius_meters": geo.fuzz_radius_meters,
            "area_label": geo.area_label,
            "masked_phone": structured.masked_phone,
            "allow_foster": structured.allow_foster,
            "light_power": 100,
            "source_type": "FB_CRAWLER",
            "source_url": post.source_url,
            "content_simhash": simhash_hex,
            "image_phash": phash_hex,
        }
        ready_spots.append(spot_payload)
        stats["accepted"] += 1
        logger.info(
            "✨ [Tầng 3 - Chuẩn Hóa Đốm] %s | %s | Tọa độ làm mờ: (%.5f, %.5f) | SĐT che: %s",
            spot_payload["spot_type"],
            spot_payload["title"],
            spot_payload["public_lat"],
            spot_payload["public_lng"],
            spot_payload["masked_phone"],
        )

    # Nếu có cấu hình SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY thì đẩy thẳng lên Supabase
    supabase_url = os.getenv("SUPABASE_URL") or os.getenv("NEXT_PUBLIC_SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
    if supabase_url and supabase_key and ready_spots:
        try:
            from supabase import create_client  # type: ignore

            sb = create_client(supabase_url, supabase_key)
            for item in ready_spots:
                sb.table("dom_nho_posts").insert(item).execute()
            logger.info("Đã đồng bộ %d đốm sáng mới lên Supabase.", len(ready_spots))
        except Exception as exc:
            logger.warning("Không thể ghi trực tiếp lên Supabase (%s).", exc)

    if output_json:
        out_path = Path(output_json)
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(
            json.dumps(ready_spots, ensure_ascii=False, indent=2), encoding="utf-8"
        )
        logger.info("Đã xuất kết quả chuẩn hóa ra file: %s", out_path)

    logger.info(
        "HOÀN TẤT CHU KỲ CRAWLER: Tổng=%d | Chặn Tầng 1=%d | Trùng Tầng 2=%d | Đốm Hợp Lệ=%d",
        stats["total"],
        stats["blocked_tier1"],
        stats["dup_tier2"],
        stats["accepted"],
    )
    return ready_spots


def main() -> None:
    parser = argparse.ArgumentParser(description="Đốm Nhỏ Automated Rescue Crawler")
    parser.add_argument(
        "--demo",
        action="store_true",
        default=True,
        help="Chạy với tập dữ liệu mô phỏng hội nhóm để kiểm thử Phễu Lọc 3 Tầng",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="",
        help="Đường dẫn file JSON xuất kết quả",
    )
    args = parser.parse_args()
    asyncio.run(run_pipeline(demo_mode=args.demo, output_json=args.output or None))


if __name__ == "__main__":
    main()

