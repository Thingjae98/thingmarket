"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface ChatRoom {
  id: string;
  product_id: string;
  product_title: string | null;
  buyer_nickname: string | null;
  seller_nickname: string | null;
  last_message: string | null;
  last_message_at: string | null;
  created_at: string;
}

const NAV = [
  { href: "/dashboard", label: "📊 대시보드" },
  { href: "/users", label: "👥 사용자" },
  { href: "/products", label: "📦 상품" },
  { href: "/chats", label: "💬 채팅" },
  { href: "/reports", label: "🚨 신고" },
];

export default function AdminChatsPage() {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
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
      adminFetch<ChatRoom[]>("/admin/chats", session.access_token)
        .then(setRooms)
        .finally(() => setLoading(false));
    });
  }, []);

  return (
    <div className="flex h-full">
      <aside className="w-56 bg-gray-900 text-white flex flex-col">
        <div className="px-4 py-5 border-b border-gray-700">
          <Link href="/dashboard" className="font-bold text-orange-400 text-lg">
            띵마켓 어드민
          </Link>
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
      </aside>

      <main className="flex-1 overflow-y-auto p-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">채팅 모니터링</h1>
        <p className="text-sm text-gray-500 mb-4">
          전체 채팅방 목록입니다. 클릭하면 대화 내용을 열람할 수 있습니다.
        </p>

        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : rooms.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">채팅방이 없습니다.</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">상품</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">구매자</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">판매자</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">마지막 메시지</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">일시</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {rooms.map((room) => (
                  <tr key={room.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium truncate max-w-[160px]">
                      {room.product_title ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">{room.buyer_nickname ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-600">{room.seller_nickname ?? "-"}</td>
                    <td className="px-4 py-3 text-gray-400 truncate max-w-[180px]">
                      {room.last_message ?? "메시지 없음"}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {room.last_message_at
                        ? new Date(room.last_message_at).toLocaleString("ko-KR")
                        : "-"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/chats/${room.id}`}
                        className="text-xs px-3 py-1.5 border border-orange-300 text-orange-500 rounded-lg hover:bg-orange-50"
                      >
                        열람
                      </Link>
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
