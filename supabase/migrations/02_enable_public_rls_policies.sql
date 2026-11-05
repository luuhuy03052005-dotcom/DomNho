-- ============================================================================
-- ĐỐM NHỎ (DOM NHO) — MIGRATION 02: KÍCH HOẠT RLS POLICIES CHO COMMUNITY FEED
-- Chạy file này trong Supabase SQL Editor để cho phép đọc/ghi/sửa/xóa trực tiếp
-- các bảng cộng đồng với Publishable Key (anon/authenticated).
-- ============================================================================

DROP POLICY IF EXISTS "Public can view public active spots" ON public.dom_nho_posts;
CREATE POLICY "Public can view public active spots"
    ON public.dom_nho_posts
    FOR SELECT
    USING (
        visibility = 'PUBLIC'
        AND status IN ('ACTIVE', 'MATCHED', 'RESOLVED')
    );

DROP POLICY IF EXISTS "Public can insert spots" ON public.dom_nho_posts;
CREATE POLICY "Public can insert spots"
    ON public.dom_nho_posts
    FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can update spot light power" ON public.dom_nho_posts;
CREATE POLICY "Public can update spot light power"
    ON public.dom_nho_posts
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can delete spots" ON public.dom_nho_posts;
CREATE POLICY "Public can delete spots"
    ON public.dom_nho_posts
    FOR DELETE
    USING (true);

DROP POLICY IF EXISTS "Public can read and write profiles" ON public.profiles;
CREATE POLICY "Public can read and write profiles"
    ON public.profiles
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Public can read and write couple rooms" ON public.couple_rooms;
CREATE POLICY "Public can read and write couple rooms"
    ON public.couple_rooms
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view and insert unlock requests" ON public.contact_unlock_requests;
CREATE POLICY "Anyone can view and insert unlock requests"
    ON public.contact_unlock_requests
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view sightings" ON public.spot_sightings;
CREATE POLICY "Anyone can view sightings"
    ON public.spot_sightings
    FOR ALL
    USING (true)
    WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can view public memory snaps" ON public.memory_snaps;
CREATE POLICY "Anyone can view public memory snaps"
    ON public.memory_snaps
    FOR ALL
    USING (true)
    WITH CHECK (true);
