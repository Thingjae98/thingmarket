"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

interface ChatRoom {
  id: string;
  product_id: string;
  product_title: string | null;
  product_thumbnail: string | null;
  other_nickname: string | null;
  last_message: string | null;
  last_message_at: string | null;
  buyer_unread: number;
  seller_unread: number;
  buyer_id: string;
  seller_id: string;
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function ChatListPage() {
  const { session } = useAuthStore();
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    api
      .get<ChatRoom[]>("/chats", session.access_token)
      .then(setRooms)
      .finally(() => setLoading(false));
  }, [session]);

  if (loading) return (
    <div className="text-center py-20" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
  );

  return (
    <div>
      <h1 className="text-lg font-bold mb-4" style={{ color: "var(--tx-primary)" }}>채팅</h1>
      {rooms.length === 0 ? (
        <div className="text-center py-16" style={{ color: "var(--tx-secondary)" }}>
          <p className="text-4xl mb-3">💬</p>
          <p className="text-sm">진행 중인 채팅이 없습니다.</p>
        </div>
      ) : (
        <div
          className="rounded-2xl shadow-sm overflow-hidden"
          style={{ backgroundColor: "var(--bg-card)" }}
        >
          {rooms.map((room, idx) => {
            const unread = session?.user.id === room.buyer_id ? room.buyer_unread : room.seller_unread;
            return (
              <Link
                key={room.id}
                href={`/chat/${room.id}`}
                className="flex items-center gap-3 px-4 py-4 transition-colors"
                style={{
                  borderTop: idx > 0 ? "1px solid var(--bd-input)" : undefined,
                }}
              >
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl shrink-0 overflow-hidden"
                  style={{ backgroundColor: "var(--bg-input)" }}
                >
                  {room.product_thumbnail ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={room.product_thumbnail} alt="" className="w-full h-full rounded-full object-cover" />
                  ) : "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <p className="text-sm font-medium truncate" style={{ color: "var(--tx-primary)" }}>
                      {room.other_nickname ?? "알 수 없음"}
                    </p>
                    {room.last_message_at && (
                      <span className="text-xs shrink-0 ml-2" style={{ color: "var(--tx-secondary)" }}>
                        {timeAgo(room.last_message_at)}
                      </span>
                    )}
                  </div>
                  <p className="text-xs truncate" style={{ color: "var(--tx-secondary)" }}>
                    {room.product_title}
                  </p>
                  <p className="text-xs truncate mt-0.5" style={{ color: "var(--tx-secondary)" }}>
                    {room.last_message ?? "메시지를 시작해 보세요"}
                  </p>
                </div>
                {unread > 0 && (
                  <span className="shrink-0 w-5 h-5 bg-orange-500 rounded-full text-white text-xs flex items-center justify-center">
                    {unread > 9 ? "9+" : unread}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
