import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UserModule } from './modules/user/user.module';
import { WhatsAppModule } from './modules/whats-app/whats-app.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { HttpModule } from '@nestjs/axios';
import { ClientCertificateMiddleware } from './middleware/client-certficate.middleware';
import { ChatModule } from 'src/modules/chat/chat.module';
import { GeminiModule } from './modules/gemini/gemini.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    HttpModule,
    UserModule,
    WhatsAppModule,
    ChatModule,
    GeminiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {
  // configure(consumer: MiddlewareConsumer) {
  //   // Apply client certificate validation middleware to WhatsApp webhook routes
  //   consumer
  //     .apply(ClientCertificateMiddleware)
  //     .forRoutes(
  //       { path: 'whatsapp/webhook', method: RequestMethod.GET },
  //       { path: 'whatsapp/webhook', method: RequestMethod.POST },
  //     );
  // }
}
