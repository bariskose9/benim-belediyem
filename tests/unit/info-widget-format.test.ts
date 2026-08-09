/**
 * @vitest-environment node
 */
import { describe, expect, it } from "vitest";

import {
  formatCoinPrice,
  formatForecastDay,
  formatPercent,
  formatRate,
  formatRateDate,
  formatTemperature,
} from "@/features/info-widgets/services/format";
import { describeWeatherCode } from "@/features/info-widgets/services/weather-codes";

/**
 * Widget sayılarının ve hava kodlarının GÖSTERİM tarafı.
 *
 * Saf fonksiyonlar oldukları için doğrudan sınanıyorlar; ekran üzerinden test
 * etmek aynı kuralı çok daha kırılgan biçimde ölçerdi.
 *
 * ⛔ BURADAKİ SAYILAR PARA DEĞİL. Para tutarları tam sayı kuruş olarak tutulur
 * ve `money.test.ts` onları ayrıca sınıyor.
 */

describe("sayı biçimlendirme", () => {
  it("sıcaklığı tam sayıya yuvarlar", () => {
    expect(formatTemperature(37.2)).toBe("37°");
    expect(formatTemperature(-3.6)).toBe("-4°");
  });

  it("kuru dört haneli ve Türkçe ondalık ayıracıyla yazar", () => {
    // Kur küçük değişimlerle anlam kazanıyor; iki hane "değişmedi" izlenimi verirdi.
    expect(formatRate(47.70992)).toBe("47,7099 ₺");
  });

  it("kripto fiyatını binlik ayraçla ve kuruşsuz yazar", () => {
    expect(formatCoinPrice(3_096_909.4)).toBe("3.096.909 ₺");
  });

  it("yüzdeyi İŞARETSİZ verir — yön ayrıca metinle söyleniyor", () => {
    expect(formatPercent(-0.0777)).toBe("0,08");
    expect(formatPercent(1.25)).toBe("1,25");
  });
});

describe("tarih biçimlendirme", () => {
  it("tahmin gününü kısa etiketе çevirir", () => {
    // Gün ortasına sabitleniyor; 00:00 UTC okunsaydı İstanbul'da bir önceki
    // gün olur ve etiket bir gün geriye kayardı.
    expect(formatForecastDay("2026-08-10")).toBe("10 Ağu Pzt");
  });

  it("kur tarihini tam yazar", () => {
    expect(formatRateDate("2026-08-07")).toBe("7 Ağustos 2026");
  });

  it("bozuk tarihi olduğu gibi bırakır, patlamaz", () => {
    expect(formatForecastDay("tarih değil")).toBe("tarih değil");
    expect(formatRateDate("")).toBe("");
  });
});

describe("WMO hava kodu", () => {
  it("bilinen kodları Türkçeye çevirir", () => {
    expect(describeWeatherCode(0)).toEqual({ label: "Açık", icon: "clear" });
    expect(describeWeatherCode(3)).toEqual({ label: "Çok bulutlu", icon: "cloudy" });
    expect(describeWeatherCode(95)).toEqual({ label: "Gök gürültülü fırtına", icon: "thunder" });
  });

  it("sağanak ve kar kodlarını doğru aileye koyar", () => {
    expect(describeWeatherCode(82).icon).toBe("rain");
    expect(describeWeatherCode(86).icon).toBe("snow");
  });

  it("tanınmayan kod için NÖTR bir karşılık döner", () => {
    // Sağlayıcı tabloya yeni bir kod eklerse widget'ın çökmesi kabul edilemez.
    expect(describeWeatherCode(1234)).toEqual({ label: "Bilinmiyor", icon: "cloudy" });
  });
});
