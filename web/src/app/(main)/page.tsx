import dynamic from "next/dynamic";
import GeoInit from "./GeoInit";
import SearchBar from "./SearchBar";
import RotatingKeyword from "@/components/RotatingKeyword";
import PopularKeywords from "@/components/PopularKeywords";

// GoldPriceHero JS 번들 분리 → 초기 TBT·FCP 감소
const GoldPriceHero = dynamic(() => import("@/components/GoldPriceHero"));

/**
 * 홈 — 랜딩 (서버 컴포넌트)
 * h1이 초기 HTML에 포함되어 LCP 개선.
 * 클라이언트 로직(위치·검색)은 GeoInit / SearchBar로 분리.
 */
export default function HomePage() {
  return (
    <div>
      <GeoInit />

      {/* 1) 헤드라인 — h1이 서버 렌더링되어 LCP 개선 */}
      <h1
        className="text-center font-bold mt-10 sm:mt-14 mb-6 text-[1.05rem] sm:text-xl"
        style={{ color: "var(--tx-primary)" }}
      >
        <span className="inline-block mr-1" aria-hidden>📍</span>
        띵마켓에서 <RotatingKeyword /> 찾고 계신가요?
      </h1>

      {/* 2) 검색바 */}
      <SearchBar />

      {/* 3) 인기 검색어 */}
      <div className="mb-8">
        <PopularKeywords align="center" />
      </div>

      {/* 4) 금 시세 히어로 — 동적 임포트로 초기 번들 분리 */}
      <GoldPriceHero />

      <p className="text-center text-xs mt-2 mb-1" style={{ color: "var(--tx-secondary)" }}>
        실시간 시세 기반 동네 금 직거래 플랫폼
      </p>
    </div>
  );
}
