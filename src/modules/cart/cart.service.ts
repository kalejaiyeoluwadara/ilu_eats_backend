import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { CatalogService } from '../catalog/catalog.service';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { UpdateCartItemDto } from './dto/update-cart-item.dto';
import { resolveLinePrice } from '../../common/utils/pricing.util';

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    private readonly catalogService: CatalogService,
  ) {}

  private serialize(cart: CartDocument | null) {
    if (!cart || cart.items.length === 0) {
      return {
        items: [],
        storeId: null,
        storeSlug: null,
        storeName: null,
        subtotal: 0,
        count: 0,
      };
    }
    const subtotal = cart.items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const first = cart.items[0];
    return {
      items: cart.items.map((item) => ({
        id: item._id.toString(),
        productId: item.productId.toString(),
        storeId: item.storeId.toString(),
        storeSlug: item.storeSlug,
        storeName: item.storeName,
        name: item.name,
        image: item.image,
        price: item.price,
        quantity: item.quantity,
        notes: item.notes,
        selectedOptions: item.selectedOptions,
      })),
      storeId: first.storeId.toString(),
      storeSlug: first.storeSlug,
      storeName: first.storeName,
      subtotal,
      count,
    };
  }

  private async getOrCreateCart(userId: string) {
    let cart = await this.cartModel.findOne({ userId });
    if (!cart) cart = await this.cartModel.create({ userId, items: [] });
    return cart;
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    return this.serialize(cart);
  }

  async addItem(userId: string, dto: AddCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const product = await this.catalogService.getProductDocById(dto.productId);
    const store = await this.catalogService.getStoreDocById(
      product.storeId.toString(),
    );

    if (cart.items.length > 0 && !cart.items[0].storeId.equals(store._id)) {
      throw new ConflictException({ error: 'different-store' });
    }

    const { unitPrice, resolvedOptions } = resolveLinePrice(
      product,
      dto.selectedOptions,
    );

    cart.items.push({
      productId: product._id,
      storeId: store._id,
      storeSlug: store.slug,
      storeName: store.name,
      name: product.name,
      image: product.image,
      price: unitPrice,
      quantity: dto.quantity,
      notes: dto.notes ?? null,
      selectedOptions: resolvedOptions,
    });

    await cart.save();
    return this.serialize(cart);
  }

  async updateItem(userId: string, lineId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.id(lineId);
    if (!item) throw new NotFoundException('Cart line not found');

    const quantity = Math.min(99, Math.max(0, dto.quantity));
    if (quantity === 0) {
      item.deleteOne();
    } else {
      item.quantity = quantity;
    }

    await cart.save();
    return this.serialize(cart);
  }

  async removeItem(userId: string, lineId: string) {
    const cart = await this.getOrCreateCart(userId);
    const item = cart.items.id(lineId);
    if (!item) throw new NotFoundException('Cart line not found');
    item.deleteOne();
    await cart.save();
    return this.serialize(cart);
  }

  async clearCart(userId: string) {
    await this.cartModel.updateOne(
      { userId },
      { $set: { items: [] } },
      { upsert: true },
    );
  }
}
