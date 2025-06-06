import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class GeminiService {
  private readonly apiUrlBase =
    'https://generativelanguage.googleapis.com/v1beta/models';
  private readonly apiKey: string;
  private readonly modelName = 'gemini-2.0-flash';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('GEMINI_API_KEY');
  }

  async analyzeMessage(
    chatHistory: any[],
    newMessage: string,
  ): Promise<string> {
    const prompt = `Categorize this message into one of these categories:
    1. Vital sign input
    2. Personal information supply
    3. Medical complaint
    4. General inquiry
    5. Other

    Chat History:
    ${chatHistory.map((chat) => `${chat.type}: ${chat.message}`).join('\n')}

    New Message: ${newMessage}
    Response should be just the category name.`;

    const apiUrl = `${this.apiUrlBase}/${this.modelName}:generateContent?key=${this.apiKey}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 50,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      if (
        data.candidates &&
        data.candidates.length > 0 &&
        data.candidates[0].content &&
        data.candidates[0].content.parts &&
        data.candidates[0].content.parts.length > 0
      ) {
        return data.candidates[0].content.parts[0].text.trim();
      } else {
        console.warn('Gemini API response structure unexpected:', data);
        return 'Unknown';
      }
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      return 'Unknown';
    }
  }

  async generateReply(
    chatHistory: { type: string; message: string }[],
    newMessage: string,
  ): Promise<string> {
    const formattedHistory = chatHistory
      .slice(-5) // Consider only the last 5 messages for context
      .map((chat) => `${chat.type}: ${chat.message}`)
      .join('\n');

    const prompt = `You are a WhatsApp chatbot assisting users with health-related queries.
    Generate a concise and helpful response based on the user's message and previous chat history.

    Chat History:
    ${formattedHistory}

    User Message: ${newMessage}

    Reply:`;

    const apiUrl = `${this.apiUrlBase}/${this.modelName}:generateContent?key=${this.apiKey}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'I’m sorry, but I don’t have a response for that at the moment.';

      return reply;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      return 'I’m currently experiencing issues. Please try again later.';
    }
  }

  async askAMedicalComplaintQuestion(
    complaintHistory: string[],
    complaint: string,
  ): Promise<string> {
    const formattedHistory = complaintHistory.slice(-20).join('\n');

    const prompt = `You are a WhatsApp chatbot assisting users with health-related queries.
      A user is making a medical complaint. Your goal is to ask at most two meaningful follow-up question if needed, based on the user's message and previous messages.
      If the user has already provided sufficient information, simply reply with:
      "No further questions at the moment."

    Chat History:
    ${formattedHistory}

    User Message: ${complaint}

    Reply:`;

    const apiUrl = `${this.apiUrlBase}/${this.modelName}:generateContent?key=${this.apiKey}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'I’m sorry, but I don’t have a response for that at the moment.';

      return reply;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      return 'I’m currently experiencing issues. Please try again later.';
    }
  }

  async evaluateVitalSign(message: string): Promise<string> {
    const prompt = `
    You are a WhatsApp chatbot assisting users with health-related queries about vital signs like blood pressure, heart rate, temperature, and blood sugar levels etc.

      A user provided information about these parameters, and I want you to:
      1. State whether each parameter appears to be within a generally healthy range or potentially concerning.
      2. If there is need to talk with a physician, please suggest they reply with "Yes talk to doctor".

      If BMI parameters (height in cm and weight in kg) are sent, please calculate the BMI and state the user's BMI category.

      User Message: ${message}

      Reply:
    `;

    const apiUrl = `${this.apiUrlBase}/${this.modelName}:generateContent?key=${this.apiKey}`;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          apiUrl,
          {
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              maxOutputTokens: 100,
            },
          },
          {
            headers: {
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      const reply =
        data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() ||
        'I’m sorry, but I don’t have a response for that at the moment.';

      return reply;
    } catch (error) {
      console.error('Gemini API Error:', error.response?.data || error.message);
      return 'I’m currently experiencing issues. Please try again later.';
    }
  }
}
