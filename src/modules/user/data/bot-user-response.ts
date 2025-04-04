export class BotUserResponse {
  static welcomeNewUser(): string {
    return `Hi, my name is Johnny, welcome to Grosa 🙂 \nWhat's your name?`;
  }

  static askForNameAgain(): string {
    return `Hello again, Johnny here \nStill haven't gotten your name.`;
  }

  static sendUserAvailableOptions(): string {
    return `Welcome to Grosa Health \n\nFor better health delivery I would like to get your\n1.Gender\n2.Age\n3.Current blood pressure`;
  }

  static personalizedWelcome(name: string): string {
    return `Welcome ${name} to Grosa! 🎉 We're glad to have you here.`;
  }

  static orderConfirmation(phone: string): string {
    return `Thanks for placing an order! We've sent a confirmation message to ${phone}.`;
  }

  static genericResponse(): string {
    return `I didn't quite get that. Could you rephrase? 😊`;
  }
}
