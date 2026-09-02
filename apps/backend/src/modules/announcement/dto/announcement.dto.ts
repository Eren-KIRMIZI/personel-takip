import { IsArray, IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'EXPIRED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'EXPIRED';

  @IsOptional()
  @IsEnum(['ALL', 'DEPARTMENT', 'UNIT', 'SPECIFIC'])
  targetType?: 'ALL' | 'DEPARTMENT' | 'UNIT' | 'SPECIFIC';

  @IsOptional()
  @IsUUID()
  targetId?: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  targetEmployeeIds?: string[];

  @IsOptional()
  @IsDateString()
  publishAt?: string;

  @IsOptional()
  @IsDateString()
  expireAt?: string;
}

export class UpdateAnnouncementDto extends PartialType(CreateAnnouncementDto) {}

export class AnnouncementListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['DRAFT', 'PUBLISHED', 'EXPIRED'])
  status?: 'DRAFT' | 'PUBLISHED' | 'EXPIRED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 20;
}
