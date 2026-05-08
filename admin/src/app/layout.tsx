import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "띵마켓 어드민",
  description: "ThingMarket 관리자 대시보드",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko" className="h-full">
      <body className="h-full bg-gray-100">{children}</body>
    </html>
  );
}
