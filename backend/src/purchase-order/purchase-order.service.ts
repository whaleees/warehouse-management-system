import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { CreatePurchaseOrderDto } from './dto/create-po.dto';
import { AddPOItemDto } from './dto/add-item.dto';
import { UpdatePurchaseOrderDto } from './dto/update-po.dto';
import { OrderStatus, Prisma } from '@prisma/client';
import { UpdatePOItemDto } from './dto/update-item.dto';
import { withReceivedRemaining } from './po-projection.util';

@Injectable()
export class PurchaseOrderService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePurchaseOrderDto, userId: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id: dto.supplierId },
    });

    if (!supplier) throw new NotFoundException('Supplier not found');

    const poNumber = `PO-${Date.now()}`;

    return this.prisma.purchaseOrder.create({
      data: {
        orderNumber: poNumber,
        supplierId: dto.supplierId,
        expectedDate: dto.expectedDate ? new Date(dto.expectedDate) : undefined,
        // ✅ NEW: start as DRAFT so FE "Approve" flow works
        status: OrderStatus.DRAFT,
        createdBy: userId,
      },
    });
  }

  async addItem(poId: string, dto: AddPOItemDto) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    const locked = new Set<OrderStatus>([
      OrderStatus.RECEIVED,
      OrderStatus.CANCELLED,
    ]);

    if (locked.has(po.status)) {
      throw new ForbiddenException('Cannot modify a finalized PO');
    }

    const duplicate = await this.prisma.purchaseOrderItem.findFirst({
      where: { purchaseOrderId: poId, productId: dto.productId },
    });

    if (duplicate) {
      throw new BadRequestException(
        'Product already exists in this purchase order',
      );
    }

    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) throw new NotFoundException('Product not found');

    return this.prisma.purchaseOrderItem.create({
      data: {
        purchaseOrderId: poId,
        productId: dto.productId,
        quantity: dto.quantity,
        unitPrice: dto.unitPrice,
      },
    });
  }

  async updateItem(poId: string, itemId: string, dto: UpdatePOItemDto) {
    const item = await this.prisma.purchaseOrderItem.findFirst({
      where: {
        id: itemId,
        purchaseOrderId: poId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found in this purchase order');
    }

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const locked = new Set<OrderStatus>([
      OrderStatus.RECEIVED,
      OrderStatus.CANCELLED,
    ]);

    if (locked.has(po.status)) {
      throw new ForbiddenException('Cannot modify a finalized PO');
    }

    return this.prisma.purchaseOrderItem.update({
      where: { id: itemId },
      data: {
        quantity: dto.quantity ?? item.quantity,
        unitPrice: dto.unitPrice ?? item.unitPrice,
      },
    });
  }

  async deleteItem(poId: string, itemId: string) {
    const item = await this.prisma.purchaseOrderItem.findFirst({
      where: {
        id: itemId,
        purchaseOrderId: poId,
      },
    });

    if (!item) {
      throw new NotFoundException('Item not found in this purchase order');
    }

    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
    });
    if (!po) throw new NotFoundException('Purchase order not found');

    const locked = new Set<OrderStatus>([
      OrderStatus.RECEIVED,
      OrderStatus.CANCELLED,
    ]);

    if (locked.has(po.status)) {
      throw new ForbiddenException('Cannot modify a finalized PO');
    }

    return this.prisma.purchaseOrderItem.delete({
      where: { id: itemId },
    });
  }

  async findAll() {
    const pos = await this.prisma.purchaseOrder.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        goodsReceipts: true,
        createdByUser: true,
        approvedByUser: true,
        items: {
          include: {
            product: true,
            receiptLines: {
              select: { quantity: true },
            },
          },
        },
      },
    });

    return pos.map((po) => ({
      ...po,
      items: withReceivedRemaining(po.items),
    }));
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: {
        supplier: true,
        goodsReceipts: true,
        createdByUser: true,
        approvedByUser: true,
        items: {
          include: {
            product: true,
            receiptLines: {
              select: { quantity: true },
            },
          },
        },
      },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    // 🟩 Calculate received + remaining so FE displays correctly
    return {
      ...po,
      items: withReceivedRemaining(po.items),
    };
  }

  async update(id: string, dto: UpdatePurchaseOrderDto) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');

    const locked = new Set<OrderStatus>([
      OrderStatus.RECEIVED,
      OrderStatus.CANCELLED,
    ]);

    if (locked.has(po.status)) {
      throw new ForbiddenException('Cannot modify a finalized PO');
    }

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        expectedDate: dto.expectedDate
          ? new Date(dto.expectedDate)
          : po.expectedDate,
        supplierId: dto.supplierId ?? po.supplierId,
      },
    });
  }

  async approve(poId: string, userId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id: poId },
      include: { items: true },
    });

    if (!po) throw new NotFoundException('Purchase order not found');

    if (po.status === OrderStatus.CANCELLED)
      throw new ForbiddenException('Cannot approve a cancelled PO');

    // ✅ FIX: use enum, not a string
    if (po.status !== OrderStatus.DRAFT)
      throw new ForbiddenException('PO already approved');

    if (!po.items || po.items.length === 0)
      throw new BadRequestException('Cannot approve PO with no items');

    return this.prisma.purchaseOrder.update({
      where: { id: poId },
      data: {
        approvedBy: userId,
        approvedAt: new Date(),
        status: OrderStatus.PENDING,
      },
    });
  }

  async cancel(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });

    if (!po) throw new NotFoundException('Purchase order not found');

    if (po.status === OrderStatus.RECEIVED)
      throw new ForbiddenException('Cannot cancel a fully received PO');

    return this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: OrderStatus.CANCELLED },
    });
  }

  /**
   * Recomputes and persists a PO's status from its received quantities.
   * Canonical implementation shared with GoodsReceiptService; accepts a
   * transaction client so it can participate in an enclosing transaction.
   */
  async recomputeStatus(
    poId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const poItems = await db.purchaseOrderItem.findMany({
      where: { purchaseOrderId: poId },
    });

    // if no items, keep whatever status it already has
    if (poItems.length === 0) return;

    const received = await db.goodsReceiptLine.groupBy({
      by: ['purchaseOrderItemId'],
      where: {
        purchaseOrderItem: { purchaseOrderId: poId },
      },
      _sum: { quantity: true },
    });

    let fullyReceived = true;
    let anyReceived = false;

    for (const item of poItems) {
      const rec = received.find((r) => r.purchaseOrderItemId === item.id);
      const recQty = rec?._sum?.quantity ?? 0;

      if (recQty > 0) {
        anyReceived = true;
      }

      if (recQty < item.quantity) {
        fullyReceived = false;
      }
    }

    const newStatus = fullyReceived
      ? OrderStatus.RECEIVED
      : anyReceived
        ? OrderStatus.PARTIALLY_RECEIVED
        : OrderStatus.PENDING;

    await db.purchaseOrder.update({
      where: { id: poId },
      data: { status: newStatus },
    });
  }
}
