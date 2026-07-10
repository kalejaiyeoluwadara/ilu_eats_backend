import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcrypt';
import { User, UserDocument } from './schemas/user.schema';
import { Role } from '../../common/enums/role.enum';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class UsersService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  toPublicUser(user: UserDocument) {
    return {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
    };
  }

  findById(id: string) {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.userModel.findById(id);
  }

  findByEmail(email: string) {
    return this.userModel.findOne({ email: email.toLowerCase().trim() });
  }

  findByRole(role: Role) {
    return this.userModel.find({ role }).sort({ createdAt: -1 });
  }

  async createCustomer(name: string, email: string, password: string) {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create({
      name,
      email,
      passwordHash,
      role: Role.Customer,
    });
  }

  /** Operator accounts (rider/admin) are provisioned by an admin, never self-signup. */
  async createOperator(
    name: string,
    email: string,
    password: string,
    role: Role,
    phone?: string,
  ) {
    const existing = await this.findByEmail(email);
    if (existing) throw new ConflictException('Email already registered');
    const passwordHash = await bcrypt.hash(password, 10);
    return this.userModel.create({
      name,
      email,
      passwordHash,
      role,
      phone: phone ?? null,
    });
  }

  /** Admin-driven password reset for operator accounts (rider/admin) — no old-password check. */
  async setPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      { passwordHash },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async findOrCreateOAuthUser(name: string, email: string) {
    let user = await this.findByEmail(email);
    let isNew = false;
    if (!user) {
      const passwordHash = await bcrypt.hash(Math.random().toString(36), 10);
      user = await this.userModel.create({
        name,
        email: email.toLowerCase().trim(),
        passwordHash,
        role: Role.Customer,
      });
      isNew = true;
    }
    return { user, isNew };
  }

  async validateCredentials(email: string, password: string) {
    const user = await this.findByEmail(email);
    if (!user) return null;
    const matches = await bcrypt.compare(password, user.passwordHash);
    return matches ? user : null;
  }

  verifyPassword(user: UserDocument, password: string) {
    return bcrypt.compare(password, user.passwordHash);
  }

  async setPasswordResetToken(
    userId: string,
    tokenHash: string,
    expires: Date,
  ) {
    await this.userModel.updateOne(
      { _id: userId },
      { passwordResetTokenHash: tokenHash, passwordResetExpires: expires },
    );
  }

  /** Returns the user only if the hashed token matches and hasn't expired. */
  findByValidPasswordResetToken(tokenHash: string) {
    return this.userModel.findOne({
      passwordResetTokenHash: tokenHash,
      passwordResetExpires: { $gt: new Date() },
    });
  }

  /** Sets a new password and clears the reset token so it can't be reused. */
  async resetPassword(userId: string, password: string) {
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await this.userModel.findByIdAndUpdate(
      userId,
      {
        passwordHash,
        passwordResetTokenHash: null,
        passwordResetExpires: null,
      },
      { new: true },
    );
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  async updateMe(userId: string, dto: UpdateUserDto) {
    const user = await this.userModel.findByIdAndUpdate(userId, dto, {
      new: true,
    });
    if (!user) throw new NotFoundException('User not found');
    return this.toPublicUser(user);
  }

  async getAddresses(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');
    return { items: user.addresses };
  }

  async addAddress(userId: string, dto: CreateAddressDto) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const isFirst = user.addresses.length === 0;
    const isDefault = isFirst || Boolean(dto.makeDefault);

    if (isDefault) {
      user.addresses.forEach((address) => (address.isDefault = false));
    }

    user.addresses.push({
      label: dto.label,
      addressLine: dto.addressLine,
      phone: dto.phone,
      isDefault,
    });

    await user.save();
    return { items: user.addresses };
  }

  async updateAddress(
    userId: string,
    addressId: string,
    dto: UpdateAddressDto,
  ) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');

    const address = user.addresses.id(addressId);
    if (!address) throw new NotFoundException('Address not found');

    if (dto.isDefault) {
      user.addresses.forEach((a) => (a.isDefault = false));
    }

    Object.assign(address, dto);
    await user.save();
    return { items: user.addresses };
  }

  async removeAddress(userId: string, addressId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const address = user.addresses.id(addressId);
    if (!address) throw new NotFoundException('Address not found');
    address.deleteOne();
    await user.save();
    return { items: user.addresses };
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const user = await this.userModel.findById(userId);
    if (!user) throw new NotFoundException('User not found');
    const address = user.addresses.id(addressId);
    if (!address) throw new NotFoundException('Address not found');
    user.addresses.forEach((a) => (a.isDefault = a._id.equals(address._id)));
    await user.save();
    return { items: user.addresses };
  }

  async getFavoriteIds(userId: string) {
    const user = await this.userModel.findById(userId).lean();
    if (!user) throw new NotFoundException('User not found');
    return user.favoriteProductIds;
  }

  async addFavorite(userId: string, productId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { favoriteProductIds: productId } },
    );
    await this.userModel.updateOne(
      { _id: userId },
      { $push: { favoriteProductIds: { $each: [productId], $position: 0 } } },
    );
  }

  async removeFavorite(userId: string, productId: string) {
    await this.userModel.updateOne(
      { _id: userId },
      { $pull: { favoriteProductIds: productId } },
    );
  }
}
