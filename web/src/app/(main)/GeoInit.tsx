"use client";

import { useEffect } from "react";
import { useLocationStore } from "@/store/location";

export default function GeoInit() {
  const requestGeo = useLocationStore((s) => s.requestGeo);
  useEffect(() => {
    requestGeo();
  }, [requestGeo]);
  return null;
}
