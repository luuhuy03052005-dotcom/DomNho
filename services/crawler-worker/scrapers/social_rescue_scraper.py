"""
Scraper Worker (Phân hệ 1 - Thu thập tự động)
Hỗ trợ:
  1. Playwright Headless Browser cào bài viết từ các hội nhóm cứu hộ công khai
  2. Chế độ Demo/Seed thông minh để kiểm thử toàn bộ phễu lọc 3 tầng không cần cookie
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Optional
import logging

logger = logging.getLogger("dom_nho.scraper")


@dataclass
class RawSocialPost:
    external_id: str
    group_name: str
    author_name: str
    raw_text: str
    image_urls: List[str] = field(default_factory=list)
    source_url: str = ""
    posted_at: str = field(
        default_factory=lambda: datetime.now(timezone.utc).isoformat()
    )


class SocialRescueScraper:
    """Thu thập bài đăng cứu hộ / tìm thú lạc từ các hội nhóm."""

    DEFAULT_GROUPS = [
        "Cứu Hộ Chó Mèo Sài Gòn",
        "Tìm Chó Mèo Lạc TP.HCM & Hà Nội",
        "Trạm Cứu Hộ Thú Cưng Thủ Đức",
        "Hội Yêu Mèo Ta & Nhận Nuôi Miễn Phí",
        "Cộng Đồng Cứu Trợ Động Vật Đà Nẵng",
    ]

    def __init__(self, headless: bool = True) -> None:
        self.headless = headless

    async def fetch_recent_posts(
        self, group_urls: Optional[List[str]] = None, use_sample_feed: bool = True
    ) -> List[RawSocialPost]:
        """
        Thu thập bài viết mới nhất trong 30-60 phút qua.
        Nếu chưa cấu hình URL/Session thực tế hoặc bật `use_sample_feed`,
        hệ thống trả về tập dữ liệu thực tế đa dạng (gồm cả bài hợp lệ, bài trùng lặp
        và bài spam bán hàng) để kiểm chứng Phễu Lọc 3 Tầng.
        """
        if not group_urls or use_sample_feed:
            logger.info("Đang lấy dữ liệu từ luồng mô phỏng hội nhóm cứu hộ...")
            return self._get_realistic_sample_posts()

        posts: List[RawSocialPost] = []
        try:
            from playwright.async_api import async_playwright  # type: ignore

            async with async_playwright() as p:
                browser = await p.chromium.launch(headless=self.headless)
                context = await browser.new_context(
                    viewport={"width": 1280, "height": 900},
                    locale="vi-VN",
                )
                page = await context.new_page()
                for url in group_urls:
                    try:
                        await page.goto(url, timeout=30000, wait_until="domcontentloaded")
                        await page.wait_for_timeout(2000)
                        articles = await page.locator('[role="article"]').all()
                        for idx, article in enumerate(articles[:10]):
                            text = (await article.inner_text()).strip()
                            if len(text) < 25:
                                continue
                            posts.append(
                                RawSocialPost(
                                    external_id=f"pw_{idx}_{hash(text) & 0xFFFFFF}",
                                    group_name=url,
                                    author_name="Thành viên Hội Cứu Hộ",
                                    raw_text=text,
                                    image_urls=[],
                                    source_url=url,
                                )
                            )
                    except Exception as exc:
                        logger.warning("Không thể đọc trang %s: %s", url, exc)
                await browser.close()
        except Exception as exc:
            logger.warning("Playwright chưa khởi chạy (%s), chuyển sang dữ liệu mẫu.", exc)
            return self._get_realistic_sample_posts()

        return posts

    @staticmethod
    def _get_realistic_sample_posts() -> List[RawSocialPost]:
        return [
            RawSocialPost(
                external_id="fb_post_1001",
                group_name="Tìm Chó Mèo Lạc TP.HCM",
                author_name="Ngọc Ánh",
                raw_text=(
                    "[KHẨN CẤP - TÌM MÈO LẠC] Bé mèo mướp vàng tên Bơ bị tuột khỏi balo "
                    "lúc 19h tối nay gần ngã tư Hàng Xanh, đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM. "
                    "Bé đeo vòng cổ đỏ có chuông nhỏ, hơi nhát người lạ. Ai thấy bé xin báo giúp "
                    "SĐT 0908123456, gia đình xin hậu tạ!"
                ),
                image_urls=[
                    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80"
                ],
                source_url="https://facebook.com/groups/timchomeolac/posts/1001",
            ),
            # Bài trùng lặp ở nhóm khác để kiểm tra Tầng 2 (SimHash / pHash Deduplication)
            RawSocialPost(
                external_id="fb_post_1002_dup",
                group_name="Cứu Hộ Chó Mèo Sài Gòn",
                author_name="Ngọc Ánh",
                raw_text=(
                    "[KHẨN CẤP - TÌM MÈO LẠC] Bé mèo mướp vàng tên Bơ bị tuột khỏi balo "
                    "lúc 19h tối nay gần ngã tư Hàng Xanh, đường Điện Biên Phủ, Quận Bình Thạnh, TP.HCM. "
                    "Bé đeo vòng cổ đỏ có chuông nhỏ, hơi nhát người lạ. Ai thấy bé xin báo giúp "
                    "SĐT 0908123456!"
                ),
                image_urls=[
                    "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?auto=format&fit=crop&w=900&q=80"
                ],
                source_url="https://facebook.com/groups/cuuhochomeo/posts/1002",
            ),
            # Bài spam thương mại để kiểm tra Tầng 1 (Rule-based Commercial Filter)
            RawSocialPost(
                external_id="fb_post_1003_spam",
                group_name="Hội Yêu Mèo Ta",
                author_name="Shop Thú Cưng Giá Rẻ",
                raw_text=(
                    "Xả kho đàn Poodle thuần chủng bảo hành sức khỏe, nhận phối giống giá sinh viên "
                    "chỉ từ 1tr5, ship toàn quốc inbox ngay!"
                ),
                image_urls=[],
                source_url="https://facebook.com/groups/yeumeo/posts/1003",
            ),
            RawSocialPost(
                external_id="fb_post_1004",
                group_name="Trạm Cứu Hộ Thú Cưng Thủ Đức",
                author_name="Minh Quân",
                raw_text=(
                    "Mình vừa đi ngang Công viên Lê Văn Tám, Quận 1, TP.HCM thấy một bé chó Corgi "
                    "lông vàng trắng đang ngồi co ro dưới mái hiên, cổ còn dây dắt màu xanh. "
                    "Mình có để lại ít nước uống, bạn nào lạc bé ra đón gấp nhé! Liên hệ 0912345678"
                ),
                image_urls=[
                    "https://images.unsplash.com/photo-1612536057832-2ff7ead58194?auto=format&fit=crop&w=900&q=80"
                ],
                source_url="https://facebook.com/groups/cuuhothuduc/posts/1004",
            ),
            RawSocialPost(
                external_id="fb_post_1005",
                group_name="Hội Yêu Mèo Ta & Nhận Nuôi Miễn Phí",
                author_name="Trạm Mèo Nhỏ Thảo Điền",
                raw_text=(
                    "[TÌM NHÀ YÊU THƯƠNG] Bé mèo tam thể Mây (3 tháng tuổi) được tụi mình cứu lúc mưa "
                    "ở Thảo Điền, TP. Thủ Đức, TP.HCM. Bé đã sổ giun, biết đi vệ sinh đúng chỗ, cực kỳ "
                    "quấn người. Cần tìm ba mẹ hoặc các bạn sinh viên nhận Foster tạm trú. SĐT: 0987654321"
                ),
                image_urls=[
                    "https://images.unsplash.com/photo-1573865526739-10659fec78a5?auto=format&fit=crop&w=900&q=80"
                ],
                source_url="https://facebook.com/groups/nhannuoimeota/posts/1005",
            ),
        ]

