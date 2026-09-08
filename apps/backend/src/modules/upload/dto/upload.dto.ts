import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UploadFileDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @ApiProperty({ description: 'MIME türü (örn. application/pdf)' })
  @IsString()
  @MaxLength(100)
  contentType!: string;

  @ApiProperty({ description: 'Base64 (data URL prefix olabilir)' })
  @IsString()
  base64!: string;

  @ApiPropertyOptional({ description: 'Klasör (varsayılan: leave-docs)' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  folder?: string;
}