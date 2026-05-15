"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/types";
import ProductCard from "@/components/ProductCard";
import PopularKeywords from "@/components/PopularKeywords";

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

// 금 도메인 시각용 카테고리 — 선택 시 해당 키워드로 검색 (DB 카테고리 스키마 변경 X)
const CATEGORIES = [
  { key: "ring", label: "반지" },
  { key: "necklace", label: "목걸이" },
  { key: "bracelet", label: "팔찌" },
  { key: "earring", label: "귀걸이" },
  { key: "goldbar", label: "골드바" },
  { key: "watch", label: "금시계" },
  { key: "etc", label: "기타" },
];

export default function MarketPage() {
  return (
    <Suspense fallback={<div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>}>
      <MarketInner />
    </Suspense>
  );
}

function MarketInner() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") ?? "";
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(initialQuery);
  const [radius, setRadius] = useState(3);
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [locationName, setLocationName] = useState("서울 중구");
  const [locating, setLocating] = useState(false);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [category, setCategory] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ lat: String(lat), lng: String(lng), radius: String(radius) });
      const data = await api.get<ProductListItem[]>(`/products?${params}`);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [lat, lng, radius]);

  const fetchSearch = useCallback(async (overrideKeyword?: string) => {
    const k = (overrideKeyword ?? keyword).trim();
    if (!k) return fetchProducts();
    setLoading(true);
    try {
      const params = new URLSearchParams({ keyword: k, lat: String(lat), lng: String(lng), radius: String(radius) });
      const data = await api.get<ProductListItem[]>(`/products/search?${params}`);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, lat, lng, radius, fetchProducts]);

  useEffect(() => {
    if (initialQuery) fetchSearch();
    else fetchProducts();
    // initialQuery는 마운트 시점에 한 번만 적용
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts]);

  const handleLocate = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setLat(pos.coords.latitude); setLng(pos.coords.longitude); setLocationName("현재 위치"); setLocating(false); },
      () => setLocating(false)
    );
  };

  const handleCategory = (key: string, label: string) => {
    if (category === key) {
      setCategory(null);
      setKeyword("");
      fetchProducts();
    } else {
      setCategory(key);
      setKeyword(label);
      fetchSearch(label);
    }
  };

  const reset = () => {
    setOnlyAvailable(false);
    setCategory(null);
    setRadius(3);
    setKeyword("");
    fetchProducts();
  };

  // 거래 가능 필터링 (클라이언트 사이드)
  const visible = onlyAvailable ? products.filter((p) => p.status === "selling") : products;

  return (
    <div>
      {/* 상단 검색 줄: 위치 선택 + 검색바 + 화살표 버튼 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="h-12 px-4 rounded-full text-sm font-medium transition-colors shrink-0 flex items-center gap-1"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
        >
          <span aria-hidden>📍</span>
          {locating ? "위치 찾는 중..." : locationName}
          <span className="text-xs ml-0.5" style={{ color: "var(--tx-secondary)" }}>▾</span>
        </button>
        <div className="flex-1 flex items-center gap-2">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchSearch()}
            placeholder="검색어를 입력해주세요"
            className="flex-1 h-12 px-5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
            style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
          />
          <button
            onClick={() => fetchSearch()}
            aria-label="검색"
            className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 shrink-0"
            style={{ backgroundColor: "var(--tx-primary)", color: "var(--bg-card)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          </button>
        </div>
      </div>

      {/* 인기 검색어 */}
      <div className="mb-6 overflow-x-auto">
        <PopularKeywords />
      </div>

      {/* 메인 헤딩 — 당근 "경기도 안양시 만안구 석수2동 중고거래" 스타일 */}
      <h1 className="text-2xl font-extrabold mb-5 tracking-tight" style={{ color: "var(--tx-primary)" }}>
        🪙 {locationName} 동네 금 거래
      </h1>

      {/* 본문: 사이드바 + 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-8">
        {/* 좌측 필터 사이드바 */}
        <aside className="text-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold" style={{ color: "var(--tx-primary)" }}>필터</h2>
            <button
              onClick={reset}
              className="text-xs transition-opacity hover:opacity-70"
              style={{ color: "var(--accent)" }}
            >
              초기화
            </button>
          </div>

          {/* 거래 가능만 */}
          <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
              className="w-4 h-4 accent-orange-500 cursor-pointer"
            />
            <span style={{ color: "var(--tx-primary)" }}>거래 가능만 보기</span>
          </label>

          {/* 위치 (반경) */}
          <div className="mb-6">
            <h3 className="font-bold mb-1" style={{ color: "var(--tx-primary)" }}>위치</h3>
            <p className="text-xs mb-2.5" style={{ color: "var(--tx-secondary)" }}>{locationName} 기준 반경</p>
            <div className="space-y-2">
              {[1, 3, 5].map((r) => (
                <label key={r} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="radius"
                    checked={radius === r}
                    onChange={() => setRadius(r)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                  />
                  <span style={{ color: "var(--tx-primary)" }}>{r}km 이내</span>
                </label>
              ))}
            </div>
          </div>

          {/* 카테고리 */}
          <div>
            <h3 className="font-bold mb-2.5" style={{ color: "var(--tx-primary)" }}>카테고리</h3>
            <div className="space-y-2">
              {CATEGORIES.map((c) => (
                <label key={c.key} className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="radio"
                    name="category"
                    checked={category === c.key}
                    onChange={() => handleCategory(c.key, c.label)}
                    className="w-4 h-4 accent-orange-500 cursor-pointer"
                  />
                  <span style={{ color: "var(--tx-primary)" }}>{c.label}</span>
                </label>
              ))}
            </div>
          </div>
        </aside>

        {/* 우측 상품 그리드 */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
              <p className="text-4xl mb-3">🪙</p>
              <p className="text-sm">조건에 맞는 금 상품이 없습니다.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
              {visible.map((p) => (
                <ProductCard key={p.id} item={p} variant="grid" />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div>
      <div
        className="w-full aspect-square rounded-xl mb-2"
        style={{
          backgroundColor: "var(--bg-input)",
          backgroundImage: "linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.18) 50%, transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "shimmer 1.4s linear infinite",
        }}
      />
      <div className="h-4 w-3/4 rounded mb-1.5" style={{ backgroundColor: "var(--bg-input)" }} />
      <div className="h-4 w-1/2 rounded" style={{ backgroundColor: "var(--bg-input)" }} />
    </div>
  );
}
