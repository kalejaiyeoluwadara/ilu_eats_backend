import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { PromosService } from './promos.service';
import { CreatePromoDto } from './dto/create-promo.dto';
import { UpdatePromoDto } from './dto/update-promo.dto';

@Controller('v1/admin/promos')
export class PromosAdminController {
  constructor(private readonly promosService: PromosService) {}

  @Get()
  async findAll() {
    return this.promosService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.promosService.findOne(id);
  }

  @Post()
  async create(@Body() dto: CreatePromoDto) {
    return this.promosService.create(dto);
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdatePromoDto) {
    return this.promosService.update(id, dto);
  }

  @Patch(':id/toggle-active')
  async toggleActive(@Param('id') id: string) {
    return this.promosService.toggleActive(id);
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.promosService.delete(id);
  }
}
