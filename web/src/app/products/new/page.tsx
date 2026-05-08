"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";
import type { ProductDetail } from "@/types";

const CATEGORIES = [
  { id: 1, name: "디지털기기" },
  { id: 2, name: "가구/인테리어" },
  { id: 3, name: "의류" },
  { id: 4, name: "도서/티켓" },
  { id: 5, name: "스포츠/레저" },
  { id: 6, name: "생활가전" },
  { id: 7, name: "식물" },
  { id: 8, name: "기타" },
];

const inputCls =
  "w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors";

export default function NewProductPage() {
  const router = useRouter();
  const { session } = useAuthStore();
  const fileRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [isNegotiable, setIsNegotiable] = useState(true);
  const [locationName, setLocationName] = useState("서울 중구");
  const [lat, setLat] = useState(37.5665);
  const [lng, setLng] = useState(126.978);
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []).slice(0, 10 - images.length);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setImages((prev) => [...prev, ...files].slice(0, 10));
    setPreviews((prev) => [...prev, ...newPreviews].slice(0, 10));
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
    setPreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleLocate = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setLat(pos.coords.latitude);
      setLng(pos.coords.longitude);
      setLocationName("현재 위치");
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session) { router.push("/login"); return; }
    setLoading(true);
    setError("");

    const form = new FormData();
    form.append("title", title);
    form.append("price", price || "0");
    form.append("location_name", locationName);
    form.append("lat", String(lat));
    form.append("lng", String(lng));
    form.append("is_negotiable", String(isNegotiable));
    if (description) form.append("description", description);
    if (categoryId) form.append("category_id", String(categoryId));
    images.forEach((img) => form.append("images", img));

    try {
      const product = await api.postForm<ProductDetail>("/products", form, session.access_token);
      router.push(`/products/${product.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "등록에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-8">
      <h1 className="text-lg font-bold mb-5" style={{ color: "var(--tx-primary)" }}>내 물건 팔기</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-xl px-3 py-2">{error}</p>
        )}

        {/* 이미지 */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 shrink-0 border-2 border-dashed rounded-xl flex flex-col items-center justify-center text-xs hover:border-orange-400 transition-colors"
            style={{ borderColor: "var(--bd-input)", color: "var(--tx-secondary)" }}
          >
            <span className="text-2xl">📷</span>
            <span>{images.length}/10</span>
          </button>
          {previews.map((url, i) => (
            <div key={i} className="relative w-20 h-20 shrink-0 rounded-xl overflow-hidden">
              <Image src={url} alt={`preview-${i}`} fill className="object-cover" sizes="80px" />
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 text-white rounded-full text-xs flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}
          <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={handleImages} />
        </div>

        {/* 제목 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--tx-secondary)" }}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="글 제목"
            className={inputCls}
            style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
          />
        </div>

        {/* 카테고리 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--tx-secondary)" }}>카테고리</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id === categoryId ? null : c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
                  categoryId === c.id
                    ? "bg-orange-500 text-white border-orange-500"
                    : "hover:border-orange-400"
                }`}
                style={categoryId !== c.id ? {
                  borderColor: "var(--bd-input)",
                  color: "var(--tx-secondary)",
                  backgroundColor: "var(--bg-input)",
                } : {}}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 가격 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--tx-secondary)" }}>가격</label>
          <div className="flex gap-2 items-center">
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0 (무료나눔)"
              min={0}
              className={`flex-1 ${inputCls}`}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
            />
            <label className="flex items-center gap-1.5 text-sm shrink-0 cursor-pointer" style={{ color: "var(--tx-secondary)" }}>
              <input
                type="checkbox"
                checked={isNegotiable}
                onChange={(e) => setIsNegotiable(e.target.checked)}
                className="accent-orange-500 w-4 h-4"
              />
              가격제안가능
            </label>
          </div>
        </div>

        {/* 설명 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--tx-secondary)" }}>자세한 설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={5}
            placeholder="브랜드, 모델명, 구매 시기, 하자 여부 등을 자유롭게 적어주세요."
            className={`resize-none ${inputCls}`}
            style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
          />
        </div>

        {/* 거래 위치 */}
        <div>
          <label className="block text-sm font-semibold mb-1.5" style={{ color: "var(--tx-secondary)" }}>거래 희망 위치</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={locationName}
              onChange={(e) => setLocationName(e.target.value)}
              className={`flex-1 ${inputCls}`}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
            />
            <button
              type="button"
              onClick={handleLocate}
              className="px-3 py-2.5 rounded-xl text-sm transition-colors hover:border-orange-400 hover:text-orange-500"
              style={{ border: "1px solid var(--bd-input)", color: "var(--tx-secondary)", backgroundColor: "var(--bg-input)" }}
            >
              📍현재위치
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !title}
          className="w-full py-3 rounded-xl font-semibold disabled:opacity-50 transition-colors text-sm"
          style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
        >
          {loading ? "등록 중..." : "완료"}
        </button>
      </form>
    </div>
  );
}
