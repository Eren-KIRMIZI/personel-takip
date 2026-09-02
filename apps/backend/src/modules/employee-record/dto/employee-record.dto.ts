import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDateString, IsEnum, IsISO8601, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
import { EmployeeRecordCategory, EmployeeRecordType } from '@prisma/client';
import { ListQueryDto } from '../../organization/dto/organization.dto';

export class CreateEmployeeRecordDto {
  @ApiProperty({ description: 'Personel ID' })
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ enum: EmployeeRecordCategory })
  @IsEnum(EmployeeRecordCategory)
  category!: EmployeeRecordCategory;

  @ApiProperty({ enum: EmployeeRecordType })
  @IsEnum(EmployeeRecordType)
  type!: EmployeeRecordType;

  @ApiProperty({ description: 'Başlık', example: 'Geç kalma uyarısı' })
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiProperty({ description: 'Kayıt tarihi (ISO)', example: '2026-09-02' })
  @IsISO8601()
  date!: string;

  @ApiPropertyOptional({ description: 'Düzenleyen personel ID' })
  @IsOptional()
  @IsUUID()
  issuedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class UpdateEmployeeRecordDto {
  @ApiPropertyOptional({ enum: EmployeeRecordType })
  @IsOptional()
  @IsEnum(EmployeeRecordType)
  type?: EmployeeRecordType;

  @ApiPropertyOptional({ description: 'Başlık' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(4000)
  description?: string;

  @ApiPropertyOptional({ description: 'Kayıt tarihi (ISO)' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({ description: 'Düzenleyen personel ID' })
  @IsOptional()
  @IsUUID()
  issuedById?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  note?: string;
}

export class EmployeeRecordListQueryDto extends ListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional({ enum: EmployeeRecordCategory })
  @IsOptional()
  @IsEnum(EmployeeRecordCategory)
  category?: EmployeeRecordCategory;

  @ApiPropertyOptional({ enum: EmployeeRecordType })
  @IsOptional()
  @IsEnum(EmployeeRecordType)
  type?: EmployeeRecordType;

  @ApiPropertyOptional({ description: 'Başlangıç tarihi (ISO)' })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: 'Bitiş tarihi (ISO)' })
  @IsOptional()
  @Type(() => Date)
  @IsDateString()
  to?: string;
}