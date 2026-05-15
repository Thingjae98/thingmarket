import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";

export default function MarketLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar maxWidth="max-w-6xl" />
      <main className="max-w-6xl mx-auto w-full px-4 py-5 flex-1 min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
