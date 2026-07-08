import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.ordersService.createOrder(user.id, dto);
  }

  @Get('users/me/orders')
  findMyOrders(@CurrentUser() user: any, @Query() query: PaginationQueryDto) {
    return this.ordersService.findMyOrders(user.id, query.page, query.pageSize);
  }

  @Get('orders/:id')
  findOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.findOrderByCode(id, user.id);
  }
}
