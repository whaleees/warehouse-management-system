import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SalesOrderService } from './sales-order.service';
import { CreateSalesOrderDto } from './dto/create-so.dto';
import { AddSOItemDto } from './dto/add-so-item.dto';
import { UpdateSalesOrderDto } from './dto/update-so.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('sales-order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SalesOrderController {
  constructor(private readonly service: SalesOrderService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateSalesOrderDto) {
    return this.service.create(dto);
  }

  @Post(':id/item')
  @Roles(UserRole.MANAGER)
  addItem(@Param('id') id: string, @Body() dto: AddSOItemDto) {
    return this.service.addItem(id, dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.MANAGER)
  update(@Param('id') id: string, @Body() dto: UpdateSalesOrderDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/approve')
  @Roles(UserRole.MANAGER)
  approve(@Param('id') id: string, @Req() req) {
    return this.service.approve(id, req.user.sub);
  }

  @Post(':id/cancel')
  @Roles(UserRole.MANAGER)
  cancel(@Param('id') id: string) {
    return this.service.cancel(id);
  }
}
