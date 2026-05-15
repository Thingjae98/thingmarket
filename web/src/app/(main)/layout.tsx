import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      {/* Navbar는 /market과 동일한 max-w-6xl로 통일 */}
      <Navbar maxWidth="max-w-6xl" />
      {/* 본문은 기존대로 max-w-2xl 유지 (가운데 정렬, 가독성) */}
      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex-1 min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
