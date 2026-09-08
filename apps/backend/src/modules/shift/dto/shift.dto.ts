import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsDateString, IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { ShiftDay } from '@prisma/client';

export class CreateShiftDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  code?: string;

  @ApiProperty({ description: 'HH:mm formatında başlangıç', example: '08:00' })
  @IsString()
  startTime!: string;

  @ApiProperty({ description: 'HH:mm formatında bitiş', example: '17:00' })
  @IsString()
  endTime!: string;

  @ApiPropertyOptional({ default: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(480)
  breakMinutes?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  workLocationId?: string;
}

export class AssignShiftDto {
  @ApiProperty()
  @IsUUID()
  shiftId!: string;

  @ApiPropertyOptional({ type: [String], enum: ShiftDay, description: 'Atanacak günler' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(ShiftDay, { each: true })
  days?: ShiftDay[];

  @ApiPropertyOptional({ enum: ShiftDay, description: 'Tekil gün (geriye dönük uyumluluk)' })
  @IsOptional()
  @IsEnum(ShiftDay)
  day?: ShiftDay;

  @ApiPropertyOptional({ description: 'Atanacak personeller (boşsa tekil day)' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds?: string[];
}

export class BulkAssignShiftDto {
  @ApiProperty({ type: [String], description: 'Personel IDleri' })
  @IsArray()
  @IsUUID('4', { each: true })
  employeeIds!: string[];

  @ApiPropertyOptional({ type: [String], enum: ShiftDay, description: 'Atanacak günler' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(ShiftDay, { each: true })
  days?: ShiftDay[];

  @ApiPropertyOptional({ enum: ShiftDay, description: 'Tekil gün (geriye dönük uyumluluk)' })
  @IsOptional()
  @IsEnum(ShiftDay)
  day?: ShiftDay;

  @ApiProperty()
  @IsUUID()
  shiftId!: string;
}

export class ShiftAssignmentListDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  shiftId?: string;

  @ApiPropertyOptional({ enum: ShiftDay })
  @IsOptional()
  @IsEnum(ShiftDay)
  day?: ShiftDay;
}

export const SHIFT_DAY_LABEL: Record<ShiftDay, string> = {
  MON: 'Pazartesi',
  TUE: 'Salı',
  WED: 'Çarşamba',
  THU: 'Perşembe',
  FRI: 'Cuma',
  SAT: 'Cumartesi',
  SUN: 'Pazar',
};

export const SHIFT_DAY_ORDER: ShiftDay[] = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];