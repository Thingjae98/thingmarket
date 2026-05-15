/**
 * 금 시세 프록시 API
 * - 현재가: gold-api.com (USD/oz) + exchangerate-api.com (USD/KRW)
 * - 시계열: Yahoo Finance v8 (GC=F 금 선물, 무료·키 불필요) → KRW/돈 환산
 * - 외부 API 실패 시 결정론적 mock fallback (stale=true 표시)
 *
 * 쿼리: ?range=10d|1m|3m|1y  (기본 1m)
 */

const GRAM_PER_OZ = 31.1035;
const GRAM_PER_DON = 3.75;

const BUY_MARGIN_THREE = 1.041;
const SELL_MARGIN_THREE = 0.992;
const BUY_MARGIN_FOUR = 1.043;
const SELL_MARGIN_FOUR = 0.994;

const VAT = 1.1;

const FALLBACK = {
  spotUsdPerOz: 2600,
  usdKrw: 1380,
};

const RANGE_DAYS = {
  "10d": 10,
  "1m": 30,
  "3m": 90,
  "1y": 365,
} as const;
type Range = keyof typeof RANGE_DAYS;
const DEFAULT_RANGE: Range = "1m";

type GoldApiResp = { price: number; updatedAt?: string };
type FxApiResp = { rates: { KRW: number } };

async function fetchJson<T>(url: string, timeoutMs = 5000, revalidate = 300): Promise<T | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, { signal: ac.signal, next: { revalidate } });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

type YahooResp = {
  chart?: {
    result?: Array<{
      timestamp?: number[];
      indicators?: { quote?: Array<{ close?: (number | null)[] }> };
    }>;
  };
};

// 우리 range → Yahoo range. "10d"는 Yahoo 공식 값이 없어 1mo 가져와 슬라이스.
const RANGE_TO_YAHOO: Record<Range, { yahoo: string; sliceLast?: number }> = {
  "10d": { yahoo: "1mo", sliceLast: 10 },
  "1m": { yahoo: "1mo" },
  "3m": { yahoo: "3mo" },
  "1y": { yahoo: "1y" },
};

/**
 * Yahoo Finance v8 chart endpoint으로 금 선물(GC=F) 일별 close 시리즈를 가져온다.
 * 반환: USD/oz close (오래된 → 최신 순서)
 */
async function fetchUsdOzHistory(range: Range): Promise<number[] | null> {
  const cfg = RANGE_TO_YAHOO[range];
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/GC=F?range=${cfg.yahoo}&interval=1d`;
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), 8000);
    const res = await fetch(url, {
      signal: ac.signal,
      headers: { "User-Agent": "Mozilla/5.0" },
      next: { revalidate: 3600 }, // 시세 히스토리는 1시간 캐시
    });
    clearTimeout(t);
    if (!res.ok) return null;
    const json: YahooResp = await res.json();
    const r = json.chart?.result?.[0];
    const closesRaw = r?.indicators?.quote?.[0]?.close;
    if (!closesRaw) return null;
    const closes = closesRaw.filter((c): c is number => c != null && c > 0);
    if (closes.length === 0) return null;
    return cfg.sliceLast ? closes.slice(-cfg.sliceLast) : closes;
  } catch {
    return null;
  }
}

/** 외부 히스토리 실패 시 fallback: 현재가 기준 결정론적 mock 시리즈 */
function mockTrend(krwPerDon: number, days: number): number[] {
  const today = new Date();
  const out: number[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const seed = (d.getUTCDate() * 7 + d.getUTCMonth() * 13 + d.getUTCFullYear()) % 100;
    const wave = Math.sin((seed / 100) * Math.PI * 2) * 0.01;     // ±1%
    const drift = (i / days - 0.5) * -0.015;                       // 약한 상승 추세
    out.push(Math.round((krwPerDon * (1 + wave + drift)) / 1000) * 1000);
  }
  return out;
}

function parseRange(s: string | null): Range {
  if (s && s in RANGE_DAYS) return s as Range;
  return DEFAULT_RANGE;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const range = parseRange(url.searchParams.get("range"));
  const days = RANGE_DAYS[range];

  const [gold, fx, history] = await Promise.all([
    fetchJson<GoldApiResp>("https://api.gold-api.com/price/XAU", 5000, 300),
    fetchJson<FxApiResp>("https://api.exchangerate-api.com/v4/latest/USD", 5000, 300),
    fetchUsdOzHistory(range),
  ]);

  const spotUsdPerOz = gold?.price ?? FALLBACK.spotUsdPerOz;
  const usdKrw = fx?.rates?.KRW ?? FALLBACK.usdKrw;
  const stale = !gold || !fx;

  const krwPerGram = (spotUsdPerOz * usdKrw) / GRAM_PER_OZ;
  const krwPerDon = krwPerGram * GRAM_PER_DON;

  const three = {
    buy: Math.round((krwPerDon * BUY_MARGIN_THREE) / 100) * 100,
    sell: Math.round((krwPerDon * SELL_MARGIN_THREE) / 100) * 100,
  };
  const four = {
    buy: Math.round((krwPerDon * BUY_MARGIN_FOUR) / 100) * 100,
    sell: Math.round((krwPerDon * SELL_MARGIN_FOUR) / 100) * 100,
  };

  // 시계열: 실 데이터(USD/oz) → KRW/돈 환산 (현재 환율 적용)
  // 실패 시 mock 사용
  let trend: number[];
  let trendSource: "real" | "mock";
  if (history && history.length > 1) {
    trend = history.map((usdOz) =>
      Math.round(((usdOz * usdKrw) / GRAM_PER_OZ) * GRAM_PER_DON / 1000) * 1000
    );
    trendSource = "real";
  } else {
    trend = mockTrend(krwPerDon, days);
    trendSource = "mock";
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      stale,
      range,
      trendSource,
      spot: {
        usdPerOz: spotUsdPerOz,
        usdKrw,
        krwPerGram: Math.round(krwPerGram),
        krwPerDon: Math.round(krwPerDon),
      },
      gold24k: {
        threeNine: {
          buy: three.buy,
          buyVat: Math.round((three.buy * VAT) / 100) * 100,
          sell: three.sell,
        },
        fourNine: {
          buy: four.buy,
          buyVat: Math.round((four.buy * VAT) / 100) * 100,
          sell: four.sell,
        },
      },
      trend,
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
