import type { Metadata } from "next";
import Link from "next/link";

import { messages } from "@/config/messages";

/**
 * Hesap silindikten sonra açılan HERKESE AÇIK sayfa.
 *
 * ═══ NEDEN GİRİŞ GEREKTİRMİYOR ═══
 * Bu sayfaya gelen kullanıcının oturumu az önce kapandı. `guardPage` konsaydı
 * kullanıcı, hesabını sildiği anda giriş ekranına atılırdı ve neyin
 * saklandığını hiç okuyamazdı.
 *
 * ═══ NEDEN LİSTE BURADA TEKRARLANIYOR ═══
 * KVKK Yönetmeliği m.12/1-c: kısmen karşılanan silme talebi, gerekçesi
 * açıklanarak BİLDİRİLİR. Silme öncesi ekranda gösterildi; burada bir kez daha
 * gösteriliyor çünkü kullanıcı o an karar vermeye odaklıydı ve okuduğunu
 * hatırlamayabilir. Aynı listenin tek kaynağı `messages.account.deletion` —
 * iki yerde ayrı yazılsaydı biri güncellendiğinde diğeri yanlış kalırdı.
 *
 * ⛔ SAYFA HİÇBİR VERİ OKUMUYOR. Adres çubuğuna elle yazan biri de aynı
 * metni görüyor; "hangi hesap silindi" bilgisi burada yok ve olmamalı.
 */
export const metadata: Metadata = {
  title: messages.account.farewell.pageTitle,
  // Silme onay sayfasının arama sonuçlarında çıkmasının hiçbir anlamı yok.
  robots: { index: false, follow: false },
};

const copy = messages.account.farewell;
const deletionCopy = messages.account.deletion;

export default function AccountDeletedPage() {
  return (
    <main className="page-shell flex flex-col gap-6 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-3xl font-bold tracking-tight">{copy.title}</h1>
        <p className="max-w-prose text-base text-muted-foreground">{copy.description}</p>
      </header>

      <section
        aria-labelledby="saklananlar"
        className="flex flex-col gap-2 rounded-xl bg-card p-5 ring-1 ring-foreground/10"
      >
        <h2 id="saklananlar" className="font-heading text-xl font-semibold tracking-tight">
          {deletionCopy.retained.heading}
        </h2>
        <ul className="flex list-disc flex-col gap-2 pl-5 text-base text-muted-foreground">
          {deletionCopy.retained.items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      </section>

      <p className="max-w-prose text-base text-muted-foreground">{deletionCopy.reRegisterNotice}</p>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-lg bg-primary px-4 font-medium text-primary-foreground"
        >
          {copy.home}
        </Link>
        <Link
          href="/kayit"
          className="inline-flex min-h-11 items-center rounded-lg px-4 font-medium text-primary underline underline-offset-4"
        >
          {copy.register}
        </Link>
      </div>
    </main>
  );
}
