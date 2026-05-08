"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface Stats {
  total_users: number;
  total_products: number;
  total_transactions: number;
  pending_reports: number;
}

const NAV = [
  { href: "/dashboard", label: "📊 대시보드" },
  { href: "/users", label: "👥 사용자" },
  { href: "/products", label: "📦 상품" },
  { href: "/chats", label: "💬 채팅" },
  { href: "/reports", label: "🚨 신고" },
];

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [token, setToken] = useState("");
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { router.push("/login"); return; }
      const role = session.user.user_metadata?.role;
      if (role !== "admin") { router.push("/login"); return; }
      setToken(session.access_token);
      const data = await adminFetch<Stats>("/admin/stats", session.access_token);
      setStats(data);
    });
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="flex h-full">
      {/* 사이드바 */}
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <p className="font-bold text-orange-400 text-lg">띵마켓 어드민</p>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <button
          onClick={handleLogout}
          className="m-4 py-2 text-sm text-gray-400 hover:text-white border border-gray-700 rounded-lg"
        >
          로그아웃
        </button>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">대시보드</h1>

        {stats ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard label="전체 사용자" value={stats.total_users} color="bg-blue-500" />
            <StatCard label="전체 상품" value={stats.total_products} color="bg-green-500" />
            <StatCard label="전체 거래" value={stats.total_transactions} color="bg-purple-500" />
            <StatCard
              label="처리 대기 신고"
              value={stats.pending_reports}
              color="bg-red-500"
              alert={stats.pending_reports > 0}
            />
          </div>
        ) : (
          <div className="text-gray-400 text-sm py-10 text-center">통계 불러오는 중...</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { href: "/users", label: "👥 사용자 관리", desc: "사용자 목록 조회 및 정지 처리" },
            { href: "/products", label: "📦 상품 관리", desc: "전체 상품 조회 및 강제 삭제" },
            { href: "/reports", label: "🚨 신고 처리", desc: "신고 목록 확인 및 상태 변경" },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="bg-white rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <p className="text-lg font-bold text-gray-800 mb-1">{item.label}</p>
              <p className="text-sm text-gray-500">{item.desc}</p>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
  alert,
}: {
  label: string;
  value: number;
  color: string;
  alert?: boolean;
}) {
  return (
    <div className={`rounded-2xl p-5 text-white ${color} ${alert ? "ring-2 ring-red-300 ring-offset-2" : ""}`}>
      <p className="text-sm opacity-80">{label}</p>
      <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
