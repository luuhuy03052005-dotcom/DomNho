-- ============================================================================
-- ĐỐM NHỎ (DOM NHO) — DATABASE MIGRATION 01
-- Mạng Xã Hội Bản Đồ Cứu Hộ & Lưu Giữ Kỷ Niệm Thú Cưng (Geo-Spatial SNS)
-- Tech Stack: Supabase PostgreSQL + PostGIS + Row Level Security (RLS)
-- ============================================================================

-- 1. KÍCH HOẠT EXTENSIONS CẦN THIẾT
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 2. KIỂU DỮ LIỆU ENUM CHUẨN HÓA THEO THUẬT NGỮ "ÁNH SÁNG & HƠI ẤM"
DO $$ BEGIN
    CREATE TYPE dom_spot_type AS ENUM (
        'RED_SOS',       -- Đốm Đỏ (#E63946): Tin tìm thú lạc / Cấp cứu
        'ORANGE_SIGHT',  -- Đốm Cam (#E07A5F): Tin bắt gặp ngoài đường (Tín hiệu POV)
        'YELLOW_ADOPT',  -- Đốm Vàng (#F4A261): Tin tìm người nhận nuôi / Trạm tạm trú (Đợi Nhà)
        'GREEN_PEACE'    -- Đốm Xanh (#2A9D8F): Ca đã giải quyết / Đã nhận nuôi (Bình Yên)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dom_spot_status AS ENUM (
        'ACTIVE',        -- Đang sáng trên bản đồ
        'MATCHED',       -- Đã có tín hiệu khớp lệnh đang xác minh
        'RESOLVED',      -- Đã đoàn tụ / Đã nhận nuôi (chuyển sang Đốm Xanh)
        'FADED',         -- Đã tắt dần vì light_power = 0 sau thời gian dài
        'SHADOWBANNED'   -- Ẩn với cộng đồng (chống spam), chỉ người đăng tự thấy
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE dom_visibility AS ENUM (
        'PUBLIC',         -- Công khai (với tọa độ đã làm mờ ±200m)
        'PRIVATE_COUPLE'  -- Chỉ cặp đôi / phòng kết nối mới nhìn thấy (RLS bảo vệ)
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 3. BẢNG HỒ SƠ NGƯỜI DÙNG & PHIÊN ĐĂNG NHẬP VĨNH VIỄN (ZERO-VERIFICATION AUTH)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID UNIQUE, -- Liên kết tới auth.users nếu bật Supabase Auth
    display_name TEXT NOT NULL CHECK (char_length(display_name) BETWEEN 2 AND 60),
    pin_hash TEXT NOT NULL, -- Băm của mã PIN 4-6 số
    device_secret_token TEXT UNIQUE NOT NULL, -- Token khôi phục phiên vĩnh viễn trên thiết bị
    avatar_url TEXT,
    preferred_theme TEXT DEFAULT 'morning_sun', -- morning_sun | pine_hill | sunset | twilight
    couple_room_id UUID,
    patrol_mode_active BOOLEAN DEFAULT FALSE,
    last_patrol_location GEOGRAPHY(POINT, 4326),
    daily_post_count INTEGER DEFAULT 0,
    last_post_date DATE DEFAULT CURRENT_DATE,
    is_shadowbanned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 4. BẢNG PHÒNG KỶ NIỆM CẶP ĐÔI / NHÓM BẠN (CO-OP PATROL & COUPLE MEMORY ROOM)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.couple_rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL DEFAULT 'Hành Trình Đốm Nhỏ',
    invite_code TEXT UNIQUE NOT NULL, -- Mã mời QR 6 ký tự
    member_one_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    member_two_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    shared_light_points INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 5. BẢNG CHÍNH: ĐỐM SÁNG TRÊN BẢN ĐỒ (dom_nho_posts)
-- Lưu ý Bảo mật:
--   - public_location: Tọa độ ĐÃ LÀM MỜ ±150m-300m để hiển thị công khai
--   - exact_location: Tọa độ chính xác, không bao giờ trả trực tiếp ra API công khai
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.dom_nho_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL DEFAULT 'Người Yêu Thú Cưng',
    spot_type dom_spot_type NOT NULL DEFAULT 'RED_SOS',
    status dom_spot_status NOT NULL DEFAULT 'ACTIVE',
    visibility dom_visibility NOT NULL DEFAULT 'PUBLIC',
    couple_room_id UUID REFERENCES public.couple_rooms(id) ON DELETE SET NULL,

    -- Nội dung bài đăng & Đặc điểm nhận dạng (AI hoặc người dùng chọn)
    title TEXT NOT NULL,
    story TEXT,
    species TEXT NOT NULL DEFAULT 'cat', -- 'cat' | 'dog' | 'other'
    breed TEXT,
    coat_color TEXT,
    traits TEXT[] DEFAULT '{}',          -- VD: ['Mèo ta', 'Vòng cổ đỏ', 'Nhát người']
    images TEXT[] NOT NULL DEFAULT '{}', -- Danh sách URL ảnh .webp (<150KB)

    -- Tọa độ không gian (PostGIS)
    public_lat DOUBLE PRECISION NOT NULL,
    public_lng DOUBLE PRECISION NOT NULL,
    public_location GEOGRAPHY(POINT, 4326) NOT NULL,
    fuzz_radius_meters INTEGER NOT NULL DEFAULT 200,
    area_label TEXT NOT NULL DEFAULT 'TP. Hồ Chí Minh',

    -- Tọa độ gốc (Chỉ dùng nội bộ cho thuật toán khớp lệnh 3km & khi mở khóa)
    exact_location GEOGRAPHY(POINT, 4326),

    -- Chỉ số Ánh Sáng & Tương tác ("Truyền Lửa")
    light_power INTEGER NOT NULL DEFAULT 100 CHECK (light_power BETWEEN 0 AND 500),
    boost_count INTEGER NOT NULL DEFAULT 1,
    is_emergency_boosted BOOLEAN NOT NULL DEFAULT FALSE,
    emergency_boost_until TIMESTAMPTZ,

    -- Hỗ trợ nhận nuôi / Foster
    allow_foster BOOLEAN NOT NULL DEFAULT FALSE,
    adopter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,

    -- Metadata từ Động cơ AI Crawler (Phân hệ 1)
    source_type TEXT NOT NULL DEFAULT 'USER_POST', -- 'USER_POST' | 'FB_CRAWLER'
    source_url TEXT,
    content_simhash TEXT,
    image_phash TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dom_nho_posts_public_location
    ON public.dom_nho_posts USING GIST (public_location);

CREATE INDEX IF NOT EXISTS idx_dom_nho_posts_exact_location
    ON public.dom_nho_posts USING GIST (exact_location);

CREATE INDEX IF NOT EXISTS idx_dom_nho_posts_status_type
    ON public.dom_nho_posts (status, spot_type, visibility);

CREATE INDEX IF NOT EXISTS idx_dom_nho_posts_simhash
    ON public.dom_nho_posts (content_simhash) WHERE content_simhash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_dom_nho_posts_phash
    ON public.dom_nho_posts (image_phash) WHERE image_phash IS NOT NULL;

-- ============================================================================
-- 6. BẢNG BẢO MẬT LIÊN HỆ RIÊNG TƯ (CONTACT MASKING)
-- Không cho phép đọc trực tiếp SĐT/Zalo từ bản đồ công khai
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.private_contacts (
    post_id UUID PRIMARY KEY REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    owner_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    masked_phone TEXT NOT NULL, -- VD: '090***456' (Hiển thị công khai)
    raw_phone TEXT NOT NULL,    -- Số thật (Chỉ mở khóa khi chủ bài đồng ý)
    zalo_link TEXT,
    exact_address_note TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.contact_unlock_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    requester_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    requester_name TEXT NOT NULL,
    request_type TEXT NOT NULL DEFAULT 'SIGHTING_REPORT', -- 'SIGHTING_REPORT' | 'ADOPT_REQUEST' | 'FOSTER_OFFER'
    message TEXT NOT NULL,
    proof_image_url TEXT,
    is_approved BOOLEAN NOT NULL DEFAULT FALSE,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 7. BẢNG DẤU VẾT BẮT GẶP (SIGHTINGS TIMELINE) & KHỚP LỆNH KÉP (MATCH ALERTS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.spot_sightings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    reporter_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reporter_name TEXT NOT NULL DEFAULT 'Người Đi Đường Tốt Bụng',
    image_url TEXT NOT NULL,
    note TEXT NOT NULL,
    emotion_tag TEXT DEFAULT 'Đang tìm đường',
    public_lat DOUBLE PRECISION NOT NULL,
    public_lng DOUBLE PRECISION NOT NULL,
    distance_from_origin_m INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.spot_matches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    red_sos_post_id UUID NOT NULL REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    orange_sight_post_id UUID NOT NULL REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    distance_meters INTEGER NOT NULL,
    similarity_score NUMERIC(4,2) NOT NULL DEFAULT 0.85,
    matched_traits TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING' | 'CONFIRMED' | 'DISMISSED'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(red_sos_post_id, orange_sight_post_id)
);

-- ============================================================================
-- 8. BẢNG CAM KẾT KỶ NIỆM HÀNG TUẦN (WEEKLY MEMORY PACT - memory_snaps)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.memory_snaps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.dom_nho_posts(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    couple_room_id UUID REFERENCES public.couple_rooms(id) ON DELETE SET NULL,
    week_number INTEGER NOT NULL DEFAULT 1,
    image_url TEXT NOT NULL,
    caption TEXT NOT NULL,
    weight_kg NUMERIC(4,1),
    mood_tag TEXT DEFAULT 'Bình yên & Quấn chủ',
    lat DOUBLE PRECISION,
    lng DOUBLE PRECISION,
    sent_to_rescuer BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 9. BẢNG TRẠM THÚ Y CẤP CỨU 24/7 (B2B LOCAL SUPPORT STATIONS)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.vet_stations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    hotline TEXT NOT NULL,
    is_24_7 BOOLEAN DEFAULT TRUE,
    supports_rescue_discount BOOLEAN DEFAULT TRUE,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    location GEOGRAPHY(POINT, 4326) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- 10. HÀM BẢO MẬT: LÀM MỜ TỌA ĐỘ TỰ ĐỘNG (COORDINATE FUZZING ±150m-300m)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.fuzz_coordinates(
    exact_lat DOUBLE PRECISION,
    exact_lng DOUBLE PRECISION,
    OUT fuzzed_lat DOUBLE PRECISION,
    OUT fuzzed_lng DOUBLE PRECISION
)
LANGUAGE plpgsql
AS $$
DECLARE
    -- 0.0018 độ vĩ/kinh tương đương ~200m ngoài thực tế
    lat_offset DOUBLE PRECISION;
    lng_offset DOUBLE PRECISION;
BEGIN
    lat_offset := (random() * 0.0030 - 0.0015);
    lng_offset := (random() * 0.0030 - 0.0015);
    -- Đảm bảo tối thiểu lệch ít nhất ~120m so với vị trí thật
    IF abs(lat_offset) < 0.0008 THEN
        lat_offset := CASE WHEN lat_offset >= 0 THEN 0.0012 ELSE -0.0012 END;
    END IF;
    fuzzed_lat := round((exact_lat + lat_offset)::numeric, 6)::double precision;
    fuzzed_lng := round((exact_lng + lng_offset)::numeric, 6)::double precision;
END;
$$;

-- Trigger tự động làm mờ tọa độ trước khi INSERT vào dom_nho_posts
CREATE OR REPLACE FUNCTION public.trg_fuzz_dom_nho_location()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    fuzzed RECORD;
BEGIN
    IF NEW.exact_location IS NULL THEN
        NEW.exact_location := ST_SetSRID(ST_MakePoint(NEW.public_lng, NEW.public_lat), 4326)::geography;
    END IF;

    SELECT * INTO fuzzed FROM public.fuzz_coordinates(NEW.public_lat, NEW.public_lng);
    NEW.public_lat := fuzzed.fuzzed_lat;
    NEW.public_lng := fuzzed.fuzzed_lng;
    NEW.public_location := ST_SetSRID(ST_MakePoint(NEW.public_lng, NEW.public_lat), 4326)::geography;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS before_insert_fuzz_location ON public.dom_nho_posts;
CREATE TRIGGER before_insert_fuzz_location
    BEFORE INSERT ON public.dom_nho_posts
    FOR EACH ROW
    EXECUTE FUNCTION public.trg_fuzz_dom_nho_location();

-- ============================================================================
-- 11. HÀM RPC: QUÉT CÁC ĐỐM SÁNG TRONG BÁN KÍNH (get_nearby_dom_nho)
-- Không bao giờ trả về exact_location hoặc raw_phone
-- ============================================================================
CREATE OR REPLACE FUNCTION public.get_nearby_dom_nho(
    user_lat DOUBLE PRECISION,
    user_lng DOUBLE PRECISION,
    radius_meters DOUBLE PRECISION DEFAULT 5000,
    viewer_id UUID DEFAULT NULL,
    viewer_couple_room_id UUID DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    author_id UUID,
    author_name TEXT,
    spot_type dom_spot_type,
    status dom_spot_status,
    visibility dom_visibility,
    title TEXT,
    story TEXT,
    species TEXT,
    breed TEXT,
    coat_color TEXT,
    traits TEXT[],
    images TEXT[],
    public_lat DOUBLE PRECISION,
    public_lng DOUBLE PRECISION,
    fuzz_radius_meters INTEGER,
    area_label TEXT,
    light_power INTEGER,
    boost_count INTEGER,
    is_emergency_boosted BOOLEAN,
    allow_foster BOOLEAN,
    source_type TEXT,
    source_url TEXT,
    masked_phone TEXT,
    distance_meters INTEGER,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_point GEOGRAPHY(POINT, 4326);
BEGIN
    user_point := ST_SetSRID(ST_MakePoint(user_lng, user_lat), 4326)::geography;

    RETURN QUERY
    SELECT
        p.id,
        p.author_id,
        p.author_name,
        p.spot_type,
        p.status,
        p.visibility,
        p.title,
        p.story,
        p.species,
        p.breed,
        p.coat_color,
        p.traits,
        p.images,
        p.public_lat,
        p.public_lng,
        p.fuzz_radius_meters,
        p.area_label,
        p.light_power,
        p.boost_count,
        p.is_emergency_boosted,
        p.allow_foster,
        p.source_type,
        p.source_url,
        COALESCE(pc.masked_phone, '090***889') AS masked_phone,
        ROUND(ST_Distance(p.public_location, user_point))::INTEGER AS distance_meters,
        p.created_at
    FROM public.dom_nho_posts p
    LEFT JOIN public.private_contacts pc ON pc.post_id = p.id
    WHERE
        p.light_power > 0
        AND (
            -- Không hiện bài bị Shadowban trừ khi chính tác giả đang xem
            p.status IN ('ACTIVE', 'MATCHED', 'RESOLVED')
            OR (p.status = 'SHADOWBANNED' AND p.author_id = viewer_id)
        )
        AND (
            -- Chỉ hiển thị bài PUBLIC hoặc bài PRIVATE_COUPLE đúng phòng cặp đôi
            p.visibility = 'PUBLIC'
            OR (p.visibility = 'PRIVATE_COUPLE' AND p.couple_room_id IS NOT NULL AND p.couple_room_id = viewer_couple_room_id)
        )
        AND ST_DWithin(p.public_location, user_point, radius_meters)
    ORDER BY
        p.is_emergency_boosted DESC,
        ST_Distance(p.public_location, user_point) ASC;
END;
$$;

-- ============================================================================
-- 12. HÀM RPC: THUẬT TOÁN KHỚP LỆNH KÉP TRONG BÁN KÍNH 3KM (DOUBLE MATCH)
-- Quét các Đốm Đỏ (RED_SOS) và Đốm Cam (ORANGE_SIGHT) trong 3000m cùng loài/đặc điểm
-- ============================================================================
CREATE OR REPLACE FUNCTION public.find_matching_spots_within_3km(
    target_post_id UUID
)
RETURNS TABLE (
    matched_post_id UUID,
    matched_title TEXT,
    matched_spot_type dom_spot_type,
    matched_image TEXT,
    distance_meters INTEGER,
    similarity_score NUMERIC(4,2),
    common_traits TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    src RECORD;
    opposite_type dom_spot_type;
BEGIN
    SELECT * INTO src FROM public.dom_nho_posts WHERE id = target_post_id;
    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF src.spot_type = 'ORANGE_SIGHT' THEN
        opposite_type := 'RED_SOS';
    ELSIF src.spot_type = 'RED_SOS' THEN
        opposite_type := 'ORANGE_SIGHT';
    ELSE
        RETURN;
    END IF;

    RETURN QUERY
    SELECT
        cand.id AS matched_post_id,
        cand.title AS matched_title,
        cand.spot_type AS matched_spot_type,
        cand.images[1] AS matched_image,
        ROUND(ST_Distance(COALESCE(cand.exact_location, cand.public_location), COALESCE(src.exact_location, src.public_location)))::INTEGER AS distance_meters,
        LEAST(
            0.98,
            0.60
            + (CASE WHEN cand.coat_color IS NOT NULL AND cand.coat_color = src.coat_color THEN 0.20 ELSE 0.0 END)
            + (COALESCE(array_length(ARRAY(SELECT UNNEST(cand.traits) INTERSECT SELECT UNNEST(src.traits)), 1), 0) * 0.08)
        )::NUMERIC(4,2) AS similarity_score,
        ARRAY(SELECT UNNEST(cand.traits) INTERSECT SELECT UNNEST(src.traits)) AS common_traits
    FROM public.dom_nho_posts cand
    WHERE
        cand.id <> src.id
        AND cand.spot_type = opposite_type
        AND cand.status IN ('ACTIVE', 'MATCHED')
        AND cand.species = src.species
        AND ST_DWithin(
            COALESCE(cand.exact_location, cand.public_location),
            COALESCE(src.exact_location, src.public_location),
            3000 -- Bán kính 3km
        )
    ORDER BY similarity_score DESC, distance_meters ASC
    LIMIT 5;
END;
$$;

-- ============================================================================
-- 13. HÀM RPC: TRUYỀN LỬA (BOOST LIGHT POWER) & TỰ ĐỘNG GIẢM ĐỘ SÁNG (AUTO-FADE)
-- ============================================================================
CREATE OR REPLACE FUNCTION public.boost_dom_light(
    target_post_id UUID,
    power_delta INTEGER DEFAULT 15
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    updated_power INTEGER;
BEGIN
    UPDATE public.dom_nho_posts
    SET
        light_power = LEAST(500, light_power + power_delta),
        boost_count = boost_count + 1,
        updated_at = NOW()
    WHERE id = target_post_id
    RETURNING light_power INTO updated_power;

    RETURN COALESCE(updated_power, 0);
END;
$$;

-- Hàm chạy định kỳ mỗi 24h giảm light_power của các đốm không được Truyền Lửa
CREATE OR REPLACE FUNCTION public.decay_dom_nho_light_daily()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    affected_rows INTEGER;
BEGIN
    UPDATE public.dom_nho_posts
    SET
        light_power = GREATEST(0, light_power - 20),
        status = CASE
            WHEN GREATEST(0, light_power - 20) = 0 THEN 'FADED'::dom_spot_status
            ELSE status
        END,
        updated_at = NOW()
    WHERE
        status = 'ACTIVE'
        AND spot_type <> 'GREEN_PEACE'
        AND (is_emergency_boosted = FALSE OR emergency_boost_until < NOW())
        AND updated_at < NOW() - INTERVAL '24 hours';

    GET DIAGNOSTICS affected_rows = ROW_COUNT;
    RETURN affected_rows;
END;
$$;

-- ============================================================================
-- 14. CHÍNH SÁCH AN TOÀN ROW LEVEL SECURITY (RLS)
-- ============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.couple_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dom_nho_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.private_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_unlock_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spot_sightings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memory_snaps ENABLE ROW LEVEL SECURITY;

-- Chính sách đọc đốm sáng công khai (ẩn bài PRIVATE_COUPLE của người khác)
DROP POLICY IF EXISTS "Public can view public active spots" ON public.dom_nho_posts;
CREATE POLICY "Public can view public active spots"
    ON public.dom_nho_posts
    FOR SELECT
    USING (
        visibility = 'PUBLIC'
        AND status IN ('ACTIVE', 'MATCHED', 'RESOLVED')
    );

-- Chính sách bảo vệ bảng private_contacts: Chỉ chủ bài đăng mới đọc được raw_phone trực tiếp
DROP POLICY IF EXISTS "Only owner can read private raw contact" ON public.private_contacts;
CREATE POLICY "Only owner can read private raw contact"
    ON public.private_contacts
    FOR SELECT
    USING (auth.uid() = owner_id);

-- Cho phép xem các dấu vết bắt gặp (Sightings) và Kỷ niệm công khai
DROP POLICY IF EXISTS "Anyone can view sightings" ON public.spot_sightings;
CREATE POLICY "Anyone can view sightings"
    ON public.spot_sightings
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "Anyone can view public memory snaps" ON public.memory_snaps;
CREATE POLICY "Anyone can view public memory snaps"
    ON public.memory_snaps
    FOR SELECT
    USING (true);

