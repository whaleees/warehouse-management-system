import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ShipmentService } from './shipment.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { AddShipmentLineDto } from './dto/add-shipment-line.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('shipment')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ShipmentController {
  constructor(private readonly service: ShipmentService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateShipmentDto, @Req() req) {
    return this.service.create(dto, req.user.sub);
  }

  @Post(':id/line')
  @Roles(UserRole.MANAGER)
  addLine(@Param('id') id: string, @Body() dto: AddShipmentLineDto) {
    return this.service.addLine(id, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/ship')
  @Roles(UserRole.MANAGER)
  ship(@Param('id') id: string, @Req() req) {
    return this.service.ship(id, req.user.sub);
  }

  @Post(':id/deliver')
  @Roles(UserRole.MANAGER)
  deliver(@Param('id') id: string) {
    return this.service.deliver(id);
  }

  @Post(':id/cancel')
  @Roles(UserRole.MANAGER)
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
