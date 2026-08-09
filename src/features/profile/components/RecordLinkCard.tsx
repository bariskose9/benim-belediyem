import Link from "next/link";

/**
 * Profil merkezindeki tek kart — bir kayıt alanına ya da bir hesap ayarına
 * götüren kapı.
 *
 * TÜM KART TIKLANABİLİR, kart içindeki küçük bir bağlantı değil: dokunma hedefi
 * 44px'ten büyük olsun diye (07-ui-design-system.md) ve kullanıcı kartın
 * "içine girilebilir" olduğunu deneyerek öğrenmek zorunda kalmasın diye.
 *
 * `<h3>` KULLANILIYOR: kart sayfadaki bir `<h2>` bölümünün altında yaşıyor,
 * yani başlık düzeyi atlanmıyor (WCAG 2.1 AA · başlık hiyerarşisi).
 */
export type RecordLinkCardProps = {
  href: string;
  title: string;
  description: string;
  /** Adres/kart bölümlerinde "3 adres kayıtlı" gibi bir alt satır. */
  hint?: string;
};

export function RecordLinkCard({ href, title, description, hint }: RecordLinkCardProps) {
  return (
    <Link
      href={href}
      className="flex min-h-11 flex-col gap-1 rounded-xl bg-card p-4 ring-1 ring-foreground/10 transition-colors outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      <h3 className="font-heading text-lg font-semibold tracking-tight">{title}</h3>
      <p className="text-base text-muted-foreground">{description}</p>
      {hint ? <p className="text-base font-medium text-brand-accent">{hint}</p> : null}
    </Link>
  );
}
