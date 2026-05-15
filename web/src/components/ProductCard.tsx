import Link from "next/link";
import Image from "next/image";
import type { ProductListItem } from "@/types";

function formatPrice(price: number) {
  return price === 0 ? "나눔" : `${price.toLocaleString()}원`;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금 전";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

const STATUS_LABEL: Record<string, string> = {
  selling: "",
  reserved: "예약중",
  sold: "거래완료",
};

type Variant = "list" | "grid";

export default function ProductCard({
  item,
  variant = "list",
}: {
  item: ProductListItem;
  variant?: Variant;
}) {
  if (variant === "grid") return <GridCard item={item} />;
  return <ListCard item={item} />;
}

function ListCard({ item }: { item: ProductListItem }) {
  return (
    <Link
      href={`/products/${item.id}`}
      className="flex gap-3 py-4 transition-colors hover:opacity-80"
      style={{ borderBottom: "1px solid var(--bd-input)" }}
    >
      <div
        className="relative w-24 h-24 rounded-xl overflow-hidden shrink-0"
        style={{ backgroundColor: "var(--bg-input)" }}
      >
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title}
            fill
            className="object-cover"
            sizes="96px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-3xl" style={{ color: "var(--bd-input)" }}>
            📦
          </div>
        )}
        {item.status !== "selling" && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <span className="text-white text-xs font-bold">{STATUS_LABEL[item.status]}</span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm truncate" style={{ color: "var(--tx-primary)" }}>{item.title}</p>
        <p className="text-xs mt-0.5" style={{ color: "var(--tx-secondary)" }}>
          {item.location_name ?? "위치 미설정"} ·{" "}
          {item.distance_km != null ? `${item.distance_km}km` : ""}{" "}
          {timeAgo(item.created_at)}
        </p>
        <p className="text-sm font-bold mt-1" style={{ color: "var(--tx-primary)" }}>
          {item.is_negotiable && item.price > 0 && (
            <span className="text-xs font-normal mr-1" style={{ color: "var(--tx-secondary)" }}>가격제안가능</span>
          )}
          {formatPrice(item.price)}
        </p>
        <div className="flex gap-3 mt-1.5 text-xs" style={{ color: "var(--tx-secondary)" }}>
          {item.like_count > 0 && <span>♥ {item.like_count}</span>}
          {item.view_count > 0 && <span>👁 {item.view_count}</span>}
        </div>
      </div>
    </Link>
  );
}

function GridCard({ item }: { item: ProductListItem }) {
  return (
    <Link
      href={`/products/${item.id}`}
      className="block group transition-transform hover:-translate-y-0.5"
    >
      {/* 정사각 썸네일 */}
      <div
        className="relative w-full aspect-square rounded-xl overflow-hidden mb-2"
        style={{ backgroundColor: "var(--bg-input)" }}
      >
        {item.thumbnail_url ? (
          <Image
            src={item.thumbnail_url}
            alt={item.title}
            fill
            className="object-cover transition-transform group-hover:scale-[1.02]"
            sizes="(max-width: 640px) 50vw, 320px"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-4xl" style={{ color: "var(--bd-input)" }}>
            📦
          </div>
        )}
        {item.status !== "selling" && (
          <div className="absolute inset-0 bg-black/55 flex items-center justify-center">
            <span className="text-white text-sm font-bold">{STATUS_LABEL[item.status]}</span>
          </div>
        )}
      </div>

      <p className="text-sm truncate" style={{ color: "var(--tx-primary)" }}>{item.title}</p>
      <p className="text-sm font-bold mt-0.5" style={{ color: "var(--tx-primary)" }}>
        {formatPrice(item.price)}
      </p>
      <p className="text-[11px] mt-0.5" style={{ color: "var(--tx-secondary)" }}>
        {item.location_name ?? "위치 미설정"}
        {item.distance_km != null && <> · {item.distance_km}km</>}
        {" · "}
        {timeAgo(item.created_at)}
      </p>
    </Link>
  );
}
