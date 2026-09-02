import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDecimal, IsEnum, IsInt, IsOptional, IsString, IsUUID, MaxLength, Min, MinLength } from 'class-validator';
import { PayrollStatus } from '@prisma/client';
import { ListQueryDto } from '../../organization/dto/organization.dto';

export class SetSalaryDto {
  @ApiProperty({ description: 'Brüt aylık maaş (TRY)' })
  @IsDecimal({ decimal_digits: '1,2', force_decimal: false })
  baseSalary!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class CreatePayrollDto {
  @ApiProperty({ description: 'Maaş dönemi yılı', example: 2026 })
  @IsInt()
  @Min(2000)
  periodYear!: number;

  @ApiProperty({ description: 'Maaş dönemi ayı (1-12)', example: 9 })
  @IsInt()
  @Min(1)
  periodMonth!: number;
}

export class UpdatePayrollDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2', force_decimal: false })
  bonus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDecimal({ decimal_digits: '1,2', force_decimal: false })
  deduction?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class PayrollListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  periodMonth?: number;

  @ApiPropertyOptional({ enum: PayrollStatus })
  @IsOptional()
  @IsEnum(PayrollStatus)
  status?: PayrollStatus;
}

export class StablePeriodDto {
  @ApiProperty()
  @IsInt()
  @Min(2000)
  periodYear!: number;

  @ApiProperty()
  @IsInt()
  @Min(1)
  periodMonth!: number;
}