"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";
import { useAuthStore } from "@/store/auth";

const inputCls =
  "mt-1 w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();
  const setSession = useAuthStore((s) => s.setSession);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("이메일 또는 비밀번호가 올바르지 않습니다.");
      setLoading(false);
      return;
    }
    setSession(data.session);
    router.push("/");
    router.refresh();
  };

  const handleKakao = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-page)" }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-orange-500">띵마켓</h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--tx-secondary)" }}>동네 중고거래</p>

        <form
          onSubmit={handleLogin}
          className="rounded-2xl shadow-sm p-6 space-y-4"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--tx-secondary)" }}>이메일</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={inputCls}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
              placeholder="example@email.com"
            />
          </div>
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--tx-secondary)" }}>비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={inputCls}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "로그인 중..." : "로그인"}
          </button>

          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full" style={{ borderTop: "1px solid var(--bd-input)" }} />
            </div>
            <div className="relative flex justify-center text-xs" style={{ color: "var(--tx-secondary)" }}>
              <span className="px-2" style={{ backgroundColor: "var(--bg-card)" }}>또는</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleKakao}
            className="w-full py-2.5 bg-yellow-400 text-gray-900 rounded-xl text-sm font-medium hover:bg-yellow-500 transition-colors"
          >
            카카오로 계속하기
          </button>
          <button
            type="button"
            onClick={handleGoogle}
            className="w-full py-2.5 rounded-xl text-sm font-medium transition-colors hover:opacity-80"
            style={{
              backgroundColor: "var(--bg-input)",
              border: "1px solid var(--bd-input)",
              color: "var(--tx-primary)",
            }}
          >
            Google로 계속하기
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--tx-secondary)" }}>
          아직 계정이 없으신가요?{" "}
          <Link href="/register" className="text-orange-500 font-medium hover:underline">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
