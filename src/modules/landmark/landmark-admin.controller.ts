import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { LandmarkService } from './landmark.service';
import { CreateLandmarkDto } from './dto/create-landmark.dto';
import { UpdateLandmarkDto } from './dto/update-landmark.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../../common/enums/role.enum';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
@Controller('admin/landmarks')
export class LandmarkAdminController {
  constructor(private readonly landmarkService: LandmarkService) {}

  @Get()
  findAll() {
    return this.landmarkService.findAll();
  }

  @Post()
  create(@Body() dto: CreateLandmarkDto) {
    return this.landmarkService.create(dto);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateLandmarkDto) {
    return this.landmarkService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.landmarkService.remove(id);
  }
}
