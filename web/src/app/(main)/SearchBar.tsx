"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SearchBar() {
  const router = useRouter();
  const [keyword, setKeyword] = useState("");

  const submit = () => {
    const q = keyword.trim();
    router.push(q ? `/market?q=${encodeURIComponent(q)}` : "/market");
  };

  return (
    <div className="flex gap-2 mb-3 max-w-md mx-auto">
      <input
        type="text"
        value={keyword}
        onChange={(e) => setKeyword(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && submit()}
        placeholder="검색어를 입력해주세요"
        className="flex-1 px-5 py-3 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
        style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
      />
      <button
        onClick={submit}
        aria-label="검색"
        className="w-12 h-12 rounded-full flex items-center justify-center transition-opacity hover:opacity-80 shrink-0"
        style={{ backgroundColor: "var(--tx-primary)", color: "var(--bg-card)" }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <line x1="5" y1="12" x2="19" y2="12" />
          <polyline points="12 5 19 12 12 19" />
        </svg>
      </button>
    </div>
  );
}
