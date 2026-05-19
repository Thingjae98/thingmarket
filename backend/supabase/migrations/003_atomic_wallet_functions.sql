-- ============================================================
-- ThingMarket Phase 5 보완 — 원자적 지갑 함수
-- 실행 위치: Supabase Dashboard > SQL Editor
--
-- 문제: transaction_service.py가 잔액을 읽은 뒤 별도로 UPDATE하는
--       TOCTOU 패턴 사용 → 동시 요청 시 잔액이 음수가 될 수 있음.
-- 해결: 잔액 확인·차감·증가를 단일 UPDATE 문으로 처리해
--       DB 레벨에서 원자성을 보장한다.
-- ============================================================


-- ────────────────────────────────────────────────────────────
-- 원자적 잔액 차감 (잔액 부족 시 예외 발생)
-- UPDATE ... WHERE balance >= p_amount 이 0 행이면 잔액 부족
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION deduct_wallet(p_user_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE virtual_wallets
    SET    balance = balance - p_amount
    WHERE  user_id = p_user_id
      AND  balance >= p_amount;

    IF NOT FOUND THEN
        -- 지갑이 없는 경우와 잔액 부족인 경우를 구분
        IF NOT EXISTS (SELECT 1 FROM virtual_wallets WHERE user_id = p_user_id) THEN
            RAISE EXCEPTION '지갑없음';
        END IF;
        RAISE EXCEPTION '잔액부족';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ────────────────────────────────────────────────────────────
-- 원자적 잔액 증가 (충전 · 환불 · 판매 확정 시)
-- ────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION credit_wallet(p_user_id UUID, p_amount BIGINT)
RETURNS void AS $$
BEGIN
    UPDATE virtual_wallets
    SET    balance = balance + p_amount
    WHERE  user_id = p_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION '지갑없음';
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
