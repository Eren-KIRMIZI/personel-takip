import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsBoolean, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';

export class ScanCardDto {
  @ApiProperty({ description: 'Kart üzerindeki benzersiz ID (cardUid)' })
  @IsString()
  @MaxLength(120)
  cardUid!: string;

  @ApiPropertyOptional({ description: 'Kartın okutulduğu cihaz (CardReader) id' })
  @IsOptional()
  @IsUUID()
  readerId?: string;

  @ApiPropertyOptional({ description: 'Zımbalanacak personel (boşsa kart sahibi)' })
  @IsOptional()
  @IsUUID()
  employeeId?: string;
}

export class CreateCardCredentialDto {
  @ApiProperty()
  @IsUUID()
  employeeId!: string;

  @ApiProperty({ description: 'Kart üzerindeki benzersiz ID (15 haneli rakam)' })
  @IsString()
  @Matches(/^\d{15}$/, { message: 'Kart ID 15 haneli rakam olmalıdır.' })
  cardUid!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Geçerli olduğu lokasyonlar (boşsa her yerde geçerli)' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  locationIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class UpdateCardCredentialDto {
  @ApiPropertyOptional({ description: 'Kart üzerindeki benzersiz ID (15 haneli rakam)' })
  @IsOptional()
  @IsString()
  @Matches(/^\d{15}$/, { message: 'Kart ID 15 haneli rakam olmalıdır.' })
  cardUid?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ description: 'Geçerli olduğu lokasyonlar (boşsa her yerde geçerli)' })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  locationIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}

export class CreateCardReaderDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateCardReaderDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  serialNo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  locationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}