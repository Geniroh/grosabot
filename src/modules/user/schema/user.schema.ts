import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema({ timestamps: true })
export class User extends Document {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  name?: string;

  @Prop()
  profileName?: string;

  @Prop({ enum: ['male', 'female'] })
  gender?: string;

  @Prop()
  age?: number;
}

export const UserSchema = SchemaFactory.createForClass(User);
