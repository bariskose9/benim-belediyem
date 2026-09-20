# VS Code eklentileri

<!-- ŞABLON — `docs/project/vscode-eklentileri.md` olarak kopyalanır; kurulan stack'e göre uyarlanır. -->

Projeyi VS Code'da açtığında sağ altta *"Bu projede önerilen eklentiler var"*
uyarısı çıkar → **Install All** de. Liste `.vscode/extensions.json` içinde.

Çıkmazsa: `Ctrl+Shift+P` → **Extensions: Show Recommended Extensions**

## Neden bunlar

### Stack'in çalışması için

| Eklenti | Ne için |
|---|---|
| **Claude Code** | Zaten şart |
| **Prisma** | `schema.prisma` dosyasını renklendirir ve biçimlendirir. Onsuz veri modeli yazmak çok zorlaşır |
| **ESLint** | Kit ESLint'i zorunlu tutuyor. Eklenti olmadan hatalar yalnızca terminalde görünür, kod yazarken değil |
| **Prettier** | Biçimlendirme. Kit zorunlu tutuyor |
| **Tailwind CSS IntelliSense** | Sınıf adlarını tamamlar, yanlış yazılanı gösterir |

### Hata görmeyi kolaylaştıranlar

| Eklenti | Ne yapar |
|---|---|
| **Pretty TypeScript Errors** | TypeScript'in uzun ve anlaşılmaz hata metinlerini okunabilir hâle getirir |
| **Error Lens** | Hatayı doğrudan satırın yanında gösterir |
| **GitLens** | Her satırın yanında son değiştiren kişiyi ve tarihi yazar |

### Test ve altyapı

| Eklenti | Ne için |
|---|---|
| **Containers** | Çalışan Docker konteynerlerini görmek, loglarına bakmak |
| **Playwright** | E2E testlerini arayüzden çalıştırmak |
| **Vitest** | Birim testlerini arayüzden çalıştırıp sonucu görmek |
| **REST Client** | API uçlarını tarayıcı açmadan denemek |
| **GitHub Actions** | CI dosyasını düzenlerken sözdizimi yardımı |

### Küçük kolaylıklar

**Path Intellisense** (dosya yolu tamamlama) ve **Auto Rename Tag** (JSX etiketi
değiştirince kapanışını da değiştirir).

## Gerekmeyenler

Temalar, **Live Server** (Next.js kendi sunucusunu çalıştırır),
**HTML CSS Support** (Tailwind kullanıldığı için gereksiz), renk önizleme ve
benzeri görsel eklentiler. Zevk meselesi — projeye etkisi yok.

## Elle kurmak istersen

VS Code terminalinde:

```
code --install-extension Prisma.prisma
code --install-extension dbaeumer.vscode-eslint
code --install-extension esbenp.prettier-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension yoavbls.pretty-ts-errors
code --install-extension usernamehw.errorlens
code --install-extension eamodio.gitlens
code --install-extension ms-azuretools.vscode-containers
code --install-extension ms-playwright.playwright
code --install-extension vitest.explorer
code --install-extension humao.rest-client
code --install-extension github.vscode-github-actions
code --install-extension christian-kohler.path-intellisense
code --install-extension formulahendry.auto-rename-tag
```

Bir kimlik hata verirse Extensions panelinden **adıyla** ara — kimlikler zamanla
değişebiliyor.

## Alternatif: Settings Sync

VS Code'un **Settings Sync** özelliği eklentileri hesabınla senkronlar.
Ayarlar → Turn on Settings Sync. Ancak iş makinesinde kişisel hesabını
bağlamak istemeyebilirsin; o durumda yukarıdaki liste yeterli.
