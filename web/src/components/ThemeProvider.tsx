"use client";

import { useEffect } from "react";
import { useThemeStore } from "@/store/theme";

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const setTheme = useThemeStore((s) => s.setTheme);

  useEffect(() => {
    const saved = localStorage.getItem("theme") as "light" | "dark" | null;
    const preferred = window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    setTheme(saved ?? preferred);
  }, [setTheme]);

  return <>{children}</>;
}
