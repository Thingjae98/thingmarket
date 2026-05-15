"use client";

import { create } from "zustand";

type Status = "idle" | "requesting" | "granted" | "denied" | "unsupported";

type LocationState = {
  lat: number;
  lng: number;
  locationName: string;
  status: Status;
  /**
   * 위치를 요청한다.
   * - 기본(no force): idle 상태일 때만 요청 → 페이지 진입 시 자동 1회 호출용
   * - force: true → 권한 다시 묻기 (📍 버튼 등 명시적 사용자 액션)
   */
  requestGeo: (opts?: { force?: boolean }) => void;
};

const DEFAULT = {
  lat: 37.5665,
  lng: 126.978,
  locationName: "서울 중구",
} as const;

export const useLocationStore = create<LocationState>((set, get) => ({
  ...DEFAULT,
  status: "idle",
  requestGeo: ({ force = false } = {}) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      set({ status: "unsupported" });
      return;
    }
    const cur = get().status;
    if (!force && cur !== "idle") return;

    set({ status: "requesting" });
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        set({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          locationName: "현재 위치",
          status: "granted",
        });
      },
      () => set({ status: "denied" }),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 5 * 60 * 1000 }
    );
  },
}));
