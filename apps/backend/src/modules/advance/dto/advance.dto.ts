import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsNumberString, IsOptional, IsString, IsUUID, Max, MaxLength, MinLength, Min } from 'class-validator';
import { AdvanceStatus } from '@prisma/client';
import { ListQueryDto } from '../../organization/dto/organization.dto';

export class CreateAdvanceDto {
  @ApiProperty({ description: 'Personel ID' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'Avans tutarı (TRY)', example: '1000.00' })
  @IsNumberString({}, { message: 'Geçerli bir tutar girin (örn: 1000 veya 1000.50)' })
  amount!: string;

  @ApiPropertyOptional({ description: 'Taksit sayısı', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  installmentCount?: number;

  @ApiPropertyOptional({ description: 'Kesintiye başlanacak dönem — yıl', example: 2026 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear?: number;

  @ApiPropertyOptional({ description: 'Kesintiye başlanacak dönem — ay (1-12)', example: 9 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  description?: string;
}

export class RejectAdvanceDto {
  @ApiProperty({ description: 'Red gerekçesi' })
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  rejectionReason!: string;
}

export class AdvanceListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  periodYear?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  periodMonth?: number;

  @ApiPropertyOptional({ enum: AdvanceStatus })
  @IsOptional()
  @IsEnum(AdvanceStatus)
  status?: AdvanceStatus;
}