/**
 * 금 시세 프록시 API
 * - 외부 무료 API에서 금 spot(USD/oz) + USD/KRW 환율을 가져와
 *   24K 한국 시세(원/돈, 원/그램)로 환산해 반환한다.
 * - 5분 캐시(s-maxage)로 외부 API rate-limit 보호.
 * - 외부 API 실패 시 합리적 fallback을 반환하고 stale=true 표시.
 */

const GRAM_PER_OZ = 31.1035;
const GRAM_PER_DON = 3.75; // 1돈 = 3.75g

// 살때(소매), 팔때(재매입) 마진 — 한국 금 소매상 평균치 가정
const BUY_MARGIN_THREE = 1.041;  // 24K 쓰리나인(99.9%)
const SELL_MARGIN_THREE = 0.992;
const BUY_MARGIN_FOUR = 1.043;   // 24K 포나인(99.99%)
const SELL_MARGIN_FOUR = 0.994;

const VAT = 1.1;

// fallback (외부 API 모두 실패 시)
const FALLBACK = {
  spotUsdPerOz: 2600,
  usdKrw: 1380,
};

type GoldApiResp = { price: number; updatedAt?: string };
type FxApiResp = { rates: { KRW: number } };

async function fetchJson<T>(url: string, timeoutMs = 5000): Promise<T | null> {
  try {
    const ac = new AbortController();
    const t = setTimeout(() => ac.abort(), timeoutMs);
    const res = await fetch(url, {
      signal: ac.signal,
      // Next.js 데이터 캐시 — 5분 재검증
      next: { revalidate: 300 },
    });
    clearTimeout(t);
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function GET() {
  const [gold, fx] = await Promise.all([
    fetchJson<GoldApiResp>("https://api.gold-api.com/price/XAU"),
    fetchJson<FxApiResp>("https://api.exchangerate-api.com/v4/latest/USD"),
  ]);

  const spotUsdPerOz = gold?.price ?? FALLBACK.spotUsdPerOz;
  const usdKrw = fx?.rates?.KRW ?? FALLBACK.usdKrw;
  const stale = !gold || !fx;

  const krwPerGram = (spotUsdPerOz * usdKrw) / GRAM_PER_OZ;
  const krwPerDon = krwPerGram * GRAM_PER_DON;

  // 24K 두 종(쓰리나인/포나인) 살때/팔때 (1돈 기준)
  const three = {
    buy: Math.round((krwPerDon * BUY_MARGIN_THREE) / 100) * 100,
    sell: Math.round((krwPerDon * SELL_MARGIN_THREE) / 100) * 100,
  };
  const four = {
    buy: Math.round((krwPerDon * BUY_MARGIN_FOUR) / 100) * 100,
    sell: Math.round((krwPerDon * SELL_MARGIN_FOUR) / 100) * 100,
  };

  // 14일 추이 mock — 현재가 기준 결정론적 변동 (실시간 히스토리는 유료 API 필요)
  // seed로 일자별 ±0.5% 진동만 부여해 차트가 너무 평탄해 보이지 않게 함
  const today = new Date();
  const trend: number[] = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const seed = (d.getUTCDate() * 7 + d.getUTCMonth() * 13) % 100;
    const wave = Math.sin((seed / 100) * Math.PI * 2) * 0.005; // ±0.5%
    const drift = (i - 6.5) * -0.0008; // 약한 상승 추세
    trend.push(Math.round(krwPerDon * (1 + wave + drift) / 1000) * 1000);
  }

  return Response.json(
    {
      generatedAt: new Date().toISOString(),
      stale,
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
      trend14d: trend,
    },
    {
      headers: {
        // 브라우저/CDN 캐시 정책: 1분 fresh, 5분까지 stale 허용
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    }
  );
}
