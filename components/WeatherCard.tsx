"use client";

import { useEffect, useState } from "react";
import { Cloud, CloudRain, MapPin, RefreshCw, Snowflake, Sparkles, Sun, ThermometerSun } from "lucide-react";
import Link from "next/link";
import HUDPanel from "@/components/hud/HUDPanel";

interface Weather {
  temperatureC: number;
  feelsLikeC: number;
  humidityPercent: number;
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
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [minutesAgo, setMinutesAgo] = useState(0);
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
    setFetchedAt(Date.now());
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
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const res = await fetch(`/api/weather?lat=${pos.coords.latitude}&lon=${pos.coords.longitude}`);
        const data = await res.json();
        if (res.ok) {
          setWeather(data);
          setFetchedAt(Date.now());
        } else setError(data.error ?? "Couldn't load weather");
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

  // Time-based display value computed in an effect (not during render) -
  // Date.now() is an impure call and React flags it if called inline.
  useEffect(() => {
    if (!fetchedAt) return;
    const update = () => setMinutesAgo(Math.max(0, Math.round((Date.now() - fetchedAt) / 60000)));
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, [fetchedAt]);

  if (weather === undefined) return null;

  if (!weather) {
    return (
      <HUDPanel className="p-4">
        <p className="tech-label mb-3">LOCATION NOT SET</p>
        <div className="flex gap-2">
          <input
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            placeholder="Enter city"
            onKeyDown={(e) => e.key === "Enter" && cityInput && fetchByCity(cityInput)}
            className="flex-1 px-3 py-2 rounded text-xs outline-none border mono"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
          <button onClick={useMyLocation} className="btn-outline px-3 py-2 text-xs flex items-center gap-1">
            <MapPin size={12} />
          </button>
        </div>
        {error && <p className="text-[10px] mt-2" style={{ color: "var(--color-danger)" }}>{error}</p>}
      </HUDPanel>
    );
  }

  const Icon = ICONS[weather.mapped];

  return (
    <HUDPanel className="p-4 hud-grid-bg">
      <div className="flex items-center justify-between mb-3">
        {editingCity ? (
          <input
            autoFocus
            value={cityInput}
            onChange={(e) => setCityInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && cityInput && fetchByCity(cityInput)}
            onBlur={() => setEditingCity(false)}
            placeholder="City name"
            className="px-2 py-1 rounded text-xs outline-none border mono"
            style={{ background: "var(--color-bg-1)", borderColor: "var(--color-border)", color: "var(--color-text)" }}
          />
        ) : (
          <button onClick={() => setEditingCity(true)} className="tech-label flex items-center gap-1.5">
            <MapPin size={11} color="var(--color-cyan)" /> {(weather.location ?? "SET LOCATION").toUpperCase()}
          </button>
        )}
        <Icon size={22} color="var(--color-accent)" />
      </div>

      <div className="flex items-end gap-2 mb-1">
        <p className="text-3xl" style={{ fontFamily: "var(--font-display)", color: "var(--color-accent)", textShadow: "0 0 20px rgba(157,140,255,0.4)" }}>
          {Math.round(weather.temperatureC)}°
        </p>
        <p className="tech-label mb-1.5">{weather.mapped.toUpperCase()}</p>
      </div>

      <p className="text-xs mb-3" style={{ color: "var(--color-text-muted)" }}>
        Feels like {Math.round(weather.feelsLikeC)}° · Humidity {weather.humidityPercent}%
      </p>

      <div className="hud-divider mb-2" />
      <div className="flex items-center justify-between">
        <button onClick={() => fetchByCity(weather.location ?? cityInput)} className="tech-label flex items-center gap-1">
          <RefreshCw size={10} /> UPDATE: {minutesAgo}M AGO
        </button>
        <Link href={`/generate?weather=${weather.mapped}`} className="tech-label flex items-center gap-1" style={{ color: "var(--color-accent)" }}>
          <Sparkles size={10} /> GENERATE FOR TODAY
        </Link>
      </div>
      {error && <p className="text-[10px] mt-2" style={{ color: "var(--color-danger)" }}>{error}</p>}
    </HUDPanel>
  );
}
