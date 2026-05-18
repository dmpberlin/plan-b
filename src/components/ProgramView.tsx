"use client";

import { useState, useMemo, useRef, useEffect, useCallback } from "react";
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
  const dayRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const isScrollingRef = useRef(false);

  const locationByAlias = useMemo(() => {
    const map = new Map<string, Location>();
    for (const loc of locations) {
      for (const alias of loc.aliases) map.set(alias, loc);
    }
    return map;
  }, [locations]);

  // Group all appearances by day → location → acts
  const byDay = useMemo(() => {
    const q = search.trim().toLowerCase();
    return DAYS.map(({ date }) => {
      const dayActs = appearances.filter((a) => {
        if (a.date !== date) return false;
        if (!q) return true;
        return a.band.toLowerCase().includes(q) || a.location.toLowerCase().includes(q);
      });
      const locMap = new Map<string, Appearance[]>();
      for (const a of dayActs) {
        const arr = locMap.get(a.location) ?? [];
        arr.push(a);
        locMap.set(a.location, arr);
      }
      for (const arr of locMap.values())
        arr.sort((a, b) => a.isoDatetime.localeCompare(b.isoDatetime));
      return {
        date,
        groups: [...locMap.entries()].sort(([a], [b]) => a.localeCompare(b)),
      };
    });
  }, [appearances, search]);

  // IntersectionObserver: update active tab as day headers scroll into view
  useEffect(() => {
    const observers: IntersectionObserver[] = [];
    DAYS.forEach(({ date }) => {
      const el = dayRefs.current[date];
      if (!el) return;
      const obs = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !isScrollingRef.current) {
            setActiveDay(date);
          }
        },
        { rootMargin: "-80px 0px -60% 0px", threshold: 0 }
      );
      obs.observe(el);
      observers.push(obs);
    });
    return () => observers.forEach((o) => o.disconnect());
  }, [byDay]);

  const scrollToDay = useCallback((date: string) => {
    const el = dayRefs.current[date];
    if (!el) return;
    setActiveDay(date);
    isScrollingRef.current = true;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => { isScrollingRef.current = false; }, 800);
  }, []);

  const favoriteCount = useMemo(
    () => appearances.filter((a) => isFavorite(a.id)).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [appearances, isFavorite, loaded]
  );

  const totalResults = useMemo(
    () => byDay.reduce((sum, d) => sum + d.groups.reduce((s, [, a]) => s + a.length, 0), 0),
    [byDay]
  );

  return (
    <div className="flex flex-col">
      {/* Sticky header */}
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
          <input
            type="search"
            placeholder="Suche Künstler oder Location…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-3 w-full rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 placeholder-zinc-500 outline-none focus:border-zinc-600"
          />
          {/* Day tabs — now act as jump links */}
          <div className="flex gap-1">
            {DAYS.map((d) => (
              <button
                key={d.date}
                onClick={() => scrollToDay(d.date)}
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

      {/* All days in one continuous scroll */}
      <div className="px-4 pb-24">
        {search && totalResults === 0 && (
          <p className="mt-8 text-center text-sm text-zinc-500">
            Keine Auftritte gefunden.
          </p>
        )}

        {byDay.map(({ date, groups }) => {
          const day = DAYS.find((d) => d.date === date)!;
          if (search && groups.length === 0) return null;
          return (
            <div
              key={date}
              ref={(el) => { dayRefs.current[date] = el; }}
              // scroll-mt so sticky header doesn't cover section
              className="scroll-mt-36"
            >
              {/* Day separator */}
              <div className="mt-6 mb-3 flex items-center gap-3">
                <span className="text-sm font-bold text-zinc-200">{day.label}</span>
                <div className="h-px flex-1 bg-zinc-800" />
              </div>

              {groups.map(([locName, acts]) => {
                const loc = locationByAlias.get(locName);
                return (
                  <div key={locName} className="mt-4">
                    <div className="mb-2 flex items-center gap-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
                        {locationShort(locName)}
                      </span>
                      {loc && (
                        <span className="text-xs text-zinc-600">
                          {loc.address.split(",")[0]}
                        </span>
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
          );
        })}
      </div>
    </div>
  );
}
