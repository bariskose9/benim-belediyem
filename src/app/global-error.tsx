"use client";

import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

import { messages } from "@/config/messages";

import "./globals.css";

/**
 * KÖK hata sınırı — yalnızca `layout.tsx`'in KENDİSİ patladığında çizilir
 * (docs/standards/10-definition-of-done.md "her ekranda hata durumu").
 *
 * ⛔ NEDEN KENDİ `<html>` VE `<body>` ETİKETLERİ VAR: bu bileşen kök
 * yerleşimin YERİNE geçiyor, içine değil. Etiketler olmazsa sayfa hiç
 * çizilmez ve kullanıcı boş beyaz ekran görür — `12-operations-and-scaling.md`
 * "boş beyaz ekran bırakılmaz" diyor.
 *
 * ⛔ NEDEN TASARIM BİLEŞENLERİ KULLANILMIYOR: buraya düşüldüğünde yerleşimin
 * zaten patladığı biliniyor. `SiteHeader` veya `Alert` çağırmak, aynı arızanın
 * bu ekranı da düşürme riskini taşır. Satır içi ve bağımsız tutuldu.
 */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => {
    /**
     * ⭐ Yerleşim hataları Next.js tarafından kendi sınırında yutuluyor ve
     * `onRequestError` bunları GÖRMÜYOR — istemcide çizilen bir hata sınırı
     * sunucu kancasına düşmez. Bu çağrı olmasaydı en ağır arıza sınıfı
     * (tüm sayfanın açılmaması) hata takibinde hiç görünmezdi.
     */
    Sentry.captureException(error);
  }, [error]);

  /**
   * ⛔ YAZI TİPİ SİSTEM YIĞINIYLA VERİLİYOR, `next/font` İLE DEĞİL.
   *
   * Tarayıcıda ölçüldü: kök yerleşim çizilmediği için `--font-sans` değişkeni
   * tanımsız kalıyor ve Tailwind'in `font-sans` sınıfı serif'e düşüyordu.
   *
   * Çözüm olarak buraya `next/font` eklemek YANLIŞ olurdu: bu ekran tam da
   * bir şeyler bozulduğunda çiziliyor, yani hiçbir dış kaynağa bağlı olmamalı.
   * Sistem yığını hiçbir şey indirmez ve her zaman çizilir.
   *
   * ⚠️ Aynı sebeple bu ekran TEMAYA DUYARLI DEĞİL: tema sınıfını uygulayan
   * script de kök yerleşimde. Koyu tema kullanıcısı burada açık tema görür.
   * Kabul edildi — acil durum ekranının okunabilir olması, temaya uymasından
   * önemli.
   */
  const systemFont =
    'ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';

  return (
    <html lang="tr">
      <body
        style={{ fontFamily: systemFont }}
        className="flex min-h-dvh items-center justify-center bg-background p-6 text-foreground"
      >
        <main className="flex max-w-md flex-col items-start gap-4">
          <h1 className="text-2xl font-semibold">{messages.errors.unexpectedTitle}</h1>
          {/* İç detay (stack, SQL, dosya yolu) kullanıcıya GÖSTERİLMEZ. */}
          <p className="text-base text-muted-foreground">{messages.errors.unexpected}</p>
          {/*
            ⛔ BİLEREK `<Link>` DEĞİL DÜZ `<a>`.
            ESLint burada `next/link` öneriyor ama bu ekran kök yerleşim
            çöktüğünde çiziliyor; istemci tarafı yönlendirici de bozuk olabilir.
            `<Link>` sayfayı yeniden YÜKLEMEDEN gezindiği için kullanıcıyı aynı
            bozuk durumda bırakabilirdi. Düz bağlantı tam sayfa yükleme yapıyor
            ve uygulamayı sıfırdan ayağa kaldırıyor — burada istenen tam da bu.
          */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a
            href="/"
            className="inline-flex min-h-11 items-center rounded-md bg-primary px-4 text-base text-primary-foreground"
          >
            Ana sayfaya dön
          </a>
        </main>
      </body>
    </html>
  );
}
