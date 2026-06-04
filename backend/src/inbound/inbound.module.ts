import { Module } from '@nestjs/common';
import { InboundController } from './inbound.controller';
import { InboundService } from './inbound.service';
import { GoodsReceiptModule } from '../goods-receipt/goods-receipt.module';
import { BatchModule } from '../batch/batch.module';
import { PrismaModule } from '../prisma.module';

@Module({
  imports: [GoodsReceiptModule, BatchModule, PrismaModule],
  controllers: [InboundController],
  providers: [InboundService],
})
export class InboundModule {}
