"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { useThemeStore } from "@/store/theme";
import { createClient } from "@/lib/supabase";

export default function Navbar({ maxWidth = "max-w-2xl" }: { maxWidth?: "max-w-2xl" | "max-w-6xl" }) {
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
      <div className={`${maxWidth} mx-auto px-4 h-14 flex items-center justify-between`}>
        <Link href="/" className="flex items-center gap-1.5">
          <Image src="/logo.svg" alt="띵마켓" width={28} height={28} priority />
          <span className="text-lg font-bold tracking-tight" style={{ color: "var(--accent)" }}>
            띵마켓
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-sm">
          {user ? (
            <>
              <Link href="/products/new" className="transition-opacity hover:opacity-70" style={{ color: "var(--tx-secondary)" }}>
                금 등록
              </Link>
              <Link href="/chat" className="transition-opacity hover:opacity-70" style={{ color: "var(--tx-secondary)" }}>
                채팅
              </Link>
              <Link href="/likes" className="transition-opacity hover:opacity-70" style={{ color: "var(--tx-secondary)" }}>
                관심목록
              </Link>
              <Link href="/profile" className="transition-opacity hover:opacity-70" style={{ color: "var(--tx-secondary)" }}>
                내 프로필
              </Link>
              <button
                onClick={handleLogout}
                className="transition-colors hover:opacity-50 text-xs"
                style={{ color: "var(--tx-secondary)" }}
              >
                로그아웃
              </button>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-80"
                style={{ border: "1px solid var(--accent)", color: "var(--accent)" }}
              >
                로그인
              </Link>
              <Link
                href="/register"
                className="px-3 py-1.5 rounded-full text-sm transition-opacity hover:opacity-80"
                style={{ backgroundColor: "var(--accent)", color: "var(--accent-fg)" }}
              >
                회원가입
              </Link>
            </>
          )}

          {/* 다크/라이트 토글 */}
          <button
            onClick={toggle}
            title={theme === "dark" ? "라이트 모드" : "다크 모드"}
            className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
            style={{ backgroundColor: "var(--accent-soft)" }}
          >
            {theme === "dark" ? "☀️" : "🌙"}
          </button>
        </nav>
      </div>
    </header>
  );
}
