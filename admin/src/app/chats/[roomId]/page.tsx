"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useParams, useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface Message {
  id: string;
  sender_id: string;
  sender_nickname: string | null;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
}

const NAV = [
  { href: "/dashboard", label: "📊 대시보드" },
  { href: "/users", label: "👥 사용자" },
  { href: "/products", label: "📦 상품" },
  { href: "/chats", label: "💬 채팅" },
  { href: "/reports", label: "🚨 신고" },
];

export default function AdminChatDetailPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

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
      adminFetch<Message[]>(`/admin/chats/${roomId}/messages`, session.access_token)
        .then(setMessages)
        .finally(() => setLoading(false));
    });
  }, [roomId]);

  // 발신자별 색상 구분 (최대 8명)
  const senderColors: Record<string, string> = {};
  const palette = [
    "bg-blue-100 text-blue-800",
    "bg-green-100 text-green-800",
    "bg-purple-100 text-purple-800",
    "bg-yellow-100 text-yellow-800",
    "bg-pink-100 text-pink-800",
    "bg-indigo-100 text-indigo-800",
    "bg-red-100 text-red-800",
    "bg-teal-100 text-teal-800",
  ];
  let colorIdx = 0;
  messages.forEach((m) => {
    if (!senderColors[m.sender_id]) {
      senderColors[m.sender_id] = palette[colorIdx++ % palette.length];
    }
  });

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
        <div className="flex items-center gap-3 mb-6">
          <Link href="/chats" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>
          <h1 className="text-2xl font-bold text-gray-800">채팅 열람</h1>
          <span className="text-xs text-gray-400 bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full font-medium">
            🔒 관리자 전용 열람
          </span>
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : messages.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">메시지가 없습니다.</p>
        ) : (
          <div className="space-y-2 max-w-2xl">
            {messages.map((msg) => (
              <div key={msg.id} className="flex gap-3 items-start">
                {/* 발신자 뱃지 */}
                <span
                  className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap ${senderColors[msg.sender_id]}`}
                >
                  {msg.sender_nickname ?? "알 수 없음"}
                </span>

                {/* 메시지 내용 */}
                <div className="flex-1">
                  <div className="bg-white rounded-xl px-4 py-2.5 shadow-sm text-sm text-gray-800 leading-relaxed">
                    {msg.content}
                  </div>
                </div>

                {/* 시간 */}
                <span className="shrink-0 text-xs text-gray-400 mt-1 whitespace-nowrap">
                  {new Date(msg.created_at).toLocaleString("ko-KR", {
                    month: "2-digit",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
