"use client";

import { useState, useEffect } from "react";
import { createBrowserClient } from "@supabase/ssr";
import { useRouter } from "next/navigation";
import { adminFetch } from "@/lib/api";
import Link from "next/link";

interface Product {
  id: string;
  title: string;
  price: number;
  status: string;
  seller_id: string;
  created_at: string;
  profiles: { nickname: string } | null;
}

const NAV = [
  { href: "/dashboard", label: "📊 대시보드" },
  { href: "/users", label: "👥 사용자" },
  { href: "/products", label: "📦 상품" },
  { href: "/chats", label: "💬 채팅" },
  { href: "/reports", label: "🚨 신고" },
];

const STATUS_LABEL: Record<string, string> = {
  selling: "판매중",
  reserved: "예약중",
  sold: "거래완료",
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
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
      adminFetch<Product[]>("/admin/products", session.access_token)
        .then(setProducts)
        .finally(() => setLoading(false));
    });
  }, []);

  const handleDelete = async (productId: string, title: string) => {
    if (!confirm(`"${title}" 상품을 삭제하시겠습니까?`)) return;
    await adminFetch(`/admin/products/${productId}`, token, { method: "DELETE" });
    setProducts((prev) => prev.filter((p) => p.id !== productId));
  };

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
        <h1 className="text-2xl font-bold text-gray-800 mb-6">상품 관리</h1>

        {loading ? (
          <p className="text-gray-400 text-sm">불러오는 중...</p>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">제목</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">판매자</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">가격</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">상태</th>
                  <th className="px-4 py-3 text-left text-gray-500 font-medium">등록일</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium truncate max-w-[200px]">{p.title}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {(p.profiles as { nickname: string } | null)?.nickname ?? "-"}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {p.price === 0 ? "나눔" : `${p.price.toLocaleString()}원`}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        p.status === "selling" ? "bg-green-100 text-green-600" :
                        p.status === "reserved" ? "bg-yellow-100 text-yellow-600" :
                        "bg-gray-100 text-gray-500"
                      }`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(p.created_at).toLocaleDateString("ko-KR")}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDelete(p.id, p.title)}
                        className="text-xs px-2 py-1.5 border border-red-300 text-red-500 rounded-lg hover:bg-red-50"
                      >
                        강제삭제
                      </button>
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
