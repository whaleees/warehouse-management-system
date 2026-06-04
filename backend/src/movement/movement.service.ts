import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreateMovementDto } from './dto/create-movement.dto';
import { MovementType, Prisma } from '@prisma/client';

@Injectable()
export class MovementService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMovementDto, userId: string) {
    this.validateMovement(dto);

    // Validate batch + product relationship
    const batch = await this.prisma.productBatch.findUnique({
      where: { id: dto.batchId },
    });

    if (!batch) throw new NotFoundException('Batch not found');
    if (batch.productId !== dto.productId)
      throw new BadRequestException('Batch does not belong to product');

    switch (dto.type) {
      case MovementType.IN:
        return this.handleIN(dto, userId);

      case MovementType.OUT:
        return this.handleOUT(dto, userId);

      case MovementType.TRANSFER:
        return this.handleTRANSFER(dto, userId);

      case MovementType.ADJUSTMENT:
        return this.handleADJUSTMENT(dto, userId);

      default:
        throw new BadRequestException('Invalid movement type');
    }
  }

  // -------------------------------
  // VALIDATION RULES (based on Prisma Schema)
  // -------------------------------

  private validateMovement(dto: CreateMovementDto) {
    if (dto.quantity <= 0 && dto.type !== MovementType.ADJUSTMENT) {
      throw new BadRequestException('Quantity must be > 0');
    }

    if (dto.type === MovementType.IN && !dto.toLocationId) {
      throw new BadRequestException('IN movement requires toLocationId');
    }

    if (dto.type === MovementType.OUT && !dto.fromLocationId) {
      throw new BadRequestException('OUT movement requires fromLocationId');
    }

    if (dto.type === MovementType.TRANSFER) {
      if (!dto.fromLocationId || !dto.toLocationId)
        throw new BadRequestException(
          'TRANSFER requires both from/to location',
        );

      if (dto.fromLocationId === dto.toLocationId)
        throw new BadRequestException('Cannot transfer to the same location');
    }

    if (dto.type === MovementType.ADJUSTMENT && !dto.fromLocationId) {
      throw new BadRequestException('ADJUSTMENT requires location');
    }
  }

  // -------------------------------
  // IN Movement
  // -------------------------------

  private async handleIN(
    dto: CreateMovementDto,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    let inventory = await db.inventory.findUnique({
      where: {
        productId_batchId_locationId: {
          productId: dto.productId,
          batchId: dto.batchId,
          locationId: dto.toLocationId!,
        },
      },
    });

    if (!inventory) {
      inventory = await db.inventory.create({
        data: {
          productId: dto.productId,
          batchId: dto.batchId,
          locationId: dto.toLocationId!,
          quantity: dto.quantity,
        },
      });
    } else {
      inventory = await db.inventory.update({
        where: { id: inventory.id },
        data: { quantity: inventory.quantity + dto.quantity },
      });
    }

    return this.recordMovement(dto, inventory.id, userId, db);
  }

  // -------------------------------
  // OUT Movement
  // -------------------------------

  private async handleOUT(
    dto: CreateMovementDto,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const inventory = await db.inventory.findUnique({
      where: {
        productId_batchId_locationId: {
          productId: dto.productId,
          batchId: dto.batchId,
          locationId: dto.fromLocationId!,
        },
      },
    });

    if (!inventory)
      throw new NotFoundException(
        'No inventory found for this product/batch/location',
      );

    if (inventory.quantity < dto.quantity)
      throw new BadRequestException('Insufficient stock');

    await db.inventory.update({
      where: { id: inventory.id },
      data: { quantity: inventory.quantity - dto.quantity },
    });

    return this.recordMovement(dto, inventory.id, userId, db);
  }

  // -------------------------------
  // TRANSFER Movement (OUT + IN, atomic)
  // -------------------------------

  private async handleTRANSFER(dto: CreateMovementDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.handleOUT({ ...dto, type: MovementType.OUT }, userId, tx);
      return this.handleIN({ ...dto, type: MovementType.IN }, userId, tx);
    });
  }

  // -------------------------------
  // ADJUSTMENT Movement (+ or -)
  // -------------------------------

  private async handleADJUSTMENT(
    dto: CreateMovementDto,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const inventory = await db.inventory.findUnique({
      where: {
        productId_batchId_locationId: {
          productId: dto.productId,
          batchId: dto.batchId,
          locationId: dto.fromLocationId!,
        },
      },
    });

    if (!inventory)
      throw new NotFoundException('Inventory not found for adjustment');

    const newQty = inventory.quantity + dto.quantity;

    if (newQty < 0)
      throw new BadRequestException('Adjustment cannot make quantity < 0');

    await db.inventory.update({
      where: { id: inventory.id },
      data: { quantity: newQty },
    });

    return this.recordMovement(dto, inventory.id, userId, db);
  }

  // -------------------------------
  // StockMovement Create Record
  // -------------------------------

  private async recordMovement(
    dto: CreateMovementDto,
    inventoryId: string,
    userId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    return db.stockMovement.create({
      data: {
        ...dto,
        inventoryId,
        userId,
      },
    });
  }
}
