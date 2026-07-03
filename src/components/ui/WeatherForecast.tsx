import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  apparentTemp: number;
  humidity: number;
  description: string;
  icon: string;
  locationName: string;
  iconColor: string;
  surfaceClassName: string;
  accentClassName: string;
}

const DEFAULT_WEATHER: WeatherData = {
  temp: 28,
  apparentTemp: 30,
  humidity: 72,
  description: 'Nắng nhẹ',
  icon: 'partly_cloudy_day',
  locationName: 'TP. HCM',
  iconColor: 'text-sky-500',
  surfaceClassName: 'from-sky-50 via-white to-rose-50',
  accentClassName: 'bg-sky-500',
};

function normalizeLocationName(value: string) {
  return value
    .replace(/^Thành phố\s+/i, 'TP. ')
    .replace(/^Tỉnh\s+/i, '')
    .replace(/^Quận\s+/i, 'Q. ')
    .replace(/^Huyện\s+/i, 'H. ')
    .trim();
}

function getWeatherTone(code: number) {
  if (code === 0) {
    return {
      description: 'Trời nắng',
      icon: 'wb_sunny',
      iconColor: 'text-amber-500',
      surfaceClassName: 'from-amber-50 via-white to-rose-50',
      accentClassName: 'bg-amber-400',
    };
  }
  if (code >= 1 && code <= 3) {
    return {
      description: 'Mây nhẹ',
      icon: 'partly_cloudy_day',
      iconColor: 'text-sky-500',
      surfaceClassName: 'from-sky-50 via-white to-indigo-50',
      accentClassName: 'bg-sky-500',
    };
  }
  if (code === 45 || code === 48) {
    return {
      description: 'Có sương mù',
      icon: 'foggy',
      iconColor: 'text-slate-500',
      surfaceClassName: 'from-slate-50 via-white to-zinc-50',
      accentClassName: 'bg-slate-400',
    };
  }
  if (code >= 51 && code <= 82) {
    return {
      description: code >= 80 ? 'Mưa rào' : 'Có mưa',
      icon: code >= 80 ? 'rainy_heavy' : 'rainy',
      iconColor: 'text-blue-600',
      surfaceClassName: 'from-blue-50 via-white to-indigo-50',
      accentClassName: 'bg-blue-500',
    };
  }
  if (code >= 95) {
    return {
      description: 'Giông bão',
      icon: 'thunderstorm',
      iconColor: 'text-violet-600',
      surfaceClassName: 'from-violet-50 via-white to-fuchsia-50',
      accentClassName: 'bg-violet-500',
    };
  }
  return DEFAULT_WEATHER;
}

export default function WeatherForecast({ compact }: { compact?: boolean }) {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchWeatherAndLocation(lat?: number, lon?: number) {
      try {
        let finalLat = lat;
        let finalLon = lon;
        let locationName = DEFAULT_WEATHER.locationName;

        try {
          const url = lat && lon
            ? `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=vi`
            : 'https://api.bigdatacloud.net/data/reverse-geocode-client?localityLanguage=vi';

          const geoRes = await fetch(url);
          const geoData = await geoRes.json();

          if (active) {
            locationName = normalizeLocationName(geoData.city || geoData.locality || geoData.principalSubdivision || DEFAULT_WEATHER.locationName);
            finalLat = finalLat ?? geoData.latitude;
            finalLon = finalLon ?? geoData.longitude;
          }
        } catch (error) {
          console.warn('Geocoding failed, falling back to default/GPS coords', error);
        }

        const queryLat = finalLat ?? 10.8231;
        const queryLon = finalLon ?? 106.6297;
        const res = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${queryLat}&longitude=${queryLon}&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code`
        );
        const data = await res.json();

        if (!active) return;

        const code = data.current?.weather_code ?? 0;
        const tone = getWeatherTone(code);
        setWeather({
          ...tone,
          temp: Math.round(data.current?.temperature_2m ?? DEFAULT_WEATHER.temp),
          apparentTemp: Math.round(data.current?.apparent_temperature ?? data.current?.temperature_2m ?? DEFAULT_WEATHER.apparentTemp),
          humidity: Math.round(data.current?.relative_humidity_2m ?? DEFAULT_WEATHER.humidity),
          locationName,
        });
      } catch {
        if (active) setWeather(DEFAULT_WEATHER);
      } finally {
        if (active) setLoading(false);
      }
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => fetchWeatherAndLocation(position.coords.latitude, position.coords.longitude),
        () => fetchWeatherAndLocation(),
        { maximumAge: 1000 * 60 * 15, timeout: 6000 }
      );
    } else {
      fetchWeatherAndLocation();
    }

    return () => {
      active = false;
    };
  }, []);

  const finalWeather = weather ?? DEFAULT_WEATHER;

  if (loading) {
    if (compact) {
      return (
        <div className="h-[52px] w-full max-w-[500px] rounded-2xl border border-white/75 bg-white/65 p-3 shadow-sm backdrop-blur-md flex items-center justify-between animate-pulse">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-slate-200" />
            <div className="space-y-1">
              <div className="h-3.5 w-20 rounded bg-slate-200" />
              <div className="h-2.5 w-12 rounded bg-slate-200" />
            </div>
          </div>
          <div className="h-6 w-10 rounded bg-slate-200" />
        </div>
      );
    }
    return (
      <div className="min-w-[250px] max-w-[300px] rounded-[1.45rem] border border-white/75 bg-white/65 p-1.5 shadow-sm backdrop-blur-md">
        <div className="grid grid-cols-[1fr_76px] gap-1.5">
          <div className="h-20 animate-pulse rounded-[1.05rem] bg-slate-100" />
          <div className="h-20 animate-pulse rounded-[1.05rem] bg-slate-100" />
          <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
          <div className="h-11 animate-pulse rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (compact) {
    return (
      <div className={`group relative w-full max-w-[360px] overflow-hidden rounded-2xl border border-white/75 bg-gradient-to-br ${finalWeather.surfaceClassName} px-3 py-2 shadow-sm backdrop-blur-md transition duration-300 flex items-center justify-between gap-2`}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-100">
            <span className={`material-symbols-outlined text-[20px] ${finalWeather.iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
              {finalWeather.icon}
            </span>
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-black leading-tight text-slate-800">{finalWeather.locationName}</p>
            <p className="hidden truncate text-[10px] font-bold text-slate-500 leading-none mt-0.5 sm:block">{finalWeather.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <p className="text-lg font-black leading-none text-slate-900">
              {finalWeather.temp}<span className="align-top text-xs text-sky-600">°C</span>
            </p>
          </div>
          <div className="hidden md:block text-left border-l border-slate-200/50 pl-3">
            <span className="block text-[9px] font-bold text-slate-400">Cảm giác</span>
            <span className="block text-xs font-black leading-tight text-slate-800">{finalWeather.apparentTemp}°C</span>
          </div>
          <div className="hidden lg:block text-left border-l border-slate-200/50 pl-3">
            <span className="block text-[9px] font-bold text-slate-400">Độ ẩm</span>
            <span className="block text-xs font-black leading-tight text-slate-800">{finalWeather.humidity}%</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`group relative min-w-[250px] max-w-[300px] overflow-hidden rounded-[1.45rem] border border-white/75 bg-gradient-to-br ${finalWeather.surfaceClassName} p-1.5 shadow-[0_14px_34px_rgba(148,163,184,0.14)] backdrop-blur-md transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(148,163,184,0.18)]`}>
      <div className={`absolute left-6 top-0 h-1 w-12 rounded-b-full ${finalWeather.accentClassName}`} />
      <div className="grid grid-cols-[1fr_76px] gap-1.5">
        <div className="rounded-[1.05rem] bg-white/78 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-white/75">
          <p className="truncate text-sm font-black leading-tight text-slate-800">{finalWeather.locationName}</p>
          <p className="mt-0.5 truncate text-[11px] font-bold text-slate-500">{finalWeather.description}</p>
          <p className="mt-2 text-[1.85rem] font-black leading-none text-slate-900">
            {finalWeather.temp}<span className="align-top text-sm text-sky-600">°C</span>
          </p>
        </div>

        <div className="flex flex-col items-center justify-center rounded-[1.05rem] bg-white/62 p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] ring-1 ring-white/65">
          <div className="flex size-11 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-slate-100">
            <span className={`material-symbols-outlined text-[26px] ${finalWeather.iconColor} transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6`}>
              {finalWeather.icon}
            </span>
          </div>
          <span className={`mt-1.5 h-1 w-9 rounded-full ${finalWeather.accentClassName}`} />
        </div>

        <div className="rounded-2xl bg-white/62 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] ring-1 ring-white/65">
          <span className="block text-[10px] font-bold text-slate-400">Cảm giác</span>
          <span className="block text-sm font-black leading-tight text-slate-800">{finalWeather.apparentTemp}°C</span>
        </div>
        <div className="rounded-2xl bg-white/62 px-3 py-1.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68)] ring-1 ring-white/65">
          <span className="block text-[10px] font-bold text-slate-400">Độ ẩm</span>
          <span className="block text-sm font-black leading-tight text-slate-800">{finalWeather.humidity}%</span>
        </div>
      </div>
    </div>
  );
}
