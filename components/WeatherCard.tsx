"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, MapPin, Snowflake, Sparkles, Sun, ThermometerSun } from "lucide-react";
import Link from "next/link";

interface Weather {
  temperatureC: number;
  mapped: "Hot" | "Warm" | "Cool" | "Cold" | "Rainy";
  location: string | null;
}

const ICONS: Record<Weather["mapped"], typeof Sun> = {
  Hot: ThermometerSun,
  Warm: Sun,
  Cool: Cloud,
  Cold: Snowflake,
  Rainy: CloudRain,
};

export default function WeatherCard() {
  const [weather, setWeather] = useState<Weather | null | undefined>(undefined); // undefined = loading
  const [cityInput, setCityInput] = useState("");
  const [editingCity, setEditingCity] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchByCity = async (city: string) => {
    setError(null);
    const res = await fetch(`/api/weather?city=${encodeURIComponent(city)}`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error ?? "Couldn't load weather");
      return;
    }
    setWeather(data);
    setEditingCity(false);
    await fetch("/api/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ location_city: data.location ?? city }),
    });
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) {
      setError("Location isn't available in this browser");
      return;
    }
    // Only fetched after explicit user action (tapping this button) - never automatic.
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        if (res.ok) setWeather(data);
        else setError(data.error ?? "Couldn't load weather");
      },
      () => setError("Location permission denied")
    );
  };

  useEffect(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then((data) => {
        const city = data.preferences?.location_city;
        if (city) return fetchByCity(city);
        setWeather(null);
      });
  }, []);

  if (weather === undefined) return null;

  if (!weather) {
    return (
      <div className="rounded-2xl p-4 border" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
        <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>Set your location for real-time weather styling</p>
        <div className="flex gap-2">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="City name"
            onKeyDown={(e) => e.key === "Enter" && cityInput && fetchByCity(cityInput)}
            className="flex-1 px-3 py-2 rounded-lg text-xs outline-none border"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <button onClick={useMyLocation} className="btn-outline px-3 py-2 text-xs flex items-center gap-1">
            <MapPin size={12} />
          </button>
        </div>
        {error && <p className="text-[10px] mt-2" style={{ color: "#ff6b6b" }}>{error}</p>}
      </div>
    );
  }

  const Icon = ICONS[weather.mapped];

  return (
    <div className="rounded-2xl p-4 border flex items-center justify-between" style={{ background: "var(--color-bg-2)", borderColor: "var(--color-border)" }}>
      <div>
        {editingCity ? (
          <input
            autoFocus
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cityInput && fetchByCity(cityInput)}
            onBlur={() => setEditingCity(false)}
            placeholder="City name"
            className="px-2 py-1 rounded text-xs outline-none border mb-1"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
        ) : (
          <button onClick={() => setEditingCity(true)} className="text-xs flex items-center gap-1 mb-1" style={{ color: "var(--color-text-muted)" }}>
            <MapPin size={10} /> {weather.location ?? "Change location"}
          </button>
        )}
        <p className="text-xl">
          {Math.round(weather.temperatureC)}°C <span className="text-sm" style={{ color: "var(--color-text-muted)" }}>{weather.mapped}</span>
        </p>
      </div>
      <div className="flex flex-col items-end gap-2">
        <Icon size={26} color="var(--color-accent)" />
        <Link href={`/generate?weather=${weather.mapped}`} className="text-[10px] flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
          <Sparkles size={10} /> Generate for today
        </Link>
      </div>
    </div>
  );
}
