import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { WhatsAppService } from './whats-app.service';
import { CreateWhatsAppDto } from './dto/create-whats-app.dto';
import { UpdateWhatsAppDto } from './dto/update-whats-app.dto';

@Controller('whats-app')
export class WhatsAppController {
  private readonly logger = new Logger(WhatsAppController.name);
  constructor(private readonly whatsAppService: WhatsAppService) {}

  @Get('say-hello')
  sayhello() {
    return this.whatsAppService.sayHello();
  }

  @Get('send-text')
  sendText() {
    return this.whatsAppService.sendText(
      '2347032332652',
      'Hello World From API',
    );
  }

  @Post()
  create(@Body() createWhatsAppDto: CreateWhatsAppDto) {
    return this.whatsAppService.create(createWhatsAppDto);
  }

  @Get()
  findAll() {
    return this.whatsAppService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.whatsAppService.findOne(+id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateWhatsAppDto: UpdateWhatsAppDto,
  ) {
    return this.whatsAppService.update(+id, updateWhatsAppDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.whatsAppService.remove(+id);
  }

  @Get('webhook')
  verifyWebhook(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ): string {
    console.log(' I WAS HIT ');
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
    console.log(' I WAS HIT ');
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
