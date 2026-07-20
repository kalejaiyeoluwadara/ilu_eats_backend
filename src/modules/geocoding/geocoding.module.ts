import { Module } from '@nestjs/common';
import { GeocodingController } from './geocoding.controller';
import { GeocodingAdminController } from './geocoding-admin.controller';
import { GeocodingService } from './geocoding.service';

@Module({
  controllers: [GeocodingController, GeocodingAdminController],
  providers: [GeocodingService],
  exports: [GeocodingService],
})
export class GeocodingModule {}
