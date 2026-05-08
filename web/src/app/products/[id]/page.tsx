"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { ProductDetail } from "@/types";

function formatPrice(price: number) {
  return price === 0 ? "나눔" : `${price.toLocaleString()}원`;
}

const STATUS_LABEL: Record<string, string> = {
  selling: "판매중",
  reserved: "예약중",
  sold: "거래완료",
};

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { session, user } = useAuthStore();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [imgIdx, setImgIdx] = useState(0);
  const [likeLoading, setLikeLoading] = useState(false);

  useEffect(() => {
    api
      .get<ProductDetail>(`/products/${id}`, session?.access_token)
      .then(setProduct)
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleLike = async () => {
    if (!session) { router.push("/login"); return; }
    setLikeLoading(true);
    try {
      const res = await api.post<{ liked: boolean }>(
        `/products/${id}/like`,
        {},
        session.access_token
      );
      setProduct((prev) =>
        prev
          ? {
              ...prev,
              is_liked: res.liked,
              like_count: prev.like_count + (res.liked ? 1 : -1),
            }
          : prev
      );
    } finally {
      setLikeLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    await api.delete(`/products/${id}`, session?.access_token);
    router.push("/");
  };

  if (loading) return (
    <div className="text-center py-20" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
  );
  if (!product) return null;

  const isMine = user?.id === product.seller_id;
  const images = product.images ?? [];

  return (
    <div className="pb-24">
      {/* 이미지 슬라이더 */}
      <div className="relative -mx-4 aspect-square" style={{ backgroundColor: "var(--bg-input)" }}>
        {images.length > 0 ? (
          <>
            <Image
              src={images[imgIdx].image_url}
              alt={product.title}
              fill
              className="object-cover"
              sizes="672px"
              priority
            />
            {images.length > 1 && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1">
                {images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setImgIdx(i)}
                    className={`w-1.5 h-1.5 rounded-full ${
                      i === imgIdx ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-6xl" style={{ color: "var(--bd-input)" }}>
            📦
          </div>
        )}
      </div>

      {/* 판매자 정보 */}
      <div className="flex items-center gap-3 py-4" style={{ borderBottom: "1px solid var(--bd-input)" }}>
        <div
          className="w-10 h-10 rounded-full overflow-hidden"
          style={{ backgroundColor: "var(--bg-input)" }}
        >
          {product.seller_avatar ? (
            <Image src={product.seller_avatar} alt="avatar" width={40} height={40} />
          ) : (
            <div className="w-full h-full flex items-center justify-center" style={{ color: "var(--tx-secondary)" }}>👤</div>
          )}
        </div>
        <div>
          <p className="text-sm font-medium" style={{ color: "var(--tx-primary)" }}>
            {product.seller_nickname ?? "알 수 없음"}
          </p>
          <p className="text-xs" style={{ color: "var(--tx-secondary)" }}>
            매너온도 {product.seller_manner_temp?.toFixed(1) ?? "36.5"}°C
          </p>
        </div>
      </div>

      {/* 상품 정보 */}
      <div className="py-4" style={{ borderBottom: "1px solid var(--bd-input)" }}>
        <div className="flex items-center gap-2 mb-1">
          <span
            className="text-xs rounded px-1.5 py-0.5"
            style={{ color: "var(--tx-secondary)", border: "1px solid var(--bd-input)" }}
          >
            {STATUS_LABEL[product.status]}
          </span>
        </div>
        <h1 className="text-lg font-bold mb-1" style={{ color: "var(--tx-primary)" }}>
          {product.title}
        </h1>
        <p className="text-xs mb-3" style={{ color: "var(--tx-secondary)" }}>
          {product.location_name} · 조회 {product.view_count}
        </p>
        {product.description && (
          <p className="text-sm whitespace-pre-wrap leading-relaxed" style={{ color: "var(--tx-primary)" }}>
            {product.description}
          </p>
        )}
      </div>

      {/* 내 상품일 때 관리 버튼 */}
      {isMine && (
        <div className="flex gap-2 py-3" style={{ borderBottom: "1px solid var(--bd-input)" }}>
          <Link
            href={`/products/${id}/edit`}
            className="flex-1 text-center py-2 rounded-lg text-sm transition-colors hover:border-orange-400"
            style={{
              border: "1px solid var(--bd-input)",
              color: "var(--tx-secondary)",
              backgroundColor: "var(--bg-input)",
            }}
          >
            수정
          </Link>
          <button
            onClick={handleDelete}
            className="flex-1 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20"
          >
            삭제
          </button>
        </div>
      )}

      {/* 하단 고정 바 */}
      <div
        className="fixed bottom-0 left-0 right-0 px-4 py-3 flex items-center justify-between max-w-2xl mx-auto"
        style={{
          backgroundColor: "var(--bg-card)",
          borderTop: "1px solid var(--bd-input)",
        }}
      >
        <button
          onClick={handleLike}
          disabled={likeLoading}
          className={`flex flex-col items-center text-xs gap-0.5 ${
            product.is_liked ? "text-red-500" : ""
          }`}
          style={!product.is_liked ? { color: "var(--tx-secondary)" } : {}}
        >
          <span className="text-xl">{product.is_liked ? "♥" : "♡"}</span>
          <span>{product.like_count}</span>
        </button>

        <div className="flex items-center gap-2">
          <div>
            {product.is_negotiable && product.price > 0 && (
              <p className="text-xs" style={{ color: "var(--tx-secondary)" }}>가격제안가능</p>
            )}
            <p className="text-lg font-bold" style={{ color: "var(--tx-primary)" }}>
              {formatPrice(product.price)}
            </p>
          </div>
          {!isMine && product.status === "selling" && (
            <button
              onClick={async () => {
                if (!session) { router.push("/login"); return; }
                const room = await api.post<{ id: string }>(
                  "/chats",
                  { product_id: id },
                  session.access_token
                );
                router.push(`/chat/${room.id}`);
              }}
              className="px-5 py-2.5 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600"
            >
              채팅하기
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
