import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { GeocodingService } from './geocoding.service';
import { AutocompleteDto } from './dto/autocomplete.dto';
import { PlaceDetailsDto } from './dto/place-details.dto';

/**
 * Store-location search for the admin console. Deliberately forced onto Google
 * (via the `google*` service methods) regardless of GEOCODING_PROVIDER: store
 * onboarding needs Google's business/place coverage to resolve a vendor by name,
 * which the customer-facing provider (e.g. Chowdeck) doesn't match. Admin-only.
 */
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Throttle({ default: { ttl: 60000, limit: 40 } })
@Controller('admin/geocoding')
export class GeocodingAdminController {
  constructor(private readonly geocoding: GeocodingService) {}

  /** GET /admin/geocoding/autocomplete?q=...&sessionToken=... */
  @Get('autocomplete')
  autocomplete(@Query() query: AutocompleteDto) {
    return this.geocoding.googleAutocomplete(query.q, query.sessionToken);
  }

  /** GET /admin/geocoding/places/:placeId?sessionToken=... */
  @Get('places/:placeId')
  placeDetails(
    @Param('placeId') placeId: string,
    @Query() query: PlaceDetailsDto,
  ) {
    return this.geocoding.googlePlaceDetails(placeId, query.sessionToken);
  }
}
