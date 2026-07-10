import { Controller, Get } from '@nestjs/common';
import { PlatformService } from './platform.service';

@Controller()
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  /** Public — customer app polls this to grey out the catalog when closed. */
  @Get('platform/status')
  getStatus() {
    return this.platformService.getStatus();
  }
}
