import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import {
  MovementType,
  ReferenceType,
  SalesOrderStatus,
  ShipmentStatus,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OutboundService {
  constructor(private prisma: PrismaService) {}

  async updateSalesOrderStatusFromShipments(
    salesOrderId: string,
    db: Prisma.TransactionClient = this.prisma,
  ) {
    const so = await db.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true },
    });

    if (!so) return;

    const ordered = so.items.reduce((acc, item) => acc + item.quantity, 0);

    const shippedLines = await db.shipmentLine.findMany({
      where: { salesOrderItem: { salesOrderId } },
    });

    const shipped = shippedLines.reduce((acc, line) => acc + line.quantity, 0);

    if (shipped === 0) {
      return;
    }

    await db.salesOrder.update({
      where: { id: salesOrderId },
      data: {
        status:
          shipped < ordered
            ? SalesOrderStatus.PARTIALLY_SHIPPED
            : SalesOrderStatus.SHIPPED,
      },
    });
  }

  async createShipmentForSalesOrder(salesOrderId: string, userId: string) {
    const so = await this.prisma.salesOrder.findUnique({
      where: { id: salesOrderId },
      include: { items: true },
    });

    if (!so) throw new NotFoundException('Sales order not found');

    const allowedStatuses = new Set<SalesOrderStatus>([
      SalesOrderStatus.PENDING,
      SalesOrderStatus.PARTIALLY_SHIPPED,
    ]);

    if (!allowedStatuses.has(so.status)) {
      throw new ForbiddenException(
        'Cannot create shipment for this Sales Order. It must be approved (PENDING) first.',
      );
    }

    if (so.items.length === 0) {
      throw new BadRequestException(
        'Cannot create shipment for Sales Order with no items',
      );
    }

    const shipmentNumber = `SHIP-${Date.now()}`;

    return this.prisma.shipment.create({
      data: {
        shipmentNumber,
        salesOrderId,
        status: ShipmentStatus.DRAFT,
        userId,
      },
    });
  }

  async addShipmentLinesAutoAllocate(
    shipmentId: string,
    salesOrderItemId: string,
    quantity: number,
    fromLocationId: string,
  ) {
    if (quantity <= 0) {
      throw new BadRequestException('Quantity must be greater than 0');
    }

    if (!fromLocationId) {
      throw new BadRequestException('fromLocationId is required');
    }

    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { salesOrder: true },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    const blockedStatuses = new Set<ShipmentStatus>([
      ShipmentStatus.CANCELLED,
      ShipmentStatus.IN_TRANSIT,
      ShipmentStatus.DELIVERED,
    ]);

    if (blockedStatuses.has(shipment.status)) {
      throw new ForbiddenException('Cannot add lines to this shipment');
    }

    const soItem = await this.prisma.salesOrderItem.findUnique({
      where: { id: salesOrderItemId },
      include: { salesOrder: true },
    });

    if (!soItem) throw new NotFoundException('Sales order item not found');

    if (soItem.salesOrderId !== shipment.salesOrderId) {
      throw new BadRequestException(
        "Sales order item does not belong to this shipment's Sales Order",
      );
    }

    const existingLinesForItem = await this.prisma.shipmentLine.findMany({
      where: { salesOrderItemId },
    });

    const alreadyPlanned = existingLinesForItem.reduce(
      (acc, line) => acc + line.quantity,
      0,
    );

    if (alreadyPlanned + quantity > soItem.quantity) {
      throw new BadRequestException(
        `Cannot ship more than ordered for this item. Ordered=${soItem.quantity}, Already planned=${alreadyPlanned}`,
      );
    }

    // Allocate + reserve atomically: if we can't fully satisfy the request the
    // thrown error rolls back every reservation and created line — no manual
    // compensation needed.
    return this.prisma.$transaction(async (tx) => {
      // FEFO: only the selected location, earliest expiry first
      const inventories = await tx.inventory.findMany({
        where: {
          productId: soItem.productId,
          locationId: fromLocationId,
        },
        include: {
          batch: true,
          location: true,
        },
        orderBy: [{ batch: { expiryDate: 'asc' } }, { createdAt: 'asc' }],
      });

      if (inventories.length === 0) {
        throw new BadRequestException(
          'Selected location has no inventory for this product',
        );
      }

      let remaining = quantity;
      const createdLines: Prisma.ShipmentLineGetPayload<object>[] = [];

      for (const inv of inventories) {
        const available = inv.quantity - inv.reservedQty;
        if (available <= 0) continue;

        const take = Math.min(available, remaining);
        if (take <= 0) continue;

        await tx.inventory.update({
          where: { id: inv.id },
          data: { reservedQty: { increment: take } },
        });

        const line = await tx.shipmentLine.create({
          data: {
            shipmentId,
            salesOrderItemId,
            productId: soItem.productId,
            batchId: inv.batchId,
            fromLocationId: inv.locationId,
            quantity: take,
          },
        });

        createdLines.push(line);
        remaining -= take;

        if (remaining === 0) break;
      }

      if (remaining > 0) {
        throw new BadRequestException(
          'Insufficient available inventory at the selected location to fulfill this shipment',
        );
      }

      return createdLines;
    });
  }

  async shipShipment(shipmentId: string, userId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { lines: true, salesOrder: true },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    if (shipment.status === ShipmentStatus.CANCELLED)
      throw new ForbiddenException('Cannot ship a cancelled shipment');

    if (shipment.status === ShipmentStatus.IN_TRANSIT)
      throw new ForbiddenException('Shipment already in transit');

    if (shipment.status === ShipmentStatus.DELIVERED)
      throw new ForbiddenException('Shipment already delivered');

    if (shipment.lines.length === 0)
      throw new BadRequestException('Cannot ship an empty shipment');

    await this.prisma.$transaction(
      async (tx) => {
        for (const line of shipment.lines) {
          // Conditional atomic decrement: only succeeds if both physical and
          // reserved quantities are sufficient, so concurrent ships cannot
          // oversell and quantities can never go negative.
          const result = await tx.inventory.updateMany({
            where: {
              productId: line.productId,
              batchId: line.batchId,
              locationId: line.fromLocationId,
              quantity: { gte: line.quantity },
              reservedQty: { gte: line.quantity },
            },
            data: {
              quantity: { decrement: line.quantity },
              reservedQty: { decrement: line.quantity },
            },
          });

          if (result.count === 0) {
            throw new BadRequestException(
              `Insufficient physical or reserved quantity for shipment line ${line.id}`,
            );
          }

          await tx.stockMovement.create({
            data: {
              type: MovementType.OUT,
              quantity: line.quantity,
              productId: line.productId,
              batchId: line.batchId,
              fromLocationId: line.fromLocationId,
              referenceType: ReferenceType.SHIPMENT,
              referenceId: shipmentId,
              userId,
            },
          });
        }

        await tx.shipment.update({
          where: { id: shipmentId },
          data: {
            status: ShipmentStatus.IN_TRANSIT,
            shippedAt: new Date(),
          },
        });

        await this.updateSalesOrderStatusFromShipments(
          shipment.salesOrderId,
          tx,
        );
      },
      { timeout: 20000 },
    );

    return { message: 'Shipment marked as IN_TRANSIT' };
  }

  async deliverShipment(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    if (shipment.status !== ShipmentStatus.IN_TRANSIT)
      throw new ForbiddenException(
        'Only IN_TRANSIT shipments can be delivered',
      );

    const updated = await this.prisma.shipment.update({
      where: { id: shipmentId },
      data: {
        status: ShipmentStatus.DELIVERED,
        deliveredAt: new Date(),
      },
    });

    await this.updateSalesOrderStatusFromShipments(shipment.salesOrderId);

    return updated;
  }

  async cancelShipment(shipmentId: string) {
    const shipment = await this.prisma.shipment.findUnique({
      where: { id: shipmentId },
      include: { lines: true, salesOrder: true },
    });

    if (!shipment) throw new NotFoundException('Shipment not found');

    if (
      shipment.status === ShipmentStatus.IN_TRANSIT ||
      shipment.status === ShipmentStatus.DELIVERED
    ) {
      throw new ForbiddenException(
        'Cannot cancel a shipment that is already shipped/delivered',
      );
    }

    // Idempotent: cancelling an already-cancelled shipment must not release
    // reservations a second time.
    if (shipment.status === ShipmentStatus.CANCELLED) {
      return { message: 'Shipment already cancelled' };
    }

    await this.prisma.$transaction(async (tx) => {
      // Re-check inside the transaction to guard against a concurrent cancel.
      const fresh = await tx.shipment.findUnique({
        where: { id: shipmentId },
      });

      if (!fresh || fresh.status === ShipmentStatus.CANCELLED) return;

      for (const line of shipment.lines) {
        await tx.inventory.updateMany({
          where: {
            productId: line.productId,
            batchId: line.batchId,
            locationId: line.fromLocationId,
          },
          data: {
            reservedQty: { decrement: line.quantity },
          },
        });
      }

      await tx.shipment.update({
        where: { id: shipmentId },
        data: { status: ShipmentStatus.CANCELLED },
      });

      await this.updateSalesOrderStatusFromShipments(shipment.salesOrderId, tx);
    });

    return { message: 'Shipment cancelled and reservations released' };
  }
}
