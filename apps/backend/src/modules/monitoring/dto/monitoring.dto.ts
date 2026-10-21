import { IsEnum, IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IncidentSeverity, IncidentStatus, IncidentCategory } from '@prisma/client';

export class IncidentListQueryDto {
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize?: number;
  @ApiPropertyOptional({ enum: IncidentSeverity }) @IsOptional() @IsEnum(IncidentSeverity) severity?: IncidentSeverity;
  @ApiPropertyOptional({ enum: IncidentStatus }) @IsOptional() @IsEnum(IncidentStatus) status?: IncidentStatus;
  @ApiPropertyOptional({ enum: IncidentCategory }) @IsOptional() @IsEnum(IncidentCategory) category?: IncidentCategory;
  @ApiPropertyOptional() @IsOptional() @IsString() service?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() from?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() to?: string;
}

export class AcknowledgeIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
}

export class ResolveIncidentDto {
  @ApiPropertyOptional() @IsOptional() @IsString() note?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() resolvedBy?: string;
}

export class ReportClientErrorDto {
  @IsString() message: string;
  @IsOptional() @IsString() stack?: string;      // maskelenecek
  @IsOptional() @IsString() route?: string;
  @IsOptional() @IsString() module?: string;
  @IsOptional() @IsString() correlationId?: string;
  @IsOptional() @IsString() appVersion?: string;
}

export class HealthCheckQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsString() service?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) limit?: number;
}
