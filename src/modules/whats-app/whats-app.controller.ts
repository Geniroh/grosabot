import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';

@Controller('whats-app')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    const isVerified = this.whatsAppService.verifyWebhook(mode, token);
    if (isVerified) {
      this.logger.log('Webhook verification successful');
      return challenge;
    }

    this.logger.warn('Webhook verification failed');
    return 'Verification failed';
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  async handleWebhook(@Body() body: any): Promise<void> {
    this.logger.log('Received webhook payload');

    try {
      await this.whatsAppService.handleIncomingMessage(body);
    } catch (error) {
      this.logger.error(
        `Error handling webhook: ${error.message}`,
        error.stack,
      );
    }
  }
}
