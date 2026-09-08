import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { OvertimeStatus } from '@prisma/client';
import { ListQueryDto } from '../../organization/dto/organization.dto';

export class CreateOvertimeDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ type: String, format: 'date' })
  @IsDateString()
  date!: string;

  @ApiProperty({ description: 'Saat cinsinden mesai süresi' })
  @IsNumber()
  @Min(0.5)
  hours!: number;

  @ApiPropertyOptional({ default: 1, description: 'Katsayı (örn. 1.5)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  rate?: number;

  @ApiPropertyOptional({ description: 'Çalışılacak alan / yer' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  workArea?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;
}

export class RejectOvertimeDto {
  @ApiProperty()
  @IsString()
  @MaxLength(500)
  rejectionReason!: string;
}

export class OvertimeListQueryDto extends ListQueryDto {
  @ApiPropertyOptional({ enum: OvertimeStatus })
  @IsOptional()
  @IsEnum(OvertimeStatus)
  status?: OvertimeStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ type: String, format: 'date' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  pageSize?: number = 20;
}