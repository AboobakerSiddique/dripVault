import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { fetchCurrentWeather, geocodeCity } from "@/lib/weather";

function log(context: string, detail: Record<string, unknown>) {
  console.log(`[weather] ${context}`, detail);
}
function logError(context: string, detail: Record<string, unknown>) {
  console.error(`[weather:error] ${context}`, detail);
}

// GET /api/weather?city=... or ?lat=&lon=
// The client never calls Open-Meteo directly, and there's no API key to
// protect (Open-Meteo requires none) - this route exists so weather
// fetching stays centralized and loggable, and so a keyed provider could
// be swapped in later (via WEATHER_API_KEY) without any client change.
export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const city = searchParams.get("city");
  const lat = searchParams.get("lat");
  const lon = searchParams.get("lon");

  let latitude: number, longitude: number, resolvedName: string | undefined;

  try {
    if (lat && lon) {
      latitude = parseFloat(lat);
      longitude = parseFloat(lon);
    } else if (city) {
      const geo = await geocodeCity(city);
      if (!geo) {
        log("geocode_not_found", { userId: user.id, city });
        return NextResponse.json({ error: `Couldn't find "${city}"` }, { status: 404 });
      }
      latitude = geo.latitude;
      longitude = geo.longitude;
      resolvedName = geo.name;
    } else {
      return NextResponse.json({ error: "Provide city or lat/lon" }, { status: 400 });
    }

    const weather = await fetchCurrentWeather(latitude, longitude);
    if (!weather) {
      logError("forecast_fetch_failed", { userId: user.id, latitude, longitude });
      return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
    }

    log("fetched", {
      userId: user.id,
      source: resolvedName ?? `${latitude},${longitude}`,
      temperature: weather.temperatureC,
      condition: weather.weatherCode,
      mappedWeather: weather.mapped,
    });

    return NextResponse.json({ ...weather, location: resolvedName ?? null });
  } catch (err) {
    logError("unexpected_failure", { userId: user.id, message: err instanceof Error ? err.message : String(err) });
    return NextResponse.json({ error: "Weather service unavailable" }, { status: 502 });
  }
}
