import { Module } from '@nestjs/common';
import { ChatService } from 'src/modules/chat/chat.service';
import { ChatController } from 'src/modules/chat/chat.controller';
import { MongooseModule } from '@nestjs/mongoose';
import { Chat, ChatSchema } from 'src/modules/chat/schema/chat.schema';
import { UserModule } from 'src/modules/user/user.module';
import { GeminiModule } from 'src/modules/gemini/gemini.module';
import { HttpModule } from '@nestjs/axios';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Chat.name, schema: ChatSchema }]),
    UserModule,
    GeminiModule,
    HttpModule,
  ],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
