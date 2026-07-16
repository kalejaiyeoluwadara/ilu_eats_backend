import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { QuoteOrderDto } from './dto/quote-order.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller()
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('orders')
  createOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOrderDto,
  ) {
    return this.ordersService.createOrder(user.id, dto);
  }

  /** Prices a basket for display at checkout. Persists nothing. */
  @Post('orders/quote')
  @HttpCode(HttpStatus.OK)
  quoteOrder(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: QuoteOrderDto,
  ) {
    return this.ordersService.quoteOrder(user.id, dto);
  }

  @Get('users/me/orders')
  findMyOrders(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.ordersService.findMyOrders(user.id, query.page, query.pageSize);
  }

  @Get('orders/:id')
  findOrder(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.ordersService.findOrderByCode(id, user.id);
  }
}
