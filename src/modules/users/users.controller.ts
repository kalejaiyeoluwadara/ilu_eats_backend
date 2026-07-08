import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CatalogService } from '../catalog/catalog.service';
import { UpdateUserDto } from './dto/update-user.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('users/me')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly catalogService: CatalogService,
  ) {}

  @Patch()
  updateMe(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateUserDto) {
    return this.usersService.updateMe(user.id, dto);
  }

  @Get('addresses')
  getAddresses(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.getAddresses(user.id);
  }

  @Post('addresses')
  addAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.addAddress(user.id, dto);
  }

  @Patch('addresses/:id')
  updateAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(user.id, id, dto);
  }

  @Delete('addresses/:id')
  removeAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.removeAddress(user.id, id);
  }

  @Post('addresses/:id/default')
  setDefaultAddress(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.usersService.setDefaultAddress(user.id, id);
  }

  @Get('favorites')
  async getFavorites(@CurrentUser() user: AuthenticatedUser) {
    const productIds = await this.usersService.getFavoriteIds(user.id);
    const products = await this.catalogService.findProductsByIds(productIds);
    const bySlugOrder = productIds
      .map((id) => products.find((p) => p._id.toString() === id))
      .filter(Boolean);
    return { productIds, products: bySlugOrder };
  }

  @Post('favorites/:productId')
  @HttpCode(204)
  addFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.usersService.addFavorite(user.id, productId);
  }

  @Delete('favorites/:productId')
  @HttpCode(204)
  removeFavorite(
    @CurrentUser() user: AuthenticatedUser,
    @Param('productId') productId: string,
  ) {
    return this.usersService.removeFavorite(user.id, productId);
  }
}
