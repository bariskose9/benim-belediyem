"use client";

import { useRouter } from "next/navigation";
import { useCallback, useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  SUPPORT_ATTACHMENT_MAX_BYTES,
  SUPPORT_ATTACHMENT_MAX_COUNT,
  SUPPORT_DESCRIPTION_MAX_LENGTH,
  SUPPORT_DESCRIPTION_MIN_LENGTH,
  SUPPORT_SUBJECT_MAX_LENGTH,
  SUPPORT_SUBJECT_MIN_LENGTH,
} from "@/config/constants";
import { messages } from "@/config/messages";
import { apiRequest } from "@/features/auth/components/api-client";
import { FormAlert } from "@/features/auth/components/FormAlert";
import { TextField } from "@/features/auth/components/TextField";
import { TurnstileWidget } from "@/features/auth/components/TurnstileWidget";
import { ALLOWED_IMAGE_ACCEPT, ALLOWED_IMAGE_TYPES } from "@/lib/file-upload";
import { cn } from "@/lib/utils";

/**
 * Yeni destek talebi formu (PRD §5.7).
 *
 * ⛔ BURADAKİ KONTROLLER GÜVENLİK DEĞİL, KULLANICI DENEYİMİDİR. Adet, boyut ve
 * tür sunucuda yeniden — ve gerçekten — denetleniyor: burada `File.type`'a
 * bakılıyor, sunucuda BAYTLARIN İMZASINA (`file-upload.ts`). İstemcideki
 * kontrolün tek amacı, kullanıcıyı 2 MB'lık bir yükleme yapıp reddedilmekten
 * kurtarmak.
 *
 * DOSYALAR `useState` İÇİNDE TUTULUYOR, `<input>`'un kendisinde değil: seçilen
 * bir dosyayı listeden çıkarabilmek için tarayıcının `FileList` nesnesini
 * değiştirmek gerekir ve o salt okunurdur.
 */

const copy = messages.support.form;
const errors = messages.support.errors;

const MAX_SIZE_LABEL = `${Math.round(SUPPORT_ATTACHMENT_MAX_BYTES / (1024 * 1024))} MB`;

export type NewTicketFormProps = {
  turnstileSiteKey: string | undefined;
};

export function NewTicketForm({ turnstileSiteKey }: NewTicketFormProps) {
  const router = useRouter();
  const descriptionId = useId();
  const descriptionHelpId = `${descriptionId}-help`;
  const attachmentsId = useId();
  const attachmentsHelpId = `${attachmentsId}-help`;

  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // `useCallback` şart: `TurnstileWidget` bu geri çağrıyı efekt bağımlılığında
  // tutuyor, her render'da yeni bir fonksiyon vermek widget'ı yeniden çizerdi.
  const handleToken = useCallback((token: string) => setTurnstileToken(token), []);

  function selectFiles(selected: FileList | null) {
    if (!selected) return;

    const incoming = [...selected];

    if (files.length + incoming.length > SUPPORT_ATTACHMENT_MAX_COUNT) {
      setError(errors.tooManyAttachments(SUPPORT_ATTACHMENT_MAX_COUNT));

      return;
    }

    const tooLarge = incoming.find((file) => file.size > SUPPORT_ATTACHMENT_MAX_BYTES);

    if (tooLarge) {
      setError(errors.attachmentTooLarge(MAX_SIZE_LABEL));

      return;
    }

    const wrongType = incoming.find(
      (file) => !ALLOWED_IMAGE_TYPES.includes(file.type as (typeof ALLOWED_IMAGE_TYPES)[number]),
    );

    if (wrongType) {
      setError(errors.attachmentType);

      return;
    }

    setError(null);
    setFiles([...files, ...incoming]);
  }

  async function submit() {
    setError(null);
    setIsPending(true);

    const body = new FormData();
    body.set("subject", subject);
    body.set("description", description);
    body.set("turnstileToken", turnstileToken);
    files.forEach((file) => body.append("attachments", file));

    const result = await apiRequest<{ id: string }>("/api/support-tickets", {
      method: "POST",
      body,
    });

    setIsPending(false);

    if (!result.ok) {
      setError(result.message);

      return;
    }

    // Talep oluştu: form temizlenir ve kullanıcı yeni talebinin detayına
    // gider. `router.refresh()` yetmezdi — liste sunucuda çizilmiş durumda.
    setSubject("");
    setDescription("");
    setFiles([]);
    router.push(`/destek/${result.data.id}`);
  }

  return (
    <form
      className="flex flex-col gap-4 rounded-xl bg-card p-4 ring-1 ring-foreground/10"
      onSubmit={(event) => {
        event.preventDefault();
        void submit();
      }}
    >
      <h2 className="font-heading text-xl font-semibold tracking-tight">{copy.heading}</h2>

      <FormAlert message={error} />

      <TextField
        label={copy.subjectLabel}
        help={copy.subjectHint}
        name="subject"
        value={subject}
        required
        minLength={SUPPORT_SUBJECT_MIN_LENGTH}
        maxLength={SUPPORT_SUBJECT_MAX_LENGTH}
        autoComplete="off"
        onChange={(event) => setSubject(event.target.value)}
      />

      {/*
        Çok satırlı alan için ayrı bir bileşen eklenmedi: `TextField` tek satır
        için yazılmış ve tek kullanım için ikinci bir soyutlama üretmek YAGNI
        olurdu. Erişilebilirlik kuralları burada elle kuruluyor — görünür
        etiket, `aria-describedby` ve gerçek `minLength`/`maxLength`.
      */}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={descriptionId}>{copy.descriptionLabel}</Label>
        <textarea
          id={descriptionId}
          name="description"
          rows={6}
          required
          minLength={SUPPORT_DESCRIPTION_MIN_LENGTH}
          maxLength={SUPPORT_DESCRIPTION_MAX_LENGTH}
          value={description}
          aria-describedby={descriptionHelpId}
          onChange={(event) => setDescription(event.target.value)}
          className={cn(
            "w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 py-2 text-base",
            "transition-colors outline-none placeholder:text-muted-foreground",
            "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "md:text-sm dark:bg-input/30",
          )}
        />
        <p id={descriptionHelpId} className="text-sm text-muted-foreground">
          {copy.descriptionHint}
        </p>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={attachmentsId}>{copy.attachmentsLabel}</Label>
        <input
          id={attachmentsId}
          type="file"
          name="attachments"
          multiple
          accept={ALLOWED_IMAGE_ACCEPT}
          aria-describedby={attachmentsHelpId}
          disabled={files.length >= SUPPORT_ATTACHMENT_MAX_COUNT}
          onChange={(event) => {
            selectFiles(event.target.files);
            // Aynı dosya ikinci kez seçilebilsin diye alan sıfırlanıyor:
            // tarayıcı aynı değeri yeniden atadığında `change` tetiklenmez.
            event.target.value = "";
          }}
          className="min-h-11 w-full rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm file:mr-3 file:min-h-8 file:rounded-md file:border-0 file:bg-muted file:px-3 file:text-sm file:font-medium"
        />
        <p id={attachmentsHelpId} className="text-sm text-muted-foreground">
          {copy.attachmentsHint(SUPPORT_ATTACHMENT_MAX_COUNT, MAX_SIZE_LABEL)}
        </p>
      </div>

      {files.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${index}`}
              className="flex items-center justify-between gap-3 rounded-lg bg-muted px-3 py-2"
            >
              <span className="min-w-0 truncate text-sm">{file.name}</span>
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 shrink-0"
                aria-label={copy.removeAttachment(file.name)}
                onClick={() => setFiles(files.filter((_, position) => position !== index))}
              >
                ✕
              </Button>
            </li>
          ))}
        </ul>
      ) : null}

      <TurnstileWidget siteKey={turnstileSiteKey} onToken={handleToken} />

      <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={isPending}>
        {isPending ? copy.submitting : copy.submit}
      </Button>
    </form>
  );
}
