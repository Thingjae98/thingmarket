"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { createClient } from "@/lib/supabase";

export default function Navbar() {
  const { user, clear } = useAuthStore();
  const { theme, toggle } = useThemeStore();
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    clear();
    router.push("/");
    router.refresh();
  };

  return (
    <header
      className="sticky top-0 z-50 shadow-sm"
      style={{ backgroundColor: "var(--bg-card)", borderBottom: "1px solid var(--bd-input)" }}
    >
      <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/" className="text-xl font-bold text-orange-500">
          띵마켓
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/products/new" className="hover:text-orange-500 transition-colors" style={{ color: "var(--tx-secondary)" }}>
                판매하기
              </Link>
              <Link href="/chat" className="hover:text-orange-500 transition-colors" style={{ color: "var(--tx-secondary)" }}>
                채팅
              </Link>
              <Link href="/likes" className="hover:text-orange-500 transition-colors" style={{ color: "var(--tx-secondary)" }}>
                관심목록
              </Link>
              <Link href="/profile" className="hover:text-orange-500 transition-colors" style={{ color: "var(--tx-secondary)" }}>
                내 프로필
              </Link>
              <button
                onClick={handleLogout}
                className="hover:text-orange-400 transition-colors text-xs"
                style={{ color: "var(--tx-secondary)" }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full border border-orange-400 text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-colors"
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-full bg-orange-500 text-white hover:bg-orange-600 transition-colors"
              >
                회원가입
              </Link>
            </>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors hover:bg-black/5 dark:hover:bg-white/10"
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </nav>
      </div>
    </header>
  );
}
