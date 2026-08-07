import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { AssignCategoryProductsDto } from './dto/assign-category-products.dto';
import { QueryCategoryProductsDto } from './dto/query-category-products.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/categories')
export class CategoriesAdminController {
  constructor(private readonly categoriesService: CategoriesService) {}

  /** All categories, hidden ones included, with item and store counts. */
  @Get()
  findAll() {
    return this.categoriesService.findAllAdmin();
  }

  /** Every item inside a category, paginated and searchable. */
  @Get(':slug/products')
  findProducts(
    @Param('slug') slug: string,
    @Query() query: QueryCategoryProductsDto,
  ) {
    return this.categoriesService.findProductsBySlug(
      slug,
      query.page,
      query.pageSize,
      query.search,
      true,
    );
  }

  /** Stores tagged with a category. */
  @Get(':slug/stores')
  findStores(@Param('slug') slug: string) {
    return this.categoriesService.findStoresBySlug(slug);
  }

  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoriesService.create(dto);
  }

  @Post('reorder')
  reorder(@Body() dto: ReorderCategoriesDto) {
    return this.categoriesService.reorder(dto.orderedIds);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.categoriesService.update(id, dto);
  }

  /**
   * Deleting a category holding items requires `?reassignTo=<slug>` — see
   * CategoriesService.remove for why they cannot simply be orphaned.
   */
  @Delete(':id')
  remove(@Param('id') id: string, @Query('reassignTo') reassignTo?: string) {
    return this.categoriesService.remove(id, reassignTo);
  }

  /** Apply the item picker's diff in one call. */
  @Patch(':id/products')
  assign(@Param('id') id: string, @Body() dto: AssignCategoryProductsDto) {
    return this.categoriesService.assign(id, dto);
  }
}
