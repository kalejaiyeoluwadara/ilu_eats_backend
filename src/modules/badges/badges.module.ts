import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BadgesService } from './badges.service';
import { BadgesController } from './badges.controller';
import { BadgesAdminController } from './badges-admin.controller';
import { Badge, BadgeSchema } from './schemas/badge.schema';
import { CatalogModule } from '../catalog/catalog.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Badge.name, schema: BadgeSchema }]),
    // For the Product model — badge membership lives on the product document.
    CatalogModule,
  ],
  controllers: [BadgesController, BadgesAdminController],
  providers: [BadgesService],
  exports: [BadgesService],
})
export class BadgesModule {}
