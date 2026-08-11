import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * CI iş akışlarının güvenlik kapıları (adım 18d, borç #99).
 *
 * NEDEN TEST, NEDEN SADECE KURAL DEĞİL: `09-ci-cd-deploy.md` "action'lar tam
 * commit SHA'sıyla sabitlenir" kuralını YAZIYORDU ve 11 `uses:` satırının
 * 11'i yine de etiketliydi. Yazılı kural, yeni bir satır eklendiğinde kimseyi
 * durdurmaz. Bu dosya kuralı bir kapıya çeviriyor: etiketle sabitlenmiş bir
 * action eklendiği anda CI kırmızıya döner.
 *
 * SALDIRI: etiket taşınabilir bir işaretçidir. Action'ın sahibi (veya deposunu
 * ele geçiren biri) `v6` etiketini başka bir commit'e çevirirse yapı bir
 * sonraki koşuda SESSİZCE farklı kod çalıştırır — ve o kod deponun tüm
 * sırlarına erişebilir. Tam SHA değişmez (immutable) bir işaretçidir.
 */

const WORKFLOW_DIR = ".github/workflows";

function readWorkflows(): { file: string; content: string }[] {
  return readdirSync(WORKFLOW_DIR)
    .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
    .map((file) => ({ file, content: readFileSync(join(WORKFLOW_DIR, file), "utf8") }));
}

/** `uses:` satırları — yerel action'lar (`./...`) hariç, onların SHA'sı yok. */
function externalUses(content: string): { line: string; lineNumber: number }[] {
  return content
    .split("\n")
    .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
    .filter(({ line }) => /^-?\s*uses:\s*[^.]/.test(line));
}

const workflows = readWorkflows();

describe("CI iş akışları — tedarik zinciri kapıları", () => {
  it("hiç değilse bir iş akışı dosyası bulunuyor", () => {
    // Kendini savunan test: klasör yolu değişirse aşağıdaki kapıların hepsi
    // boş listede dolaşıp SESSİZCE yeşil kalırdı.
    expect(workflows.length).toBeGreaterThan(0);
  });

  it.each(workflows)("$file — her action tam commit SHA'sıyla sabitlenmiş", ({ content }) => {
    const unpinned = externalUses(content).filter(
      ({ line }) => !/@[0-9a-f]{40}(\s|$)/.test(line.split("#")[0] ?? ""),
    );

    expect(unpinned.map(({ lineNumber, line }) => `${lineNumber}: ${line}`)).toEqual([]);
  });

  it.each(workflows)("$file — her SHA'nın yanında okunabilir sürüm yorumu var", ({ content }) => {
    // SHA insan için okunamaz. Yorum olmadan "hangi sürümdeyiz, güncelleme
    // gerekiyor mu" sorusu ancak GitHub'a bakarak cevaplanır.
    const missingComment = externalUses(content).filter(({ line }) => !/#\s*v\d+\.\d+/.test(line));

    expect(missingComment.map(({ lineNumber, line }) => `${lineNumber}: ${line}`)).toEqual([]);
  });

  it.each(workflows)("$file — açık bir permissions bloğu tanımlıyor", ({ content }) => {
    // Varsayılan `GITHUB_TOKEN` izinleri depo ayarına bağlıdır ve yazma
    // yetkisi verebilir. Açık blok, ayardan bağımsız olarak en az yetkiyi
    // dosyanın kendisine yazar.
    expect(content).toMatch(/^permissions:/m);
  });
});
