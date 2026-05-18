"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import { Appearance, Location, PlanBEntry, ReachabilityStatus } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";
import { useGeolocation } from "@/hooks/useGeolocation";

const REFRESH_INTERVAL_MS = 3 * 60 * 1000;
const LOOKAHEAD_HOURS = 4;

const MANUAL_LOCATIONS = [
  { id: "hbf",          label: "Leipzig Hauptbahnhof",    lat: 51.3456, lng: 12.3820 },
  { id: "markt",        label: "Leipzig Markt",            lat: 51.3394, lng: 12.3750 },
  { id: "agra",         label: "agra",                     lat: 51.2825, lng: 12.3838 },
  { id: "felsenkeller", label: "Felsenkeller",             lat: 51.3333, lng: 12.3305 },
  { id: "haus-leipzig", label: "Haus Leipzig",             lat: 51.3387, lng: 12.3640 },
  { id: "moritzbastei", label: "Moritzbastei",             lat: 51.3397, lng: 12.3805 },
  { id: "parkschloss",  label: "Parkschloß",               lat: 51.2803, lng: 12.4088 },
  { id: "peterskirche", label: "Peterskirche",             lat: 51.3345, lng: 12.3772 },
  { id: "stadtbad",     label: "Stadtbad",                 lat: 51.3581, lng: 12.3754 },
  { id: "taeubchenthal",label: "Täubchenthal",             lat: 51.3282, lng: 12.3269 },
  { id: "torhaus",      label: "Torhaus Dölitz",           lat: 51.2819, lng: 12.4063 },
  { id: "volkspalast",  label: "Volkspalast",              lat: 51.3691, lng: 12.3531 },
  { id: "wachau",       label: "Kirchenruine Wachau",      lat: 51.2620, lng: 12.4639 },
];

const SIM_DATES = [
  { label: "Fr 22.05.", iso: "2026-05-22" },
  { label: "Sa 23.05.", iso: "2026-05-23" },
  { label: "So 24.05.", iso: "2026-05-24" },
  { label: "Mo 25.05.", iso: "2026-05-25" },
];

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

function fmtTime(time: string) {
  return time.replace(/\s*Uhr$/i, "").replace(".", ":");
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
  const [simActive, setSimActive] = useState(false);
  const [simDate, setSimDate] = useState(SIM_DATES[0].iso);
  const [simTimeVal, setSimTimeVal] = useState("17:00");
  const [showHelp, setShowHelp] = useState(false);
  const [manualLocationId, setManualLocationId] = useState<string>("");

  // Restore persisted simulation + location state on mount
  useEffect(() => {
    try {
      const active = localStorage.getItem("planb-sim-active") === "1";
      const date   = localStorage.getItem("planb-sim-date")   || SIM_DATES[0].iso;
      const time   = localStorage.getItem("planb-sim-time")   || "17:00";
      const locId  = localStorage.getItem("planb-manual-loc") || "";
      setSimActive(active);
      setSimDate(date);
      setSimTimeVal(time);
      setManualLocationId(locId);
    } catch { /* storage unavailable */ }
  }, []);

  // Persist whenever values change
  useEffect(() => { try { localStorage.setItem("planb-sim-active", simActive ? "1" : "0"); } catch {} }, [simActive]);
  useEffect(() => { try { localStorage.setItem("planb-sim-date",   simDate);               } catch {} }, [simDate]);
  useEffect(() => { try { localStorage.setItem("planb-sim-time",   simTimeVal);             } catch {} }, [simTimeVal]);
  useEffect(() => { try { localStorage.setItem("planb-manual-loc", manualLocationId);       } catch {} }, [manualLocationId]);

  const activePosition = useMemo(() => {
    if (manualLocationId) {
      const m = MANUAL_LOCATIONS.find((l) => l.id === manualLocationId);
      if (m) return { lat: m.lat, lng: m.lng };
    }
    return position;
  }, [manualLocationId, position]);

  const locationByAlias = useMemo(() => {
    const map = new Map<string, Location>();
    for (const loc of locations) {
      for (const alias of loc.aliases) map.set(alias, loc);
    }
    return map;
  }, [locations]);

  // Clock tick — paused during simulation
  useEffect(() => {
    if (simActive) return;
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, [simActive]);

  // Apply simulated time whenever date/time selectors change
  useEffect(() => {
    if (!simActive) {
      setNow(new Date());
      return;
    }
    const parsed = new Date(`${simDate}T${simTimeVal}:00`);
    if (!isNaN(parsed.getTime())) setNow(parsed);
  }, [simActive, simDate, simTimeVal]);

  const favoriteAppearances = useMemo(() => {
    if (!loaded) return [];
    return appearances.filter((a) => isFavorite(a.id));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appearances, isFavorite, loaded, favorites]);

  // Acts within the travel-time window (Google Maps is called for these)
  const nearFavorites = useMemo(() => {
    const cutoff = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);
    return favoriteAppearances.filter((a) => {
      const start = new Date(a.isoDatetime);
      return start > now && start <= cutoff;
    });
  }, [favoriteAppearances, now]);

  // All future favorites (shown in full list)
  const upcomingFavorites = useMemo(() => {
    return favoriteAppearances
      .filter((a) => new Date(a.isoDatetime) > now)
      .sort((a, b) => a.isoDatetime.localeCompare(b.isoDatetime));
  }, [favoriteAppearances, now]);

  const neededLocations = useMemo(() => {
    const seen = new Set<string>();
    const result: Location[] = [];
    for (const a of nearFavorites) {
      const loc = locationByAlias.get(a.location);
      if (loc && !seen.has(loc.id)) {
        seen.add(loc.id);
        result.push(loc);
      }
    }
    return result;
  }, [upcomingFavorites, locationByAlias]);

  const fetchTravelTimes = useCallback(async () => {
    if (!activePosition || neededLocations.length === 0) return;
    setFetching(true);
    try {
      const res = await fetch("/api/travel-times", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: activePosition,
          destinations: neededLocations.map((l) => ({
            locationId: l.id,
            lat: l.lat,
            lng: l.lng,
          })),
          // Use simulated time so Google returns correct transit schedules
          departureTime: Math.floor(now.getTime() / 1000),
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setTravelTimes((prev) => ({ ...prev, ...data }));
      }
    } finally {
      setFetching(false);
    }
  }, [activePosition, neededLocations, now]);

  useEffect(() => {
    fetchTravelTimes();
    const t = setInterval(fetchTravelTimes, REFRESH_INTERVAL_MS);
    return () => clearInterval(t);
  }, [fetchTravelTimes]);

  const entries: PlanBEntry[] = useMemo(() => {
    return nearFavorites.map((a) => {
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

  // Acts beyond the travel-time window — shown as plain list
  const laterFavorites = useMemo(() => {
    const cutoff = new Date(now.getTime() + LOOKAHEAD_HOURS * 3_600_000);
    return upcomingFavorites.filter((a) => new Date(a.isoDatetime) > cutoff);
  }, [upcomingFavorites, now]);

  if (!loaded) return null;

  if (favoriteAppearances.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 py-24 text-center">
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
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-zinc-100">Plan B</h1>
            <button
              onClick={() => setShowHelp((v) => !v)}
              title="Anleitung"
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                showHelp ? "bg-zinc-600 text-zinc-100" : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              }`}
            >
              ?
            </button>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-mono ${simActive ? "text-amber-400" : "text-zinc-500"}`}>
              {now.toLocaleDateString("de-DE", { weekday: "short", day: "2-digit", month: "2-digit" })}{" "}
              {now.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })}
            </span>
            <button
              onClick={() => setSimActive((v) => !v)}
              title="Zeitsimulation"
              className={`rounded px-1.5 py-0.5 text-xs transition-colors ${
                simActive ? "bg-amber-900/60 text-amber-400" : "bg-zinc-800 text-zinc-500 hover:text-zinc-300"
              }`}
            >
              ⏱
            </button>
          </div>
        </div>

        {/* Simulation panel */}
        {simActive && (
          <div className="mb-3 rounded-xl border border-amber-800/50 bg-amber-950/20 px-3 py-3 space-y-2">
            <p className="text-xs font-semibold text-amber-400">Zeitsimulation aktiv</p>
            <div className="flex gap-2">
              <select
                value={simDate}
                onChange={(e) => setSimDate(e.target.value)}
                className="flex-1 rounded-lg border border-amber-800/40 bg-zinc-900 px-2 py-2 text-sm text-amber-200 outline-none"
              >
                {SIM_DATES.map((d) => (
                  <option key={d.iso} value={d.iso}>{d.label}</option>
                ))}
              </select>
              <input
                type="time"
                value={simTimeVal}
                onChange={(e) => setSimTimeVal(e.target.value)}
                className="w-28 rounded-lg border border-amber-800/40 bg-zinc-900 px-2 py-2 text-sm text-amber-200 outline-none [color-scheme:dark]"
              />
            </div>
          </div>
        )}

        {/* Help panel */}
        {showHelp && (
          <div className="mb-3 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 space-y-2">
            <p className="text-sm font-semibold text-zinc-100">So funktioniert Plan B</p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-zinc-400 marker:text-zinc-600">
              <li><span className="text-zinc-300">Favoriten setzen</span> — im Programm-Tab Acts mit ♥ markieren.</li>
              <li><span className="text-zinc-300">Standort erlauben</span> — Plan B fragt einmalig nach GPS.</li>
              <li><span className="text-zinc-300">Erreichbarkeit prüfen</span> — ÖPNV-Fahrzeit zu bevorstehenden Favoriten (nächste 4 Std.).</li>
            </ol>
            <div className="flex flex-col gap-1 pt-1 text-xs">
              {[
                { cls: "bg-green-950/60 text-green-400", label: "grün", text: "≥ 15 min Puffer — entspannt erreichbar" },
                { cls: "bg-yellow-950/60 text-yellow-400", label: "gelb", text: "0–14 min Puffer — knapp, aber möglich" },
                { cls: "bg-red-950/60 text-red-400", label: "rot", text: "zu wenig Zeit — such Plan B!" },
              ].map(({ cls, label, text }) => (
                <div key={label} className="flex items-center gap-2">
                  <span className={`w-14 rounded px-1.5 py-0.5 text-center font-medium ${cls}`}>{label}</span>
                  <span className="text-zinc-400">{text}</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-zinc-500">
              Fahrzeiten alle 3 min aktualisiert. <strong className="text-zinc-400">Maps ↗</strong> öffnet die ÖPNV-Route.
            </p>
          </div>
        )}

        {/* Location picker */}
        <div className="flex items-center gap-2">
          {/* GPS status indicator */}
          {!manualLocationId && (
            <div className="text-xs shrink-0">
              {geoStatus === "loading" && <span className="text-zinc-500">⟳ GPS…</span>}
              {geoStatus === "success" && (
                <span className="text-green-500">● GPS{fetching ? " · lädt…" : ""}</span>
              )}
              {geoStatus === "error" && (
                <button onClick={retry} className="text-yellow-500">⚠ GPS fehlgeschlagen</button>
              )}
            </div>
          )}

          {/* Manual location select */}
          <select
            value={manualLocationId}
            onChange={(e) => setManualLocationId(e.target.value)}
            className="flex-1 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-300 outline-none"
          >
            <option value="">
              {geoStatus === "success" ? "📍 GPS aktiv" : "Standort manuell wählen…"}
            </option>
            <optgroup label="Leipzig">
              {MANUAL_LOCATIONS.slice(0, 2).map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </optgroup>
            <optgroup label="WGT-Venues">
              {MANUAL_LOCATIONS.slice(2).map((l) => (
                <option key={l.id} value={l.id}>{l.label}</option>
              ))}
            </optgroup>
          </select>
        </div>
      </div>

      {/* Upcoming entries */}
      <div className="px-4">
        {/* Near-term entries with travel time */}
        {entries.length > 0 && (
          <div className="mt-2 flex flex-col gap-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Nächste {LOOKAHEAD_HOURS} Stunden
            </p>
            {entries.map(({ appearance: a, location: loc, minutesUntilStart, travelMinutes, bufferMinutes, status }) => (
              <div key={a.id} className={`rounded-xl border px-4 py-3 ${statusColor(status)}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-zinc-100 leading-tight truncate">{a.band}</div>
                    <div className="mt-0.5 text-xs text-zinc-400">
                      {fmtTime(a.time)} · {a.location}
                    </div>
                    <div className="mt-1 text-xs text-zinc-500">
                      {travelMinutes !== null
                        ? `${travelMinutes} min Fahrt · noch ${minutesUntilStart} min`
                        : `noch ${minutesUntilStart} min`}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <span className={`text-sm font-bold ${statusColor(status).split(" ")[0]}`}>
                      {statusLabel(status, bufferMinutes)}
                    </span>
                    {loc && activePosition && (
                      <a
                        href={mapsLink(activePosition, loc)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rounded-full bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300 hover:bg-zinc-700"
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

        {/* All remaining future favorites */}
        {upcomingFavorites.length === 0 ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-900 p-4 text-center">
            <p className="text-sm text-zinc-400">Keine zukünftigen Favoriten.</p>
            {simActive && (
              <p className="mt-1 text-xs text-zinc-600">Andere Uhrzeit wählen oder mehr Favoriten setzen.</p>
            )}
          </div>
        ) : laterFavorites.length > 0 ? (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              {entries.length > 0 ? "Später" : "Alle Favoriten"}
            </p>
            {laterFavorites.map((a) => (
              <div key={a.id} className="flex items-center gap-3 border-t border-zinc-800/50 py-2">
                <span className="w-11 shrink-0 text-xs font-mono text-zinc-600">{fmtTime(a.time)}</span>
                <span className="flex-1 text-sm text-zinc-400 truncate">{a.band}</span>
                <span className="text-xs text-zinc-600">{a.date.slice(0, 5)}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}
