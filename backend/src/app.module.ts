import { Module } from '@nestjs/common';
import { APP_FILTER } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AllExceptionsFilter } from './common/all-exceptions.filter';
import { AuthModule } from './auth/auth.module';
import { UserModule } from './user/user.module';
import { ShipmentModule } from './shipment/shipment.module';
import { SalesOrderModule } from './sales-order/sales-order.module';
import { GoodsReceiptModule } from './goods-receipt/goods-receipt.module';
import { PurchaseOrderModule } from './purchase-order/purchase-order.module';
import { MovementModule } from './movement/movement.module';
import { InventoryModule } from './inventory/inventory.module';
import { LocationModule } from './location/location.module';
import { SectionModule } from './section/section.module';
import { BatchModule } from './batch/batch.module';
import { ProductModule } from './product/product.module';
import { PrismaModule } from './prisma.module';
import { OutboundModule } from './outbound/outbound.module';
import { InboundModule } from './inbound/inbound.module';
import { SupplierModule } from './supplier/supplier.module';
import { CustomerModule } from './customer/customer.module';
import { UploadModule } from './upload/upload.module';
import { ReportsModule } from './reports/reports.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UserModule,
    ProductModule,
    SectionModule,
    BatchModule,
    MovementModule,
    ShipmentModule,
    SalesOrderModule,
    GoodsReceiptModule,
    PurchaseOrderModule,
    InventoryModule,
    LocationModule,
    OutboundModule,
    InboundModule,
    SupplierModule,
    CustomerModule,
    UploadModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: AllExceptionsFilter,
    },
  ],
})
export class AppModule {}
