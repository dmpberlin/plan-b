import { NextRequest } from "next/server";

interface Destination {
  locationId: string;
  lat: number;
  lng: number;
}

interface RequestBody {
  origin: { lat: number; lng: number };
  destinations: Destination[];
  departureTime: number; // Unix timestamp
}

export async function POST(request: NextRequest) {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return Response.json({ error: "Google Maps API key not configured." }, { status: 500 });
  }

  const body: RequestBody = await request.json();
  const { origin, destinations, departureTime } = body;

  if (!origin || !destinations?.length) {
    return Response.json({ error: "Missing origin or destinations." }, { status: 400 });
  }

  const originStr = `${origin.lat},${origin.lng}`;
  const destinationsStr = destinations.map((d) => `${d.lat},${d.lng}`).join("|");

  const url = new URL("https://maps.googleapis.com/maps/api/distancematrix/json");
  url.searchParams.set("origins", originStr);
  url.searchParams.set("destinations", destinationsStr);
  url.searchParams.set("mode", "transit");
  url.searchParams.set("departure_time", String(departureTime));
  url.searchParams.set("key", apiKey);

  const resp = await fetch(url.toString());
  if (!resp.ok) {
    return Response.json({ error: "Google Maps API error." }, { status: 502 });
  }

  const data = await resp.json();
  if (data.status !== "OK") {
    return Response.json({ error: `Google Maps: ${data.status}` }, { status: 502 });
  }

  const elements = data.rows[0]?.elements ?? [];
  const result: Record<string, number | null> = {};

  destinations.forEach((dest, i) => {
    const el = elements[i];
    result[dest.locationId] = el?.status === "OK" ? el.duration.value : null;
  });

  return Response.json(result);
}
