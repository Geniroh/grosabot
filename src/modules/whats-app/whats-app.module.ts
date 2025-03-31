import { Module } from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';
import { WhatsAppController } from './whats-app.controller';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [HttpModule],
  controllers: [WhatsAppController],
  providers: [WhatsAppService],
})
export class WhatsAppModule {}
