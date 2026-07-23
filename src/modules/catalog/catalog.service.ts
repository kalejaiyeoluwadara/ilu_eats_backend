import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Store, StoreDocument } from './schemas/store.schema';
import { Product, ProductDocument } from './schemas/product.schema';
import { QueryStoresDto } from './dto/query-stores.dto';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryAdminProductsDto } from './dto/query-admin-products.dto';
import { CategoryId } from '../../common/enums/category.enum';
import { generateUniqueSlug } from '../../common/utils/slug.util';
import { paginate } from '../../common/dto/paginated-result.dto';
import { ActivityService } from '../activity/activity.service';
import { CloudinaryService } from '../../cloudinary/cloudinary.service';
import { PlatformService } from '../platform/platform.service';
import { CacheService } from '../../common/redis/cache.service';
import { computeDeliveryFee, LngLat } from '../../common/geo/geo.util';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SearchType } from './dto/search.dto';
import {
  PRODUCT_SEARCH_DEFINITION,
  PRODUCT_SEARCH_INDEX,
  STORE_SEARCH_DEFINITION,
  STORE_SEARCH_INDEX,
  ensureSearchIndexes,
} from './search-indexes';

const PLATFORM_STORE_SLUG = 'ilueats-kitchen';

/** All catalog reads share one cache namespace, so any store/product write
 * refreshes every listing at once. Menu edits are infrequent, so this coarse
 * invalidation costs little and sidesteps tracking cross-effects (slug renames
 * cascading to products, popularity toggles moving items in/out of featured). */
const CATALOG_NS = 'catalog';
const CATALOG_TTL = 60; // seconds

/** A store row from the near-me $geoNear aggregation: the lean store fields plus
 *  the straight-line `distanceMeters` the stage annotates each result with. */
type NearbyStoreDoc = Record<string, unknown> & {
  geo: { coordinates: [number, number] };
  distanceMeters: number;
};

/** Build a GeoJSON point from a lat/lng pair, or null unless both are present. */
function geoFromLatLng(
  latitude?: number,
  longitude?: number,
): { type: 'Point'; coordinates: number[] } | null {
  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    return null;
  }
  return { type: 'Point', coordinates: [longitude, latitude] };
}

@Injectable()
export class CatalogService implements OnModuleInit {
  private readonly logger = new Logger(CatalogService.name);

  /** Flips to false the first time an Atlas `$search` stage errors (e.g. the
   * index isn't built yet, or the cluster has no Search), so we stop paying the
   * failed-round-trip cost and serve the `$text` fallback until next restart. */
  private atlasSearchAvailable = true;

  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly activityService: ActivityService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly platformService: PlatformService,
    private readonly cache: CacheService,
    private readonly geocodingService: GeocodingService,
  ) {}

  async onModuleInit() {
    await ensureSearchIndexes([
      {
        model: this.productModel,
        name: PRODUCT_SEARCH_INDEX,
        definition: PRODUCT_SEARCH_DEFINITION,
      },
      {
        model: this.storeModel,
        name: STORE_SEARCH_INDEX,
        definition: STORE_SEARCH_DEFINITION,
      },
    ]);
  }

  async findStores(query: QueryStoresDto) {
    const filter: Record<string, any> = { isPlatform: { $ne: true } };
    if (query.category && query.category !== ('all' as any)) {
      filter.categories = query.category;
    }
    if (query.featured !== undefined) {
      filter.isFeatured = query.featured;
    }
    if (query.q) {
      filter.$text = { $search: query.q };
    }

    const run = async () => {
      const items = await this.storeModel
        .find(filter)
        .sort({ createdAt: -1 })
        .lean();
      return { items };
    };

    // Text searches are high-cardinality and rarely repeat, so caching them just
    // churns keys — only cache the shared, browse-by-category listings (the home
    // page and category tabs every user hits).
    if (query.q) return run();
    const suffix = `stores:${query.category ?? 'all'}:${query.featured ?? 'any'}`;
    return this.cache.wrapVersioned(CATALOG_NS, suffix, CATALOG_TTL, run);
  }

  /**
   * Stores near a customer, sorted by proximity, each annotated with road
   * distance and the delivery fee it would cost from there. Requires the
   * 2dsphere index on `geo`; stores without coordinates are naturally excluded.
   */
  async findStoresNear(
    lng: number,
    lat: number,
    radiusKm?: number,
    category?: CategoryId,
  ) {
    // Bucket coordinates to ~3 decimals (~110m) so customers standing near each
    // other share a cache entry instead of each triggering their own $geoNear
    // aggregation. Rounding the radius/category into the key keeps variants apart.
    const suffix = `near:${lat.toFixed(3)}:${lng.toFixed(3)}:${radiusKm ?? 'auto'}:${category ?? 'all'}`;

    return this.cache.wrapVersioned(
      CATALOG_NS,
      suffix,
      CATALOG_TTL,
      async () => {
        const pricing = await this.platformService.getDeliveryPricing();
        // maxDistance pre-filters by straight-line metres (cheap DB-side bound);
        // the display distance/fee below use real road distance. Fall back to the
        // platform max radius when unspecified.
        const maxDistanceMeters = (radiusKm ?? pricing.maxRadiusKm) * 1000;

        const query: Record<string, any> = { isPlatform: { $ne: true } };
        if (category && category !== ('all' as any))
          query.categories = category;

        const docs = await this.storeModel.aggregate<NearbyStoreDoc>([
          {
            $geoNear: {
              near: { type: 'Point', coordinates: [lng, lat] },
              distanceField: 'distanceMeters',
              maxDistance: maxDistanceMeters,
              spherical: true,
              query,
            },
          },
        ]);

        // Real Google road distance from the customer to every store in ONE
        // batched Routes call (cached per pair; falls back to a haversine
        // estimate per store if Routes is down). $geoNear only returns stores
        // that have `geo`, so every doc has coordinates to route to.
        const origin: LngLat = [lng, lat];
        const dests: LngLat[] = docs.map((store) => [
          store.geo.coordinates[0],
          store.geo.coordinates[1],
        ]);
        const routes = await this.geocodingService.routeDistancesFromOrigin(
          origin,
          dests,
        );

        const items = docs.map((store, i) => {
          const distanceKm = routes[i].distanceKm;
          // Drop the geoNear-only straight-line field; the real road distance
          // computed above is what we surface.
          const { distanceMeters: _straightLine, ...rest } = store;
          return {
            ...rest,
            distanceKm: Math.round(distanceKm * 10) / 10,
            deliveryFee: computeDeliveryFee(distanceKm, pricing),
          };
        });
        return { items };
      },
    );
  }

  async findStoreBySlug(slug: string) {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      `store:${slug}`,
      CATALOG_TTL,
      async () => {
        const store = await this.storeModel.findOne({ slug }).lean();
        if (!store) throw new NotFoundException('Store not found');
        return store;
      },
    );
  }

  async findStoreOrThrow(id: string) {
    const store = await this.storeModel.findById(id);
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findProductsByStore(storeSlug: string, category?: CategoryId) {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      `products:${storeSlug}:${category ?? 'all'}`,
      CATALOG_TTL,
      async () => {
        const store = await this.storeModel.findOne({ slug: storeSlug }).lean();
        if (!store) throw new NotFoundException('Store not found');
        const filter: Record<string, any> = { storeId: store._id };
        if (category) filter.category = category;
        const items = await this.productModel.find(filter).lean();
        return { items };
      },
    );
  }

  async findProductBySlugs(storeSlug: string, productSlug: string) {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      `product:${storeSlug}:${productSlug}`,
      CATALOG_TTL,
      async () => {
        const product = await this.productModel
          .findOne({ storeSlug, slug: productSlug })
          .lean();
        if (!product) throw new NotFoundException('Product not found');
        return product;
      },
    );
  }

  async findFeaturedProducts() {
    // Same result for every user → single cache entry, highest hit rate of all.
    return this.cache.wrapVersioned(
      CATALOG_NS,
      'featured',
      CATALOG_TTL,
      async () => {
        const items = await this.productModel.find({ isPopular: true }).lean();
        return { items };
      },
    );
  }

  /**
   * Customer-facing search across stores and dishes.
   *
   * Uses Atlas Search when available: a compound query that must match the
   * name (fuzzy, tolerant of typos), an autocomplete prefix, or the
   * description, then boosts popular / higher-rated items so the best matches
   * float to the top. Falls back to a `$text` search (sorted by textScore) if
   * the Atlas index isn't ready yet, so search never goes dark during rollout.
   */
  async search(q: string, type: SearchType = 'all', page = 1, pageSize = 20) {
    const term = q?.trim();
    const empty = { stores: [], products: [] };
    if (!term) return empty;

    const wantStores = type === 'all' || type === 'stores';
    const wantDishes = type === 'all' || type === 'dishes';
    const limit = Math.min(Math.max(pageSize, 1), 50);
    const skip = (Math.max(page, 1) - 1) * limit;

    const [stores, products] = await Promise.all([
      wantStores ? this.searchStores(term, limit, skip) : Promise.resolve([]),
      wantDishes ? this.searchProducts(term, limit, skip) : Promise.resolve([]),
    ]);
    return { stores, products };
  }

  /** Typo-tolerant name suggestions for the search box (as-you-type). */
  async suggest(q: string, limit = 6) {
    const term = q?.trim();
    if (!term) return { stores: [], products: [] };
    const size = Math.min(Math.max(limit, 1), 10);

    if (!this.atlasSearchAvailable) {
      const rx = new RegExp(
        `^${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`,
        'i',
      );
      const [stores, products] = await Promise.all([
        this.storeModel
          .find({ name: rx, isPlatform: { $ne: true } })
          .select('name slug image')
          .limit(size)
          .lean(),
        this.productModel
          .find({ name: rx })
          .select('name slug storeSlug image')
          .limit(size)
          .lean(),
      ]);
      return { stores, products };
    }

    const autocomplete = {
      query: term,
      path: 'name',
      fuzzy: { maxEdits: 1, prefixLength: 1 },
    };

    try {
      const [stores, products] = await Promise.all([
        this.storeModel.aggregate([
          {
            $search: {
              index: STORE_SEARCH_INDEX,
              autocomplete,
            },
          },
          { $match: { isPlatform: { $ne: true } } },
          { $limit: size },
          { $project: { name: 1, slug: 1, image: 1 } },
        ]),
        this.productModel.aggregate([
          {
            $search: { index: PRODUCT_SEARCH_INDEX, autocomplete },
          },
          { $limit: size },
          { $project: { name: 1, slug: 1, storeSlug: 1, image: 1 } },
        ]),
      ]);
      return { stores, products };
    } catch (err) {
      this.disableAtlasSearch('suggest', err);
      return this.suggest(q, limit);
    }
  }

  /** Compound clause shared by store/product search: a match on any of name
   * (fuzzy), name-prefix, or description, with name weighted highest. */
  private nameTextClause(term: string) {
    return {
      compound: {
        should: [
          {
            text: {
              query: term,
              path: 'name',
              score: { boost: { value: 5 } },
              fuzzy: { maxEdits: 1, prefixLength: 1, maxExpansions: 50 },
            },
          },
          {
            autocomplete: {
              query: term,
              path: 'name',
              score: { boost: { value: 3 } },
              fuzzy: { maxEdits: 1, prefixLength: 1 },
            },
          },
          {
            text: {
              query: term,
              path: 'description',
              fuzzy: { maxEdits: 1, prefixLength: 2 },
            },
          },
        ],
        minimumShouldMatch: 1,
      },
    };
  }

  private async searchProducts(term: string, limit: number, skip: number) {
    if (this.atlasSearchAvailable) {
      try {
        return await this.productModel.aggregate([
          {
            $search: {
              index: PRODUCT_SEARCH_INDEX,
              compound: {
                must: [this.nameTextClause(term)],
                // Popular dishes get a scoring nudge without excluding others.
                should: [
                  {
                    equals: {
                      path: 'isPopular',
                      value: true,
                      score: { boost: { value: 2 } },
                    },
                  },
                ],
              },
            },
          },
          { $skip: skip },
          { $limit: limit },
          { $set: { searchScore: { $meta: 'searchScore' } } },
        ]);
      } catch (err) {
        this.disableAtlasSearch('product search', err);
      }
    }
    return this.productModel
      .find({ $text: { $search: term } }, { score: { $meta: 'textScore' } })
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  private async searchStores(term: string, limit: number, skip: number) {
    if (this.atlasSearchAvailable) {
      try {
        return await this.storeModel.aggregate([
          {
            $search: {
              index: STORE_SEARCH_INDEX,
              compound: {
                must: [this.nameTextClause(term)],
                should: [
                  // Secondary signals: match on tagline/location/tags, plus a
                  // scoring nudge for stores that are currently open.
                  {
                    text: {
                      query: term,
                      path: ['tagline', 'location', 'tags'],
                      fuzzy: { maxEdits: 1, prefixLength: 2 },
                    },
                  },
                  {
                    equals: {
                      path: 'isOpen',
                      value: true,
                      score: { boost: { value: 2 } },
                    },
                  },
                ],
              },
            },
          },
          // Hidden house store must never surface in customer search.
          { $match: { isPlatform: { $ne: true } } },
          { $skip: skip },
          { $limit: limit },
          { $set: { searchScore: { $meta: 'searchScore' } } },
        ]);
      } catch (err) {
        this.disableAtlasSearch('store search', err);
      }
    }
    return this.storeModel
      .find(
        { $text: { $search: term }, isPlatform: { $ne: true } },
        { score: { $meta: 'textScore' } },
      )
      .sort({ score: { $meta: 'textScore' } })
      .skip(skip)
      .limit(limit)
      .lean();
  }

  private disableAtlasSearch(context: string, err: unknown) {
    if (this.atlasSearchAvailable) {
      this.logger.warn(
        `Atlas Search unavailable during ${context}, falling back to $text: ${(err as Error).message}`,
      );
    }
    this.atlasSearchAvailable = false;
  }

  async createStore(dto: CreateStoreDto) {
    const slug = await generateUniqueSlug(
      this.storeModel,
      dto.slug || dto.name,
    );
    const geo = geoFromLatLng(dto.latitude, dto.longitude);
    const store = await this.storeModel.create({
      ...dto,
      slug,
      categories: dto.categories?.length ? dto.categories : [CategoryId.Snacks],
      ...(geo ? { geo } : {}),
    });
    await this.cache.bumpVersion(CATALOG_NS);
    void this.activityService.log('stores', `Store created · ${store.name}`);
    return store.toObject();
  }

  async deleteStore(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid store id');
    const store = await this.storeModel.findById(id);
    if (!store) throw new NotFoundException('Store not found');
    if (store.isPlatform)
      throw new BadRequestException('The platform store cannot be deleted');
    const { deletedCount } = await this.productModel.deleteMany({
      storeId: store._id,
    });
    await store.deleteOne();
    await this.cache.bumpVersion(CATALOG_NS);
    void this.activityService.log(
      'stores',
      `Store deleted · ${store.name} (${deletedCount} item${deletedCount === 1 ? '' : 's'} removed)`,
    );
  }

  /**
   * House store that owns standalone items sold directly by the platform.
   * Created on demand; hidden from public store listings.
   */
  async ensurePlatformStore() {
    const existing = await this.storeModel.findOne({ isPlatform: true });
    if (existing) return existing.toObject();
    const store = await this.storeModel.create({
      slug: await generateUniqueSlug(this.storeModel, PLATFORM_STORE_SLUG),
      name: 'ìlúEats Kitchen',
      tagline: 'Straight from ìlúEats',
      description:
        'Standalone items sold directly by ìlúEats, outside any vendor storefront.',
      categories: [CategoryId.Snacks],
      isOpen: true,
      isPlatform: true,
      location: 'Ilisan-Remo',
    });
    return store.toObject();
  }

  async findAllProductsAdmin(query: QueryAdminProductsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const filter: Record<string, any> = {};
    if (query.storeId) filter.storeId = new Types.ObjectId(query.storeId);
    if (query.category && query.category !== ('all' as any)) {
      filter.category = query.category;
    }
    if (query.q) {
      const rx = new RegExp(
        query.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'i',
      );
      filter.$or = [{ name: rx }, { description: rx }, { storeSlug: rx }];
    }

    const [items, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    const storeIds = [...new Set(items.map((p) => String(p.storeId)))];
    const stores = await this.storeModel
      .find({ _id: { $in: storeIds } })
      .select('name isPlatform')
      .lean();
    const storeById = new Map(stores.map((s) => [String(s._id), s]));

    return paginate(
      items.map((p) => ({
        ...p,
        storeName: storeById.get(String(p.storeId))?.name ?? p.storeSlug,
        storeIsPlatform: !!storeById.get(String(p.storeId))?.isPlatform,
      })),
      totalItems,
      page,
      pageSize,
    );
  }

  async duplicateProduct(id: string, targetStoreId?: string) {
    const source = await this.getProductDocById(id);
    const store = await this.findStoreOrThrow(
      targetStoreId ?? String(source.storeId),
    );

    const src = source.toObject();
    const slug = await generateUniqueSlug(this.productModel, src.slug, {
      storeId: store._id,
    });

    const copy = await this.productModel.create({
      name: src.name,
      description: src.description,
      price: src.price,
      oldPrice: src.oldPrice,
      image: src.image,
      category: src.category,
      isPopular: src.isPopular,
      isNew: src.isNew,
      rating: src.rating,
      reviews: src.reviews,
      options: src.options,
      slug,
      storeId: store._id,
      storeSlug: store.slug,
    });
    await this.cache.bumpVersion(CATALOG_NS);
    void this.activityService.log(
      'stores',
      `Item duplicated · ${copy.name} → ${store.name}`,
    );
    return copy.toObject();
  }

  async updateStore(id: string, dto: UpdateStoreDto) {
    const store = await this.findStoreOrThrow(id);
    const previousSlug = store.slug;

    if (dto.slug && dto.slug !== previousSlug) {
      store.slug = await generateUniqueSlug(this.storeModel, dto.slug, {
        _id: { $ne: store._id },
      });
    }

    const geo = geoFromLatLng(dto.latitude, dto.longitude);
    Object.assign(store, {
      ...dto,
      slug: store.slug,
      ...(geo ? { geo } : {}),
    });
    await store.save();

    if (store.slug !== previousSlug) {
      await this.productModel.updateMany(
        { storeId: store._id },
        { $set: { storeSlug: store.slug } },
      );
    }

    await this.cache.bumpVersion(CATALOG_NS);
    return store.toObject();
  }

  async createProduct(
    storeId: string,
    dto: CreateProductDto,
    file?: Express.Multer.File,
  ) {
    const store = await this.findStoreOrThrow(storeId);
    const slug = await generateUniqueSlug(
      this.productModel,
      dto.slug || dto.name,
      {
        storeId: store._id,
      },
    );

    const price = Math.round(dto.price);
    const oldPrice =
      dto.oldPrice && dto.oldPrice > 0 ? Math.round(dto.oldPrice) : null;

    const image = file
      ? (await this.cloudinaryService.uploadFile(file, 'menu-items')).secure_url
      : dto.image;

    const product = await this.productModel.create({
      ...dto,
      image,
      price,
      oldPrice,
      slug,
      storeId: store._id,
      storeSlug: store.slug,
    });
    await this.cache.bumpVersion(CATALOG_NS);
    return product.toObject();
  }

  async updateProduct(
    id: string,
    dto: UpdateProductDto,
    file?: Express.Multer.File,
  ) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    if (dto.slug && dto.slug !== product.slug) {
      product.slug = await generateUniqueSlug(this.productModel, dto.slug, {
        storeId: product.storeId,
        _id: { $ne: product._id },
      });
    }

    Object.assign(product, { ...dto, slug: product.slug });

    if (file) {
      const upload = await this.cloudinaryService.uploadFile(
        file,
        'menu-items',
      );
      product.image = upload.secure_url;
    }

    if (dto.price !== undefined) product.price = Math.round(dto.price);
    if (dto.oldPrice !== undefined) {
      product.oldPrice = dto.oldPrice > 0 ? Math.round(dto.oldPrice) : null;
    }

    await product.save();
    await this.cache.bumpVersion(CATALOG_NS);
    return product.toObject();
  }

  async deleteProduct(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product id');
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Product not found');
    await this.cache.bumpVersion(CATALOG_NS);
  }

  async findProductsByIds(ids: string[]) {
    return this.productModel.find({ _id: { $in: ids } }).lean();
  }

  async getProductDocById(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new NotFoundException('Product not found');
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async getStoreDocById(id: string) {
    return this.findStoreOrThrow(id);
  }
}
