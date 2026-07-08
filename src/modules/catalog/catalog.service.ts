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
import { CategoryId } from '../../common/enums/category.enum';
import { generateUniqueSlug } from '../../common/utils/slug.util';

@Injectable()
export class CatalogService {
  constructor(
    @InjectModel(Store.name) private storeModel: Model<StoreDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
  ) {}

  async findStores(query: QueryStoresDto) {
    const filter: Record<string, any> = {};
    if (query.category && query.category !== ('all' as any)) {
      filter.categories = query.category;
    }
    if (query.featured !== undefined) {
      filter.isFeatured = query.featured;
    }
    if (query.q) {
      filter.$text = { $search: query.q };
    }
    const items = await this.storeModel
      .find(filter)
      .sort({ createdAt: -1 })
      .lean();
    return { items };
  }

  async findStoreBySlug(slug: string) {
    const store = await this.storeModel.findOne({ slug }).lean();
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findStoreOrThrow(id: string) {
    const store = await this.storeModel.findById(id);
    if (!store) throw new NotFoundException('Store not found');
    return store;
  }

  async findProductsByStore(storeSlug: string, category?: CategoryId) {
    const store = await this.storeModel.findOne({ slug: storeSlug }).lean();
    if (!store) throw new NotFoundException('Store not found');
    const filter: Record<string, any> = { storeId: store._id };
    if (category) filter.category = category;
    const items = await this.productModel.find(filter).lean();
    return { items };
  }

  async findProductBySlugs(storeSlug: string, productSlug: string) {
    const product = await this.productModel
      .findOne({ storeSlug, slug: productSlug })
      .lean();
    if (!product) throw new NotFoundException('Product not found');
    return product;
  }

  async findFeaturedProducts() {
    const items = await this.productModel.find({ isPopular: true }).lean();
    return { items };
  }

  async search(q: string, type: 'all' | 'stores' | 'dishes' = 'all') {
    const result: { stores: any[]; products: any[] } = {
      stores: [],
      products: [],
    };
    if (!q) return result;
    if (type === 'all' || type === 'stores') {
      result.stores = await this.storeModel
        .find({ $text: { $search: q } })
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
    const store = await this.storeModel.create({
      ...dto,
      slug,
      categories: dto.categories?.length ? dto.categories : [CategoryId.Snacks],
    });
    return store.toObject();
  }

  async updateStore(id: string, dto: UpdateStoreDto) {
    const store = await this.findStoreOrThrow(id);
    const previousSlug = store.slug;

    if (dto.slug && dto.slug !== previousSlug) {
      store.slug = await generateUniqueSlug(this.storeModel, dto.slug, {
        _id: { $ne: store._id },
      });
    }

    Object.assign(store, { ...dto, slug: store.slug });
    await store.save();

    if (store.slug !== previousSlug) {
      await this.productModel.updateMany(
        { storeId: store._id },
        { $set: { storeSlug: store.slug } },
      );
    }

    return store.toObject();
  }

  async createProduct(storeId: string, dto: CreateProductDto) {
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

    const product = await this.productModel.create({
      ...dto,
      price,
      oldPrice,
      slug,
      storeId: store._id,
      storeSlug: store.slug,
    });
    return product.toObject();
  }

  async updateProduct(id: string, dto: UpdateProductDto) {
    const product = await this.productModel.findById(id);
    if (!product) throw new NotFoundException('Product not found');

    if (dto.slug && dto.slug !== product.slug) {
      product.slug = await generateUniqueSlug(this.productModel, dto.slug, {
        storeId: product.storeId,
        _id: { $ne: product._id },
      });
    }

    Object.assign(product, { ...dto, slug: product.slug });

    if (dto.price !== undefined) product.price = Math.round(dto.price);
    if (dto.oldPrice !== undefined) {
      product.oldPrice = dto.oldPrice > 0 ? Math.round(dto.oldPrice) : null;
    }

    await product.save();
    return product.toObject();
  }

  async deleteProduct(id: string) {
    if (!Types.ObjectId.isValid(id))
      throw new BadRequestException('Invalid product id');
    const result = await this.productModel.findByIdAndDelete(id);
    if (!result) throw new NotFoundException('Product not found');
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
