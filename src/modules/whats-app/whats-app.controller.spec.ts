import { Test, TestingModule } from '@nestjs/testing';
import { WhatsAppController } from './whats-app.controller';
import { WhatsAppService } from './whats-app.service';

describe('WhatsAppController', () => {
  let controller: WhatsAppController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [WhatsAppController],
      providers: [WhatsAppService],
    }).compile();

    controller = module.get<WhatsAppController>(WhatsAppController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
