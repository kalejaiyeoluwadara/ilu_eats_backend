import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersAdminController } from './orders-admin.controller';
import { Order, OrderSchema } from './schemas/order.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { CartModule } from '../cart/cart.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
    CatalogModule,
    CartModule,
    UsersModule,
  ],
  controllers: [OrdersController, OrdersAdminController],
  providers: [OrdersService],
  exports: [MongooseModule],
})
export class OrdersModule {}
