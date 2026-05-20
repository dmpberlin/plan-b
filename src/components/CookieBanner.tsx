"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "wgt-cookie-consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {}
  }, []);

  function accept() {
    try { localStorage.setItem(STORAGE_KEY, "1"); } catch {}
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="fixed bottom-16 left-0 right-0 z-50 px-4 pb-2">
      <div className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 shadow-xl">
        <p className="text-xs text-zinc-400 leading-relaxed">
          Diese App speichert deine <strong className="text-zinc-300">Favoriten und Einstellungen</strong> ausschließlich lokal
          in deinem Browser (localStorage). Es werden keine Cookies gesetzt, keine Daten an Server übertragen
          und kein Tracking durchgeführt.
        </p>
        <button
          onClick={accept}
          className="mt-2 w-full rounded-lg bg-zinc-800 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700 transition-colors"
        >
          Verstanden
        </button>
      </div>
    </div>
  );
}
