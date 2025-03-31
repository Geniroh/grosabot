import { Injectable, Logger } from '@nestjs/common';
import { CreateWhatsAppDto } from './dto/create-whats-app.dto';
import { UpdateWhatsAppDto } from './dto/update-whats-app.dto';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly verifyToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    this.apiToken = this.configService.get<string>('WHATSAPP_TOKEN');
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
  }

  verifyWebhook(mode: string, token: string): boolean {
    this.logger.debug(
      `Verifying webhook: mode=${mode}, token=${token}, expected=${this.verifyToken}`,
    );

    return mode === 'subscribe' && token === this.verifyToken;
  }

  verifyeToken(mode: string, token: string, challenge: string): string | null {
    if (mode === 'subscribe' && token === this.verifyToken) {
      return challenge;
    }
    return null;
  }

  async handleIncomingMessage(payload: any): Promise<void> {
    // WhatsApp sends data in the format described in their documentation
    // https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples

    if (payload.object !== 'whatsapp_business_account') {
      this.logger.warn(`Received unexpected payload object: ${payload.object}`);
      return;
    }

    for (const entry of payload.entry || []) {
      for (const change of entry.changes || []) {
        if (change.field !== 'messages') {
          continue;
        }

        const value = change.value;
        if (!value.messages || value.messages.length === 0) {
          continue;
        }

        for (const message of value.messages) {
          await this.processMessage(message, value.contacts?.[0]);
        }
      }
    }
  }

  private async processMessage(message: any, contact: any): Promise<void> {
    const from = message.from;
    const contactName = contact?.profile?.name || 'Unknown';

    this.logger.log(`Processing message from ${contactName} (${from})`);

    // Handle different message types (text, image, audio, document, etc.)
    if (message.type === 'text') {
      const text = message.text.body;
      this.logger.log(`Received text message: ${text}`);

      // Process text message and optionally send a response
      await this.sendText(
        from,
        `Hello ${contactName}, we received your message: "${text}"`,
      );
    } else {
      this.logger.log(`Received message of type: ${message.type}`);
      // Handle other message types as needed
    }
  }

  create(createWhatsAppDto: CreateWhatsAppDto) {
    return 'This action adds a new whatsApp';
  }

  findAll() {
    return `This action returns all whatsApp`;
  }

  findOne(id: number) {
    return `This action returns a #${id} whatsApp`;
  }

  update(id: number, updateWhatsAppDto: UpdateWhatsAppDto) {
    return `This action updates a #${id} whatsApp`;
  }

  remove(id: number) {
    return `This action removes a #${id} whatsApp`;
  }

  async sayHello() {
    const whatsAppUrl =
      'https://graph.facebook.com/v22.0/553379581200992/messages';
    const whatsAppToken = this.configService.get('WHATSAPP_TOKEN');

    console.log({ whatsAppToken, whatsAppUrl });

    const { data } = await firstValueFrom(
      this.httpService.post(
        whatsAppUrl,
        {
          messaging_product: 'whatsapp',
          to: '2347032332652',
          type: 'template',
          template: {
            name: 'hello_world',
            language: {
              code: 'en_US',
            },
          },
        },
        {
          headers: {
            Authorization: `Bearer ${whatsAppToken}`,
            'Content-Type': 'application/json',
          },
        },
      ),
    );

    return data;
  }

  async sendText(to: string, message: string) {
    try {
      // const whatsAppUrl =
      //   'https://graph.facebook.com/v22.0/553379581200992/messages';
      const whatsAppToken = this.configService.get('WHATSAPP_TOKEN');
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            messaging_product: 'whatsapp',
            to: to && '2347032332652',
            type: 'text',
            text: {
              body: message && 'This is a follow up message from API',
            },
          },
          {
            headers: {
              Authorization: `Bearer ${whatsAppToken}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );
      return data;
    } catch (error) {
      this.logger.error(`Failed to send message to ${to}: ${error.message}`);
      throw error;
    }
  }
}
