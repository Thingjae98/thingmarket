"use client";

/**
 * 금 시세 히어로 섹션
 * - 현재 24K 시세(살때/팔때) 카드
 * - 14일 시세 추이 SVG 라인 차트(목업 데이터)
 * - "금 거래 시작" CTA
 *
 * 데이터는 모두 클라이언트 시간을 기반으로 한 mock입니다.
 * 실제 시세 API 연동은 별도 작업으로 분리.
 */

const BUY_24K_THREE = 854_400; // 24K(쓰리나인) 살때
const SELL_24K_THREE = 813_400;
const BUY_24K_FOUR = 856_400; // 24K(포나인) 살때
const SELL_24K_FOUR = 815_400;

const VAT = 1.1; // VAT 10%

// 최근 14일 가짜 시세 (천원 단위) — 약한 상승 추세
const TREND: number[] = [
  836, 838, 840, 839, 842, 845, 844, 847, 849, 850, 851, 853, 852, 854,
];

function formatKRW(n: number) {
  return n.toLocaleString("ko-KR") + "원";
}

function nowStamp() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const hh = String(d.getHours()).padStart(2, "0");
  const mi = String(d.getMinutes()).padStart(2, "0");
  return `${d.getFullYear()}년 ${mm}월 ${dd}일 ${hh}시 ${mi}분 기준`;
}

function MiniChart() {
  const width = 320;
  const height = 90;
  const padX = 8;
  const padY = 10;
  const max = Math.max(...TREND);
  const min = Math.min(...TREND);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / (TREND.length - 1);
  const points = TREND.map((v, i) => {
    const x = padX + stepX * i;
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return `${x},${y}`;
  }).join(" ");

  // 영역 채우기용 path
  const areaPath =
    `M ${padX},${height - padY} ` +
    TREND.map((v, i) => {
      const x = padX + stepX * i;
      const y = padY + (1 - (v - min) / range) * (height - padY * 2);
      return `L ${x},${y}`;
    }).join(" ") +
    ` L ${width - padX},${height - padY} Z`;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-20" aria-label="14일 시세 추이">
      <defs>
        <linearGradient id="goldArea" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D4A017" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#goldArea)" />
      <polyline
        fill="none"
        stroke="#D4A017"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export default function GoldPriceHero() {
  return (
    <section
      className="rounded-2xl overflow-hidden shadow-sm mb-5"
      style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)" }}
    >
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>🔄</span>
          <h2 className="text-base font-bold" style={{ color: "var(--tx-primary)" }}>
            금 시세
          </h2>
        </div>
        <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
          {nowStamp()}
        </span>
      </div>

      {/* 시세 추이 차트 */}
      <div className="px-3">
        <MiniChart />
      </div>

      {/* 시세 표 */}
      <div className="px-5 pt-2 pb-3 grid grid-cols-3 text-xs font-semibold gap-2" style={{ color: "var(--tx-secondary)" }}>
        <div>골드 종류</div>
        <div className="text-right">내가 살 때</div>
        <div className="text-right">내가 팔 때</div>
      </div>

      <div className="mx-4 mb-2 rounded-xl px-4 py-3 grid grid-cols-3 items-center" style={{ backgroundColor: "var(--accent-soft)" }}>
        <div>
          <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>GOLD24K</div>
          <div className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>쓰리나인(99.9%)</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold" style={{ color: "var(--tx-primary)" }}>{formatKRW(BUY_24K_THREE)}</div>
          <div className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
            {formatKRW(Math.round(BUY_24K_THREE * VAT))}(VAT포함)
          </div>
        </div>
        <div className="text-right text-sm font-bold" style={{ color: "var(--tx-primary)" }}>
          {formatKRW(SELL_24K_THREE)}
        </div>
      </div>

      <div className="mx-4 mb-3 rounded-xl px-4 py-3 grid grid-cols-3 items-center" style={{ backgroundColor: "var(--accent-soft)" }}>
        <div>
          <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>GOLD24K</div>
          <div className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>포나인(99.99%)</div>
        </div>
        <div className="text-right">
          <div className="text-sm font-bold" style={{ color: "var(--tx-primary)" }}>{formatKRW(BUY_24K_FOUR)}</div>
          <div className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>
            {formatKRW(Math.round(BUY_24K_FOUR * VAT))}(VAT포함)
          </div>
        </div>
        <div className="text-right text-sm font-bold" style={{ color: "var(--tx-primary)" }}>
          {formatKRW(SELL_24K_FOUR)}
        </div>
      </div>

      {/* CTA */}
      <a
        href="#products"
        className="block mx-4 mb-4 rounded-xl py-3 text-center font-bold text-sm transition-opacity hover:opacity-90"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
      >
        금 거래 시작 ▶
      </a>
    </section>
  );
}
