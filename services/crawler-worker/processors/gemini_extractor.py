"""
Tầng 3 (LLM Structuring):
Sử dụng Gemini 2.5 Flash API bóc tách văn bản tự do thành cấu trúc JSON chuẩn của Đốm Nhỏ:
- Phân loại Đốm: RED_SOS (Tìm thú lạc / Cấp cứu) | ORANGE_SIGHT (Bắt gặp ngoài đường) | YELLOW_ADOPT (Tìm người nhận nuôi)
- Loài, giống, màu lông, danh sách hạt đặc điểm (traits)
- Địa chỉ chữ để chuyển sang tọa độ GPS
- Tự động che số điện thoại (Contact Masking: 090***456)
"""
from __future__ import annotations

from dataclasses import asdict, dataclass, field
import json
import logging
import os
import re
from typing import Any, Dict, List, Optional

logger = logging.getLogger("dom_nho.gemini_extractor")


@dataclass
class StructuredDomNhoPost:
    spot_type: str  # 'RED_SOS' | 'ORANGE_SIGHT' | 'YELLOW_ADOPT'
    title: str
    story: str
    species: str  # 'cat' | 'dog' | 'other'
    breed: str
    coat_color: str
    traits: List[str] = field(default_factory=list)
    address_text: str = "TP. Hồ Chí Minh"
    allow_foster: bool = False
    raw_phone: str = ""
    masked_phone: str = "090***889"

    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class GeminiSpotExtractor:
    """Bóc tách dữ liệu chuẩn hóa bằng Gemini 2.5 Flash (kèm bộ phân tích dự phòng)."""

    def __init__(self, api_key: Optional[str] = None) -> None:
        self.api_key = api_key or os.getenv("GEMINI_API_KEY")

    @staticmethod
    def mask_phone_number(phone: str) -> str:
        digits = re.sub(r"\D", "", phone)
        if len(digits) >= 9:
            return f"{digits[:3]}***{digits[-3:]}"
        return "090***688"

    @staticmethod
    def extract_phone_from_text(text: str) -> str:
        match = re.search(r"(0\d{2,3}[\s\.\-]?\d{3}[\s\.\-]?\d{3,4})", text)
        if match:
            return re.sub(r"\D", "", match.group(1))
        return ""

    def extract(self, raw_text: str) -> StructuredDomNhoPost:
        """
        Gọi Gemini 2.5 Flash nếu có GEMINI_API_KEY, ngược lại dùng bộ trích xuất ngữ nghĩa tiếng Việt.
        """
        if self.api_key:
            try:
                from google import genai  # type: ignore

                client = genai.Client(api_key=self.api_key)
                prompt = (
                    "Bạn là AI chuẩn hóa dữ liệu cho mạng xã hội cứu hộ thú cưng Đốm Nhỏ. "
                    "Hãy đọc bài đăng sau và trả về đúng JSON với các trường: "
                    "spot_type (RED_SOS | ORANGE_SIGHT | YELLOW_ADOPT), title (ngắn gọn <65 ký tự), "
                    "story (tóm tắt ấm áp 1-2 câu), species (cat | dog | other), breed, coat_color, "
                    "traits (mảng tối đa 4 tag ngắn), address_text (địa chỉ cụ thể nhất trong bài), "
                    "allow_foster (boolean), raw_phone.\n\nBài đăng:\n" + raw_text
                )
                response = client.models.generate_content(
                    model="gemini-2.5-flash",
                    contents=prompt,
                    config={"response_mime_type": "application/json"},
                )
                data = json.loads(response.text)
                raw_phone = data.get("raw_phone") or self.extract_phone_from_text(raw_text)
                return StructuredDomNhoPost(
                    spot_type=data.get("spot_type", "RED_SOS"),
                    title=data.get("title", "Đốm nhỏ cần giúp đỡ"),
                    story=data.get("story", raw_text[:180]),
                    species=data.get("species", "cat"),
                    breed=data.get("breed", "Chưa rõ"),
                    coat_color=data.get("coat_color", "Vàng trắng"),
                    traits=data.get("traits", [])[:4],
                    address_text=data.get("address_text", "TP. Hồ Chí Minh"),
                    allow_foster=bool(data.get("allow_foster", False)),
                    raw_phone=raw_phone,
                    masked_phone=self.mask_phone_number(raw_phone),
                )
            except Exception as exc:
                logger.warning("Gemini API fallback sang bộ bóc tách nội bộ: %s", exc)

        return self._heuristic_vietnamese_extract(raw_text)

    def _heuristic_vietnamese_extract(self, raw_text: str) -> StructuredDomNhoPost:
        lower = raw_text.lower()

        # 1. Phân loại loại Đốm
        if any(k in lower for k in ["nhận nuôi", "tìm nhà", "tìm chủ mới", "foster"]):
            spot_type = "YELLOW_ADOPT"
        elif any(k in lower for k in ["đi ngang", "vừa thấy", "bắt gặp", "ngồi co ro"]):
            spot_type = "ORANGE_SIGHT"
        else:
            spot_type = "RED_SOS"

        # 2. Loài & Giống
        species = "dog" if any(k in lower for k in ["chó", "cún", "corgi", "poodle", "husky"]) else "cat"
        breed = "Mèo ta" if species == "cat" else "Cún cưng"
        if "mướp" in lower:
            breed = "Mèo Mướp"
        elif "tam thể" in lower:
            breed = "Mèo Tam Thể"
        elif "corgi" in lower:
            breed = "Chó Corgi"

        # 3. Màu lông
        coat_color = "Vàng ấm"
        for color_kw, label in [
            ("vàng trắng", "Vàng trắng"),
            ("mướp vàng", "Mướp vàng"),
            ("tam thể", "Tam thể"),
            ("đen", "Đen tuyền"),
            ("trắng", "Trắng sữa"),
        ]:
            if color_kw in lower:
                coat_color = label
                break

        # 4. Hạt đặc điểm (Traits)
        traits: List[str] = [breed]
        trait_candidates = [
            ("vòng cổ đỏ", "Vòng cổ đỏ"),
            ("dây dắt", "Còn dây dắt"),
            ("nhát người", "Nhát người"),
            ("quấn người", "Quấn người"),
            ("lúc mưa", "Cứu lúc mưa"),
            ("sổ giun", "Đã sổ giun"),
            ("foster", "Nhận Foster"),
        ]
        for kw, label in trait_candidates:
            if kw in lower and len(traits) < 4:
                traits.append(label)

        # 5. Địa chỉ chữ
        address_text = "TP. Hồ Chí Minh"
        location_Hints = [
            ("hàng xanh", "Ngã tư Hàng Xanh, Bình Thạnh, TP.HCM"),
            ("lê văn tám", "Công viên Lê Văn Tám, Quận 1, TP.HCM"),
            ("thảo điền", "Thảo Điền, TP. Thủ Đức, TP.HCM"),
            ("thủ đức", "TP. Thủ Đức, TP.HCM"),
            ("quận 1", "Quận 1, TP.HCM"),
            ("bình thạnh", "Quận Bình Thạnh, TP.HCM"),
        ]
        for kw, loc_label in location_Hints:
            if kw in lower:
                address_text = loc_label
                break

        # 6. Tiêu đề ngắn gọn
        if spot_type == "RED_SOS":
            title = f"Tìm {breed.lower()} ({coat_color.lower()}) lạc quanh {address_text.split(',')[0]}"
        elif spot_type == "ORANGE_SIGHT":
            title = f"Bắt gặp {breed.lower()} đang chờ người đón tại {address_text.split(',')[0]}"
        else:
            title = f"{breed} tìm nhà yêu thương tại {address_text.split(',')[0]}"

        raw_phone = self.extract_phone_from_text(raw_text)
        return StructuredDomNhoPost(
            spot_type=spot_type,
            title=title,
            story=raw_text.strip(),
            species=species,
            breed=breed,
            coat_color=coat_color,
            traits=traits,
            address_text=address_text,
            allow_foster="foster" in lower or "tạm trú" in lower,
            raw_phone=raw_phone,
            masked_phone=self.mask_phone_number(raw_phone),
        )

