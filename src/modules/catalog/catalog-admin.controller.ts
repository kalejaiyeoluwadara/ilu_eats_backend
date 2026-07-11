import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { CatalogService } from './catalog.service';
import { CreateStoreDto } from './dto/create-store.dto';
import { UpdateStoreDto } from './dto/update-store.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryAdminProductsDto } from './dto/query-admin-products.dto';
import { DuplicateProductDto } from './dto/duplicate-product.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller()
export class CatalogAdminController {
  constructor(private readonly catalogService: CatalogService) {}

  @Post('stores')
  createStore(@Body() dto: CreateStoreDto) {
    return this.catalogService.createStore(dto);
  }

  @Patch('stores/:id')
  updateStore(@Param('id') id: string, @Body() dto: UpdateStoreDto) {
    return this.catalogService.updateStore(id, dto);
  }

  @Delete('stores/:id')
  deleteStore(@Param('id') id: string) {
    return this.catalogService.deleteStore(id);
  }

  @Post('platform-store')
  ensurePlatformStore() {
    return this.catalogService.ensurePlatformStore();
  }

  @Get('menu-items')
  findAllProducts(@Query() query: QueryAdminProductsDto) {
    return this.catalogService.findAllProductsAdmin(query);
  }

  @Post('menu-items/:id/duplicate')
  duplicateProduct(@Param('id') id: string, @Body() dto: DuplicateProductDto) {
    return this.catalogService.duplicateProduct(id, dto.storeId);
  }

  @Post('stores/:storeId/menu-items')
  @UseInterceptors(FileInterceptor('image'))
  createProduct(
    @Param('storeId') storeId: string,
    @Body() dto: CreateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalogService.createProduct(storeId, dto, file);
  }

  @Patch('menu-items/:id')
  @UseInterceptors(FileInterceptor('image'))
  updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.catalogService.updateProduct(id, dto, file);
  }

  @Delete('menu-items/:id')
  deleteProduct(@Param('id') id: string) {
    return this.catalogService.deleteProduct(id);
  }
}
