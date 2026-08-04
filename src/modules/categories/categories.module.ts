import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CategoriesService } from './categories.service';
import { CategoriesController } from './categories.controller';
import { CategoriesAdminController } from './categories-admin.controller';
import { Category, CategorySchema } from './schemas/category.schema';
import { CatalogModule } from '../catalog/catalog.module';
import { IsCategorySlugConstraint } from './validators/is-category-slug.validator';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Category.name, schema: CategorySchema },
    ]),
    // For the Product and Store models — category membership lives on those
    // documents as a slug, not as a join collection here.
    CatalogModule,
  ],
  controllers: [CategoriesController, CategoriesAdminController],
  providers: [CategoriesService, IsCategorySlugConstraint],
  exports: [CategoriesService],
})
export class CategoriesModule {}
