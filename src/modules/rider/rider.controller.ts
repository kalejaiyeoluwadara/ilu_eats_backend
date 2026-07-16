import {
  Body,
  Controller,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { RiderService } from './rider.service';
import { SetOnlineDto } from './dto/set-online.dto';
import { UpdateRiderProfileDto } from './dto/update-rider-profile.dto';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { QueryJobsDto } from './dto/query-jobs.dto';
import { QueryStatementDto } from './dto/query-statement.dto';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Rider)
@Controller('rider')
export class RiderController {
  constructor(private readonly riderService: RiderService) {}

  @Get('offers')
  getOffers(@CurrentUser() user: AuthenticatedUser) {
    return this.riderService.getOffers(user.id);
  }

  @Post('online')
  setOnline(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetOnlineDto) {
    return this.riderService.setOnline(user.id, dto.isOnline);
  }

  @Post('offers/:offerId/accept')
  acceptOffer(
    @CurrentUser() user: AuthenticatedUser,
    @Param('offerId') offerId: string,
  ) {
    return this.riderService.acceptOffer(user.id, offerId);
  }

  @Get('jobs')
  getJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryJobsDto,
  ) {
    return this.riderService.getJobs(
      user.id,
      query.status,
      query.page,
      query.pageSize,
    );
  }

  @Post('jobs/:jobId/pickup')
  pickup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.riderService.pickup(user.id, jobId);
  }

  @Post('jobs/:jobId/deliver')
  deliver(
    @CurrentUser() user: AuthenticatedUser,
    @Param('jobId') jobId: string,
  ) {
    return this.riderService.deliver(user.id, jobId);
  }

  @Get('earnings/summary')
  getEarningsSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.riderService.getEarningsSummary(user.id);
  }

  @Get('earnings/ledger')
  getEarningsLedger(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: PaginationQueryDto,
  ) {
    return this.riderService.getEarningsLedger(
      user.id,
      query.page,
      query.pageSize,
    );
  }

  @Get('earnings/statement')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="rider-statement.csv"')
  getEarningsStatement(
    @CurrentUser() user: AuthenticatedUser,
    @Query() query: QueryStatementDto,
  ) {
    return this.riderService.getEarningsStatement(user.id, query.from, query.to);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.riderService.getProfile(user.id);
  }

  @Patch('profile')
  updateProfile(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateRiderProfileDto,
  ) {
    return this.riderService.updateProfile(user.id, dto);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('file'))
  addDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UploadDocumentDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.riderService.addDocument(user.id, dto.type, file);
  }
}
