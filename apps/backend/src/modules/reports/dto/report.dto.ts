import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsIn, IsOptional, IsUUID, Matches } from 'class-validator';

export class ReportQueryDto {
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
  @IsUUID()
  employeeId?: string;
}

export class PeriodicReportQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ example: '2026-09' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}$/, { message: 'month YYYY-MM biçiminde olmalıdır' })
  month?: string;
}

export class NonCardPunchQueryDto extends ReportQueryDto {
  @ApiPropertyOptional({ enum: ['IN', 'OUT', 'BOTH'], default: 'BOTH' })
  @IsOptional()
  @IsIn(['IN', 'OUT', 'BOTH'])
  side!: 'IN' | 'OUT' | 'BOTH';
}