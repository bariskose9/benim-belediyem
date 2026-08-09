import {
  CloudDrizzleIcon,
  CloudFogIcon,
  CloudIcon,
  CloudLightningIcon,
  CloudRainIcon,
  CloudSnowIcon,
  CloudSunIcon,
  SunIcon,
  type LucideIcon,
} from "lucide-react";

import { messages } from "@/config/messages";

import { getWeather } from "../services/info-widgets.service";
import { formatDecimal, formatForecastDay, formatTemperature } from "../services/format";
import { describeWeatherCode, type WeatherIconKey } from "../services/weather-codes";
import { WidgetCard, WidgetErrorState } from "./WidgetCard";

/**
 * Hava durumu kartı — İzmir için güncel durum + 3 günlük tahmin (PRD §5.8).
 *
 * SUNUCU BİLEŞENİ: dış çağrı ve önbellek sunucuda; tarayıcıya yalnızca çizilmiş
 * HTML gidiyor. Anahtar gerektiren bir sağlayıcıya geçilse bile anahtar
 * istemciye çıkmaz.
 */

const copy = messages.infoWidgets.weather;

/** İkon eşlemesi ARAYÜZ KATMANINDA: `weather-codes.ts` React bilmiyor. */
const WEATHER_ICONS: Record<WeatherIconKey, LucideIcon> = {
  clear: SunIcon,
  partly: CloudSunIcon,
  cloudy: CloudIcon,
  fog: CloudFogIcon,
  drizzle: CloudDrizzleIcon,
  rain: CloudRainIcon,
  snow: CloudSnowIcon,
  thunder: CloudLightningIcon,
};

export async function WeatherWidget() {
  const result = await getWeather();

  if (result.status === "error") {
    return (
      <WidgetCard title={copy.title} icon={CloudSunIcon} headingId="widget-hava">
        <WidgetErrorState />
      </WidgetCard>
    );
  }

  const { current, days } = result.data;
  const condition = describeWeatherCode(current.code);
  const CurrentIcon = WEATHER_ICONS[condition.icon];

  return (
    <WidgetCard
      title={copy.title}
      icon={CloudSunIcon}
      headingId="widget-hava"
      fetchedAt={result.fetchedAt}
      isStale={result.isStale}
    >
      <div className="flex items-center gap-3">
        <CurrentIcon aria-hidden="true" className="size-10 shrink-0 text-brand-accent" />
        <div className="flex flex-col">
          {/*
            Sıcaklık KENDİ elemanında: çıplak metin düğümü olarak bırakılırsa
            en dar kapsayıcısının metni "37°İzmir" olur ve ne ekran okuyucu ne
            de test iki bilgiyi ayırabilir.
          */}
          <p className="text-2xl font-semibold">
            <span>{formatTemperature(current.temperatureC)}</span>
            <span className="ml-2 text-sm font-normal text-muted-foreground">{copy.city}</span>
          </p>
          <p className="text-sm text-muted-foreground">{condition.label}</p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">
        {copy.humidity(Math.round(current.humidityPercent))} ·{" "}
        {copy.wind(formatDecimal(current.windKmh, 0))}
      </p>

      <div className="flex flex-col gap-2">
        <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {copy.forecastHeading}
        </h4>

        {days.length === 0 ? (
          <p className="text-sm text-muted-foreground">{copy.empty}</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {days.map((day) => {
              const dayCondition = describeWeatherCode(day.code);
              const DayIcon = WEATHER_ICONS[dayCondition.icon];

              return (
                <li key={day.date} className="flex items-center gap-2 text-sm">
                  <DayIcon aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-24">{formatForecastDay(day.date)}</span>
                  {/* Görsel olarak kısa, ekran okuyucuya tam cümle. */}
                  <span aria-hidden="true" className="ml-auto tabular-nums">
                    {formatTemperature(day.maxC)} / {formatTemperature(day.minC)}
                  </span>
                  <span className="sr-only">
                    {copy.dayRange(formatTemperature(day.maxC), formatTemperature(day.minC))}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </WidgetCard>
  );
}
