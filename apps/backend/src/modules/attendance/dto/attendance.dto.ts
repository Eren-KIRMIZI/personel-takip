import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { PunchSource, PunchType } from '@prisma/client';
import { ListQueryDto } from '../../organization/dto/organization.dto';

export class AttendanceListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: PunchType })
  @IsOptional()
  @IsEnum(PunchType)
  type?: PunchType;

  @ApiPropertyOptional({ enum: PunchSource })
  @IsOptional()
  @IsEnum(PunchSource)
  source?: PunchSource;

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

export class CreateAttendanceDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: PunchType })
  @IsEnum(PunchType)
  type!: PunchType;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  timestamp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  deviceInfo?: string;
}

export class ScanAttendanceDto {
  @ApiProperty({ description: 'QR kodu içeriği (token)' })
  @IsString()
  @MaxLength(255)
  content!: string;

  @ApiPropertyOptional({ description: 'Zımbalanacak personel (boşsa giriş yapan kullanıcı)' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class CreateQrCodeDto {
  @ApiProperty()
  @IsUUID()
  locationId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  entryPointName?: string;

  @ApiPropertyOptional({ type: String, format: 'date-time' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}