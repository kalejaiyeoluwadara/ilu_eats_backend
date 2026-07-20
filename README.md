# ìlúEats — Backend API

> **Your town. Your taste. Delivered.**

The NestJS REST API powering **ìlúEats**, a hyper-local, town-first food
delivery network — starting with Ilisan, Ogun State. It serves three clients:
the customer web app, the admin console, and the rider app. Built to run both on
a persistent host and as a Vercel serverless function.

---

## Tech stack

| | |
|---|---|
| **Framework** | NestJS 11 (Express platform) |
| **Language** | TypeScript |
| **Database** | MongoDB + Mongoose |
| **Cache / rate limit** | Redis (ioredis) — optional, falls back to in-memory |
| **Auth** | JWT (Passport) + bcrypt |
| **Payments** | Paystack (checkout, webhooks, wallet) |
| **Media** | Cloudinary (uploads via Multer) |
| **Notifications** | Termii (SMS/OTP), Meta WhatsApp Cloud API, Nodemailer (SMTP) |
| **Geocoding** | Google Places (New) / Chowdeck place proxy |
| **Hardening** | Helmet, global validation pipe, throttling behind proxy |
| **Docs / exports** | PDFKit, json2csv |

---

## Modules

Domain modules live under `src/modules/`:

| Module | Responsibility |
|---|---|
| `auth` | Signup/login, JWT issuance, OTP |
| `users` | Customer accounts & profiles |
| `catalog` | Stores & products (Atlas Search + `$text` fallback) |
| `cart` | Server-side carts |
| `orders` | Order lifecycle & status transitions |
| `payments` / `paystack` | Paystack checkout & webhook handling |
| `wallet` | Paystack-reconciled customer wallet |
| `rider` | Rider accounts, assignment & delivery queue |
| `admin` | Admin console back office |
| `banners` / `home` | Merchandising & homepage feed |
| `geocoding` / `landmark` | Address autocomplete, reverse geocoding, service-area checks |
| `sms` / `whatsapp` / `mail` | Notification channels (order events, OTP) |
| `platform` | Platform status / config |
| `referral` | Referral program |
| `uploads` | Cloudinary media uploads |

Shared code (guards, interceptors, DTOs, enums, Redis, geo, schemas) lives under
`src/common/`; runtime config is centralized in `src/config/configuration.ts`.

---

## Cross-cutting behavior

- **CORS** — static allowlist (customer, admin, rider origins + local ports).
- **Validation** — global `ValidationPipe` with `whitelist` + `forbidNonWhitelisted`.
- **Rate limiting** — 100 req/min per real client IP, enforced globally via Redis
  when `REDIS_URL` is set (per-instance in-memory otherwise).
- **Serverless-aware** — Mongo pool budgeting, `trust proxy`, disabled ETag, and
  `Cache-Control: no-store` so warm Vercel invocations reuse the same connection.
- **Response shaping** — `TransformMongoInterceptor` normalizes Mongo documents.

---

## Getting started

### Prerequisites

- Node.js 20+
- MongoDB (local or Atlas)
- (Optional) Redis, and API keys for Paystack / Cloudinary / Termii / WhatsApp / Google

### Setup

```bash
npm install
cp .env.example .env        # fill in the values (see below)
npm run start:dev           # watch mode, http://localhost:3000
```

### Seed data

```bash
npm run seed                # base seed
npm run seed:landmarks      # landmark data
```

---

## Environment variables

Full reference lives in `.env.example`. Key groups:

- **Core** — `PORT`, `NODE_ENV`, `MONGODB_URI`, `REDIS_URL`
- **Auth** — `JWT_SECRET`, `JWT_EXPIRES_IN`
- **Paystack** — `PAYSTACK_SECRET_KEY`, `PAYSTACK_PUBLIC_KEY`, callback URLs
- **Cloudinary** — `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- **SMS (Termii)** — `TERMII_API_KEY`, sender/channel/OTP settings
- **WhatsApp (Meta)** — `WHATSAPP_ACCESS_TOKEN`, `WHATSAPP_PHONE_NUMBER_ID`, template names
- **Mail (SMTP)** — `SMTP_*`, `MAIL_*`
- **Geocoding** — `GEOCODING_PROVIDER` (`chowdeck` | `google`), `GOOGLE_MAPS_API_KEY`, service-area bias

Notification and geocoding integrations degrade gracefully: leave a provider's
key empty to disable that channel cleanly rather than crash.

---

## Scripts

| Command | Description |
|---|---|
| `npm run start:dev` | Dev server, watch mode |
| `npm run start:prod` | Run compiled build (`node dist/main`) |
| `npm run build` | Compile with `nest build` |
| `npm run lint` | ESLint (autofix) |
| `npm run format` | Prettier |
| `npm run test` / `test:e2e` / `test:cov` | Jest unit / e2e / coverage |
| `npm run seed` / `seed:landmarks` | Seed the database |

---

## Deployment

Runs on **Vercel** as a serverless function. `api/index.ts` is the entrypoint —
it builds the Nest app once and caches the Express handler (and Mongo
connection) across warm invocations; `src/main.ts`'s `createApp()` is shared
between this and the local `node dist/main` entrypoint so the two never drift.
Routing is configured in `vercel.json`.
