"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface UserProfile {
  id: string;
  nickname: string;
  is_banned: boolean;
  manner_temp: number;
  created_at: string;
  role: string;
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [keyword, setKeyword] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session || session.user.user_metadata?.role !== "admin") {
        router.push("/login");
        return;
      }
      setToken(session.access_token);
      fetchUsers(session.access_token, "");
    });
  }, []);

  const fetchUsers = async (t: string, kw: string) => {
    setLoading(true);
    const qs = kw ? `?keyword=${encodeURIComponent(kw)}` : "";
    const data = await adminFetch<UserProfile[]>(`/admin/users${qs}`, t);
    setUsers(data);
    setLoading(false);
  };

  const handleBan = async (userId: string) => {
    const updated = await adminFetch<{ is_banned: boolean }>(
      `/admin/users/${userId}/ban`,
      token,
      { method: "PATCH" }
    );
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, is_banned: updated.is_banned } : u))
    );
  };

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <Link href="/dashboard" className="font-bold text-orange-400 text-lg">띵마켓 어드민</Link>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {[{ href: "/dashboard", label: "📊 대시보드" }, { href: "/users", label: "👥 사용자" }, { href: "/products", label: "📦 상품" }, { href: "/chats", label: "💬 채팅" }, { href: "/reports", label: "🚨 신고" }].map((item) => (
            <Link key={item.href} href={item.href} className="flex items-center px-3 py-2 rounded-lg text-sm text-gray-300 hover:bg-gray-700 hover:text-white">
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">사용자 관리</h1>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchUsers(token, keyword)}
            placeholder="닉네임 검색"
            className="flex-1 px-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            onClick={() => fetchUsers(token, keyword)}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm hover:bg-orange-600"
          >
            검색
          </button>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">닉네임</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">역할</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">매너온도</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">가입일</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">상태</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((u) => (
                  <tr key={u.id} className={u.is_banned ? "bg-red-50" : ""}>
                    <td className="px-4 py-3 font-medium">{u.nickname}</td>
                    <td className="px-4 py-3 text-gray-500">{u.role === "admin" ? "🔑 관리자" : "일반"}</td>
                    <td className="px-4 py-3 text-gray-500">{u.manner_temp?.toFixed(1)}°C</td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.is_banned ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"}`}>
                        {u.is_banned ? "정지됨" : "정상"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {u.role !== "admin" && (
                        <button
                          onClick={() => handleBan(u.id)}
                          className={`text-xs px-2 py-1 rounded border ${u.is_banned ? "border-green-300 text-green-600 hover:bg-green-50" : "border-red-300 text-red-500 hover:bg-red-50"}`}
                        >
                          {u.is_banned ? "해제" : "정지"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
