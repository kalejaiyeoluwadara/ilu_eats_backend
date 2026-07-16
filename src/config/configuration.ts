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
