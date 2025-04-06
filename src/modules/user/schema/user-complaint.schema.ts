import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export enum ComplaintStatus {
  NEW = 'New',
  IN_PROGRESS = 'In Progress',
  RESOLVED = 'Resolved',
  CLOSED = 'Closed',
}

@Schema({ timestamps: true })
export class UserComplaint extends Document {
  @Prop({ required: true, unique: true })
  phone: string;

  @Prop()
  complaint: string;

  @Prop({ default: new Date() })
  complaintDate?: Date;

  @Prop()
  question: string;

  @Prop({ type: String, enum: ComplaintStatus, default: ComplaintStatus.NEW })
  status: ComplaintStatus;

  @Prop()
  resolution?: string;

  @Prop()
  resolvedBy?: string;

  @Prop()
  severity?: string; // e.g., 'Low', 'Medium', 'High'
}

export const UserComplaintSchema = SchemaFactory.createForClass(UserComplaint);
