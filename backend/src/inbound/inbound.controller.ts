import {
  Body,
  Controller,
  Param,
  Post,
  Req,
  UseGuards,
  Get,
} from '@nestjs/common';
import { InboundService } from './inbound.service';
import { StartInboundDto } from './dto/start-inbound.dto';
import { AddInboundLineDto } from './dto/add-inbound-line.dto';
import { FinalizeInboundDto } from './dto/finalize-inbound.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('inbound')
@UseGuards(JwtAuthGuard, RolesGuard)
export class InboundController {
  constructor(private readonly inbound: InboundService) {}

  @Post('start')
  @Roles(UserRole.STAFF)
  start(@Body() dto: StartInboundDto, @Req() req) {
    return this.inbound.startInbound(dto.purchaseOrderId, req.user.sub);
  }

  @Post(':grId/line')
  @Roles(UserRole.STAFF)
  addLine(@Param('grId') grId: string, @Body() dto: AddInboundLineDto) {
    return this.inbound.addLine(grId, dto);
  }

  @Post(':grId/finalize')
  @Roles(UserRole.MANAGER)
  finalize(
    @Param('grId') grId: string,
    @Body() dto: FinalizeInboundDto,
    @Req() req,
  ) {
    return this.inbound.finalize(grId, dto.autoPostStock, req.user.sub);
  }

  @Get()
  @Roles(UserRole.VIEWER)
  findAll() {
    return this.inbound.findAll();
  }

  @Get(':grId')
  @Roles(UserRole.VIEWER)
  getOne(@Param('grId') grId: string) {
    return this.inbound.getOne(grId);
  }
}
