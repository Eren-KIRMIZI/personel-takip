import { Module } from '@nestjs/common';
import { EmployeeRecordController } from './employee-record.controller';
import { EmployeeRecordService } from './employee-record.service';

@Module({
  controllers: [EmployeeRecordController],
  providers: [EmployeeRecordService],
})
export class EmployeeRecordModule {}