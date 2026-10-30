"""
Tầng 2 (Deduplication):
Băm nội dung văn bản (SimHash 64-bit) và hình ảnh (pHash) để chặn các bài đăng
trùng lặp ở nhiều hội nhóm cứu hộ khác nhau.
"""
from __future__ import annotations

import hashlib
import re
from typing import Dict, List, Optional, Tuple


class ContentDeduplicator:
    """Kiểm tra trùng lặp nội dung (SimHash) và ảnh (pHash)."""

    def __init__(self, simhash_threshold: int = 6) -> None:
        self.simhash_threshold = simhash_threshold
        self._seen_simhashes: Dict[str, int] = {}
        self._seen_phashes: Dict[str, str] = {}

    @staticmethod
    def compute_simhash(text: str) -> int:
        """Tính SimHash 64-bit cho văn bản tiếng Việt."""
        cleaned = re.sub(r"[^\w\s]", " ", text.lower())
        tokens = [t for t in cleaned.split() if len(t) > 1]
        if not tokens:
            return 0

        shingles = [
            " ".join(tokens[i : i + 2]) for i in range(max(1, len(tokens) - 1))
        ]
        vector = [0] * 64
        for shingle in shingles:
            digest = hashlib.md5(shingle.encode("utf-8")).digest()
            h = int.from_bytes(digest[:8], byteorder="big", signed=False)
            for bit in range(64):
                if (h >> bit) & 1:
                    vector[bit] += 1
                else:
                    vector[bit] -= 1

        fingerprint = 0
        for bit in range(64):
            if vector[bit] > 0:
                fingerprint |= 1 << bit
        return fingerprint

    @staticmethod
    def hamming_distance(hash_a: int, hash_b: int) -> int:
        return bin(hash_a ^ hash_b).count("1")

    @staticmethod
    def compute_image_fingerprint(image_urls: List[str]) -> Optional[str]:
        """
        Tạo mã băm đại diện cho ảnh (pHash khi tải ảnh về hoặc chuẩn hóa URL).
        """
        if not image_urls:
            return None
        canonical = image_urls[0].split("?")[0].strip().lower()
        return hashlib.sha1(canonical.encode("utf-8")).hexdigest()[:16]

    def check_and_register(
        self, post_id: str, text: str, image_urls: List[str]
    ) -> Tuple[bool, str, str, Optional[str]]:
        """
        Kiểm tra bài viết có bị trùng với bài đã quét hay không.
        Trả về: (is_unique, reason, simhash_hex, phash_hex)
        """
        simhash_val = self.compute_simhash(text)
        simhash_hex = f"{simhash_val:016x}"
        phash_hex = self.compute_image_fingerprint(image_urls)

        # 1. Kiểm tra trùng ảnh (pHash)
        if phash_hex and phash_hex in self._seen_phashes:
            dup_id = self._seen_phashes[phash_hex]
            return False, f"DUPLICATE_IMAGE_OF:{dup_id}", simhash_hex, phash_hex

        # 2. Kiểm tra khoảng cách Hamming trên SimHash văn bản
        for existing_id, existing_hash in self._seen_simhashes.items():
            dist = self.hamming_distance(simhash_val, existing_hash)
            if dist <= self.simhash_threshold:
                return (
                    False,
                    f"DUPLICATE_TEXT_OF:{existing_id}(hamming={dist})",
                    simhash_hex,
                    phash_hex,
                )

        # Lưu vào bộ nhớ phiên hiện tại
        self._seen_simhashes[post_id] = simhash_val
        if phash_hex:
            self._seen_phashes[phash_hex] = post_id

        return True, "UNIQUE_POST", simhash_hex, phash_hex

