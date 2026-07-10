export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  mongodbUri: process.env.MONGODB_URI ?? 'mongodb://localhost:27017/ilueats',
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change-me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '7d',
  },
  corsOrigin: process.env.CORS_ORIGIN ?? '*',
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
    adminUrl: process.env.MAIL_ADMIN_URL ?? 'https://ilueats.com/admin',
  },
});
