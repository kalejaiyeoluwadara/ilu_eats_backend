import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { QueryStoresDto } from './dto/query-stores.dto';
import { QueryNearbyStoresDto } from './dto/query-nearby-stores.dto';
import { CategoryId } from '../../common/enums/category.enum';

@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('stores')
  findStores(@Query() query: QueryStoresDto) {
    return this.catalogService.findStores(query);
  }

  // Must be declared before 'stores/:slug' so "near" isn't captured as a slug.
  @Get('stores/near')
  findStoresNear(@Query() query: QueryNearbyStoresDto) {
    return this.catalogService.findStoresNear(
      query.lng,
      query.lat,
      query.radiusKm,
      query.category,
    );
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

  @Get('products/by-ids')
  async findProductsByIds(@Query('ids') ids?: string) {
    const items = ids
      ? await this.catalogService.findProductsByIds(
          ids.split(',').filter(Boolean),
        )
      : [];
    return { items };
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
