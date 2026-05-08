-- ============================================================
-- ThingMarket 초기 스키마
-- 실행 위치: Supabase Dashboard > SQL Editor
-- ============================================================

-- PostGIS 확장 (위치 기반 쿼리에 필요)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ────────────────────────────────────────────────────────────
-- 카테고리
-- ────────────────────────────────────────────────────────────
CREATE TABLE categories (
    id        SERIAL PRIMARY KEY,
    name      TEXT NOT NULL,
    icon      TEXT,
    parent_id INT REFERENCES categories(id) ON DELETE SET NULL
);


-- ────────────────────────────────────────────────────────────
-- 프로필 (Supabase auth.users 1:1 확장)
-- ────────────────────────────────────────────────────────────
CREATE TABLE profiles (
    id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nickname      TEXT UNIQUE NOT NULL,
    avatar_url    TEXT,
    bio           TEXT,
    manner_temp   FLOAT       NOT NULL DEFAULT 36.5,
    location      GEOGRAPHY(Point, 4326),           -- PostGIS 위치
    location_name TEXT,                              -- 예: "서울 마포구 합정동"
    search_radius INT         NOT NULL DEFAULT 3
                  CHECK (search_radius IN (1, 3, 5)),
    role          TEXT        NOT NULL DEFAULT 'user'
                  CHECK (role IN ('user', 'admin')),
    is_banned     BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 상품 게시글
-- ────────────────────────────────────────────────────────────
CREATE TABLE products (
    id            UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    seller_id     UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title         TEXT        NOT NULL,
    description   TEXT,
    price         INT         NOT NULL CHECK (price >= 0),
    category_id   INT         REFERENCES categories(id) ON DELETE SET NULL,
    status        TEXT        NOT NULL DEFAULT 'selling'
                  CHECK (status IN ('selling', 'reserved', 'sold')),
    location      GEOGRAPHY(Point, 4326),
    location_name TEXT,
    view_count    INT         NOT NULL DEFAULT 0,
    like_count    INT         NOT NULL DEFAULT 0,
    is_negotiable BOOLEAN     NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 상품 이미지
-- ────────────────────────────────────────────────────────────
CREATE TABLE product_images (
    id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id    UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    image_url     TEXT NOT NULL,
    display_order INT  NOT NULL DEFAULT 0
);


-- ────────────────────────────────────────────────────────────
-- 관심 상품 (찜)
-- ────────────────────────────────────────────────────────────
CREATE TABLE likes (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, product_id)
);


-- ────────────────────────────────────────────────────────────
-- 채팅방
-- ────────────────────────────────────────────────────────────
CREATE TABLE chat_rooms (
    id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id      UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id        UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id       UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    last_message    TEXT,
    last_message_at TIMESTAMPTZ,
    buyer_unread    INT         NOT NULL DEFAULT 0,
    seller_unread   INT         NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, buyer_id)              -- 같은 상품에 구매자당 채팅방 1개
);


-- ────────────────────────────────────────────────────────────
-- 채팅 메시지
-- ────────────────────────────────────────────────────────────
CREATE TABLE chat_messages (
    id           UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    room_id      UUID        NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    sender_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    content      TEXT        NOT NULL,
    message_type TEXT        NOT NULL DEFAULT 'text'
                 CHECK (message_type IN ('text', 'image', 'system')),
    is_read      BOOLEAN     NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 거래 후기
-- ────────────────────────────────────────────────────────────
CREATE TABLE reviews (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id  UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    reviewer_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reviewee_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    rating      INT         NOT NULL CHECK (rating BETWEEN 1 AND 5),
    content     TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (product_id, reviewer_id)           -- 상품당 후기 1회만
);


-- ────────────────────────────────────────────────────────────
-- 신고
-- ────────────────────────────────────────────────────────────
CREATE TABLE reports (
    id          UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    target_type TEXT        NOT NULL CHECK (target_type IN ('product', 'user', 'chat')),
    target_id   UUID        NOT NULL,
    reason      TEXT        NOT NULL,
    status      TEXT        NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'reviewed', 'resolved', 'dismissed')),
    admin_note  TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 가상 지갑
-- ────────────────────────────────────────────────────────────
CREATE TABLE virtual_wallets (
    id      UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    balance INT  NOT NULL DEFAULT 0 CHECK (balance >= 0)
);


-- ────────────────────────────────────────────────────────────
-- 가상 거래 (에스크로)
-- 상태 흐름: pending → escrowed → completed
--                              └→ cancelled → refunded
-- ────────────────────────────────────────────────────────────
CREATE TABLE virtual_transactions (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID        NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    buyer_id   UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    seller_id  UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    amount     INT         NOT NULL CHECK (amount > 0),
    status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'escrowed', 'completed', 'cancelled', 'refunded')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ────────────────────────────────────────────────────────────
-- 알림
-- ────────────────────────────────────────────────────────────
CREATE TABLE notifications (
    id         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id    UUID        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    type       TEXT        NOT NULL
               CHECK (type IN ('chat', 'like', 'review', 'transaction', 'system')),
    title      TEXT        NOT NULL,
    body       TEXT        NOT NULL,
    is_read    BOOLEAN     NOT NULL DEFAULT FALSE,
    data       JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- ============================================================
-- 인덱스
-- ============================================================
CREATE INDEX idx_products_location    ON products USING GIST(location);
CREATE INDEX idx_products_seller      ON products(seller_id);
CREATE INDEX idx_products_status      ON products(status);
CREATE INDEX idx_products_created_at  ON products(created_at DESC);
CREATE INDEX idx_chat_messages_room   ON chat_messages(room_id, created_at);
CREATE INDEX idx_notifications_user   ON notifications(user_id, is_read);
CREATE INDEX idx_likes_user           ON likes(user_id);
CREATE INDEX idx_likes_product        ON likes(product_id);


-- ============================================================
-- updated_at 자동 갱신 트리거
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_updated_at
    BEFORE UPDATE ON products
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_transactions_updated_at
    BEFORE UPDATE ON virtual_transactions
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- 위치 업데이트 RPC (FastAPI → supabase.rpc() 로 호출)
-- SECURITY DEFINER: 서비스 롤 없이도 GEOGRAPHY 타입 업데이트 가능
-- ============================================================
CREATE OR REPLACE FUNCTION update_user_location(
    p_user_id      UUID,
    p_lat          FLOAT,
    p_lng          FLOAT,
    p_location_name TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE profiles
    SET location      = ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
        location_name = p_location_name,
        updated_at    = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 신규 사용자 자동 프로필·지갑 생성 트리거
-- Supabase Auth에서 회원가입 시 auth.users에 INSERT → 자동 실행
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nickname)
    VALUES (
        NEW.id,
        COALESCE(
            NEW.raw_user_meta_data->>'nickname',
            '사용자_' || LEFT(NEW.id::TEXT, 8)
        )
    );
    INSERT INTO public.virtual_wallets (user_id) VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- RLS (Row Level Security) — 데이터 접근 제어
-- 백엔드 서비스 롤은 RLS를 우회하므로, 클라이언트 직접 접근 방어용
-- ============================================================
ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE products             ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_images       ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes                ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_rooms           ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews              ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports              ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_wallets      ENABLE ROW LEVEL SECURITY;
ALTER TABLE virtual_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY "프로필 공개 조회"   ON profiles FOR SELECT USING (true);
CREATE POLICY "본인 프로필 수정"   ON profiles FOR UPDATE USING (auth.uid() = id);

-- products
CREATE POLICY "상품 공개 조회"     ON products FOR SELECT USING (true);
CREATE POLICY "상품 등록"          ON products FOR INSERT WITH CHECK (auth.uid() = seller_id);
CREATE POLICY "본인 상품 수정"     ON products FOR UPDATE USING (auth.uid() = seller_id);
CREATE POLICY "본인 상품 삭제"     ON products FOR DELETE USING (auth.uid() = seller_id);

-- product_images
CREATE POLICY "이미지 공개 조회"   ON product_images FOR SELECT USING (true);
CREATE POLICY "이미지 등록"        ON product_images FOR INSERT WITH CHECK (
    auth.uid() = (SELECT seller_id FROM products WHERE id = product_id)
);

-- likes
CREATE POLICY "본인 찜 조회"       ON likes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "찜 등록"            ON likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "찜 삭제"            ON likes FOR DELETE USING (auth.uid() = user_id);

-- chat_rooms
CREATE POLICY "채팅방 조회"        ON chat_rooms FOR SELECT
    USING (auth.uid() IN (buyer_id, seller_id));
CREATE POLICY "채팅방 생성"        ON chat_rooms FOR INSERT WITH CHECK (auth.uid() = buyer_id);

-- chat_messages
CREATE POLICY "메시지 조회"        ON chat_messages FOR SELECT USING (
    auth.uid() IN (
        SELECT buyer_id  FROM chat_rooms WHERE id = room_id
        UNION
        SELECT seller_id FROM chat_rooms WHERE id = room_id
    )
);
CREATE POLICY "메시지 전송"        ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- virtual_wallets
CREATE POLICY "본인 지갑 조회"     ON virtual_wallets FOR SELECT USING (auth.uid() = user_id);

-- notifications
CREATE POLICY "본인 알림 조회"     ON notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "본인 알림 읽음처리" ON notifications FOR UPDATE USING (auth.uid() = user_id);


-- ============================================================
-- 기본 카테고리 데이터
-- ============================================================
INSERT INTO categories (name, icon) VALUES
    ('디지털/가전',    '💻'),
    ('의류/잡화',      '👕'),
    ('가구/인테리어',  '🪑'),
    ('도서/음반',      '📚'),
    ('스포츠/레저',    '⚽'),
    ('게임',           '🎮'),
    ('뷰티/미용',      '💄'),
    ('유아동',         '🧸'),
    ('생활/주방',      '🍳'),
    ('반려동물',       '🐾'),
    ('티켓/교환권',    '🎫'),
    ('기타',           '📦');
