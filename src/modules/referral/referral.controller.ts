import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ReferralService } from './referral.service';
import { ValidateReferralCodeDto } from './dto/validate-referral-code.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('referral-codes')
export class ReferralController {
  constructor(private readonly referralService: ReferralService) {}

  /**
   * Preview a code's discount before checkout. Validates the code's own rules
   * (active, not expired, min subtotal, global usage cap). The per-user limit
   * is enforced definitively when the order is placed.
   */
  @Post('validate')
  validate(@Body() dto: ValidateReferralCodeDto) {
    return this.referralService.validateForOrder(dto.code, dto.subtotal, 0);
  }
}
