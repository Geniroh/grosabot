import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('privacy-policy')
  getPrivacyPOlicy(): string {
    return `Privacy Policy for Test Bot

        This test WhatsApp bot is for development and testing purposes only. We do not collect or store any personal information from your interactions with this bot beyond what is necessary for the functionality of this test.

        Any messages you send to this bot are processed temporarily to provide a response and are not retained long-term. We do not share your messages or any associated data with third parties for any purpose.

        This is a test environment, and the security measures in place are for testing and may not reflect the standards of a production system.

        By interacting with this test bot, you acknowledge and agree to these conditions.

        If you have any questions or concerns about this test bot, please contact [Your Name/Team Name] at [Your Email Address].

        Thank you for helping us test!`;
  }
}
