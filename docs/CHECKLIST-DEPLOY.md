# Checklist de deploy (Stock Center 2.0)

Os preços e limites dos provedores mudam: sempre confira os links oficiais (Vercel, Neon, Resend, Stripe) antes do deploy.

---

## 1. Decisões de arquitetura

- [ ] **Onde hospedar** (Vercel, Railway, Render, VPS, etc.) e se o plano gratuito cobre builds, banda e tempo de função.
- [ ] **Banco de dados**: **PostgreSQL no Neon** (Prisma `provider = "postgresql"`). Defina **`DATABASE_URL`** (conexão *pooled*) e **`DIRECT_URL`** (conexão *direct*) conforme o painel Neon — ver `.env.example`.
- [ ] **Domínio** `.com.br` ou outro registrado e **DNS** apontando para o host (A/CNAME conforme documentação do provedor).

---

## 2. Variáveis de ambiente (produção)

Copie de `.env.example` e preencha no painel do host. Nunca commite segredos.

### Obrigatórias para o app “funcionar” com banco e auth

- [ ] `DATABASE_URL` — Postgres com pool (Neon “Pooled”; recomendado na Vercel).
- [ ] `DIRECT_URL` — Postgres sem pooler (Neon “Direct”; usado pelo Prisma em `migrate`).
- [ ] `AUTH_SECRET` — string longa e aleatória (não use o default de desenvolvimento).
- [ ] `NEXT_PUBLIC_APP_URL` — URL pública **https** do site (exigido em produção para Stripe e links de e-mail).

### Pagamentos (Stripe)

- [ ] `STRIPE_SECRET_KEY` — chave **live** em produção (`sk_live_...`).
- [ ] `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — chave **live** (`pk_live_...`).
- [ ] `STRIPE_WEBHOOK_SECRET` — segredo do endpoint de webhook configurado no Dashboard Stripe apontando para `/api/webhooks/stripe` na URL pública.

### E-mail (Resend)

- [ ] `RESEND_API_KEY`
- [ ] `RESEND_FROM_EMAIL` — domínio verificado no Resend.
- [ ] `CONTACT_INBOX_EMAIL` (opcional) — cópia de contato/newsletter.

### Frete (Melhor Envio) — opcional

Sem `MELHOR_ENVIO_TOKEN` + `SHIPPING_ORIGIN_POSTAL_CODE` válidos, o site usa **fallback** de frete (ver código).

- [ ] `MELHOR_ENVIO_TOKEN`
- [ ] `SHIPPING_ORIGIN_POSTAL_CODE` (8 dígitos, CEP de postagem)
- [ ] `MELHOR_ENVIO_CONTACT_EMAIL` (User-Agent da API)
- [ ] `SHIPPING_DEFAULT_*` — dimensões/peso/seguro padrão na cotação (ver `.env.example`)
- [ ] `SHIPPING_QUOTE_STRATEGY` (opcional) — `cheapest` (padrão) ou `service_id:<n>` para forçar um serviço ME na cotação opaca do checkout

### Cron (expiração de pedidos Pix reservados)

Não use `vercel.json` para este job (cron integrado da Vercel no Hobby é no máximo 1x/dia). Use **cron no VPS** ou **serviço externo** (ex.: cron-job.org) chamando a URL pública do app.

- [ ] Agendar `GET` ou `POST` em `https://SEU_DOMINIO/api/jobs/pix-expiration` (ex.: a cada 5 minutos).
- [ ] `CRON_SECRET` — **obrigatório em produção**; o job exige header `Authorization: Bearer <CRON_SECRET>` (ver `.env.example`).

### Opcionais de produto / marketing

- [ ] `NEXT_PUBLIC_STORE_LEGAL_NAME`, `NEXT_PUBLIC_STORE_CNPJ`
- [ ] `NEXT_PUBLIC_GA_MEASUREMENT_ID` (GA4)
- [ ] `NEXT_PUBLIC_INSTAGRAM_IMAGE_URLS`
- [ ] `NEXT_PUBLIC_HERO_MARKETING_VIDEO_URL` ou `NEXT_PUBLIC_HERO_MARKETING_VIDEO_URLS`
- [ ] `NEXT_PUBLIC_PICKUP_INSTRUCTIONS` (retirada na loja)

### Login social (NextAuth) — opcional

Só habilita se **ambas** as variáveis do provedor estiverem definidas:

- [ ] Google: `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`
- [ ] Facebook: `AUTH_FACEBOOK_ID`, `AUTH_FACEBOOK_SECRET`
- [ ] Apple: `AUTH_APPLE_ID`, `AUTH_APPLE_SECRET`

Em cada console de OAuth, configure a **URL de callback** do NextAuth (ex.: `https://SEU_DOMINIO/api/auth/callback/google`).

---

## 3. Contas e consoles externos

- [ ] **Stripe**: conta ativada, métodos de pagamento (Pix/cartão) habilitados, modo **Live**, webhooks com URL de produção.
- [ ] **Resend**: domínio adicionado, registros **SPF/DKIM** no DNS concluídos e verificados.
- [ ] **Melhor Envio**: conta, transportadoras conectadas, token de API gerado (se usar cotação real).
- [ ] **Neon**: projeto criado, strings **Pooled** e **Direct** copiadas para `DATABASE_URL` e `DIRECT_URL` (Vercel e `.env` local).
- [ ] **Registro.br / registrador**: domínio e DNS corretos.

---

## 4. Build e release

- [ ] **Vercel / CI**: definir `DATABASE_URL` e `DIRECT_URL` antes do build (Neon: **Pooled** → `DATABASE_URL`, **Direct** → `DIRECT_URL`). Sem `DIRECT_URL`, o build tenta derivar da pooled (Neon); o ideal é cadastrar as duas em **Project → Settings → Environment Variables** (Production + Preview se usar o mesmo banco).
- [ ] **Build na Vercel**: o script `npm run build` executa **`prisma migrate deploy`** só se houver migrations pendentes (via conexão **Direct**). Se falhar com `P1002` (advisory lock), confira `DIRECT_URL` no Neon Direct (não pooled) e evite dois deploys simultâneos no mesmo banco.
- [ ] **Preview deployments**: se cada PR não tiver um Neon branch/DB separado, as previews vão rodar `migrate deploy` no **mesmo** banco de produção — evite isso (branch de DB no Neon ou envs diferentes por ambiente na Vercel).
- [ ] `npm ci` (ou `npm install`) e `npm run build` **localmente** só funciona com `.env` válido (Neon ou Postgres acessível), porque o build inclui migrate. Para validar só o front sem DB: `npm run build:next`.
- [ ] Opcional após primeiro deploy: rodar `npm run db:seed` uma vez (local ou script) para dados iniciais — **não** está no build automático.
- [ ] Definir `NODE_ENV=production` no host (geralmente automático).

---

## 5. Pós-deploy (smoke tests)

- [ ] Home e catálogo carregam.
- [ ] Login com e-mail/senha e (se ativo) OAuth.
- [ ] Checkout: cotação de CEP e frete (com e sem Melhor Envio).
- [ ] Pagamento de teste **live** mínimo ou fluxo de teste aprovado pela equipe (cuidado com chargebacks em testes live).
- [ ] Webhook Stripe recebendo eventos (log no Dashboard Stripe).
- [ ] E-mail de pedido ou contato chegando na caixa (e não só em spam).
- [ ] Se usar cron: verificar resposta 200 do job e estoque após expiração Pix.

---

## 6. Segurança e operação

- [ ] Rotacionar qualquer chave que tenha vazado em repositório ou chat.
- [ ] Backup do banco (Neon: snapshots / branch conforme plano).
- [ ] Monitorar limites do Resend e custos Stripe no dashboard.

---

## Referência rápida de APIs

| Serviço        | Uso principal                    |
|----------------|----------------------------------|
| Stripe         | Pagamentos e webhook             |
| Resend         | Envio de e-mails                 |
| Melhor Envio   | Cotação de frete                  |
| Brasil API     | Endereço por CEP                 |
| GA4 (gtag)     | Analytics opcional               |
| Google/FB/Apple| Login opcional                   |
