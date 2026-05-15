"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import GoldPriceHero from "@/components/GoldPriceHero";
import RotatingKeyword from "@/components/RotatingKeyword";
import PopularKeywords from "@/components/PopularKeywords";

/**
 * 홈 — 랜딩
 * 순서: 루프 헤드라인 → 좁은 검색창 → 인기 검색어 → 금 시세(차트·CTA)
 * "금 거래 시작" 클릭 시 /market 으로 이동.
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
      {/* 1) 헤드라인 — 단어 부분만 골드 컬러로 루프 */}
      <h1
        className="text-center font-bold mt-10 sm:mt-14 mb-6 text-[1.05rem] sm:text-xl"
        style={{ color: "var(--tx-primary)" }}
      >
        <span className="inline-block mr-1" aria-hidden>📍</span>
        띵마켓에서 <RotatingKeyword /> 찾고 계신가요?
      </h1>

      {/* 2) 검색바 — 좁은 폭, 중앙 정렬 */}
      <div className="flex gap-2 mb-3 max-w-md mx-auto">
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
          className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 shrink-0"
          style={{ backgroundColor: "var(--tx-primary)", color: "var(--bg-card)" }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="5" y1="12" x2="19" y2="12" />
            <polyline points="12 5 19 12 12 19" />
          </svg>
        </button>
      </div>

      {/* 3) 인기 검색어 */}
      <div className="mb-8">
        <PopularKeywords align="center" />
      </div>

      {/* 4) 금 시세 히어로 */}
      <GoldPriceHero />

      <p className="text-center text-xs mt-2 mb-1" style={{ color: "var(--tx-secondary)" }}>
        실시간 시세 기반 동네 금 직거래 플랫폼
      </p>
    </div>
  );
}
