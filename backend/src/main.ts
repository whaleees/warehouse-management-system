import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { resolve } from 'path';

async function bootstrap() {
  // Fail fast if the JWT secret is missing rather than silently signing tokens
  // with an undefined/insecure key.
  if (!process.env.JWT_SECRET) {
    throw new Error('JWT_SECRET environment variable is required');
  }

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Restrict CORS to an explicit allowlist (comma-separated CORS_ORIGINS),
  // defaulting to the local frontend for development.
  const allowedOrigins = (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({ origin: allowedOrigins });

  app.useStaticAssets(resolve(process.cwd(), 'uploads'), {
    prefix: '/uploads/',
  });

  app.useGlobalPipes(
    new ValidationPipe({
      forbidNonWhitelisted: true,
      forbidUnknownValues: false,
      stopAtFirstError: false,
    }),
  );

  await app.listen(process.env.PORT ?? 3001);
}
bootstrap();
