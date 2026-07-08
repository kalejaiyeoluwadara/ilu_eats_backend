import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { QueryAdminOrdersDto } from './dto/query-admin-orders.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/orders')
export class OrdersAdminController {
  constructor(private readonly ordersService: OrdersService) {}

  @Get()
  findAll(@Query() query: QueryAdminOrdersDto) {
    return this.ordersService.findAdminOrders(query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="orders.csv"')
  exportCsv(@Query() query: QueryAdminOrdersDto) {
    return this.ordersService.exportCsv(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ordersService.findAdminOrderDetail(id);
  }

  @Patch(':id/status')
  updateStatus(@Param('id') id: string, @Body() dto: UpdateOrderStatusDto) {
    return this.ordersService.updateStatus(id, dto.status);
  }
}
