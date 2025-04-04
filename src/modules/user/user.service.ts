import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { User } from './schema/user.schema';
import { Model } from 'mongoose';
import { IContact } from 'src/@types/user.type';
import { BotUserResponse } from './data/bot-user-response';
import { UserOnboarding } from './schema/user-onboarding.schema';

@Injectable()
export class UserService {
  constructor(
    @InjectModel(User.name) private userModel: Model<User>,
    @InjectModel(UserOnboarding.name)
    private userIntroModel: Model<UserOnboarding>,
  ) {}

  async findByPhone(phone: string): Promise<User | null> {
    return this.userModel.findOne({ phone }).exec();
  }

  async createUser(data: Partial<User>): Promise<User> {
    return this.userModel.create(data);
  }

  async updateUser(
    phone: string,
    updateData: Partial<User>,
  ): Promise<User | null> {
    return this.userModel
      .findOneAndUpdate({ phone }, updateData, { new: true })
      .exec();
  }

  async identifyUser(phone: string): Promise<User> {
    let user = await this.userModel.findOne({ phone }).exec();

    if (!user) {
      user = await this.userModel.create({ phone });
    }

    return user;
  }

  // async updateUser(phone: string, updateData: Partial<User>): Promise<User> {
  //   const user = await this.userModel.findOneAndUpdate(
  //     { phone },
  //     { $set: updateData },
  //     { new: true, runValidators: true },
  //   );

  //   if (!user) {
  //     throw new NotFoundException(`User with phone ${phone} not found`);
  //   }

  //   return user;
  // }

  // In UserService, fix the empty response:
  async identifyUserAndRespond(
    phone: string,
    contact?: IContact,
  ): Promise<string> {
    const user = await this.userModel.findOne({ phone }).exec();

    if (!user) {
      await this.userModel.create({
        phone,
        profileName: contact?.profile?.name || '',
      });
      return BotUserResponse.welcomeNewUser();
    } else {
      return '';
    }
  }

  async userIntroFindByPhone(phone: string): Promise<UserOnboarding | null> {
    return this.userIntroModel.findOne({ phone }).exec();
  }

  async createUserIntro(
    data: Partial<UserOnboarding>,
  ): Promise<UserOnboarding> {
    return this.userIntroModel.create(data);
  }

  async updateUserIntro(
    phone: string,
    updateData: Partial<UserOnboarding>,
  ): Promise<UserOnboarding | null> {
    return this.userIntroModel
      .findOneAndUpdate({ phone }, updateData, { new: true })
      .exec();
  }
}
