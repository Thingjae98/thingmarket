"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/types";
import ProductCard from "@/components/ProductCard";
import PopularKeywords from "@/components/PopularKeywords";
import { useLocationStore } from "@/store/location";

// 금 도메인 시각용 카테고리 — 선택 시 라벨을 키워드로 검색 (DB 스키마 변경 X)
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

  // 위치 전역 store
  const { lat, lng, locationName, status: geoStatus, requestGeo } = useLocationStore();
  useEffect(() => { requestGeo(); }, [requestGeo]); // 마운트 시 자동 1회 요청

  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [keyword, setKeyword] = useState(initialQuery);
  const [radius, setRadius] = useState(3);
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [category, setCategory] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchProducts]);

  // 위치 권한 획득 직후 재조회
  useEffect(() => {
    if (geoStatus === "granted") {
      if (keyword.trim()) fetchSearch();
      else fetchProducts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoStatus, lat, lng]);

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

  const filterCount =
    (onlyAvailable ? 1 : 0) + (category ? 1 : 0) + (radius !== 3 ? 1 : 0);
  const visible = onlyAvailable ? products.filter((p) => p.status === "selling") : products;

  const filterPanelProps = {
    onlyAvailable, setOnlyAvailable,
    radius, setRadius,
    category,
    onCategoryClick: handleCategory,
    locationName,
  };

  return (
    <div>
      {/* 상단 검색 줄: 위치 + 검색 + 화살표 */}
      <div className="flex items-center gap-2 mb-3">
        <button
          onClick={() => requestGeo({ force: true })}
          disabled={geoStatus === "requesting"}
          className="h-12 px-4 rounded-full text-sm font-medium transition-colors shrink-0 flex items-center gap-1"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
        >
          <span aria-hidden>📍</span>
          {geoStatus === "requesting" ? "위치 찾는 중..." : locationName}
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

      {/* 메인 헤딩 */}
      <h1 className="text-2xl font-extrabold mb-5 tracking-tight" style={{ color: "var(--tx-primary)" }}>
        {locationName} 동네 금 거래
      </h1>

      {/* 모바일: 필터 버튼 (md 미만에서만 노출) */}
      <button
        onClick={() => setFilterOpen(true)}
        className="md:hidden mb-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="4" y1="6" x2="20" y2="6" />
          <line x1="6" y1="12" x2="18" y2="12" />
          <line x1="9" y1="18" x2="15" y2="18" />
        </svg>
        필터 ({filterCount})
      </button>

      {/* 본문: 데스크탑은 사이드바 + 그리드 / 모바일은 그리드만 */}
      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6 md:gap-8">
        {/* 좌측 필터 사이드바 (md 이상) */}
        <aside className="hidden md:block text-sm">
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
          <FilterPanelBody {...filterPanelProps} />
        </aside>

        {/* 우측 상품 그리드 */}
        <section>
          {loading ? (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-4 gap-y-7">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : visible.length === 0 ? (
            <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
              <Image src="/logo.svg" alt="" width={48} height={48} className="mx-auto mb-3 opacity-60" />
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

      {/* 모바일 필터 모달 */}
      <FilterModal
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={reset}
      >
        <FilterPanelBody {...filterPanelProps} />
      </FilterModal>
    </div>
  );
}

type FilterPanelProps = {
  onlyAvailable: boolean;
  setOnlyAvailable: (v: boolean) => void;
  radius: number;
  setRadius: (v: number) => void;
  category: string | null;
  onCategoryClick: (key: string, label: string) => void;
  locationName: string;
};

function FilterPanelBody({
  onlyAvailable, setOnlyAvailable,
  radius, setRadius,
  category, onCategoryClick, locationName,
}: FilterPanelProps) {
  return (
    <div>
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
                onChange={() => onCategoryClick(c.key, c.label)}
                className="w-4 h-4 accent-orange-500 cursor-pointer"
              />
              <span style={{ color: "var(--tx-primary)" }}>{c.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 모바일 전용 필터 모달.
 * 백드롭 클릭/ESC/X/적용하기로 닫힘. 필터 변경은 즉시 부모 상태에 반영됨.
 */
function FilterModal({
  open, onClose, onReset, children,
}: {
  open: boolean;
  onClose: () => void;
  onReset: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden" role="dialog" aria-modal="true">
      {/* 백드롭 */}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
        onClick={onClose}
      />
      {/* 다이얼로그 */}
      <div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[calc(100%-2rem)] max-w-md rounded-2xl flex flex-col overflow-hidden shadow-2xl"
        style={{ backgroundColor: "var(--bg-card)", maxHeight: "85vh" }}
      >
        {/* 헤더 */}
        <header
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid var(--bd-input)" }}
        >
          <h2 className="text-base font-bold" style={{ color: "var(--tx-primary)" }}>검색 필터</h2>
          <button
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
            style={{ color: "var(--tx-primary)" }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round">
              <line x1="6" y1="6" x2="18" y2="18" />
              <line x1="18" y1="6" x2="6" y2="18" />
            </svg>
          </button>
        </header>

        {/* 바디 (스크롤) */}
        <div className="overflow-y-auto px-5 py-4 text-sm flex-1">
          {children}
        </div>

        {/* 푸터 */}
        <footer
          className="flex gap-2 px-4 py-3"
          style={{ borderTop: "1px solid var(--bd-input)" }}
        >
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-opacity hover:opacity-80"
            style={{ backgroundColor: "var(--bg-input)", color: "var(--tx-primary)" }}
          >
            전체 해제
          </button>
          <button
            onClick={onClose}
            className="flex-[2] py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
            style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
          >
            적용하기
          </button>
        </footer>
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
