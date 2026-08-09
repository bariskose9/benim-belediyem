import { TrendingDownIcon, TrendingUpIcon, WalletIcon } from "lucide-react";

import { messages } from "@/config/messages";
import { cn } from "@/lib/utils";

import { getCryptoPrices, getExchangeRates } from "../services/info-widgets.service";
import { formatCoinPrice, formatPercent, formatRate, formatRateDate } from "../services/format";
import type { CryptoSnapshot, ExchangeRateSnapshot } from "../schemas/snapshots";
import type { WidgetResult } from "../types";
import { WidgetCard, WidgetErrorState } from "./WidgetCard";

/**
 * Piyasa kartı — döviz kurları + kripto (PRD §5.8).
 *
 * ⚠️ İKİ AYRI SAĞLAYICI, İKİ AYRI KADER. Frankfurter ve CoinGecko'nun ayrı
 * önbelleği, ayrı devre kesicisi ve ayrı hata durumu var. Biri çökerse
 * diğerinin verisi ekranda KALIR — tek bir "piyasa başarısız" durumu, çalışan
 * yarıyı da gereksiz yere gizlerdi.
 *
 * İki çağrı PARALEL: sıralı beklemek kartı iki sağlayıcının toplamı kadar
 * geciktirirdi.
 */

const copy = messages.infoWidgets.markets;

export async function MarketsWidget() {
  const [rates, crypto] = await Promise.all([getExchangeRates(), getCryptoPrices()]);

  // Kartın altındaki "ne zaman alındı" satırı taze olana göre yazılıyor; ikisi
  // de düştüyse zaten iki bölüm de kendi hata mesajını gösteriyor.
  const shown = rates.status === "ok" ? rates : crypto.status === "ok" ? crypto : null;

  return (
    <WidgetCard
      title={copy.title}
      icon={WalletIcon}
      headingId="widget-piyasa"
      fetchedAt={shown?.fetchedAt ?? null}
      isStale={shown?.isStale ?? false}
    >
      <RatesSection result={rates} />
      <CryptoSection result={crypto} />
    </WidgetCard>
  );
}

function RatesSection({ result }: { result: WidgetResult<ExchangeRateSnapshot> }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {copy.ratesHeading}
      </h4>

      {result.status === "error" ? (
        <WidgetErrorState />
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {result.data.rates.map((rate) => (
              <li key={rate.code} className="flex items-center gap-2 text-sm">
                <span className="min-w-16 font-medium">{copy.unit(rate.code)}</span>
                <span className="ml-auto tabular-nums">{formatRate(rate.tryPerUnit)}</span>
              </li>
            ))}
          </ul>
          {/* Kurun ANLIK OLMADIĞI açıkça yazıyor — ECB günde bir yayınlıyor. */}
          <p className="text-xs text-muted-foreground">
            {copy.rateDate(formatRateDate(result.data.date))}
          </p>
        </>
      )}
    </div>
  );
}

function CryptoSection({ result }: { result: WidgetResult<CryptoSnapshot> }) {
  return (
    <div className="flex flex-col gap-2">
      <h4 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {copy.cryptoHeading}
      </h4>

      {result.status === "error" ? (
        <WidgetErrorState />
      ) : (
        <ul className="flex flex-col gap-1.5">
          {result.data.coins.map((coin) => {
            const isUp = coin.changePercent24h >= 0;
            const TrendIcon = isUp ? TrendingUpIcon : TrendingDownIcon;
            const percent = formatPercent(coin.changePercent24h);

            return (
              <li key={coin.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
                <span className="min-w-16 font-medium">{coinName(coin.id)}</span>
                <span className="ml-auto tabular-nums">{formatCoinPrice(coin.tryPrice)}</span>

                {/*
                  YÖN YALNIZCA RENKLE ANLATILMIYOR (WCAG 2.1 AA): ok ikonu ve
                  ekran okuyucuya okunan tam cümle de var.
                */}
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex items-center gap-0.5 text-xs font-medium tabular-nums",
                    isUp ? "text-brand-accent" : "text-destructive",
                  )}
                >
                  <TrendIcon className="size-3.5" />
                  {percent}%
                </span>
                <span className="sr-only">
                  {isUp ? copy.changeUp(percent) : copy.changeDown(percent)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Bilinmeyen bir jeton eklenirse kimliği gösterilir — kart yine çalışır. */
function coinName(id: string): string {
  return id in copy.coins ? copy.coins[id as keyof typeof copy.coins] : id;
}
