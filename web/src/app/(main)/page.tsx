"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GoldPriceHero from "@/components/GoldPriceHero";

/**
 * 홈 — 랜딩
 * 순서: 검색창 → 금 시세(차트·가격·CTA 통합 카드) → 안내
 * 상품 목록은 시세 카드 안의 "금 거래 시작" 버튼을 통해 /market 으로 진입.
 */
export default function HomePage() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  const submitSearch = () => {
    const q = keyword.trim();
    router.push(q ? `/market?q=${encodeURIComponent(q)}` : "/market");
  };

  return (
    <div>
      {/* 1) 검색창 — 최상단 */}
      <div className="flex gap-2 mb-5">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitSearch()}
          placeholder="검색어를 입력해주세요"
          className="flex-1 px-5 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
        />
        <button
          onClick={submitSearch}
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

      {/* 2) 금 시세 히어로 (차트 + 가격표 + 금 거래 시작 CTA) */}
      <GoldPriceHero />

      {/* 3) 안내 카피 */}
      <p className="text-center text-xs mt-2 mb-1" style={{ color: "var(--tx-secondary)" }}>
        실시간 시세 기반 동네 금 직거래 플랫폼
      </p>
    </div>
  );
}
