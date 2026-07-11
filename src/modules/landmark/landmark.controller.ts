import { Controller, Get } from '@nestjs/common';
import { LandmarkService } from './landmark.service';

@Controller()
export class LandmarkController {
  constructor(private readonly landmarkService: LandmarkService) {}

  /** Public — the delivery picker in the customer app. */
  @Get('landmarks')
  findActive() {
    return this.landmarkService.findActive();
  }
}
