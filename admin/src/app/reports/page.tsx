"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface Report {
  id: string;
  reporter_id: string;
  target_type: string;
  target_id: string;
  reason: string;
  status: string;
  admin_note: string | null;
  created_at: string;
}

const STATUS_OPTIONS = ["pending", "reviewed", "resolved", "dismissed"];
const STATUS_LABEL: Record<string, string> = {
  pending: "대기",
  reviewed: "검토중",
  resolved: "처리완료",
  dismissed: "기각",
};

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState("pending");
  const [noteInput, setNoteInput] = useState<Record<string, string>>({});
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
      fetchReports(session.access_token, "pending");
    });
  }, []);

  const fetchReports = async (t: string, status: string) => {
    setLoading(true);
    const data = await adminFetch<Report[]>(`/admin/reports?status=${status}`, t);
    setReports(data);
    setLoading(false);
  };

  const handleUpdate = async (reportId: string, status: string) => {
    const note = noteInput[reportId] ?? "";
    const updated = await adminFetch<Report>(`/admin/reports/${reportId}`, token, {
      method: "PATCH",
      body: JSON.stringify({ status, admin_note: note }),
    });
    setReports((prev) => prev.map((r) => (r.id === reportId ? updated : r)));
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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">신고 처리</h1>

        <div className="flex gap-2 mb-4">
          {STATUS_OPTIONS.map((s) => (
            <button
              key={s}
              onClick={() => { setSelectedStatus(s); fetchReports(token, s); }}
              className={`px-4 py-2 rounded-lg text-sm font-medium ${selectedStatus === s ? "bg-orange-500 text-white" : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"}`}
            >
              {STATUS_LABEL[s]}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : reports.length === 0 ? (
          <p className="text-gray-400 text-sm py-10 text-center">신고 없음</p>
        ) : (
          <div className="space-y-3">
            {reports.map((r) => (
              <div key={r.id} className="bg-white rounded-2xl p-5 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.target_type}</span>
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${r.status === "pending" ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                        {STATUS_LABEL[r.status]}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-800">{r.reason}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(r.created_at).toLocaleString("ko-KR")}
                    </p>
                    {r.admin_note && (
                      <p className="text-xs text-blue-600 mt-1">메모: {r.admin_note}</p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    <input
                      type="text"
                      placeholder="관리자 메모"
                      value={noteInput[r.id] ?? ""}
                      onChange={(e) => setNoteInput((prev) => ({ ...prev, [r.id]: e.target.value }))}
                      className="text-xs px-2 py-1.5 border border-gray-200 rounded-lg w-40 focus:outline-none"
                    />
                    <div className="flex gap-1">
                      <button onClick={() => handleUpdate(r.id, "resolved")} className="flex-1 text-xs py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600">처리완료</button>
                      <button onClick={() => handleUpdate(r.id, "dismissed")} className="flex-1 text-xs py-1.5 bg-gray-400 text-white rounded-lg hover:bg-gray-500">기각</button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
