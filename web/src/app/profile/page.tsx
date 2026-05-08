"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { ProfileResponse, ProductListItem } from "@/types";
import ProductCard from "@/components/ProductCard";

export default function ProfilePage() {
  const { session } = useAuthStore();
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [products, setProducts] = useState<ProductListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [editing, setEditing] = useState(false);
  const [nickname, setNickname] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api.get<ProfileResponse>("/users/me", session.access_token),
      api.get<ProductListItem[]>(`/users/${session.user.id}/products`, session.access_token),
    ])
      .then(([p, prods]) => {
        setProfile(p);
        setNickname(p.nickname);
        setBio(p.bio ?? "");
        setProducts(prods);
      })
      .finally(() => setLoading(false));
  }, [session]);

  const handleSave = async () => {
    if (!session) return;
    setSaving(true);
    try {
      const updated = await api.patch<ProfileResponse>(
        "/users/me",
        { nickname, bio },
        session.access_token
      );
      setProfile(updated);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="text-center py-20" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
  );
  if (!profile) return null;

  return (
    <div>
      {/* 프로필 헤더 */}
      <div
        className="rounded-2xl p-5 mb-4 shadow-sm"
        style={{ backgroundColor: "var(--bg-card)" }}
      >
        <div className="flex items-center gap-4 mb-4">
          <div
            className="w-16 h-16 rounded-full overflow-hidden"
            style={{ backgroundColor: "var(--bg-input)" }}
          >
            {profile.avatar_url ? (
              <Image src={profile.avatar_url} alt="avatar" width={64} height={64} />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl">👤</div>
            )}
          </div>
          <div className="flex-1">
            {editing ? (
              <input
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="text-lg font-bold border-b border-orange-400 outline-none w-full"
                style={{ backgroundColor: "transparent", color: "var(--tx-primary)" }}
              />
            ) : (
              <h2 className="text-lg font-bold" style={{ color: "var(--tx-primary)" }}>
                {profile.nickname}
              </h2>
            )}
            <p className="text-sm text-orange-500 font-medium">
              매너온도 {profile.manner_temp.toFixed(1)}°C 🌡
            </p>
          </div>
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            disabled={saving}
            className="text-sm rounded-lg px-3 py-1.5 hover:border-orange-400 transition-colors"
            style={{
              color: "var(--tx-secondary)",
              border: "1px solid var(--bd-input)",
              backgroundColor: "var(--bg-input)",
            }}
          >
            {editing ? (saving ? "저장 중" : "저장") : "편집"}
          </button>
        </div>

        {editing ? (
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="자기소개를 입력하세요"
            rows={2}
            className="w-full text-sm rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-400 resize-none"
            style={{
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--bd-input)",
              color: "var(--tx-primary)",
            }}
          />
        ) : (
          <p className="text-sm" style={{ color: "var(--tx-secondary)" }}>
            {profile.bio || "자기소개가 없습니다."}
          </p>
        )}
      </div>

      {/* 판매 목록 */}
      <h3 className="text-sm font-bold mb-2" style={{ color: "var(--tx-secondary)" }}>
        판매 상품 ({products.length})
      </h3>
      {products.length === 0 ? (
        <div className="text-center py-10 text-sm" style={{ color: "var(--tx-secondary)" }}>
          등록한 상품이 없습니다.
        </div>
      ) : (
        <div className="rounded-2xl shadow-sm px-4" style={{ backgroundColor: "var(--bg-card)" }}>
          {products.map((p) => (
            <ProductCard key={p.id} item={p} />
          ))}
        </div>
      )}
    </div>
  );
}
