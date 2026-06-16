import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
} from 'class-validator';
import { UOM } from '@prisma/client';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty({ message: 'Product name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'Product code (SKU) is required' })
  sku: string;

  @IsString()
  @IsNotEmpty({ message: 'Category is required' })
  category: string;

  @IsOptional()
  @IsString()
  brand?: string;

  @IsEnum(UOM)
  uom: UOM;

  @IsOptional()
  @IsString()
  imagePath?: string;

  @IsInt()
  @Min(0)
  lowStockThreshold: number;
}
