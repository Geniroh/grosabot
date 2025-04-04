import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ChatUserType {
  BOT = 'BOT',
  USER = 'USER',
}

@Schema({ timestamps: true })
export class Chat extends Document {
  @Prop({ required: true })
  phone: string;

  @Prop({ required: true })
  message: string;

  @Prop({ required: true, enum: ['USER', 'BOT'] })
  type: 'USER' | 'BOT';

  @Prop({ default: Date.now })
  timestamp: Date;
}

export const ChatSchema = SchemaFactory.createForClass(Chat);
