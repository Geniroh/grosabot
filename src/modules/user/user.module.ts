import { Module } from '@nestjs/common';
import { UserService } from 'src/modules/user/user.service';
import { UserController } from 'src/modules/user/user.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from 'src/modules/user/schema/user.schema';
import {
  UserOnboarding,
  UserOnboardingSchema,
} from './schema/user-onboarding.schema';
import {
  UserComplaint,
  UserComplaintSchema,
} from 'src/modules/user/schema/user-complaint.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: UserOnboarding.name, schema: UserOnboardingSchema },
      { name: UserComplaint.name, schema: UserComplaintSchema },
    ]),
  ],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
