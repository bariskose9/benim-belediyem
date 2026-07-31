# Çok aşamalı build (docs/standards/09-ci-cd-deploy.md).
#
# NOT: Vercel bu imajı KULLANMAZ — Vercel `next build` çıktısını kendisi çalıştırır.
# Bu dosya iki sebeple duruyor: başka bir sunucuya taşıma ihtiyacı doğarsa hazır
# olsun ve konteynerleştirme öğrenilsin (docs/standards/13-environments.md).

# ---------------------------------------------------------------------------
# 1) deps — bağımlılıklar ayrı katmanda: kaynak kod değişince yeniden kurulmaz
# ---------------------------------------------------------------------------
FROM node:24-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# `postinstall` betiği `prisma generate` çalıştırıyor; şema ve yapılandırma
# bu aşamada da bulunmalı, yoksa `npm ci` başarısız olur.
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

# ---------------------------------------------------------------------------
# 2) builder — Prisma istemcisini üret ve uygulamayı derle
# ---------------------------------------------------------------------------
FROM node:24-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# `next build` sırasında src/config/env.ts doğrulaması çalışır; bu değerler
# yalnızca derlemeyi geçirmek içindir, çalışma anında ortamdan gelenler kazanır.
ARG NEXT_PUBLIC_APP_URL=http://localhost:3000
ARG NEXT_PUBLIC_ENV_LABEL=local
ARG DATABASE_URL=postgresql://build:build@localhost:5432/build
ARG DIRECT_URL=postgresql://build:build@localhost:5432/build
# Adım 4a'dan itibaren zorunlu. Bu yer tutucular İMAJA GÖMÜLMEZ ve gizli
# değildir: ikisi de yalnızca sunucuda okunuyor, derleme çıktısına girmiyor
# (NEXT_PUBLIC_ öneki yok). Çalışma anında ortamdan gelen gerçek değerler kazanır.
ARG NATIONAL_ID_HASH_SALT=docker-build-placeholder-salt
ARG MOCK_KPS_API_KEY=docker-build-placeholder-key-at-least-32-chars
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_ENV_LABEL=$NEXT_PUBLIC_ENV_LABEL \
    DATABASE_URL=$DATABASE_URL \
    DIRECT_URL=$DIRECT_URL \
    NATIONAL_ID_HASH_SALT=$NATIONAL_ID_HASH_SALT \
    MOCK_KPS_API_KEY=$MOCK_KPS_API_KEY

RUN npx prisma generate
# `standalone` çıktısı yalnızca imaj için açılıyor: `next start` ile birlikte
# çalışmadığı için next.config.ts'te kalıcı olarak açık bırakılmadı.
RUN NEXT_OUTPUT=standalone npm run build

# ---------------------------------------------------------------------------
# 3) runner — yalnızca çalışması gerekenler, ROOT OLMAYAN kullanıcıyla
# ---------------------------------------------------------------------------
FROM node:24-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

# Root olarak çalıştırmak, kapta bir açık bulunursa saldırganın elini güçlendirir.
RUN addgroup -g 1001 -S nodejs && adduser -u 1001 -S nextjs -G nodejs

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nodejs /app/public ./public

USER nextjs
EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
