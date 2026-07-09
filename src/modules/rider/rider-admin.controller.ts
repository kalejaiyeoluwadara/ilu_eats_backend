import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { RiderService } from './rider.service';
import { AssignRiderDto } from './dto/assign-rider.dto';
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
  listRiders() {
    return this.riderService.listAvailableRiders();
  }

  @Post('orders/:orderId/assign-rider')
  assignRider(
    @Param('orderId') orderId: string,
    @Body() dto: AssignRiderDto,
  ) {
    return this.riderService.assignRiderToOrder(orderId, dto.riderId);
  }
}
