import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PromoCode, PromoCodeSchema } from './schemas/promo-code.schema';
import { Order, OrderSchema } from '../orders/schemas/order.schema';
import { Store, StoreSchema } from '../catalog/schemas/store.schema';
import { PromosService } from './promos.service';
import { PromosController } from './promos.controller';
import { PromosAdminController } from './promos-admin.controller';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: PromoCode.name, schema: PromoCodeSchema },
      { name: Order.name, schema: OrderSchema },
      { name: Store.name, schema: StoreSchema },
    ]),
  ],
  controllers: [PromosController, PromosAdminController],
  providers: [PromosService],
  exports: [PromosService],
})
export class PromosModule {}
