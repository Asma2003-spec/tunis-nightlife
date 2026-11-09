import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { MEDIA_ROOT, uploadedMediaHandler } from './media';
import { PrismaService } from './prisma/prisma.service';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Les images sont affichées par le Web (autre port) et le mobile : ressources cross-origin autorisées
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  app.use(cookieParser());
  // Derrière le proxy de l'hébergeur : IP réelle du visiteur (limitation de débit par IP)
  if (process.env.TRUST_PROXY === 'true') app.set('trust proxy', 1);
  // Photos envoyées depuis le back-office (stockées en base)
  app.use('/media/uploads', uploadedMediaHandler(app.get(PrismaService)));
  // Photos des établissements : /media/<clé de stockage>
  app.useStaticAssets(MEDIA_ROOT, {
    prefix: '/media/',
    maxAge: '7d',
    index: false,
    dotfiles: 'deny',
  });
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:3000').split(','),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  // Toutes les routes sont versionnées : /api/v1/...
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  app.enableShutdownHooks();

  const swagger = new DocumentBuilder()
    .setTitle('Tunis Nightlife API')
    .setDescription('API REST de la plateforme Tunis Nightlife (Web + mobile).')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swagger));

  // PORT est fourni par l'hébergeur (Render…) ; API_PORT en local
  const port = Number(process.env.PORT ?? process.env.API_PORT ?? 4000);
  await app.listen(port);
  console.log(
    `API prête sur http://localhost:${port}/api/v1 — docs : http://localhost:${port}/api/docs`,
  );
}

void bootstrap();
