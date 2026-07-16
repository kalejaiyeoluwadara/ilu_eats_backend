import {
  BadRequestException,
  Injectable,
  NotFoundException,
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
import {
  computeDeliveryFee,
  ROAD_DISTANCE_FACTOR,
} from '../../common/geo/geo.util';

const PLATFORM_STORE_SLUG = 'ilueats-kitchen';

/** All catalog reads share one cache namespace, so any store/product write
 * refreshes every listing at once. Menu edits are infrequent, so this coarse
 * invalidation costs little and sidesteps tracking cross-effects (slug renames
 * cascading to products, popularity toggles moving items in/out of featured). */
const CATALOG_NS = 'catalog';
const CATALOG_TTL = 60; // seconds

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
export class CatalogService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly activityService: ActivityService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly platformService: PlatformService,
    private readonly cache: CacheService,
  ) {}

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

    return this.cache.wrapVersioned(CATALOG_NS, suffix, CATALOG_TTL, async () => {
      const pricing = await this.platformService.getDeliveryPricing();
      // maxDistance is straight-line metres; the display distance/fee below add
      // the road factor. Fall back to the platform max radius when unspecified.
      const maxDistanceMeters = (radiusKm ?? pricing.maxRadiusKm) * 1000;

      const query: Record<string, any> = { isPlatform: { $ne: true } };
      if (category && category !== ('all' as any)) query.categories = category;

      const docs = await this.storeModel.aggregate([
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

      const items = docs.map((store: any) => {
        const distanceKm = (store.distanceMeters / 1000) * ROAD_DISTANCE_FACTOR;
        const { distanceMeters, ...rest } = store;
        return {
          ...rest,
          distanceKm: Math.round(distanceKm * 10) / 10,
          deliveryFee: computeDeliveryFee(distanceKm, pricing),
        };
      });
      return { items };
    });
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
        const items = await this.productModel
          .find({ isPopular: true })
          .lean();
        return { items };
      },
    );
  }

  async search(q: string, type: 'all' | 'stores' | 'dishes' = 'all') {
    const result: { stores: any[]; products: any[] } = {
      stores: [],
      products: [],
    };
    if (!q) return result;
    if (type === 'all' || type === 'stores') {
      result.stores = await this.storeModel
        .find({ $text: { $search: q }, isPlatform: { $ne: true } })
        .lean();
    }
    if (type === 'all' || type === 'dishes') {
      result.products = await this.productModel
        .find({ $text: { $search: q } })
        .lean();
    }
    return result;
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
      ? (await this.cloudinaryService.uploadFile(file, 'menu-items'))
          .secure_url
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
