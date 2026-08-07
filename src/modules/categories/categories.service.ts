import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import {
  Product,
  ProductDocument,
  VISIBLE_PRODUCT_FILTER,
} from '../catalog/schemas/product.schema';
import { Store, StoreDocument } from '../catalog/schemas/store.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { AssignCategoryProductsDto } from './dto/assign-category-products.dto';
import { CacheService } from '../../common/redis/cache.service';
import { CATALOG_NS } from '../../common/redis/cache-namespaces';
import { generateUniqueSlug } from '../../common/utils/slug.util';
import { paginate } from '../../common/dto/paginated-result.dto';
import { DEFAULT_CATEGORIES } from './categories.defaults';

const CATEGORIES_TTL = 300; // seconds — categories change far less than menus

/** Trimmed product payload for category listings, matching the badge groups. */
const GROUP_PRODUCT_FIELDS =
  'name slug storeSlug storeId image price oldPrice rating reviews category badges isHidden';

@Injectable()
export class CategoriesService implements OnModuleInit {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    private readonly cache: CacheService,
  ) {}

  /**
   * Migrate the old hardcoded enum into the collection on first boot. Slugs
   * match the enum values exactly, so every existing product and store keeps
   * resolving without touching their documents at all — this is purely
   * additive, which is what makes it safe to ship against live data.
   *
   * Gated on an empty collection rather than upserting, for the same reason
   * badges are: this runs on every cold start and one count is cheap.
   */
  async onModuleInit() {
    try {
      if ((await this.categoryModel.estimatedDocumentCount()) > 0) return;
      await this.categoryModel.insertMany(DEFAULT_CATEGORIES, {
        ordered: false,
      });
      await this.cache.bumpVersion(CATALOG_NS);
      this.logger.log(
        `Seeded ${DEFAULT_CATEGORIES.length} categories from the legacy CategoryId enum`,
      );
    } catch (err) {
      // Never block boot — worst case categories stay empty and admin creates
      // them by hand.
      this.logger.warn(
        `category seed skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---------------------------------------------------------------- reads

  /** Active categories for the public browse rail. */
  async findAll() {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      'categories:active',
      CATEGORIES_TTL,
      async () => {
        const items = await this.categoryModel
          .find({ isActive: true })
          .sort({ order: 1 })
          .lean();
        return { items };
      },
    );
  }

  /** Every category including hidden ones, with live product and store counts
   * — the admin list. */
  async findAllAdmin() {
    const categories = await this.categoryModel
      .find()
      .sort({ order: 1 })
      .lean();

    const [productCounts, storeCounts] = await Promise.all([
      this.productModel.aggregate<{ _id: string; count: number }>([
        { $group: { _id: '$category', count: { $sum: 1 } } },
      ]),
      this.storeModel.aggregate<{ _id: string; count: number }>([
        { $unwind: '$categories' },
        { $group: { _id: '$categories', count: { $sum: 1 } } },
      ]),
    ]);

    const productBySlug = new Map(productCounts.map((c) => [c._id, c.count]));
    const storeBySlug = new Map(storeCounts.map((c) => [c._id, c.count]));

    return {
      items: categories.map((c) => ({
        ...c,
        itemCount: productBySlug.get(c.slug) ?? 0,
        storeCount: storeBySlug.get(c.slug) ?? 0,
      })),
    };
  }

  /**
   * Every item inside a category, paginated — powers both the public "see all"
   * page and the admin category detail view.
   */
  async findProductsBySlug(
    slug: string,
    page = 1,
    pageSize = 20,
    search?: string,
    /** Admin callers pass true — the public "see all" page must not leak items
     * an admin has hidden. */
    includeHidden = false,
  ) {
    const category = await this.categoryModel.findOne({ slug }).lean();
    if (!category) throw new NotFoundException('Category not found');

    const size = Math.min(Math.max(pageSize, 1), 50);
    const current = Math.max(page, 1);

    const filter: Record<string, unknown> = {
      category: slug,
      ...(includeHidden ? {} : VISIBLE_PRODUCT_FILTER),
    };
    if (search?.trim()) {
      // Escaped so an admin typing "50% off" can't blow up the query.
      filter.name = {
        $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i',
      };
    }

    const [items, totalItems] = await Promise.all([
      this.productModel
        .find(filter)
        .select(GROUP_PRODUCT_FIELDS)
        .sort({ rating: -1, createdAt: -1 })
        .skip((current - 1) * size)
        .limit(size)
        .lean(),
      this.productModel.countDocuments(filter),
    ]);

    return { category, ...paginate(items, totalItems, current, size) };
  }

  /** Stores tagged with a category — the other half of the admin detail view. */
  async findStoresBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug }).lean();
    if (!category) throw new NotFoundException('Category not found');
    const items = await this.storeModel
      .find({ categories: slug })
      .select('name slug image cover rating categories isActive')
      .sort({ rating: -1 })
      .lean();
    return { category, items };
  }

  // --------------------------------------------------------------- writes

  async create(dto: CreateCategoryDto) {
    const slug = await generateUniqueSlug(
      this.categoryModel,
      dto.slug || dto.label,
    );
    const order = await this.categoryModel.countDocuments();
    const category = await this.categoryModel.create({ ...dto, slug, order });
    await this.cache.bumpVersion(CATALOG_NS);
    return category.toObject();
  }

  /**
   * Renaming a category's slug rewrites the reference on every product AND
   * every store that carries it. Without this an edit would silently empty the
   * category, since the old slug would no longer match anything.
   */
  async update(id: string, dto: UpdateCategoryDto) {
    const category = await this.findOrThrow(id);
    const previousSlug = category.slug;

    if (dto.slug && dto.slug !== previousSlug) {
      category.slug = await generateUniqueSlug(this.categoryModel, dto.slug, {
        _id: { $ne: category._id },
      });
    }

    Object.assign(category, { ...dto, slug: category.slug });
    await category.save();

    if (category.slug !== previousSlug) {
      await Promise.all([
        this.productModel.updateMany(
          { category: previousSlug },
          { $set: { category: category.slug } },
        ),
        this.storeModel.updateMany(
          { categories: previousSlug },
          { $set: { 'categories.$[element]': category.slug } },
          { arrayFilters: [{ element: previousSlug }] },
        ),
      ]);
    }

    await this.cache.bumpVersion(CATALOG_NS);
    return category.toObject();
  }

  /**
   * Deleting a category is NOT the same as deleting a badge. A badge is
   * optional decoration, so dropping it just strips a slug from some products.
   * `Product.category` is required — stripping it would leave documents that
   * fail their own schema and vanish from every listing.
   *
   * So a category still holding items refuses to delete unless the caller says
   * where those items should go. Stores are safe to simply untag, since their
   * membership is a set.
   */
  async remove(id: string, reassignTo?: string) {
    const category = await this.findOrThrow(id);

    const itemCount = await this.productModel.countDocuments({
      category: category.slug,
    });

    if (itemCount > 0) {
      if (!reassignTo) {
        throw new BadRequestException(
          `"${category.label}" still holds ${itemCount} item${itemCount === 1 ? '' : 's'}. ` +
            `Pass reassignTo=<slug> to move them into another category first.`,
        );
      }
      if (reassignTo === category.slug) {
        throw new BadRequestException(
          'reassignTo must be a different category',
        );
      }
      const target = await this.categoryModel
        .findOne({ slug: reassignTo })
        .lean();
      if (!target) {
        throw new BadRequestException(
          `No category with slug "${reassignTo}" to reassign items to`,
        );
      }
      await this.productModel.updateMany(
        { category: category.slug },
        { $set: { category: target.slug } },
      );
    }

    await this.storeModel.updateMany(
      { categories: category.slug },
      { $pull: { categories: category.slug } },
    );
    await this.categoryModel.deleteOne({ _id: category._id });
    await this.cache.bumpVersion(CATALOG_NS);

    return { reassignedItems: reassignTo ? itemCount : 0 };
  }

  async reorder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.categoryModel.updateOne({ _id: id }, { $set: { order: index } }),
      ),
    );
    await this.cache.bumpVersion(CATALOG_NS);
    return this.findAllAdmin();
  }

  /** Apply the admin picker's diff: move products in, add/remove stores. */
  async assign(id: string, dto: AssignCategoryProductsDto) {
    const category = await this.findOrThrow(id);
    const { add = [], addStores = [], removeStores = [] } = dto;

    if (add.length + addStores.length + removeStores.length === 0) {
      throw new BadRequestException('Nothing to assign');
    }

    await Promise.all([
      add.length > 0 &&
        this.productModel.updateMany(
          { _id: { $in: add.map((v) => new Types.ObjectId(v)) } },
          { $set: { category: category.slug } },
        ),
      addStores.length > 0 &&
        this.storeModel.updateMany(
          { _id: { $in: addStores.map((v) => new Types.ObjectId(v)) } },
          { $addToSet: { categories: category.slug } },
        ),
      removeStores.length > 0 &&
        this.storeModel.updateMany(
          { _id: { $in: removeStores.map((v) => new Types.ObjectId(v)) } },
          { $pull: { categories: category.slug } },
        ),
    ]);

    await this.cache.bumpVersion(CATALOG_NS);
    return this.findProductsBySlug(category.slug, 1, 50);
  }

  /** Slugs that currently exist — used to validate incoming category values
   * now that the enum no longer constrains them. */
  async existsBySlug(slug: string) {
    return (await this.categoryModel.countDocuments({ slug })) > 0;
  }

  private async findOrThrow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Category not found');
    }
    const category = await this.categoryModel.findById(id);
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }
}
