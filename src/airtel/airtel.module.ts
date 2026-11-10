import { Module } from '@nestjs/common';
import { AirtelCallbackController } from './airtel-callback.controller.js';
import { AirtelCallbackService } from './airtel-callback.service.js';

@Module({
  controllers: [AirtelCallbackController],
  providers: [AirtelCallbackService],
})
export class AirtelModule {}
