import { Body, Controller, Param, Post, UseGuards, Req } from '@nestjs/common';
import { GoodsReceiptService } from './goods-receipt.service';
import { CreateGoodsReceiptDto } from './dto/create-gr.dto';
import { AddGRLineDto } from './dto/add-line.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { UserRole } from '@prisma/client';
import { Roles } from '../common/roles.decorator';

@Controller('goods-receipt')
@UseGuards(JwtAuthGuard, RolesGuard)
export class GoodsReceiptController {
  constructor(private readonly service: GoodsReceiptService) {}

  @Post()
  @Roles(UserRole.STAFF)
  create(@Body() dto: CreateGoodsReceiptDto, @Req() req) {
    return this.service.create(dto, req.user.sub);
  }

  @Post(':id/line')
  @Roles(UserRole.STAFF)
  addLine(@Param('id') grId: string, @Body() dto: AddGRLineDto) {
    return this.service.addLine(grId, dto);
  }

  @Post(':id/finalize')
  @Roles(UserRole.MANAGER)
  finalize(@Param('id') grId: string, @Req() req) {
    return this.service.finalize(grId, req.user.sub);
  }
}
