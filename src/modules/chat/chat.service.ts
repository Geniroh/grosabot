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
import { ComplaintStatus } from '../user/schema/user-complaint.schema';
import {
  calculateBMI,
  getBMICategory,
  parseBMIInput,
} from 'src/common/utils/bmi-calculator';

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
      return "Great! You're all set.\nPlease note your information is confidential and is used only to provide you with the best service.\nYou can always view your profile via the /profile command. \n\nNow, how can I assist you today?";
    }

    return null;
  }

  async handleReply(from: string, text: string) {
    const chatHistory = await this.getUserChatHistory(from);

    const bmiInput = parseBMIInput(text);
    if (bmiInput) {
      const result = calculateBMI(bmiInput);
      if (!result)
        return 'Sorry, I couldn’t calculate your BMI. Check your format.';

      const category = getBMICategory(result.bmi);
      return `✅ Your BMI is *${result.bmi}* (${category}).`;
    }

    const category = await this.geminiService.analyzeMessage(chatHistory, text);
    console.log(`Message categorized as: ${category}`);

    if (category === 'Vital sign input') {
      const reply = await this.geminiService.evaluateVitalSign(text);
      return reply;
    } else if (category === 'Personal information supply') {
      return 'Thank you for providing your details. How else can I assist you?';
    } else if (category === 'Medical complaint') {
      const reply = await this.handleMedicalComplaint(from, text);
      if (reply === 'DONE') {
        await this.sendMedicalServiceOptions(from);
        return "Thanks for the details. I am reviewing your complaint and I've sent you some medical service options. Please select one from the menu.";
      } else {
        return reply;
      }
    } else if (category === 'General inquiry') {
      return this.geminiService.generateReply(chatHistory, text);
    }

    // Instead of sending text, send an interactive menu
    await this.sendServiceOptions(from);
    return 'Please select an option from the menu below.';
  }

  async handleMedicalComplaint(from: string, text: string) {
    const replies = await this.userService.findAllUSerComplaints(from);
    const defaultReply =
      'I understand you have a medical concern. Please describe your symptoms in this format\n\nMedical Complaint\n....';

    if (replies.length < 1) {
      await this.userService.createUserComplaint({
        phone: from,
        complaint: text,
        question: defaultReply,
      });

      return 'I understand you have a medical concern. Please describe your symptoms in this format\n\nMedical Complaint\n....';
    } else {
      const latestReply = replies[0];
      const complaintHistoryAsArrayOfString = replies.map(
        (reply) => reply.complaint,
      );
      const followUpQuestion =
        await this.geminiService.askAMedicalComplaintQuestion(
          complaintHistoryAsArrayOfString,
          text,
        );
      if (latestReply.status === 'New') {
        await this.userService.updateLatestComplaint(from, {
          question: followUpQuestion,
          complaint: text,
          status: ComplaintStatus.IN_PROGRESS,
        });
        return (
          followUpQuestion +
          `Please respond in this format\n\nMedical Complaint\n....`
        );
      } else if (latestReply.status === 'In Progress') {
        await this.userService.updateLatestComplaint(from, {
          question: followUpQuestion,
          complaint: text,
          status: ComplaintStatus.IN_PROGRESS,
        });

        if (followUpQuestion === 'No further questions at the moment.') {
          return `DONE`;
        }
        return (
          followUpQuestion +
          `\n\nPlease respond in this format\n\nMedical Complaint\n....`
        );
      } else if (latestReply.status === 'Resolved') {
        return 'Your previous complaint has been resolved. Would you like to file a new one?';
      } else if (latestReply.status === 'Closed') {
        return 'Your previous complaint has been closed. Would you like to file a new one?';
      }
      return followUpQuestion;
    }
  }

  async handleInteractiveReply(
    from: string,
    selectedId: string,
  ): Promise<string> {
    switch (selectedId) {
      case 'locate_health_facility':
        // await this.sendHealthFacilityTypesList(from); // List 2
        return 'What type of facility are you looking for? \nWe are working on this feature and it will be available soon.';
      case 'service_vital_signs':
        return `Please provide your vital signs in this format:\n\nVital Signs\n
....\n\nFor example:\n\nVital Signs\nBlood Pressure: 120/80\nHeart Rate: 75 bpm\nTemperature: 98.6°F\nBlood Sugar: 90 mg/dL`;

      case 'speak_to_doctor':
        return 'Sorry, we are unable to connect you to a doctor at the moment. Please try again later.';

      case 'setting_commands':
        return `Here are some commands you can use:\n\n1. /profile - View your profile information.\n2. /help - Get a list of available commands.\n3. /check-bmi - Calculate your Body Mass Index (BMI).`;

      case 'bmi_calculator':
        return `Please provide your height and weight in this format:\n\nHeight: 170 cm\nWeight: 70 kg\n\nOr in imperial units:\n\nHeight: 5 ft 7 in\nWeight: 150 lbs`;

      case 'service_medical_query':
        return `Please provide your medical inquiry in this format:\n\nMedical Inquiry\n....\n\nFor example:\n\nMedical Inquiry\nI have a headache and fever.`;

      default:
        return 'Sorry, I didn’t understand that option.';
    }
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
          text: 'Please choose from the following :',
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
                {
                  id: 'bmi_calculator',
                  title: 'Calculate BMI',
                  description: 'Calculate your Body Mass Index (BMI).',
                },
              ],
            },
            {
              title: 'Commands',
              rows: [
                {
                  id: 'setting_commands',
                  title: 'Helpful Commands',
                  description:
                    'Get a list of available commands and their functions.',
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
                  id: 'speak_to_doctor',
                  title: 'Speak to a Doctor',
                  description: 'Speak to a licensed doctor',
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

  async sendMedicalServiceOptions(phone: string) {
    const body = {
      messaging_product: 'whatsapp',
      to: phone,
      type: 'interactive',
      interactive: {
        type: 'list',
        header: {
          type: 'text',
          text: 'Grosa Health',
        },
        body: {
          text: `Please pick an option:`,
        },
        action: {
          button: 'Select an option',
          sections: [
            {
              title: 'Speak to a Doctor',
              rows: [
                {
                  id: 'speak_to_doctor',
                  title: 'Speak to a Doctor',
                  description: 'Speak to a licensed doctor',
                },
              ],
            },
            {
              title: 'Find Healthcare Nearby',
              rows: [
                {
                  id: 'locate_health_facility',
                  title: 'Locate a Health Facility',
                  description:
                    'Provide a location and we would find a pharmacy/hospital near you',
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
