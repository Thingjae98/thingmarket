"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth";
import { api } from "@/lib/api";

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  message_type: string;
  is_read: boolean;
  created_at: string;
  sender_nickname: string | null;
}

interface ChatRoom {
  id: string;
  other_nickname: string | null;
  product_title: string | null;
  buyer_id: string;
  seller_id: string;
}

const WS_BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1")
  .replace(/^http/, "ws");

export default function ChatRoomPage() {
  const { roomId } = useParams<{ roomId: string }>();
  const router = useRouter();
  const { session } = useAuthStore();
  const [room, setRoom] = useState<ChatRoom | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!session) return;
    Promise.all([
      api.get<ChatRoom>(`/chats/${roomId}`, session.access_token),
      api.get<Message[]>(`/chats/${roomId}/messages`, session.access_token),
      api.patch(`/chats/${roomId}/read`, {}, session.access_token),
    ]).then(([r, msgs]) => {
      setRoom(r);
      setMessages(msgs);
    }).catch(() => router.push("/chat"));
  }, [roomId, session]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const connectWs = useCallback(() => {
    if (!session) return;
    const ws = new WebSocket(`${WS_BASE}/chats/${roomId}/ws?token=${session.access_token}`);
    wsRef.current = ws;

    ws.onopen = () => setConnected(true);
    ws.onclose = () => {
      setConnected(false);
      setTimeout(connectWs, 3000);
    };
    ws.onmessage = (e) => {
      const msg: Message = JSON.parse(e.data);
      setMessages((prev) => [...prev, msg]);
    };
  }, [roomId, session]);

  useEffect(() => {
    connectWs();
    return () => wsRef.current?.close();
  }, [connectWs]);

  const sendMessage = () => {
    const trimmed = input.trim();
    if (!trimmed || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(JSON.stringify({ content: trimmed, message_type: "text" }));
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  if (!room) return (
    <div className="text-center py-20" style={{ color: "var(--tx-secondary)" }}>불러오는 중...</div>
  );

  return (
    <div className="flex flex-col h-[calc(100vh-56px)] -mx-4 -my-4">
      {/* 헤더 */}
      <div
        className="flex items-center gap-3 px-4 py-3"
        style={{
          backgroundColor: "var(--bg-card)",
          borderBottom: "1px solid var(--bd-input)",
        }}
      >
        <button
          onClick={() => router.back()}
          className="text-lg transition-colors hover:text-orange-500"
          style={{ color: "var(--tx-secondary)" }}
        >
          ←
        </button>
        <div>
          <p className="text-sm font-bold" style={{ color: "var(--tx-primary)" }}>
            {room.other_nickname ?? "상대방"}
          </p>
          <p className="text-xs truncate" style={{ color: "var(--tx-secondary)" }}>
            {room.product_title}
          </p>
        </div>
        <span className={`ml-auto text-xs ${connected ? "text-green-500" : ""}`}
          style={!connected ? { color: "var(--tx-secondary)" } : {}}>
          {connected ? "● 연결됨" : "○ 연결 중..."}
        </span>
      </div>

      {/* 메시지 목록 */}
      <div
        className="flex-1 overflow-y-auto px-4 py-4 space-y-3"
        style={{ backgroundColor: "var(--bg-page)" }}
      >
        {messages.map((msg) => {
          const isMine = msg.sender_id === session?.user.id;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              {!isMine && (
                <span className="text-xs mr-2 mt-auto mb-1" style={{ color: "var(--tx-secondary)" }}>
                  {msg.sender_nickname}
                </span>
              )}
              <div
                className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${
                  isMine
                    ? "bg-orange-500 text-white rounded-br-sm"
                    : "shadow-sm rounded-bl-sm"
                }`}
                style={!isMine ? {
                  backgroundColor: "var(--bg-card)",
                  color: "var(--tx-primary)",
                } : {}}
              >
                {msg.content}
              </div>
              <span className="text-xs ml-1 mt-auto mb-1 shrink-0" style={{ color: "var(--tx-secondary)" }}>
                {new Date(msg.created_at).toLocaleTimeString("ko-KR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* 입력창 */}
      <div
        className="px-3 py-3 flex gap-2 items-end"
        style={{
          backgroundColor: "var(--bg-card)",
          borderTop: "1px solid var(--bd-input)",
        }}
      >
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder="메시지를 입력하세요"
          className="flex-1 px-3 py-2 rounded-2xl text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-400 max-h-24"
          style={{
            backgroundColor: "var(--bg-input)",
            border: "1px solid var(--bd-input)",
            color: "var(--tx-primary)",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || !connected}
          className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-medium hover:bg-orange-600 disabled:opacity-40"
        >
          전송
        </button>
      </div>
    </div>
  );
}
