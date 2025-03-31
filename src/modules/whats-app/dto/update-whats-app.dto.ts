import { PartialType } from '@nestjs/mapped-types';
import { CreateWhatsAppDto } from './create-whats-app.dto';

export class UpdateWhatsAppDto extends PartialType(CreateWhatsAppDto) {}
