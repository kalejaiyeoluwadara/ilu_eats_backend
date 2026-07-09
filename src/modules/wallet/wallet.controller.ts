import {
  Body,
  Controller,
  DefaultValuePipe,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { WalletService } from './wallet.service';
import { InitializeTopupDto } from './dto/initialize-topup.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';

@UseGuards(JwtAuthGuard)
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  getWallet(@CurrentUser() user: AuthenticatedUser) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  getTransactions(
    @CurrentUser() user: AuthenticatedUser,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query('pageSize', new DefaultValuePipe(10), ParseIntPipe)
    pageSize: number,
  ) {
    return this.walletService.getTransactions(
      user.id,
      Math.max(1, page),
      Math.min(50, Math.max(1, pageSize)),
    );
  }

  @Post('topup/initialize')
  initializeTopup(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: InitializeTopupDto,
  ) {
    return this.walletService.initializeTopup(user.id, user.email, dto.amount);
  }

  @Get('topup/verify/:reference')
  verifyTopup(
    @CurrentUser() user: AuthenticatedUser,
    @Param('reference') reference: string,
  ) {
    return this.walletService.verifyTopup(user.id, reference);
  }
}
