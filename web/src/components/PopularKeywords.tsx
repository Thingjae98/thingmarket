"use client";

import { useRouter } from "next/navigation";

export const POPULAR = [
  "금반지", "금목걸이", "24K", "18K", "골드바",
  "금팔찌", "금귀걸이", "14K", "금시계", "백금",
];

export default function PopularKeywords({
  align = "left",
}: {
  align?: "left" | "center";
}) {
  const router = useRouter();
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs ${
        align === "center" ? "justify-center" : ""
      }`}
    >
      <span className="font-semibold" style={{ color: "var(--tx-secondary)" }}>
        인기 검색어
      </span>
      {POPULAR.map((k) => (
        <button
          key={k}
          onClick={() => router.push(`/market?q=${encodeURIComponent(k)}`)}
          className="transition-opacity hover:opacity-70 min-h-[44px] px-1 flex items-center"
          style={{ color: "var(--tx-primary)" }}
        >
          {k}
        </button>
      ))}
    </div>
  );
}
