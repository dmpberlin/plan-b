"use client";

import { useState, useMemo } from "react";
import { Appearance, Location } from "@/types";
import { useFavorites } from "@/hooks/useFavorites";

const DAYS = [
  { label: "Fr 22.5", date: "22.05.2026" },
  { label: "Sa 23.5", date: "23.05.2026" },
  { label: "So 24.5", date: "24.05.2026" },
  { label: "Mo 25.5", date: "25.05.2026" },
];

function locationShort(name: string): string {
  return name
    .replace("Heidnisches Dorf / Torhaus Dölitz", "Torhaus Dölitz")
    .replace("Parkschloß - ", "Parkschloß ")
    .replace("Volkspalast ", "Volkspalast/");
}

export function ProgramView({
  appearances,
  locations,
}: {
  appearances: Appearance[];
  locations: Location[];
}) {
  const [activeDay, setActiveDay] = useState(DAYS[0].date);
  const [search, setSearch] = useState("");
  const { isFavorite, toggle, loaded } = useFavorites();

  const locationById = useMemo(() => {
    const map = new Map<string, Location>();
    for (const loc of locations) {
      for (const alias of loc.aliases) map.set(alias, loc);
    }
    return map;
  }, [locations]);

  const filtered = useMemo(() => {
    const dayActs = appearances.filter((a) => a.date === activeDay);
    if (!search.trim()) return dayActs;
    const q = search.toLowerCase();
    return dayActs.filter(
      (a) =>
        a.band.toLowerCase().includes(q) ||
        a.location.toLowerCase().includes(q)
    );
  }, [appearances, activeDay, search]);

  // Group by location
  const grouped = useMemo(() => {
    const map = new Map<string, Appearance[]>();
    for (const a of filtered) {
      const arr = map.get(a.location) ?? [];
      arr.push(a);
      map.set(a.location, arr);
    }
    // Sort each group by time
    for (const [, arr] of map) arr.sort((a, b) => a.isoDatetime.localeCompare(b.isoDatetime));
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [filtered]);

  const favoriteCount = useMemo(
    () => appearances.filter((a) => isFavorite(a.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appearances, isFavorite, loaded]
  );

  return (
    <div className="flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-zinc-950 pb-2 pt-4">
        <div className="px-4">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-lg font-semibold text-zinc-100">WGT 2026</h1>
            {favoriteCount > 0 && (
              <span className="rounded-full bg-rose-900/50 px-2 py-0.5 text-xs text-rose-400">
                {favoriteCount} ♥
              </span>
            )}
          </div>
          {/* Search */}
          <input
            type="search"
            placeholder="Suche Künstler oder Location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
          {/* Day tabs */}
          <div className="flex gap-1">
            {DAYS.map((d) => (
              <button
                key={d.date}
                onClick={() => setActiveDay(d.date)}
                className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-colors ${
                  activeDay === d.date
                    ? "bg-rose-900 text-rose-100"
                    : "bg-zinc-900 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Acts */}
      <div className="px-4 pb-24">
        {grouped.length === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            Keine Auftritte gefunden.
          </p>
        )}
        {grouped.map(([locName, acts]) => {
          const loc = locationById.get(locName);
          return (
            <div key={locName} className="mt-4">
              <div className="mb-2 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                  {locationShort(locName)}
                </span>
                {loc && (
                  <span className="text-xs text-zinc-600">{loc.address.split(",")[0]}</span>
                )}
              </div>
              <div className="flex flex-col gap-1">
                {acts.map((act) => (
                  <button
                    key={act.id}
                    onClick={() => toggle(act.id)}
                    className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                      isFavorite(act.id)
                        ? "bg-rose-950/60 ring-1 ring-rose-800"
                        : "bg-zinc-900 hover:bg-zinc-800"
                    }`}
                  >
                    <span className="w-10 shrink-0 text-xs font-mono text-zinc-500">
                      {act.time.replace(" Uhr", "")}
                    </span>
                    <span className="flex-1 text-sm text-zinc-100 leading-tight">
                      {act.band}
                    </span>
                    <span
                      className={`text-base transition-transform ${
                        isFavorite(act.id) ? "scale-110 text-rose-400" : "text-zinc-700"
                      }`}
                    >
                      ♥
                    </span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
