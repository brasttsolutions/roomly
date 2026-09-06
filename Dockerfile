FROM node:22-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ENV NEXT_STANDALONE=true

# O Next embute toda variável `NEXT_PUBLIC_` no bundle durante o build, então
# elas precisam existir aqui e não só no contêiner que roda. Sem isso a imagem
# sai de pé e quebrada: o navegador fica sem chave do Supabase, o formulário de
# cartão do Mercado Pago não renderiza e o otimizador de imagens recusa as fotos
# das salas, porque `next.config.ts` monta o host permitido a partir da URL do
# projeto. Quem publica precisa passar cada uma como build arg.
ARG NEXT_PUBLIC_SUPABASE_URL
ARG NEXT_PUBLIC_SUPABASE_ANON_KEY
ARG NEXT_PUBLIC_APP_URL
ARG NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY
ARG NEXT_PUBLIC_SENTRY_DSN
ARG NEXT_PUBLIC_SENTRY_ENVIRONMENT
ARG NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
ENV NEXT_PUBLIC_SUPABASE_URL=$NEXT_PUBLIC_SUPABASE_URL \
    NEXT_PUBLIC_SUPABASE_ANON_KEY=$NEXT_PUBLIC_SUPABASE_ANON_KEY \
    NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL \
    NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=$NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY \
    NEXT_PUBLIC_SENTRY_DSN=$NEXT_PUBLIC_SENTRY_DSN \
    NEXT_PUBLIC_SENTRY_ENVIRONMENT=$NEXT_PUBLIC_SENTRY_ENVIRONMENT \
    NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE=$NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE

COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# O `server.js` do standalone usa `process.env.HOSTNAME || '0.0.0.0'`, e o Docker
# preenche HOSTNAME com o id do contêiner. Sem fixar, o servidor deixa de
# escutar em todas as interfaces e o proxy do host não alcança o app.
ENV HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
USER nextjs
EXPOSE 3000
# Vivacidade, não prontidão. `/api/ready` responde 503 de propósito enquanto a
# POC física da fechadura não for feita, então usá-la aqui marcaria o contêiner
# como doente para sempre e o orquestrador ficaria reiniciando um app saudável.
# `/api/ready` continua servindo para decidir se a operação pode ser aberta.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1
CMD ["node","server.js"]
