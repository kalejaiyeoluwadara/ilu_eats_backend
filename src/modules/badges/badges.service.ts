import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Badge, BadgeDocument } from './schemas/badge.schema';
import {
  Product,
  ProductDocument,
  VISIBLE_PRODUCT_FILTER,
} from '../catalog/schemas/product.schema';
import { CreateBadgeDto } from './dto/create-badge.dto';
import { UpdateBadgeDto } from './dto/update-badge.dto';
import { BadgeMembershipDto } from './dto/badge-membership.dto';
import { CacheService } from '../../common/redis/cache.service';
import { CATALOG_NS } from '../../common/redis/cache-namespaces';
import { generateUniqueSlug } from '../../common/utils/slug.util';
import { paginate } from '../../common/dto/paginated-result.dto';
import { DEFAULT_BADGES, LEGACY_FLAG_BADGES } from './badges.defaults';

const BADGES_TTL = 60; // seconds

/** Fields a home badge group needs from each product. Trimming the payload
 * matters here: the home response can carry a dozen groups at once. */
const GROUP_PRODUCT_FIELDS =
  'name slug storeSlug storeId image price oldPrice rating reviews category badges';

@Injectable()
export class BadgesService implements OnModuleInit {
  private readonly logger = new Logger(BadgesService.name);

  constructor(
    @InjectModel(Badge.name) private badgeModel: Model<BadgeDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    private readonly cache: CacheService,
  ) {}

  /**
   * First boot against an existing database: create the starter badges and
   * fold the legacy `isPopular` / `isNew` booleans into badge membership, so
   * the home feed can read badges alone without losing the groups that were
   * already curated through those flags.
   *
   * Gated on an empty collection rather than being blindly idempotent — this
   * runs on every serverless cold start, and one countDocuments is cheaper
   * than a pair of updateMany scans.
   */
  async onModuleInit() {
    try {
      if ((await this.badgeModel.estimatedDocumentCount()) === 0) {
        await this.badgeModel.insertMany(DEFAULT_BADGES, { ordered: false });
      } else {
        // Backfill image paths on existing default badges if they don't have one set yet
        for (const defaultBadge of DEFAULT_BADGES) {
          if (defaultBadge.image) {
            await this.badgeModel.updateOne(
              { slug: defaultBadge.slug, $or: [{ image: '' }, { image: { $exists: false } }] },
              { $set: { image: defaultBadge.image } },
            );
          }
        }
      }
      await Promise.all(
        LEGACY_FLAG_BADGES.map(({ flag, slug }) =>
          this.productModel.updateMany(
            { [flag]: true, badges: { $ne: slug } },
            { $addToSet: { badges: slug } },
          ),
        ),
      );
      await this.cache.bumpVersion(CATALOG_NS);
      this.logger.log(
        `Seeded/updated ${DEFAULT_BADGES.length} default badge illustrations and backfilled membership`,
      );
    } catch (err) {
      // Never block boot on this — the badges just stay empty and admin can
      // create them by hand.
      this.logger.warn(
        `badge seed/backfill skipped: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // ---------------------------------------------------------------- reads

  /** Active badges, for chips on item cards and the client's filter rail. */
  async findAll() {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      'badges:active',
      BADGES_TTL,
      async () => {
        const items = await this.badgeModel
          .find({ isActive: true })
          .sort({ order: 1 })
          .lean();
        return { items };
      },
    );
  }

  /** Every badge including hidden ones, with live member counts — the admin list. */
  async findAllAdmin() {
    const badges = await this.badgeModel.find().sort({ order: 1 }).lean();
    const counts = await this.productModel.aggregate<{
      _id: string;
      count: number;
    }>([
      { $unwind: '$badges' },
      { $group: { _id: '$badges', count: { $sum: 1 } } },
    ]);
    const countBySlug = new Map(counts.map((c) => [c._id, c.count]));
    return {
      items: badges.map((b) => ({
        ...b,
        itemCount: countBySlug.get(b.slug) ?? 0,
      })),
    };
  }

  /**
   * The home feed: one group per badge, in admin order, each capped at its own
   * `maxItems`. Empty groups are dropped so a badge you're still filling never
   * renders as a blank row.
   *
   * Cached under the catalog namespace, so both a badge edit here and a menu
   * edit in CatalogService refresh it.
   */
  async findHomeGroups() {
    return this.cache.wrapVersioned(
      CATALOG_NS,
      'badges:groups',
      BADGES_TTL,
      async () => {
        const badges = await this.badgeModel
          .find({ isActive: true, showOnHome: true })
          .sort({ order: 1 })
          .lean();
        if (badges.length === 0) return { items: [] };

        const groups = await Promise.all(
          badges.map(async (badge) => ({
            badge,
            items: await this.productModel
              .find({ badges: badge.slug, ...VISIBLE_PRODUCT_FILTER })
              .select(GROUP_PRODUCT_FIELDS)
              .sort({ rating: -1, createdAt: -1 })
              .limit(Math.max(badge.maxItems || 12, 1))
              .lean(),
          })),
        );
        return { items: groups.filter((g) => g.items.length > 0) };
      },
    );
  }

  /** Every item carrying a badge, paginated — powers the "see all" page. */
  async findProductsBySlug(slug: string, page = 1, pageSize = 20) {
    const badge = await this.badgeModel.findOne({ slug }).lean();
    if (!badge) throw new NotFoundException('Badge not found');

    const size = Math.min(Math.max(pageSize, 1), 50);
    const current = Math.max(page, 1);
    const [items, totalItems] = await Promise.all([
      this.productModel
        .find({ badges: slug, ...VISIBLE_PRODUCT_FILTER })
        .sort({ rating: -1, createdAt: -1 })
        .skip((current - 1) * size)
        .limit(size)
        .lean(),
      this.productModel.countDocuments({
        badges: slug,
        ...VISIBLE_PRODUCT_FILTER,
      }),
    ]);
    return { badge, ...paginate(items, totalItems, current, size) };
  }

  // --------------------------------------------------------------- writes

  async create(dto: CreateBadgeDto) {
    const slug = await generateUniqueSlug(
      this.badgeModel,
      dto.slug || dto.label,
    );
    const order = await this.badgeModel.countDocuments();
    const badge = await this.badgeModel.create({ ...dto, slug, order });
    await this.cache.bumpVersion(CATALOG_NS);
    return badge.toObject();
  }

  /**
   * Renaming a badge's slug rewrites membership on every product that carries
   * it, so existing items don't silently fall out of their group.
   */
  async update(id: string, dto: UpdateBadgeDto) {
    const badge = await this.findOrThrow(id);
    const previousSlug = badge.slug;

    if (dto.slug && dto.slug !== previousSlug) {
      badge.slug = await generateUniqueSlug(this.badgeModel, dto.slug, {
        _id: { $ne: badge._id },
      });
    }

    Object.assign(badge, { ...dto, slug: badge.slug });
    await badge.save();

    if (badge.slug !== previousSlug) {
      await this.productModel.updateMany(
        { badges: previousSlug },
        { $set: { 'badges.$[element]': badge.slug } },
        { arrayFilters: [{ element: previousSlug }] },
      );
    }

    await this.cache.bumpVersion(CATALOG_NS);
    return badge.toObject();
  }

  /** Deleting a badge also strips it from every product — no dangling slugs. */
  async remove(id: string) {
    const badge = await this.findOrThrow(id);
    await this.productModel.updateMany(
      { badges: badge.slug },
      { $pull: { badges: badge.slug } },
    );
    await this.badgeModel.deleteOne({ _id: badge._id });
    await this.cache.bumpVersion(CATALOG_NS);
  }

  async reorder(orderedIds: string[]) {
    await Promise.all(
      orderedIds.map((id, index) =>
        this.badgeModel.updateOne({ _id: id }, { $set: { order: index } }),
      ),
    );
    await this.cache.bumpVersion(CATALOG_NS);
    return this.findAllAdmin();
  }

  /** Apply an add/remove diff from the admin item picker. */
  async updateMembership(id: string, dto: BadgeMembershipDto) {
    const badge = await this.findOrThrow(id);
    const add = dto.add ?? [];
    const remove = dto.remove ?? [];
    if (add.length === 0 && remove.length === 0) {
      throw new BadRequestException('Nothing to add or remove');
    }

    if (add.length > 0) {
      await this.productModel.updateMany(
        { _id: { $in: add.map((v) => new Types.ObjectId(v)) } },
        { $addToSet: { badges: badge.slug } },
      );
    }
    if (remove.length > 0) {
      await this.productModel.updateMany(
        { _id: { $in: remove.map((v) => new Types.ObjectId(v)) } },
        { $pull: { badges: badge.slug } },
      );
    }

    await this.cache.bumpVersion(CATALOG_NS);
    return this.findProductsBySlug(badge.slug, 1, 50);
  }

  private async findOrThrow(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundException('Badge not found');
    }
    const badge = await this.badgeModel.findById(id);
    if (!badge) throw new NotFoundException('Badge not found');
    return badge;
  }
}
