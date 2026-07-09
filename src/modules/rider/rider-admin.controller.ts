import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { RiderService } from './rider.service';
import { AssignRiderDto } from './dto/assign-rider.dto';
import { CreateRiderDto } from './dto/create-rider.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin')
export class RiderAdminController {
  constructor(private readonly riderService: RiderService) {}

  @Get('riders')
  listRiders(@Query('online') online?: string) {
    if (online === 'true') return this.riderService.listAvailableRiders();
    return this.riderService.listAllRiders();
  }

  @Post('riders')
  createRider(@Body() dto: CreateRiderDto) {
    return this.riderService.createRider(dto);
  }

  @Post('orders/:orderId/assign-rider')
  assignRider(
    @Param('orderId') orderId: string,
    @Body() dto: AssignRiderDto,
  ) {
    return this.riderService.assignRiderToOrder(orderId, dto.riderId);
  }
}
