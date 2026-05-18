"use client";

import { useState, useEffect } from "react";

export interface GeoPosition {
  lat: number;
  lng: number;
}

export type GeoStatus = "idle" | "loading" | "success" | "error";

export function useGeolocation() {
  const [position, setPosition] = useState<GeoPosition | null>(null);
  const [status, setStatus] = useState<GeoStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const request = () => {
    if (!navigator.geolocation) {
      setStatus("error");
      setError("Geolocation wird von diesem Browser nicht unterstützt.");
      return;
    }
    setStatus("loading");
    setError(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setStatus("success");
      },
      (err) => {
        setStatus("error");
        setError(err.code === 1 ? "Standortzugriff verweigert." : "Standort konnte nicht ermittelt werden.");
      },
      { timeout: 10000, maximumAge: 60000 }
    );
  };

  useEffect(() => {
    request();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { position, status, error, retry: request };
}
