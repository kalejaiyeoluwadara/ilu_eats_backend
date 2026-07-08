import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { QueryStoresDto } from './dto/query-stores.dto';
import { CategoryId } from '../../common/enums/category.enum';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('stores')
  findStores(@Query() query: QueryStoresDto) {
    return this.catalogService.findStores(query);
  }

  @Get('stores/:slug')
  findStore(@Param('slug') slug: string) {
    return this.catalogService.findStoreBySlug(slug);
  }

  @Get('stores/:slug/products')
  findStoreProducts(
    @Param('slug') slug: string,
    @Query('category') category?: CategoryId,
  ) {
    return this.catalogService.findProductsByStore(slug, category);
  }

  @Get('products/featured')
  findFeaturedProducts() {
    return this.catalogService.findFeaturedProducts();
  }

  @Get('products/:storeSlug/:productSlug')
  findProduct(
    @Param('storeSlug') storeSlug: string,
    @Param('productSlug') productSlug: string,
  ) {
    return this.catalogService.findProductBySlugs(storeSlug, productSlug);
  }

  @Get('search')
  search(
    @Query('q') q: string,
    @Query('type') type?: 'all' | 'stores' | 'dishes',
  ) {
    return this.catalogService.search(q, type);
  }
}
