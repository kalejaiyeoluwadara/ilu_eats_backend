import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CatalogService } from './catalog.service';
import { CatalogController } from './catalog.controller';
import { CatalogAdminController } from './catalog-admin.controller';
import { Store, StoreSchema } from './schemas/store.schema';
import { Product, ProductSchema } from './schemas/product.schema';
import { ActivityModule } from '../activity/activity.module';
import { CloudinaryModule } from '../../cloudinary/cloudinary.module';
import { PlatformModule } from '../platform/platform.module';
import { GeocodingModule } from '../geocoding/geocoding.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Store.name, schema: StoreSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    ActivityModule,
    CloudinaryModule,
    PlatformModule,
    GeocodingModule,
  ],
  controllers: [CatalogController, CatalogAdminController],
  providers: [CatalogService],
  exports: [CatalogService, MongooseModule],
})
export class CatalogModule {}
