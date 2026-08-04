import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { BadgesService } from './badges.service';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { ReorderBadgesDto } from './dto/reorder-badges.dto';
import { BadgeMembershipDto } from './dto/badge-membership.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/badges')
export class BadgesAdminController {
  constructor(private readonly badgesService: BadgesService) {}

  /** All badges, hidden ones included, with member counts. */
  @Get()
  findAll() {
    return this.badgesService.findAllAdmin();
  }

  @Post()
  create(@Body() dto: CreateBadgeDto) {
    return this.badgesService.create(dto);
  }

  @Post('reorder')
  reorder(@Body() dto: ReorderBadgesDto) {
    return this.badgesService.reorder(dto.orderedIds);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateBadgeDto) {
    return this.badgesService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.badgesService.remove(id);
  }

  /** Apply the item picker's add/remove diff in one call. */
  @Patch(':id/products')
  updateMembership(
    @Param('id') id: string,
    @Body() dto: BadgeMembershipDto,
  ) {
    return this.badgesService.updateMembership(id, dto);
  }
}
