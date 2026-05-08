-- ============================================================
-- ThingMarket Phase 2 — 상품 관련 SQL 함수
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- 근처 상품 목록 조회 (PostGIS ST_DWithin)
-- FastAPI에서 supabase.rpc("get_products_nearby", {...})로 호출
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION get_products_nearby(
    p_lat         FLOAT,
    p_lng         FLOAT,
    p_radius_km   FLOAT   DEFAULT 3,
    p_category_id INT     DEFAULT NULL,
    p_status      TEXT    DEFAULT NULL,
    p_limit       INT     DEFAULT 20,
    p_offset      INT     DEFAULT 0
)
RETURNS TABLE(
    id            UUID,
    seller_id     UUID,
    title         TEXT,
    price         INT,
    status        TEXT,
    location_name TEXT,
    view_count    INT,
    like_count    INT,
    is_negotiable BOOLEAN,
    created_at    TIMESTAMPTZ,
    distance_km   FLOAT,
    thumbnail_url TEXT,
    seller_nickname TEXT,
    seller_avatar TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.seller_id,
        p.title,
        p.price,
        p.status,
        p.location_name,
        p.view_count,
        p.like_count,
        p.is_negotiable,
        p.created_at,
        ROUND(
            (ST_Distance(
                p.location,
                ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
            ) / 1000)::numeric, 1
        )::float                                                      AS distance_km,
        (SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.display_order ASC LIMIT 1)                       AS thumbnail_url,
        pr.nickname                                                    AS seller_nickname,
        pr.avatar_url                                                  AS seller_avatar
    FROM products p
    JOIN profiles pr ON pr.id = p.seller_id
    WHERE pr.is_banned = FALSE
      AND (p_status   IS NULL OR p.status      = p_status)
      AND (p_category_id IS NULL OR p.category_id = p_category_id)
      AND p.location IS NOT NULL
      AND ST_DWithin(
              p.location,
              ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
              p_radius_km * 1000    -- km → m 변환
          )
    ORDER BY p.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 상품 키워드 검색 (위치 필터 포함)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION search_products(
    p_keyword     TEXT,
    p_lat         FLOAT   DEFAULT NULL,
    p_lng         FLOAT   DEFAULT NULL,
    p_radius_km   FLOAT   DEFAULT NULL,
    p_limit       INT     DEFAULT 20,
    p_offset      INT     DEFAULT 0
)
RETURNS TABLE(
    id            UUID,
    seller_id     UUID,
    title         TEXT,
    price         INT,
    status        TEXT,
    location_name TEXT,
    view_count    INT,
    like_count    INT,
    is_negotiable BOOLEAN,
    created_at    TIMESTAMPTZ,
    thumbnail_url TEXT,
    seller_nickname TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.seller_id,
        p.title,
        p.price,
        p.status,
        p.location_name,
        p.view_count,
        p.like_count,
        p.is_negotiable,
        p.created_at,
        (SELECT pi.image_url FROM product_images pi
         WHERE pi.product_id = p.id
         ORDER BY pi.display_order ASC LIMIT 1) AS thumbnail_url,
        pr.nickname AS seller_nickname
    FROM products p
    JOIN profiles pr ON pr.id = p.seller_id
    WHERE pr.is_banned = FALSE
      AND p.status != 'sold'
      AND (p.title ILIKE '%' || p_keyword || '%'
           OR p.description ILIKE '%' || p_keyword || '%')
      AND (
          p_lat IS NULL OR p_lng IS NULL OR p_radius_km IS NULL
          OR ST_DWithin(
                 p.location,
                 ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
                 p_radius_km * 1000
             )
      )
    ORDER BY p.created_at DESC
    LIMIT  p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;


-- ────────────────────────────────────────────────────────────
-- 조회수 증가 (동시성 안전)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION increment_view_count(p_product_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET view_count = view_count + 1
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 좋아요 토글 (추가 or 제거) + like_count 동기화
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION toggle_like(p_user_id UUID, p_product_id UUID)
RETURNS TABLE(liked BOOLEAN) AS $$
DECLARE
    v_exists BOOLEAN;
BEGIN
    SELECT EXISTS(
        SELECT 1 FROM likes
        WHERE user_id = p_user_id AND product_id = p_product_id
    ) INTO v_exists;

    IF v_exists THEN
        DELETE FROM likes WHERE user_id = p_user_id AND product_id = p_product_id;
        UPDATE products SET like_count = GREATEST(like_count - 1, 0) WHERE id = p_product_id;
        RETURN QUERY SELECT FALSE;
    ELSE
        INSERT INTO likes (user_id, product_id) VALUES (p_user_id, p_product_id);
        UPDATE products SET like_count = like_count + 1 WHERE id = p_product_id;
        RETURN QUERY SELECT TRUE;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 상품 위치 업데이트 (GEOGRAPHY 타입)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_product_location(
    p_product_id  UUID,
    p_lat         FLOAT,
    p_lng         FLOAT,
    p_location_name TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE products
    SET location      = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        location_name = p_location_name,
        updated_at    = NOW()
    WHERE id = p_product_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
