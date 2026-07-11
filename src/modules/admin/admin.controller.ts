import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { PlatformService } from '../platform/platform.service';
import { UpdatePlatformSettingsDto } from '../platform/dto/update-platform-settings.dto';
import { UpdateDeliveryPricingDto } from '../platform/dto/update-delivery-pricing.dto';
import { QueryActivityDto } from './dto/query-activity.dto';
import { QueryUsersDto } from './dto/query-users.dto';
import { BlockUserDto } from './dto/block-user.dto';
import { UpdateFeeSettingsDto } from './dto/update-fee-settings.dto';
import { UpdateFeatureFlagDto } from './dto/update-feature-flag.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly platformService: PlatformService,
  ) {}

  @Get('settings/platform')
  getPlatformSettings() {
    return this.platformService.getStatus();
  }

  @Patch('settings/platform')
  updatePlatformSettings(@Body() dto: UpdatePlatformSettingsDto) {
    return this.platformService.updateSettings(dto);
  }

  @Get('settings/delivery')
  getDeliveryPricing() {
    return this.platformService.getDeliveryPricing();
  }

  @Patch('settings/delivery')
  updateDeliveryPricing(@Body() dto: UpdateDeliveryPricingDto) {
    return this.platformService.updateDeliveryPricing(dto);
  }

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

  @Get('users')
  listUsers(@Query() query: QueryUsersDto) {
    return this.adminService.listUsers(query);
  }

  @Get('users/:id')
  getUser(@Param('id') id: string) {
    return this.adminService.getUser(id);
  }

  @Get('users/:id/transactions')
  getUserTransactions(
    @Param('id') id: string,
    @Query() query: PaginationQueryDto,
  ) {
    return this.adminService.getUserTransactions(
      id,
      query.page,
      query.pageSize,
    );
  }

  @Patch('users/:id/block')
  setUserBlocked(
    @Param('id') id: string,
    @Body() dto: BlockUserDto,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    if (dto.blocked && id === admin.id) {
      throw new BadRequestException('You cannot block your own account');
    }
    return this.adminService.setUserBlocked(id, dto.blocked);
  }

  @Delete('users/:id')
  deleteUser(
    @Param('id') id: string,
    @CurrentUser() admin: AuthenticatedUser,
  ) {
    if (id === admin.id) {
      throw new BadRequestException('You cannot delete your own account');
    }
    return this.adminService.deleteUser(id);
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
