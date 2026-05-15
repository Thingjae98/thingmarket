"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import Link from "next/link";
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
    // initialQuery는 마운트 시점에 한 번만 적용. 이후엔 사용자 액션이 주도한다.
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
      {/* 페이지 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-lg font-bold" style={{ color: "var(--tx-primary)" }}>
          🪙 동네 금 거래
        </h1>
        <Link
          href="/"
          className="text-xs transition-opacity hover:opacity-70"
          style={{ color: "var(--tx-secondary)" }}
        >
          ← 시세 보기
        </Link>
      </div>

      {/* 검색바 */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchSearch()}
          placeholder="금 상품 검색"
          className="flex-1 px-4 py-2.5 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
        />
        <button
          onClick={fetchSearch}
          className="px-5 py-2.5 rounded-full text-sm font-medium transition-colors hover:opacity-80"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
        >
          검색
        </button>
      </div>

      {/* 위치 + 반경 */}
      <div className="flex items-center gap-2 mb-4 text-sm flex-wrap">
        <button
          onClick={handleLocate}
          disabled={locating}
          className="flex items-center gap-1 transition-colors"
          style={{ color: "var(--accent)" }}
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

      {/* 상품 목록 */}
      {loading ? (
        <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
      ) : products.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
          <p className="text-4xl mb-3">🪙</p>
          <p className="text-sm">근처에 등록된 금 상품이 없습니다.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl overflow-hidden shadow-sm"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {products.map((p) => (
            <ProductCard key={p.id} item={p} />
          ))}
        </div>
      )}
    </div>
  );
}
