import { Module } from '@nestjs/common';
import { HomeController } from './home.controller';
import { HomeService } from './home.service';
import { CatalogModule } from '../catalog/catalog.module';
import { BannersModule } from '../banners/banners.module';

/**
 * Read-only aggregator for the home page. Owns no schema or cache of its own —
 * it composes CatalogService and BannersService, inheriting their caching and
 * invalidation.
 */
@Module({
  imports: [CatalogModule, BannersModule],
  controllers: [HomeController],
  providers: [HomeService],
})
export class HomeModule {}
