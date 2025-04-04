import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class UserOnboarding extends Document {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop({ default: false })
  hasProvidedName: boolean;

  @Prop({ default: false })
  hasProvidedAge: boolean;

  @Prop({ default: false })
  hasProvidedGender: boolean;

  @Prop({ default: false })
  hasAgreedToTerms: boolean;

  @Prop({ default: 'awaiting_name' })
  currentStep: string;
}

export const UserOnboardingSchema =
  SchemaFactory.createForClass(UserOnboarding);
