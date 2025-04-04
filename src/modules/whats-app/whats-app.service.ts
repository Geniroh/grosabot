import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { UserService } from 'src/modules/user/user.service';
import { ChatService } from 'src/modules/chat/chat.service';
import { GeminiService } from 'src/modules/gemini/gemini.service';

@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly verifyToken: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly userService: UserService,
    private readonly chatService: ChatService,
    private readonly geminiService: GeminiService,
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

  async handleIncomingMessage(payload: any): Promise<void> {
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
    const text = message.text?.body?.trim();

    try {
      if (!text) {
        return this.sendText(
          from,
          'Sorry, I can only process text messages for now!',
        );
      }

      // 1. Handle commands
      if (text.startsWith('/')) {
        return this.handleCommand(text.toLowerCase(), from);
      }

      // 2. Check if user exists
      let user = await this.userService.findByPhone(from);
      if (!user) {
        const profileName = contact?.profile?.name || 'Unknown';
        user = await this.userService.createUser({ phone: from, profileName });
        await this.userService.createUserIntro({ phone: from });

        // Welcome message
        const welcomeMessages = await this.chatService.handleVeryFirstMessage(
          text,
        );
        for (const msg of welcomeMessages) {
          await this.sendText(from, msg);
        }
        return;
      }

      // 3. Handle onboarding if not complete
      const intro = await this.userService.userIntroFindByPhone(from);
      if (!intro || intro.currentStep !== 'completed') {
        const onboardingReply = await this.chatService.handleUserIntro(
          from,
          text,
        );
        if (onboardingReply) {
          return this.sendText(from, onboardingReply);
        }
        return;
      }

      // 4. Pass message to ChatService for AI processing and response generation
      const reply = await this.chatService.handleReply(from, text);
      await this.chatService.saveMessage(from, text, 'USER');
      await this.chatService.saveMessage(from, reply, 'BOT');
      return this.sendText(from, reply);
    } catch (err) {
      this.logger.error(`Error processing message: ${err.message}`);
      return this.sendText(
        from,
        'Something went wrong. Please try again later.',
      );
    }
  }

  private async handleCommand(command: string, from: string): Promise<void> {
    switch (command) {
      case '/help':
        return this.sendText(
          from,
          `
          Here are some commands you can use:
          /help - Show this help message
          /check-bmi - Check your Body Mass Index
          /settings - Update your profile information
          `,
        );

      case '/check-bmi':
        return this.sendText(
          from,
          `Please enter your height and weight in this format:\nHeight(cm), Weight(kg)`,
        );

      case '/settings':
        return this.sendText(
          from,
          `What would you like to update? (name, age, gender)\nE.g., Update name`,
        );

      default:
        return this.sendText(
          from,
          `Unknown command. Type /help to see available commands.`,
        );
    }
  }

  async sendText(to: string, message: string) {
    try {
      // Skip empty messages
      if (!message || message.trim() === '') {
        this.logger.warn(`Skipping empty message to ${to}`);
        return;
      }

      // Ensure proper phone number format
      const formattedNumber = to.startsWith('+') ? to : `+${to}`;

      const whatsAppToken = this.configService.get('WHATSAPP_TOKEN');
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.apiUrl,
          {
            messaging_product: 'whatsapp',
            to: formattedNumber,
            type: 'text',
            text: {
              body: message,
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
      if (error.response) {
        this.logger.error(
          `Response data: ${JSON.stringify(error.response.data)}`,
        );
      }
      throw error;
    }
  }
}
