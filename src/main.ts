import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { Logger, ValidationPipe } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

async function bootstrap() {
  // const httpsOptions = {
  //   key: fs.readFileSync(path.join(__dirname, '../certs/server.key')),
  //   cert: fs.readFileSync(path.join(__dirname, '../certs/server.cert')),

  //   // Enable client certificate request
  //   requestCert: true,

  //   // Reject requests without a valid client certificate
  //   rejectUnauthorized: true,

  //   // CA certificates that are trusted for client certificate validation
  //   // This should include Meta's CA certificate
  //   ca: fs.readFileSync(path.join(__dirname, '../certs/digicert-root-ca.pem')),
  // };

  const app = await NestFactory.create(AppModule);

  // const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);

  const PORT =
    process.env.PORT ||
    configService.get<number>('app.port', { infer: true }) ||
    3000;

  app.useGlobalPipes(new ValidationPipe());

  app.enableCors();

  await app.listen(PORT);

  return PORT;
}

bootstrap().then((port: number) => {
  Logger.log(`Application running on port: ${port}`, 'Main');
});
