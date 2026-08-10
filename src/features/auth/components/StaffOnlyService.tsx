import { messages } from "@/config/messages";
import { AccessDeniedNotice } from "@/features/auth/components/AccessDeniedNotice";
import { guardPage } from "@/features/auth/services/page-guard";

/**
 * Personele özel hizmetlerin ortak iskeleti (PRD §5.0 erişim kademeleri).
 *
 * Hastane randevusu ve spor salonu üyeliği belediyenin PERSONEL sağlık birimi
 * ve personel spor tesisidir; vatandaşa açık değildir. Modüllerin kendisi
 * roadmap'te kendi adımlarında gelecek — bugün burada olan tek şey KAPI, ve
 * kapı gerçek: izinsiz kullanıcıya içerik render edilmiyor.
 *
 * İki sayfa aynı bileşeni kullanıyor çünkü kural ikisinde de birebir aynı;
 * iki kopya, birinin ileride yanlışlıkla gevşetilmesinin en kısa yolu olurdu.
 */
export async function StaffOnlyService({
  path,
  title,
  description,
}: {
  path: string;
  title: string;
  description: string;
}) {
  const guard = await guardPage("staff", path);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-8">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-base text-muted-foreground">{description}</p>
      </header>

      {guard.allowed ? (
        <p className="text-base text-muted-foreground">{messages.staffServices.comingSoon}</p>
      ) : (
        <AccessDeniedNotice decision={guard.decision} returnTo={path} />
      )}
    </main>
  );
}
