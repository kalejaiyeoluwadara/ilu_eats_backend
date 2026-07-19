import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { GeocodingService } from './geocoding.service';
import { AutocompleteDto } from './dto/autocomplete.dto';
import { PlaceDetailsDto } from './dto/place-details.dto';

/**
 * Address autocomplete proxy. Guarded so only signed-in customers can spend the
 * (billed) provider quota, and throttled tighter than the global ceiling since
 * a debounced search field still fires several requests per address.
 */
@UseGuards(JwtAuthGuard)
@Throttle({ default: { ttl: 60000, limit: 40 } })
@Controller('geocoding')
export class GeocodingController {
  constructor(private readonly geocoding: GeocodingService) {}

  /** GET /geocoding/autocomplete?q=...&sessionToken=... */
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompleteDto) {
    return this.geocoding.autocomplete(query.q, query.sessionToken);
  }

  /** GET /geocoding/places/:placeId?sessionToken=... */
  @Get('places/:placeId')
  placeDetails(
    @Param('placeId') placeId: string,
    @Query() query: PlaceDetailsDto,
  ) {
    return this.geocoding.placeDetails(placeId, query.sessionToken);
  }
}
