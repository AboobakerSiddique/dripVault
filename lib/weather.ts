// Open-Meteo: free, no API key required (so there is no secret to ever
// leak client-side). Geocoding + forecast are separate free endpoints.
// Both calls happen server-side only - the browser never talks to
// Open-Meteo directly, per the "request through our application" requirement.

export type DripVaultWeather = "Hot" | "Warm" | "Cool" | "Cold" | "Rainy";

interface GeocodeResult {
  latitude: number;
  longitude: number;
  name: string;
}

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export async function geocodeCity(city: string): Promise<GeocodeResult | null> {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const first = data.results?.[0];
  if (!first) return null;
  return { latitude: first.latitude, longitude: first.longitude, name: first.name };
}

export interface CurrentWeather {
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
  precipitationProbability: number;
  weatherCode: number;
  mapped: DripVaultWeather;
}

// Maps real conditions onto dripVault's existing 5 weather modes - this
// is the ONLY integration point with the compatibility engine. The engine
// itself (lib/compatibility-engine.ts) is untouched; it just receives one
// of these 5 strings same as it does from the manual weather chips.
export function mapToDripVaultWeather(temperatureC: number, precipitationProbability: number, weatherCode: number): DripVaultWeather {
  if (precipitationProbability >= 50 || RAIN_CODES.has(weatherCode)) return "Rainy";
  if (temperatureC >= 30) return "Hot";
  if (temperatureC >= 20) return "Warm";
  if (temperatureC >= 10) return "Cool";
  return "Cold";
}

export async function fetchCurrentWeather(latitude: number, longitude: number): Promise<CurrentWeather | null> {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,apparent_temperature,relative_humidity_2m,precipitation_probability,weather_code`;
  const res = await fetch(url);
  if (!res.ok) return null;
  const data = await res.json();
  const current = data.current;
  if (!current) return null;

  const temperatureC = current.temperature_2m;
  const feelsLikeC = current.apparent_temperature ?? temperatureC;
  const humidityPercent = current.relative_humidity_2m ?? 0;
  const precipitationProbability = current.precipitation_probability ?? 0;
  const weatherCode = current.weather_code ?? 0;

  return {
    temperatureC,
    feelsLikeC,
    humidityPercent,
    precipitationProbability,
    weatherCode,
    mapped: mapToDripVaultWeather(temperatureC, precipitationProbability, weatherCode),
  };
}
