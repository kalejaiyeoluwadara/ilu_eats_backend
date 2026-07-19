export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ilueats',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  // Static allowlist — customer app, admin console, and local dev ports.
  corsOrigin: [
    'http://localhost:3030',
    'http://localhost:3060',
    'http://localhost:3070',
    'https://ilueats.com',
    'https://admin.ilueats.com',
    'https://rider.ilueats.com',
  ],
  redis: {
    // Single connection string, e.g. redis://default:password@host:port
    // (Redis Cloud). Leaving it unset disables caching and drops the throttler
    // back to per-instance in-memory counters — the app still runs, just
    // without the shared state.
    url: process.env.REDIS_URL ?? '',
  },
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
  },
  paystack: {
    secretKey: process.env.PAYSTACK_SECRET_KEY ?? '',
    publicKey: process.env.PAYSTACK_PUBLIC_KEY ?? '',
    callbackUrl: process.env.PAYSTACK_CALLBACK_URL ?? '',
    walletCallbackUrl: process.env.PAYSTACK_WALLET_CALLBACK_URL ?? '',
  },
  sms: {
    // Provider is Termii for now; the SmsService is provider-agnostic so this
    // can grow into a discriminator (e.g. 'twilio') without touching callers.
    provider: process.env.SMS_PROVIDER ?? 'termii',
    termii: {
      apiKey: process.env.TERMII_API_KEY ?? '',
      baseUrl: process.env.TERMII_BASE_URL ?? 'https://api.ng.termii.com',
      // 'N-Alert' is Termii's shared, pre-approved DND-bypass sender — no CAC
      // or sender-ID registration required, transactional/OTP content only.
      senderId: process.env.TERMII_SENDER_ID ?? 'N-Alert',
      // 'dnd' routes through the DND-bypass corridor so OTPs reach numbers with
      // Do-Not-Disturb enabled; 'generic' is cheaper but blocked by DND.
      channel: process.env.TERMII_CHANNEL ?? 'dnd',
      otpTtlMinutes: parseInt(process.env.TERMII_OTP_TTL_MINUTES ?? '10', 10),
      otpLength: parseInt(process.env.TERMII_OTP_LENGTH ?? '6', 10),
    },
  },
  whatsapp: {
    // Provider is Meta's WhatsApp Cloud API for now; the WhatsappService is
    // provider-agnostic so this can grow into a discriminator (e.g. 'twilio')
    // without touching callers.
    provider: process.env.WHATSAPP_PROVIDER ?? 'meta',
    meta: {
      accessToken: process.env.WHATSAPP_ACCESS_TOKEN ?? '',
      // The Phone Number ID from the Meta dashboard — NOT the phone number.
      phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID ?? '',
      graphVersion: process.env.WHATSAPP_GRAPH_VERSION ?? 'v21.0',
      // Must match the language of the approved templates below.
      languageCode: process.env.WHATSAPP_LANGUAGE_CODE ?? 'en',
    },
    // Names of the pre-approved message templates in Meta Business Manager.
    // Order updates are business-initiated, so they can only go out as templates.
    templates: {
      orderPrepared: process.env.WHATSAPP_TEMPLATE_ORDER_PREPARED ?? 'order_prepared',
      riderAssigned: process.env.WHATSAPP_TEMPLATE_RIDER_ASSIGNED ?? 'rider_assigned',
      orderDelivered:
        process.env.WHATSAPP_TEMPLATE_ORDER_DELIVERED ?? 'order_delivered',
    },
  },
  geocoding: {
    // Provider is Google Places (New) for now; the GeocodingService is
    // provider-agnostic so this can grow into a discriminator (e.g. 'mapbox')
    // without touching callers.
    provider: process.env.GEOCODING_PROVIDER ?? 'google',
    // Appended to the query when autocomplete is sparse and we fall back to
    // full-text search, so a sparse local term ("hassan dudu") resolves inside
    // the service area instead of returning empty. Set empty to disable the
    // appended context (the fallback still runs on the raw query).
    textSearchAreaHint:
      process.env.GEOCODING_TEXT_SEARCH_HINT ?? 'Ilishan-Remo, Ogun State',
    // Run the (pricier) text-search fallback whenever autocomplete returns
    // FEWER than this many suggestions, not only when it returns zero — local
    // queries often yield one weak hit, and the fallback surfaces the real
    // street. Set to 1 to only fall back on a fully empty autocomplete.
    textSearchFallbackThreshold: parseInt(
      process.env.GEOCODING_TEXT_SEARCH_FALLBACK_THRESHOLD ?? '3',
      10,
    ),
    google: {
      apiKey: process.env.GOOGLE_MAPS_API_KEY ?? '',
      // Bias autocomplete toward our service area (Ilisan-Remo) and restrict to
      // Nigeria so a two-letter query surfaces local streets/landmarks rather
      // than same-named places worldwide. Center matches the app's map default.
      biasLat: parseFloat(process.env.GEOCODING_BIAS_LAT ?? '6.8944'),
      biasLng: parseFloat(process.env.GEOCODING_BIAS_LNG ?? '3.7186'),
      // Radius of the service area around the center, in metres. ~8km keeps
      // Ilishan-Remo and its immediate surroundings while excluding neighbouring
      // towns (Sagamu, Ijebu-Ode).
      biasRadiusM: parseInt(process.env.GEOCODING_BIAS_RADIUS_M ?? '8000', 10),
      // Bias (default) ranks local results first but still surfaces matches
      // outside the circle; delivery-area enforcement happens on the resolved
      // coordinates via `inServiceArea` at selection time, not by hiding
      // suggestions. Set 'true' to instead HARD-limit autocomplete to the
      // circle — note Google returns almost nothing for short local queries
      // under restriction, so bias gives a far better picker.
      restrictToArea:
        (process.env.GEOCODING_RESTRICT_TO_AREA ?? 'false') === 'true',
      regionCode: process.env.GEOCODING_REGION_CODE ?? 'ng',
      languageCode: process.env.GEOCODING_LANGUAGE_CODE ?? 'en',
    },
  },
  mail: {
    host: process.env.SMTP_HOST ?? 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT ?? '587', 10),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
    fromName: process.env.MAIL_FROM_NAME ?? 'ìlúEats',
    fromEmail: process.env.MAIL_FROM_EMAIL ?? '',
    replyTo: process.env.MAIL_REPLY_TO ?? '',
    supportEmail: process.env.MAIL_SUPPORT_EMAIL ?? '',
    siteUrl: process.env.MAIL_SITE_URL ?? 'https://ilueats.com',
    adminEmail: 'kalejaiyeoluwadara1@gmail.com',
    adminUrl: process.env.MAIL_ADMIN_URL ?? 'https://admin.ilueats.com',
  },
});
