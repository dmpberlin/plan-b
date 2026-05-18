"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Appearance, Location, PlanBEntry, ReachabilityStatus } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation } from "@/hooks/useGeolocation";

const REFRESH_INTERVAL_MS = 3 * 60 * 1000; // 3 min
const LOOKAHEAD_HOURS = 4;

function statusColor(s: ReachabilityStatus) {
  if (s === "reachable") return "text-green-400 border-green-800 bg-green-950/40";
  if (s === "tight") return "text-yellow-400 border-yellow-800 bg-yellow-950/40";
  if (s === "missed") return "text-red-400 border-red-800 bg-red-950/40";
  return "text-zinc-400 border-zinc-800 bg-zinc-900";
}

function statusLabel(s: ReachabilityStatus, buffer: number | null) {
  if (s === "reachable") return `+${buffer} min`;
  if (s === "tight") return buffer !== null && buffer >= 0 ? `+${buffer} min` : "knapp";
  if (s === "missed") return "zu spät";
  return "—";
}

function mapsLink(origin: { lat: number; lng: number }, dest: Location) {
  return `https://www.google.com/maps/dir/?api=1&origin=${origin.lat},${origin.lng}&destination=${dest.lat},${dest.lng}&travelmode=transit`;
}

export function PlanBView({
  appearances,
  locations,
}: {
  appearances: Appearance[];
  locations: Location[];
}) {
  const { favorites, isFavorite, loaded } = useFavorites();
  const { position, status: geoStatus, error: geoError, retry } = useGeolocation();
  const [travelTimes, setTravelTimes] = useState<Record<string, number | null>>({});
  const [now, setNow] = useState(() => new Date());
  const [fetching, setFetching] = useState(false);

  const locationByAlias = useMemo(() => {
    const map = new Map<string, Location>();
    for (const loc of locations) {
      for (const alias of loc.aliases) map.set(alias, loc);
    }
    return map;
  }, [locations]);

  // Update clock every 30s
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  const favoriteAppearances = useMemo(() => {
    if (!loaded) return [];
    return appearances.filter((a) => isFavorite(a.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearances, isFavorite, loaded, favorites]);

  const upcomingFavorites = useMemo(() => {
    const cutoff = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);
    return favoriteAppearances.filter((a) => {
      const start = new Date(a.isoDatetime);
      return start > now && start <= cutoff;
    });
  }, [favoriteAppearances, now]);

  // Unique location IDs needed
  const neededLocations = useMemo(() => {
    const seen = new Set<string>();
    const result: Location[] = [];
    for (const a of upcomingFavorites) {
      const loc = locationByAlias.get(a.location);
      if (loc && !seen.has(loc.id)) {
        seen.add(loc.id);
        result.push(loc);
      }
    }
    return result;
  }, [upcomingFavorites, locationByAlias]);

  const fetchTravelTimes = useCallback(async () => {
    if (!position || neededLocations.length === 0) return;
    setFetching(true);
    try {
      const res = await fetch("/api/travel-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: position,
          destinations: neededLocations.map((l) => ({
            locationId: l.id,
            lat: l.lat,
            lng: l.lng,
          })),
          departureTime: Math.floor(Date.now() / 1000),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTravelTimes((prev) => ({ ...prev, ...data }));
      }
    } finally {
      setFetching(false);
    }
  }, [position, neededLocations]);

  useEffect(() => {
    fetchTravelTimes();
    const t = setInterval(fetchTravelTimes, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchTravelTimes]);

  const entries: PlanBEntry[] = useMemo(() => {
    return upcomingFavorites.map((a) => {
      const loc = locationByAlias.get(a.location);
      const start = new Date(a.isoDatetime);
      const minutesUntilStart = Math.floor((start.getTime() - now.getTime()) / 60_000);
      const travelSeconds = loc ? (travelTimes[loc.id] ?? null) : null;
      const travelMinutes = travelSeconds !== null ? Math.ceil(travelSeconds / 60) : null;
      const bufferMinutes = travelMinutes !== null ? minutesUntilStart - travelMinutes : null;

      let status: ReachabilityStatus = "unknown";
      if (bufferMinutes !== null) {
        if (bufferMinutes >= 15) status = "reachable";
        else if (bufferMinutes >= 0) status = "tight";
        else status = "missed";
      }

      return { appearance: a, location: loc!, minutesUntilStart, travelMinutes, bufferMinutes, status };
    }).sort((a, b) => a.appearance.isoDatetime.localeCompare(b.appearance.isoDatetime));
  }, [upcomingFavorites, travelTimes, now, locationByAlias]);

  // All favorites outside lookahead window
  const laterFavorites = useMemo(() => {
    const cutoff = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);
    return favoriteAppearances
      .filter((a) => new Date(a.isoDatetime) > cutoff)
      .sort((a, b) => a.isoDatetime.localeCompare(b.isoDatetime))
      .slice(0, 5);
  }, [favoriteAppearances, now]);

  if (!loaded) return null;

  if (favoriteAppearances.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
        <span className="text-5xl">♥</span>
        <p className="text-zinc-300 font-medium">Noch keine Favoriten</p>
        <p className="text-sm text-zinc-500">
          Markiere Auftritte im Programm, die du sehen möchtest.
        </p>
        <Link
          href="/program"
          className="mt-2 rounded-full bg-rose-900 px-5 py-2 text-sm font-medium text-rose-100"
        >
          Zum Programm
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col pb-24">
      {/* Header */}
      <div className="px-4 pb-2 pt-4">
        <div className="mb-1 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-zinc-100">Plan B</h1>
          <span className="text-xs text-zinc-500">
            {now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })} Uhr
          </span>
        </div>

        {/* Location status */}
        <div className="flex items-center gap-2 text-xs">
          {geoStatus === "loading" && (
            <span className="text-zinc-500">⟳ Standort wird ermittelt…</span>
          )}
          {geoStatus === "success" && (
            <span className="text-green-500">● Standort aktiv {fetching && "· lädt…"}</span>
          )}
          {geoStatus === "error" && (
            <button onClick={retry} className="text-yellow-500 underline">
              ⚠ {geoError} Erneut versuchen
            </button>
          )}
        </div>
      </div>

      {/* Upcoming entries */}
      <div className="px-4">
        {upcomingFavorites.length === 0 ? (
          <div className="mt-6 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-sm text-zinc-400">
              Keine Favoriten in den nächsten {LOOKAHEAD_HOURS} Stunden.
            </p>
          </div>
        ) : (
          <div className="mt-2 flex flex-col gap-3">
            {entries.map(({ appearance: a, location: loc, minutesUntilStart, travelMinutes, bufferMinutes, status }) => (
              <div
                key={a.id}
                className={`rounded-xl border px-4 py-3 ${statusColor(status)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold text-zinc-100 leading-tight">{a.band}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {a.time} · {a.location}
                    </div>
                    {travelMinutes !== null && (
                      <div className="mt-1 text-xs text-zinc-500">
                        {travelMinutes} min Fahrt · noch {minutesUntilStart} min
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold ${statusColor(status).split(" ")[0]}`}>
                      {statusLabel(status, bufferMinutes)}
                    </span>
                    {loc && position && (
                      <a
                        href={mapsLink(position, loc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Maps ↗
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Later favorites */}
        {laterFavorites.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Später
            </p>
            {laterFavorites.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-t border-zinc-800/50 py-2">
                <span className="w-10 shrink-0 text-xs font-mono text-zinc-600">
                  {a.time.replace(" Uhr", "")}
                </span>
                <span className="flex-1 text-sm text-zinc-400">{a.band}</span>
                <span className="text-xs text-zinc-600">{a.date.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
