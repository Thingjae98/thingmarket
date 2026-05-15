"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/types";
import ProductCard from "@/components/ProductCard";

const DEFAULT_LAT = 37.5665;
const DEFAULT_LNG = 126.978;

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

  const fetchSearch = useCallback(async () => {
    if (!keyword.trim()) return fetchProducts();
    setLoading(true);
    try {
      const params = new URLSearchParams({ keyword: keyword.trim(), lat: String(lat), lng: String(lng), radius: String(radius) });
      const data = await api.get<ProductListItem[]>(`/products/search?${params}`);
      setProducts(data);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [keyword, lat, lng, radius, fetchProducts]);

  useEffect(() => {
    if (initialQuery) {
      fetchSearch();
    } else {
      fetchProducts();
    }
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

  return (
    <div>
      {/* 검색바 — 홈과 동일 스타일 */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchSearch()}
          placeholder="검색어를 입력해주세요"
          className="flex-1 px-5 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
        />
        <button
          onClick={fetchSearch}
          aria-label="검색"
          className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
          style={{ backgroundColor: "var(--tx-primary)", color: "var(--bg-card)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* 메인 헤딩 — 당근 "경기도 안양시 만안구 석수2동 중고거래" 스타일 */}
      <h1 className="text-xl font-extrabold mb-3 tracking-tight" style={{ color: "var(--tx-primary)" }}>
        🪙 {locationName} 동네 금 거래
      </h1>

      {/* 위치 + 반경 — 기존과 동일 */}
      <div className="flex items-center gap-2 mb-5 text-sm flex-wrap">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-1 text-orange-500 hover:text-orange-600 transition-colors"
        >
          📍 {locating ? "위치 찾는 중..." : locationName}
        </button>
        <span style={{ color: "var(--bd-input)" }}>|</span>
        {[1, 3, 5].map((r) => (
          <button
            key={r}
            onClick={() => setRadius(r)}
            className="px-3 py-1 rounded-full text-xs font-medium transition-colors"
            style={radius === r
              ? { backgroundColor: "var(--accent)", color: "var(--accent-fg)" }
              : { color: "var(--tx-secondary)" }
            }
          >
            {r}km
          </button>
        ))}
      </div>

      {/* 상품 그리드 — 당근 중고거래 페이지 카드 스타일 */}
      {loading ? (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
          <p className="text-4xl mb-3">🪙</p>
          <p className="text-sm">근처에 등록된 금 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-6">
          {products.map((p) => (
            <ProductCard key={p.id} item={p} variant="grid" />
          ))}
        </div>
      )}
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
