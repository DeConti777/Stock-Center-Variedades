# Stock Center Variedades

E-commerce em `Next.js 16 + React 19 + Tailwind CSS 4` com autenticacao real, `PostgreSQL + Prisma 7`, checkout real via Mercado Pago e estrutura pronta para deploy na Vercel.

## O que ja esta real

- Autenticacao com `Auth.js` e login por e-mail/senha
- Usuarios, carrinho, favoritos e pedidos em PostgreSQL
- Checkout real com Mercado Pago: `Pix` (pagina propria) e `cartao` (Checkout Pro)
- Webhook Mercado Pago para confirmar pagamento e baixar estoque
- Seed do catalogo atual para popular o banco

## Rotas principais

- `/` Home promocional
- `/catalogo` Catalogo com busca, filtros e ordenacao
- `/produto/[slug]` Pagina de produto
- `/carrinho` Carrinho com cupom
- `/checkout` Checkout autenticado
- `/checkout/sucesso` e `/checkout/cancelado`
- `/login` e `/conta`
- `/favoritos`, `/contato`, `/sobre`, `/admin`

## Estrutura importante

- `prisma/schema.prisma`: modelos de usuarios, carrinho, favoritos, produtos e pedidos
- `prisma/seed.ts`: seed do catalogo
- `src/auth.ts`: configuracao do Auth.js
- `src/app/api/checkout/route.ts`: Pix e preferencia Checkout Pro (cartao)
- `src/app/api/webhooks/mercadopago/route.ts`: confirmacao do pagamento
- `src/lib/prisma.ts`: cliente Prisma com adapter PostgreSQL
- `src/lib/store-server.ts`: regras server-side de carrinho, favoritos e pedido

## Variaveis de ambiente

Use `.env.example` como base.

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/stockcenter?schema=public"
DIRECT_URL="postgresql://USER:PASSWORD@HOST:5432/stockcenter?schema=public"
AUTH_SECRET="uma-chave-segura"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
MERCADOPAGO_ACCESS_TOKEN="TEST-..."
```

## Setup recomendado

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run dev
```

## Validacao

```bash
npm run lint
npm run build
```
