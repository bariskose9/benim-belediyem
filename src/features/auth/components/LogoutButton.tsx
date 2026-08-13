"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";

/**
 * Çıkış düğmesi.
 *
 * `DELETE` isteğiyle oturum SUNUCUDA silinir (ADR-005). Yalnızca çerezi
 * silmek yetmezdi: jeton tarayıcıdan gitse bile veritabanındaki satır
 * yaşamaya devam eder ve ele geçirilmiş bir kopya 7 gün daha geçerli kalırdı.
 *
 * Bağlantı değil DÜĞME: çıkış durum değiştiren bir işlem, `GET` ile
 * tetiklenmemeli (önceden getirme ve tarayıcı eklentileri kullanıcıyı
 * habersiz çıkarabilir).
 */
export function LogoutButton() {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleClick() {
    setIsSubmitting(true);

    await apiRequest("/api/v1/sessions/current", { method: "DELETE" });

    // Ana sayfaya dön ve sunucu bileşenlerini tazele — menü ve korumalı
    // sayfalar oturum durumunu sunucuda okuyor.
    router.replace("/");
    router.refresh();
  }

  return (
    // `min-h-11`: dokunma hedefi en az 44x44px (07-ui-design-system.md).
    // Üst menüde durduğu için mobilde parmakla isabet edilebilmeli.
    <Button
      variant="outline"
      size="lg"
      className="min-h-11"
      onClick={handleClick}
      disabled={isSubmitting}
    >
      {isSubmitting ? messages.auth.logout.submitting : messages.auth.logout.submit}
    </Button>
  );
}
