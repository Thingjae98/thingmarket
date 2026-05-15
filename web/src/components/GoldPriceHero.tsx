"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Range = "10d" | "1m" | "3m" | "1y";

type GoldPrice = {
  generatedAt: string;
  stale: boolean;
  range: Range;
  trendSource: "real" | "mock";
  spot: { usdPerOz: number; usdKrw: number; krwPerGram: number; krwPerDon: number };
  gold24k: {
    threeNine: { buy: number; buyVat: number; sell: number };
    fourNine: { buy: number; buyVat: number; sell: number };
  };
  trend: number[];
};

const RANGES: { key: Range; label: string }[] = [
  { key: "1y", label: "1년" },
  { key: "3m", label: "3개월" },
  { key: "1m", label: "1개월" },
  { key: "10d", label: "10일" },
];

const formatKRW = (n: number) => n.toLocaleString("ko-KR") + "원";

function relativeTime(iso: string): string {
  const diff = Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 5) return "방금 업데이트";
  if (diff < 60) return `${diff}초 전 업데이트`;
  if (diff < 3600) return `${Math.floor(diff / 60)}분 전 업데이트`;
  return `${Math.floor(diff / 3600)}시간 전 업데이트`;
}

function MiniChart({ data }: { data: number[] }) {
  const width = 340;
  const height = 100;
  const padX = 6;
  const padY = 12;
  if (!data || data.length < 2) return <div style={{ height }} />;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const stepX = (width - padX * 2) / (data.length - 1);
  const coords = data.map((v, i) => {
    const x = padX + stepX * i;
    const y = padY + (1 - (v - min) / range) * (height - padY * 2);
    return { x, y };
  });
  const polyline = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const areaPath =
    `M ${padX},${height - padY} ` +
    coords.map((c) => `L ${c.x},${c.y}`).join(" ") +
    ` L ${width - padX},${height - padY} Z`;
  const last = coords[coords.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-24" aria-label="14일 시세 추이">
      <defs>
        <linearGradient id="goldArea" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#D4A017" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#D4A017" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#goldArea)" />
      <polyline
        fill="none"
        stroke="#D4A017"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={polyline}
      />
      {/* 현재가 포인트 */}
      <circle cx={last.x} cy={last.y} r="4" fill="#D4A017" />
      <circle cx={last.x} cy={last.y} r="8" fill="#D4A017" opacity="0.25">
        <animate attributeName="r" values="4;12;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="0.4;0;0.4" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function SkeletonChart() {
  return (
    <div
      className="w-full h-24 rounded-lg overflow-hidden relative"
      style={{ backgroundColor: "var(--bg-input)" }}
      aria-label="시세 불러오는 중"
    >
      <div
        className="absolute inset-0 opacity-60"
        style={{
          background: "linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.25) 50%, transparent 100%)",
          animation: "shimmer 1.4s linear infinite",
          backgroundSize: "200% 100%",
        }}
      />
      <style jsx>{`
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}

export default function GoldPriceHero() {
  const router = useRouter();
  const [range, setRange] = useState<Range>("1m");
  const [data, setData] = useState<GoldPrice | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(false);
  const [relTime, setRelTime] = useState("");
  const [flash, setFlash] = useState(false); // 값 갱신 시 잠깐 하이라이트
  const prevDonRef = useRef<number | null>(null);

  const load = useCallback(async (initial: boolean, r: Range) => {
    if (initial) setLoading(true);
    else setRefreshing(true);
    setError(false);
    try {
      const res = await fetch(`/api/gold-price?range=${r}`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const json: GoldPrice = await res.json();
      // 이전값과 다르면 flash
      if (prevDonRef.current !== null && prevDonRef.current !== json.spot.krwPerDon) {
        setFlash(true);
        setTimeout(() => setFlash(false), 900);
      }
      prevDonRef.current = json.spot.krwPerDon;
      setData(json);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
      setTimeout(() => setRefreshing(false), 600);
    }
  }, []);

  // 최초 로드 + range 변경 시 재요청
  useEffect(() => {
    load(data === null, range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // 상대시간 1초마다 갱신
  useEffect(() => {
    if (!data) return;
    const tick = () => setRelTime(relativeTime(data.generatedAt));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [data]);

  const handleStart = () => router.push("/market");

  return (
    <section
      className="rounded-2xl overflow-hidden shadow-sm mb-5 transition-all duration-500"
      style={{
        backgroundColor: "var(--bg-card)",
        border: "1px solid var(--bd-input)",
        boxShadow: flash ? "0 0 0 2px var(--accent)" : undefined,
      }}
    >
      {/* 헤더 */}
      <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-lg" aria-hidden>💰</span>
          <h2 className="text-base font-bold" style={{ color: "var(--tx-primary)" }}>
            금 시세
          </h2>
          {data?.stale && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "var(--bg-input)", color: "var(--tx-secondary)" }}
            >
              지연
            </span>
          )}
        </div>
        <button
          onClick={() => load(false, range)}
          disabled={loading || refreshing}
          className="flex items-center gap-1.5 text-[11px] transition-opacity disabled:opacity-60"
          style={{ color: "var(--tx-secondary)" }}
          aria-label="시세 새로고침"
        >
          <span>{loading ? "불러오는 중" : error ? "갱신 실패 — 재시도" : relTime}</span>
          <svg
            width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"
            className={refreshing || loading ? "animate-spin" : ""}
            style={{ color: "var(--accent)" }}
          >
            <path d="M21 12a9 9 0 1 1-3-6.7" />
            <polyline points="21 4 21 10 15 10" />
          </svg>
        </button>
      </div>

      {/* 범위 토글 — 1년 / 3개월 / 1개월 / 10일 */}
      <div className="px-4 pb-2 flex gap-1">
        {RANGES.map((r) => {
          const active = range === r.key;
          return (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              disabled={loading || refreshing}
              className="flex-1 py-1.5 rounded-full text-[11px] font-semibold transition-colors disabled:opacity-60"
              style={
                active
                  ? { backgroundColor: "var(--accent)", color: "var(--accent-fg)" }
                  : { backgroundColor: "var(--bg-input)", color: "var(--tx-secondary)" }
              }
              aria-pressed={active}
            >
              {r.label}
            </button>
          );
        })}
      </div>

      {/* 차트 */}
      <div className="px-3 pb-1">
        {loading ? <SkeletonChart /> : data ? <MiniChart data={data.trend} /> : <SkeletonChart />}
      </div>

      {/* 현재가 큰글씨 */}
      <div className="px-5 pt-1 pb-3">
        <div className="flex items-baseline justify-between">
          <span className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>24K 1돈 (3.75g) 기준</span>
          <span
            className={`text-2xl font-extrabold tabular-nums transition-colors duration-500 ${flash ? "scale-105" : ""}`}
            style={{ color: flash ? "var(--accent)" : "var(--tx-primary)" }}
          >
            {data ? formatKRW(data.spot.krwPerDon) : "─"}
          </span>
        </div>
      </div>

      {/* 시세 표 */}
      <div className="px-5 pb-2 grid grid-cols-3 text-[11px] font-semibold gap-2" style={{ color: "var(--tx-secondary)" }}>
        <div>골드 종류</div>
        <div className="text-right">내가 살 때</div>
        <div className="text-right">내가 팔 때</div>
      </div>

      <PriceRow
        label="GOLD24K"
        sub="쓰리나인(99.9%)"
        buy={data?.gold24k.threeNine.buy}
        buyVat={data?.gold24k.threeNine.buyVat}
        sell={data?.gold24k.threeNine.sell}
        skeleton={loading}
      />
      <PriceRow
        label="GOLD24K"
        sub="포나인(99.99%)"
        buy={data?.gold24k.fourNine.buy}
        buyVat={data?.gold24k.fourNine.buyVat}
        sell={data?.gold24k.fourNine.sell}
        skeleton={loading}
      />

      {/* CTA */}
      <button
        onClick={handleStart}
        className="block w-[calc(100%-2rem)] mx-4 mt-1 mb-4 rounded-xl py-3.5 text-center font-bold text-sm transition-all hover:opacity-90 hover:translate-y-[-1px] active:translate-y-0"
        style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
      >
        금 거래 시작 ▶
      </button>
    </section>
  );
}

function PriceRow({
  label, sub, buy, buyVat, sell, skeleton,
}: {
  label: string;
  sub: string;
  buy?: number;
  buyVat?: number;
  sell?: number;
  skeleton: boolean;
}) {
  return (
    <div
      className="mx-4 mb-2 rounded-xl px-4 py-3 grid grid-cols-3 items-center"
      style={{ backgroundColor: "var(--accent-soft)" }}
    >
      <div>
        <div className="text-sm font-bold" style={{ color: "var(--accent)" }}>{label}</div>
        <div className="text-[11px]" style={{ color: "var(--tx-secondary)" }}>{sub}</div>
      </div>
      <div className="text-right">
        {skeleton || buy === undefined ? (
          <SkeletonText w="64px" />
        ) : (
          <>
            <div className="text-sm font-bold tabular-nums" style={{ color: "var(--tx-primary)" }}>{formatKRW(buy)}</div>
            {buyVat !== undefined && (
              <div className="text-[10px] tabular-nums" style={{ color: "var(--tx-secondary)" }}>
                {formatKRW(buyVat)}(VAT포함)
              </div>
            )}
          </>
        )}
      </div>
      <div className="text-right">
        {skeleton || sell === undefined ? (
          <SkeletonText w="56px" />
        ) : (
          <div className="text-sm font-bold tabular-nums" style={{ color: "var(--tx-primary)" }}>{formatKRW(sell)}</div>
        )}
      </div>
    </div>
  );
}

function SkeletonText({ w }: { w: string }) {
  return (
    <span
      className="inline-block h-3.5 rounded"
      style={{
        width: w,
        backgroundColor: "var(--bg-input)",
        backgroundImage:
          "linear-gradient(90deg, transparent 0%, rgba(212,160,23,0.25) 50%, transparent 100%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.4s linear infinite",
      }}
    />
  );
}
