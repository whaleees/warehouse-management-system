import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { MovementService } from './movement.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../common/roles.guard';
import { Roles } from '../common/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('movement')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MovementController {
  constructor(private readonly service: MovementService) {}

  @Post()
  @Roles(UserRole.MANAGER)
  create(@Body() dto: CreateMovementDto, @Req() req) {
    return this.service.create(dto, req.user.sub);
  }
}
