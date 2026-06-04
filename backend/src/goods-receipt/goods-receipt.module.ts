import { Module } from '@nestjs/common';
import { GoodsReceiptService } from './goods-receipt.service';
import { GoodsReceiptController } from './goods-receipt.controller';
import { PrismaModule } from '../prisma.module';
import { PurchaseOrderModule } from '../purchase-order/purchase-order.module';

@Module({
  imports: [PrismaModule, PurchaseOrderModule],
  controllers: [GoodsReceiptController],
  providers: [GoodsReceiptService],
  exports: [GoodsReceiptService],
})
export class GoodsReceiptModule {}
