import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import * as dayjs from 'dayjs';
import { Model } from 'mongoose';
import { Chat, ChatUserType } from 'src/modules/chat/schema/chat.schema';
import { UserService } from 'src/modules/user/user.service';
import { GeminiService } from 'src/modules/gemini/gemini.service';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class ChatService {
  private readonly apiUrl: string;
  private readonly apiToken: string;
  private readonly verifyToken: string;

  constructor(
    @InjectModel(Chat.name) private chatModel: Model<Chat>,
    private readonly userService: UserService,
    private readonly geminiService: GeminiService,
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiUrl = this.configService.get<string>('WHATSAPP_API_URL');
    this.apiToken = this.configService.get<string>('WHATSAPP_TOKEN');
    this.verifyToken = this.configService.get<string>('WHATSAPP_VERIFY_TOKEN');
  }

  async saveMessage(phone: string, message: string, type: 'USER' | 'BOT') {
    return this.chatModel.create({ phone, message, type });
  }

  async getUserChats(phone: string) {
    return this.chatModel.find({ phone }).sort({ timestamp: 1 }).exec();
  }

  async getUserChatHistory(phone: string, limit = 10) {
    return this.chatModel
      .find({ phone })
      .sort({ timestamp: -1 })
      .limit(limit)
      .exec();
  }

  async isFirstMessageToday(phone: string): Promise<boolean> {
    const todayStart = dayjs().startOf('day').toDate();

    const firstMessage = await this.chatModel
      .findOne({
        phone,
        type: ChatUserType.USER,
        timestamp: { $gte: todayStart },
      })
      .exec();

    return !firstMessage;
  }

  async handleVeryFirstMessage(message: string) {
    const greetings = [
      'hi',
      'hello',
      'hey',
      'yo',
      'good morning',
      'good evening',
      'greetings',
      'good afternoon',
      'howdy',
      'my name is',
      'i am',
    ];
    const isGreeting = greetings.some((greet) =>
      message.toLowerCase().includes(greet),
    );

    if (isGreeting) {
      return [
        `Hi there and welcome to Grosa!\nMy name is Johnny and I will be your personal health assistant.\nWhat's your name?`,
      ];
    } else {
      return [
        `Sorry, I didn't understand your initial message.\nBut no worries, I'm here to help you!`,
        `Welcome to Grosa!\nMy name is Johnny and I will be your personal health assistant.\nWhat's your name?`,
      ];
    }
  }

  async handleUserIntro(from: string, text: string): Promise<string | null> {
    let intro = await this.userService.userIntroFindByPhone(from);
    if (!intro) {
      intro = await this.userService.createUserIntro({ phone: from });
    }

    if (!intro.hasProvidedName) {
      if (!/^[A-Za-z\s]+$/.test(text)) {
        return 'Please enter a valid name (letters only).';
      }
      await this.userService.updateUserIntro(from, {
        hasProvidedName: true,
        currentStep: 'awaiting_age',
      });
      await this.userService.updateUser(from, { name: text });
      return `Thanks, ${text}! Now, please provide your age.`;
    }

    if (!intro.hasProvidedAge) {
      if (!/^\d{1,3}$/.test(text) || Number(text) < 0 || Number(text) > 120) {
        return 'Please enter a valid age (e.g., 25).';
      }
      await this.userService.updateUserIntro(from, {
        hasProvidedAge: true,
        currentStep: 'awaiting_gender',
      });
      await this.userService.updateUser(from, { age: Number(text) });
      return 'Got it! Now, what is your gender? (Male/Female)';
    }

    if (!intro.hasProvidedGender) {
      const validGenders = ['male', 'female', 'other'];
      if (!validGenders.includes(text.toLowerCase())) {
        return "Please enter 'Male', 'Female'.";
      }
      await this.userService.updateUserIntro(from, {
        hasProvidedGender: true,
        currentStep: 'completed',
      });
      await this.userService.updateUser(from, { gender: text.toLowerCase() });
      return "Great! You're all set.\nPlease note your information is confidential and is used only to provide you with the best service.\nYou can always update your information via the /profile command. \n\nNow, how can I assist you today?";
    }

    return null;
  }

  // async handleReply(from: string, text: string): Promise<string> {
  //   const chatHistory = await this.getUserChatHistory(from);

  //   // 1. Categorize the user message
  //   const category = await this.geminiService.analyzeMessage(chatHistory, text);
  //   console.log(`Message categorized as: ${category}`);

  //   // 2. If it's a recognized category, process it accordingly
  //   if (category === 'Vital sign input') {
  //     return 'You provided a vital sign. Please specify details like BP, heart rate, etc.';
  //   } else if (category === 'Personal information supply') {
  //     return 'Thank you for providing your details. How else can I assist you?';
  //   } else if (category === 'Medical complaint') {
  //     return 'I understand you have a medical concern. Please describe your symptoms.';
  //   } else if (category === 'General inquiry') {
  //     // 3️⃣ Generate a chatbot response if it's a general question
  //     return this.geminiService.generateReply(chatHistory, text);
  //   }

  //   return "I'm not sure how to categorize your message. Could you clarify?";
  // }

  async handleReply(from: string, text: string): Promise<string> {
    const chatHistory = await this.getUserChatHistory(from);

    const category = await this.geminiService.analyzeMessage(chatHistory, text);
    console.log(`Message categorized as: ${category}`);

    if (category === 'Vital sign input') {
      return 'You provided a vital sign. Please specify details like BP, heart rate, etc.';
    } else if (category === 'Personal information supply') {
      return 'Thank you for providing your details. How else can I assist you?';
    } else if (category === 'Medical complaint') {
      return 'I understand you have a medical concern. Please describe your symptoms.';
    } else if (category === 'General inquiry') {
      return this.geminiService.generateReply(chatHistory, text);
    }

    // Instead of sending text, send an interactive menu
    await this.sendServiceOptions(from); // or sendQuickReplyOptions(from);
    return 'Please select an option from the menu below.';
  }

  async sendServiceOptions(phone: string) {
    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Our Services',
        },
        body: {
          text: 'I couldn’t understand your request. Please choose from the following:',
        },
        action: {
          button: 'Select an option',
          sections: [
            {
              title: 'Health & Vital Signs',
              rows: [
                {
                  id: 'service_vital_signs',
                  title: 'Record Vital Signs',
                  description: 'Log your blood pressure, heart rate, etc.',
                },
              ],
            },
            {
              title: 'Medical Assistance',
              rows: [
                {
                  id: 'service_medical_query',
                  title: 'Medical Inquiry',
                  description:
                    'Ask about symptoms, medications, or health concerns.',
                },
                {
                  id: 'service_personal_info',
                  title: 'Update Personal Info',
                  description: 'Update your name, age, or gender details.',
                },
              ],
            },
          ],
        },
      },
    };

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(this.apiUrl, body, {
          headers: {
            Authorization: `Bearer ${this.apiToken}`,
            'Content-Type': 'application/json',
          },
        }),
      );

      console.log('List message sent:', data);
    } catch (error) {
      console.error(
        'Error sending list message:',
        error.response?.data || error.message,
      );
    }
  }
}
