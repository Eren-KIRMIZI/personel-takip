import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { UploadFileDto } from './dto/upload.dto';
import { UploadService } from './upload.service';

@ApiTags('dosya')
@ApiBearerAuth()
@Controller('uploads')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}

  @Post()
  uploadFile(@Body() dto: UploadFileDto) {
    return this.uploadService.upload(dto);
  }
}