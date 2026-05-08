"use client";

import { useState, useEffect } from "react";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { ProductListItem } from "@/types";
import ProductCard from "@/components/ProductCard";

export default function LikesPage() {
  const { session } = useAuthStore();
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    api
      .get<ProductListItem[]>("/users/me/likes", session.access_token)
      .then(setProducts)
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return (
    <div className="text-center py-20" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
  );

  return (
    <div>
      <h1 className="text-lg font-bold mb-4" style={{ color: "var(--tx-primary)" }}>관심목록</h1>
      {products.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
          <p className="text-4xl mb-3">🤍</p>
          <p className="text-sm">관심 상품이 없습니다.</p>
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm overflow-hidden" style={{ backgroundColor: "var(--bg-card)" }}>
          {products.map((p) => (
            <ProductCard key={p.id} item={p} />
          ))}
        </div>
      )}
    </div>
  );
}
