import { Controller, Get, Param, Query } from '@nestjs/common';
import { BadgesService } from './badges.service';
import { QueryBadgeProductsDto } from './dto/query-badge-products.dto';

@Controller('badges')
export class BadgesController {
  constructor(private readonly badgesService: BadgesService) {}

  /** Active badges — chip labels/colours for item cards. */
  @Get()
  findAll() {
    return this.badgesService.findAll();
  }

  /** The grouped home feed: one section per badge that has items. */
  @Get('groups')
  findGroups() {
    return this.badgesService.findHomeGroups();
  }

  /** "See all" for one badge. */
  @Get(':slug/products')
  findProducts(
    @Param('slug') slug: string,
    @Query() query: QueryBadgeProductsDto,
  ) {
    return this.badgesService.findProductsBySlug(
      slug,
      query.page,
      query.pageSize,
    );
  }
}
