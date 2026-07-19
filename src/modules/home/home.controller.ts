import { Controller, Get } from '@nestjs/common';
import { HomeService } from './home.service';

@Controller('home')
export class HomeController {
  constructor(private readonly homeService: HomeService) {}

  /** One compiled payload for the whole home page: stores, featured dishes and
   * banners. Public — no guard, same as the individual reads it replaces. */
  @Get()
  getHomepage() {
    return this.homeService.getHomepage();
  }
}
