import { Module } from '@nestjs/common';
import { WhatsAppService } from 'src/modules/whats-app/whats-app.service';
import { WhatsAppController } from 'src/modules/whats-app/whats-app.controller';
import { HttpModule } from '@nestjs/axios';
import { UserModule } from 'src/modules/user/user.module';
import { ChatModule } from 'src/modules/chat/chat.module';
import { GeminiModule } from 'src/modules/gemini/gemini.module';

@Module({
  imports: [HttpModule, UserModule, ChatModule, GeminiModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
