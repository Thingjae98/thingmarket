"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase";

const inputCls =
  "mt-1 w-full px-3 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 transition-colors";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nickname, setNickname] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { nickname },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setError(error.message);
      setLoading(false);
      return;
    }

    setDone(true);
  };

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-page)" }}>
        <div className="text-center rounded-2xl shadow-sm p-8 max-w-sm w-full" style={{ backgroundColor: "var(--bg-card)" }}>
          <div className="text-4xl mb-4">📧</div>
          <h2 className="text-lg font-bold mb-2" style={{ color: "var(--tx-primary)" }}>이메일을 확인해 주세요</h2>
          <p className="text-sm mb-6" style={{ color: "var(--tx-secondary)" }}>
            {email}로 인증 링크를 보냈습니다. 링크를 클릭하면 가입이 완료됩니다.
          </p>
          <Link href="/login" className="text-orange-500 font-medium text-sm">
            로그인 페이지로 →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: "var(--bg-page)" }}>
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-center mb-2 text-orange-500">띵마켓</h1>
        <p className="text-center text-sm mb-8" style={{ color: "var(--tx-secondary)" }}>계정 만들기</p>

        <form
          onSubmit={handleRegister}
          className="rounded-2xl shadow-sm p-6 space-y-4"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {error && (
            <p className="text-sm text-red-500 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">{error}</p>
          )}
          <div>
            <label className="text-sm font-medium" style={{ color: "var(--tx-secondary)" }}>닉네임</label>
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              required
              minLength={2}
              maxLength={20}
              className={inputCls}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
              placeholder="사용할 닉네임 (2~20자)"
            />
          </div>
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
              minLength={6}
              className={inputCls}
              style={{ backgroundColor: "var(--bg-input)", border: "1px solid var(--bd-input)", color: "var(--tx-primary)" }}
              placeholder="6자 이상"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-orange-500 text-white rounded-xl text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
          >
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>

        <p className="text-center text-sm mt-4" style={{ color: "var(--tx-secondary)" }}>
          이미 계정이 있으신가요?{" "}
          <Link href="/login" className="text-orange-500 font-medium hover:underline">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
