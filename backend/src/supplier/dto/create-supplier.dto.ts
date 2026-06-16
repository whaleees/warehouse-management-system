import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  ValidateIf,
} from 'class-validator';

export class CreateSupplierDto {
  @IsString()
  @IsNotEmpty({ message: 'Supplier code is required' })
  code: string;

  @IsString()
  @IsNotEmpty({ message: 'Supplier name is required' })
  name: string;

  @IsString()
  @IsNotEmpty({ message: 'A contact person is required' })
  contact: string;

  @IsString()
  @IsNotEmpty({ message: 'A phone number is required' })
  phone: string;

  @IsString()
  @IsNotEmpty({ message: 'An address is required' })
  address: string;

  // Email is optional, but when supplied it must be a valid address.
  // ValidateIf skips the check for null/undefined/empty so blank input passes.
  @ValidateIf((o: CreateSupplierDto) => o.email != null && o.email !== '')
  @IsEmail({}, { message: 'Enter a valid email address' })
  email?: string;

  @IsOptional()
  @IsString()
  imagePath?: string;
}
