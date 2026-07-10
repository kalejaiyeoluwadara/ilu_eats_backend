import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { QueryActivityDto } from './dto/query-activity.dto';
import { UpdateFeeSettingsDto } from './dto/update-fee-settings.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard/kpis')
  getDashboardKpis() {
    return this.adminService.getDashboardKpis();
  }

  @Get('stores/stats')
  getStoreStats() {
    return this.adminService.getStoreStats();
  }

  @Get('activity')
  getActivity(@Query() query: QueryActivityDto) {
    return this.adminService.getActivity(query);
  }

  @Get('settings/fees')
  getFeeSettings() {
    return this.adminService.getFeeSettings();
  }

  @Patch('settings/fees')
  updateFeeSettings(@Body() dto: UpdateFeeSettingsDto) {
    return this.adminService.updateFeeSettings(dto);
  }

  @Get('settings/feature-flags')
  getFeatureFlags() {
    return this.adminService.getFeatureFlags();
  }

  @Patch('settings/feature-flags/:id')
  updateFeatureFlag(
    @Param('id') id: string,
    @Body() dto: UpdateFeatureFlagDto,
  ) {
    return this.adminService.updateFeatureFlag(id, dto.on);
  }
}
