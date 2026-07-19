import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { BannersService } from '../banners/banners.service';
import { QueryStoresDto } from '../catalog/dto/query-stores.dto';

/**
 * Aggregates every read the home page needs into a single response so the client
 * makes one round-trip instead of three (stores, featured dishes, banners).
 *
 * It does no data work of its own — it fans out to the catalog and banner
 * services in PARALLEL and reuses their existing versioned Redis caches. So a
 * warm home request is three cache GETs resolved concurrently (single-digit ms),
 * and a cold one is three parallel `lean()` Mongo queries rather than three
 * sequential HTTP requests. Invalidation is inherited for free: a store/menu
 * edit bumps the catalog namespace, a banner edit bumps the banner namespace,
 * and the very next home request rebuilds only the part that changed.
 */
@Injectable()
export class HomeService {
  constructor(
    private readonly catalogService: CatalogService,
    private readonly bannersService: BannersService,
  ) {}

  async getHomepage() {
    const [stores, featured, banners] = await Promise.all([
      // `{}` → all public (non-platform) stores; the client filters by category
      // locally, exactly as the standalone /stores listing did.
      this.catalogService.findStores(new QueryStoresDto()),
      this.catalogService.findFeaturedProducts(),
      this.bannersService.findAll(),
    ]);

    return {
      stores: stores.items,
      featured: featured.items,
      banners: banners.items,
    };
  }
}
