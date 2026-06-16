import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
  Req,
  Delete,
} from '@nestjs/common';
import { PurchaseOrderService } from './purchase-order.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { AddPOItemDto } from './dto/add-item.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';
import { UpdatePOItemDto } from './dto/update-item.dto';

@Controller('purchase-order')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PurchaseOrderController {
  constructor(private readonly service: PurchaseOrderService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreatePurchaseOrderDto, @Req() req) {
    return this.service.create(dto, req.user.sub);
  }

  @Post(':id/item')
  @Roles(UserRole.MANAGER)
  addItem(@Param('id') id: string, @Body() dto: AddPOItemDto) {
    return this.service.addItem(id, dto);
  }

  @Patch(':poId/item/:itemId')
  @Roles(UserRole.MANAGER)
  updateItem(
    @Param('poId') poId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdatePOItemDto,
  ) {
    return this.service.updateItem(poId, itemId, dto);
  }

  @Delete(':poId/item/:itemId')
  @Roles(UserRole.MANAGER)
  deleteItem(@Param('poId') poId: string, @Param('itemId') itemId: string) {
    return this.service.deleteItem(poId, itemId);
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
  update(@Param('id') id: string, @Body() dto: UpdatePurchaseOrderDto) {
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
