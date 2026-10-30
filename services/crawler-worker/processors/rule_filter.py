"""
Tầng 1 (Rule-based Filter):
Loại bỏ bài bán hàng, phối giống, spam từ khóa thương mại trước khi gọi AI để tiết kiệm chi phí.
"""
from __future__ import annotations

import re
from typing import Tuple


class RuleBasedFilter:
    """Bộ lọc từ khóa thương mại & kiểm tra tín hiệu cứu hộ/nhận nuôi."""

    COMMERCIAL_BLOCKLIST = [
        r"bán\s+(chó|mèo|cún|boss)",
        r"phối\s+giống",
        r"xả\s+kho",
        r"giá\s+sinh\s+viên",
        r"bảo\s+hành\s+thuần\s+chủng",
        r"ship\s+toàn\s+quốc",
        r"trả\s+góp",
        r"nhận\s+đặt\s+cọc",
        r"sỉ\s+lẻ\s+thức\s+ăn",
    ]

    RESCUE_SIGNAL_KEYWORDS = [
        "lạc",
        "tìm",
        "cứu",
        "bắt gặp",
        "nhận nuôi",
        "tìm nhà",
        "tìm chủ",
        "bỏ rơi",
        "foster",
        "trạm",
        "thấy bé",
        "cấp cứu",
    ]

    def evaluate(self, raw_text: str) -> Tuple[bool, str]:
        """
        Trả về (is_valid, reason).
        """
        normalized = raw_text.strip().lower()
        if len(normalized) < 20:
            return False, "TOO_SHORT"

        for pattern in self.COMMERCIAL_BLOCKLIST:
            if re.search(pattern, normalized):
                return False, f"BLOCKED_COMMERCIAL_PATTERN:{pattern}"

        if not any(kw in normalized for kw in self.RESCUE_SIGNAL_KEYWORDS):
            return False, "NO_RESCUE_OR_ADOPT_SIGNAL"

        return True, "PASSED_TIER_1"

