import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { GoodsReceiptService } from '../goods-receipt/goods-receipt.service';
import { BatchService } from '../batch/batch.service';
import { MovementType } from '@prisma/client';
import { ReferenceType } from '@prisma/client';

@Injectable()
export class InboundService {
  constructor(
    private prisma: PrismaService,
    private grService: GoodsReceiptService,
    private batchService: BatchService,
  ) {}

  async startInbound(purchaseOrderId: string, userId: string) {
    return this.grService.create({ purchaseOrderId }, userId);
  }

  async addLine(grId: string, dto: any) {
    const batch = await this.batchService.ensureBatchExists(
      dto.batchNumber,
      dto.productId,
      dto.expiryDate,
    );

    return this.grService.addLine(grId, {
      purchaseOrderItemId: dto.purchaseOrderItemId,
      productId: dto.productId,
      batchId: batch.id,
      locationId: dto.locationId,
      quantity: dto.quantity,
    });
  }

  async finalize(grId: string, autoPostStock: boolean, userId: string) {
    if (!autoPostStock) {
      return this.grService.finalize(grId, userId);
    }

    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id: grId },
      include: { lines: true },
    });

    if (!gr) throw new NotFoundException('Goods receipt not found');

    if (gr.lines.length === 0)
      throw new BadRequestException('Cannot finalize GR with no lines');

    // Post stock and flip the GR status atomically: if any line fails the
    // whole batch rolls back and the GR stays re-finalizable (still PENDING).
    return this.prisma.$transaction(
      async (tx) => {
        for (const line of gr.lines) {
          await tx.stockMovement.create({
            data: {
              type: MovementType.IN,
              quantity: line.quantity,
              productId: line.productId,
              batchId: line.batchId,
              toLocationId: line.locationId,
              userId,
              referenceType: ReferenceType.GOODS_RECEIPT,
              referenceId: grId,
            },
          });

          await tx.inventory.upsert({
            where: {
              productId_batchId_locationId: {
                productId: line.productId,
                batchId: line.batchId,
                locationId: line.locationId,
              },
            },
            update: { quantity: { increment: line.quantity } },
            create: {
              productId: line.productId,
              batchId: line.batchId,
              locationId: line.locationId,
              quantity: line.quantity,
            },
          });
        }

        // Flip GR -> RECEIVED (and recompute PO status) last, on the same tx.
        await this.grService.finalize(grId, userId, tx);

        return {
          message: 'Inbound finalized. Stock successfully updated.',
        };
      },
      { timeout: 20000 },
    );
  }

  async findAll() {
    return this.prisma.goodsReceipt.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        purchaseOrder: {
          include: { supplier: true },
        },
      },
    });
  }

  async getOne(grId: string) {
    const gr = await this.prisma.goodsReceipt.findUnique({
      where: { id: grId },
      include: {
        purchaseOrder: {
          include: {
            items: {
              include: {
                product: true,
                receiptLines: {
                  // All GR lines belonging to this PO item
                  select: { quantity: true },
                },
              },
            },
            supplier: true,
          },
        },
        lines: {
          include: {
            product: true,
            batch: true,
            location: { include: { section: true } },
          },
        },
      },
    });

    if (!gr) throw new NotFoundException('Inbound not found');

    const poItems = gr.purchaseOrder.items.map((item) => {
      const received = item.receiptLines.reduce(
        (sum, ln) => sum + ln.quantity,
        0,
      );

      return {
        ...item,
        received,
        remaining: Math.max(item.quantity - received, 0),
      };
    });

    return {
      ...gr,
      purchaseOrder: {
        ...gr.purchaseOrder,
        items: poItems,
      },
    };
  }
}
