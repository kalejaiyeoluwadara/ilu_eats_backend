import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, type INestApplication } from '@nestjs/common';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { TransformMongoInterceptor } from './common/interceptors/transform-mongo.interceptor';

// Shared app construction, used by BOTH the local/persistent-host entrypoint
// (bootstrap, below) and the Vercel serverless handler (api/index.ts). It wires
// up middleware/pipes/interceptors but deliberately does NOT call listen() — the
// caller decides how to serve it. Keeping this in one place stops the two
// entrypoints drifting out of sync.
export async function createApp(): Promise<INestApplication> {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);

  app.use(helmet());

  // The customer app and the admin console are separate origins, so the
  // allowlist is a list. Note `origin: '*'` is illegal alongside
  // credentials: true — the browser rejects the response — so a '*' entry maps
  // to `true`, which reflects the caller's origin back instead.
  const corsOrigins = config.get<string[]>('corsOrigin') ?? [];
  app.enableCors({
    origin: corsOrigins.includes('*') ? true : corsOrigins,
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  app.useGlobalInterceptors(new TransformMongoInterceptor());

  return app;
}

// Local / persistent-host entrypoint (`node dist/main`, `nest start`). On Vercel
// the entry is api/index.ts instead, so this block is skipped there and no port
// is bound.
async function bootstrap() {
  const app = await createApp();
  const config = app.get(ConfigService);
  await app.listen(config.get<number>('port') ?? 3000);
}

if (require.main === module) {
  void bootstrap();
}
