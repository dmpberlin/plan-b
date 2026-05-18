export interface Location {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  aliases: string[];
}

export interface Appearance {
  id: string;
  band: string;
  date: string;       // "22.05.2026"
  time: string;       // "17.00 Uhr"
  location: string;   // venue name as in data
  isoDatetime: string; // "2026-05-22T17:00:00"
}

export type ReachabilityStatus = "reachable" | "tight" | "missed" | "unknown";

export interface PlanBEntry {
  appearance: Appearance;
  location: Location;
  minutesUntilStart: number;
  travelMinutes: number | null;
  bufferMinutes: number | null;
  status: ReachabilityStatus;
}
