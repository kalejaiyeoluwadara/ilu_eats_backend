import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  root() {
    return {
      name: 'ìlúEats API',
      status: 'ok',
      message: 'Welcome to the ìlúEats API. See /health for service status.',
    };
  }

  @Get('health')
  health() {
    return { status: 'ok' };
  }
}
