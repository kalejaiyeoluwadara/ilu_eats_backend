import { Controller, Get, Param, Query } from '@nestjs/common';
import { CatalogService } from './catalog.service';
import { QueryStoresDto } from './dto/query-stores.dto';
import { QueryNearbyStoresDto } from './dto/query-nearby-stores.dto';
import { SearchDto, SuggestDto } from './dto/search.dto';


@Controller()
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('stores')
  findStores(@Query() query: QueryStoresDto) {
    return this.catalogService.findStores(query);
  }

  // Public read of the house store so the storefront can resolve its slug
  // without hardcoding it. Creation stays admin-only (POST /platform-store).
  @Get('platform-store')
  findPlatformStore() {
    return this.catalogService.findPlatformStore();
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

  // Also before 'stores/:slug'. Lets a page resolve the handful of stores it
  // actually references (cart, favourites) in one request instead of pulling
  // the whole catalog to look two of them up.
  @Get('stores/by-slugs')
  async findStoresBySlugs(@Query('slugs') slugs?: string) {
    const items = slugs
      ? await this.catalogService.findStoresBySlugs(
          slugs.split(',').filter(Boolean),
        )
      : [];
    return { items };
  }

  @Get('stores/:slug')
  findStore(@Param('slug') slug: string) {
    return this.catalogService.findStoreBySlug(slug);
  }

  @Get('stores/:slug/products')
  findStoreProducts(
    @Param('slug') slug: string,
    @Query('category') category?: string,
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
  search(@Query() query: SearchDto) {
    return this.catalogService.search(
      query.q ?? '',
      query.type ?? 'all',
      query.page ?? 1,
      query.pageSize ?? 20,
    );
  }

  // Lightweight as-you-type suggestions for the search box.
  @Get('search/suggest')
  suggest(@Query() query: SuggestDto) {
    return this.catalogService.suggest(query.q ?? '', query.limit ?? 6);
  }
}
