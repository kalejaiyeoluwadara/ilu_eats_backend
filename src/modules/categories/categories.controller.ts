import { Controller, Get, Param, Query } from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { QueryCategoryProductsDto } from './dto/query-category-products.dto';

@Controller('categories')
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** Active categories — the public browse rail. */
  @Get()
  findAll() {
    return this.categoriesService.findAll();
  }

  /** "See all" for one category. */
  @Get(':slug/products')
  findProducts(
    @Param('slug') slug: string,
    @Query() query: QueryCategoryProductsDto,
  ) {
    return this.categoriesService.findProductsBySlug(
      slug,
      query.page,
      query.pageSize,
      query.search,
    );
  }

  /** Stores tagged with this category. */
  @Get(':slug/stores')
  findStores(@Param('slug') slug: string) {
    return this.categoriesService.findStoresBySlug(slug);
  }
}
