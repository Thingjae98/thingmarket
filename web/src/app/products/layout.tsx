import Navbar from "@/components/Navbar";
import AuthProvider from "@/components/AuthProvider";

export default function ProductsLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Navbar />
      <main className="max-w-2xl mx-auto w-full px-4 py-4 flex-1 min-h-screen">
        {children}
      </main>
    </AuthProvider>
  );
}
