import { serverEnv } from "@/config/env";
import { messages } from "@/config/messages";

/**
 * Yasal sayfalarda görünen veri sorumlusu bilgisi (adım 17).
 *
 * ⛔ DEĞERLER KODA YAZILMAZ, ORTAMDAN GELİR (`LEGAL_CONTROLLER_NAME`,
 * `LEGAL_CONTACT_EMAIL`). Depo herkese açık; koda yazılan bir ad ve e-posta
 * adresi git geçmişinden çıkarılamaz ve toplayıcı botlara açık kalır. Veri
 * minimizasyonu proje sahibinin kendi verisi için de geçerlidir.
 *
 * ⛔ EKSİKSE SAYFA YİNE ÇİZİLİR: başvuru kanalı olarak kaynak kodu deposu
 * gösterilir. Hiç sayfa göstermemek, eksik bir başvuru kanalı göstermekten
 * daha kötü olurdu — KVKK aydınlatma yükümlülüğü "e-posta adresim yok" diye
 * ortadan kalkmıyor.
 */
export type DataController = {
  /** Gerçek ad tanımlıysa o, değilse tanımlayıcı bir ifade. */
  readonly displayName: string;
  /** Tanımlıysa başvuru e-postası. */
  readonly contactEmail?: string;
  /** Her hâlükârda çalışan ikinci kanal. */
  readonly repositoryUrl: string;
  /** Ad ortamdan mı geldi — sayfa "isim verilmemiş" durumunu ayırt edebilsin. */
  readonly isNamed: boolean;
};

export function resolveDataController(): DataController {
  const name = serverEnv.LEGAL_CONTROLLER_NAME;

  return {
    displayName: name ?? messages.legal.controller.unnamed,
    contactEmail: serverEnv.LEGAL_CONTACT_EMAIL,
    repositoryUrl: messages.footer.sourceCodeUrl,
    isNamed: Boolean(name),
  };
}
