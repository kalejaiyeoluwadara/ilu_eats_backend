import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { PromosService } from './promos.service';
import { ValidatePromoDto } from './dto/validate-promo.dto';

@Controller('v1/promos')
export class PromosController {
  constructor(private readonly promosService: PromosService) {}

  @Post('validate')
  @HttpCode(HttpStatus.OK)
  async validatePromo(@Body() dto: ValidatePromoDto) {
    return this.promosService.validatePromo(dto);
  }
}
