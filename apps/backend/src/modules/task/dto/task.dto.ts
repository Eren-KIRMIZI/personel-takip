import { IsEnum, IsOptional, IsString, IsUUID, IsDateString } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreateTaskDto {
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsUUID()
  employeeId: string;

  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'DELAYED', 'CANCELLED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'DELAYED' | 'CANCELLED';

  @IsOptional()
  @IsDateString()
  dueDate?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class UpdateTaskDto extends PartialType(CreateTaskDto) { }

export class UpdateTaskStatusDto {
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'DELAYED', 'CANCELLED'])
  status: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'DELAYED' | 'CANCELLED';

  @IsOptional()
  @IsString()
  note?: string;
}

export class TaskListQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  employeeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['LOW', 'MEDIUM', 'HIGH'])
  priority?: 'LOW' | 'MEDIUM' | 'HIGH';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEnum(['TODO', 'IN_PROGRESS', 'DONE', 'DELAYED', 'CANCELLED'])
  status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'DELAYED' | 'CANCELLED';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  pageSize?: number = 20;
}

export class CreateTaskCommentDto {
  @IsString()
  content: string;
}
