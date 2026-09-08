import { Injectable } from '@nestjs/common';
import { PunchSource, PunchType } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import { ReportQueryDto } from './dto/report.dto';

const employeeSelect = { id: true, firstName: true, lastName: true, employeeNo: true };

function dateRange(query: ReportQueryDto) {
  const now = new Date();
  let from: Date;
  let to: Date;
  if (query.from) from = new Date(`${query.from}T00:00:00`);
  else {
    from = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29, 0, 0, 0);
  }
  if (query.to) to = new Date(`${query.to}T23:59:59.999`);
  else to = new Date();
  return { from, to };
}

function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0);
}

function hoursMin(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return `${h}:${String(m).padStart(2, '0')}`;
}

@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cache: CacheService,
  ) {}

  async attendanceSummary(query: ReportQueryDto) {
    const { from, to } = dateRange(query);
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        timestamp: { gte: from, lte: to },
      },
      select: {
        employeeId: true,
        type: true,
        timestamp: true,
        employee: { select: employeeSelect },
      },
      orderBy: { timestamp: 'asc' },
    });

    const byEmployee = new Map<
      string,
      {
        employee: (typeof records)[number]['employee'];
        byDay: Map<string, { in?: Date; out?: Date }>;
        inCount: number;
        outCount: number;
      }
    >();

    for (const r of records) {
      let acc = byEmployee.get(r.employeeId);
      if (!acc) {
        acc = { employee: r.employee, byDay: new Map(), inCount: 0, outCount: 0 };
        byEmployee.set(r.employeeId, acc);
      }
      const day = r.timestamp.toISOString().slice(0, 10);
      const bucket = acc.byDay.get(day) ?? {};
      if (r.type === PunchType.IN) {
        acc.inCount += 1;
        if (!bucket.in) bucket.in = r.timestamp;
      } else {
        acc.outCount += 1;
        if (!bucket.out) bucket.out = r.timestamp;
      }
      acc.byDay.set(day, bucket);
    }

    const result = Array.from(byEmployee.values()).map((acc) => {
      let workedMinutes = 0;
      for (const bucket of acc.byDay.values()) {
        if (bucket.in && bucket.out && bucket.out > bucket.in) {
          workedMinutes += (bucket.out.getTime() - bucket.in.getTime()) / 60000;
        }
      }
      return {
        employee: acc.employee,
        totalRecords: acc.inCount + acc.outCount,
        totalIn: acc.inCount,
        totalOut: acc.outCount,
        workedMinutes,
        worked: hoursMin(workedMinutes),
        days: acc.byDay.size,
      };
    });

    result.sort((a, b) => b.workedMinutes - a.workedMinutes);
    return {
      from,
      to,
      summary: result,
      meta: { totalRecords: records.length, totalWorkedMinutes: result.reduce((s, r) => s + r.workedMinutes, 0) },
    };
  }

  async overtimeSummary(query: ReportQueryDto) {
    const { from, to } = dateRange(query);
    const records = await this.prisma.overtime.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        date: { gte: from, lte: to },
      },
      select: { employeeId: true, hours: true, rate: true, status: true, employee: { select: employeeSelect } },
    });

    const map = new Map<string, { employee: (typeof records)[number]['employee']; total: number; approved: number; count: number }>();
    for (const r of records) {
      let acc = map.get(r.employeeId);
      if (!acc) {
        acc = { employee: r.employee, total: 0, approved: 0, count: 0 };
        map.set(r.employeeId, acc);
      }
      const hours = r.hours * r.rate;
      acc.total += hours;
      acc.count += 1;
      if (r.status === 'APPROVED') acc.approved += hours;
    }

    const summary = Array.from(map.values())
      .map((s) => ({ employee: s.employee, totalHours: Math.round(s.total * 100) / 100, approvedHours: Math.round(s.approved * 100) / 100, records: s.count }))
      .sort((a, b) => b.approvedHours - a.approvedHours);

    return { from, to, summary, meta: { totalHours: Math.round(summary.reduce((s, r) => s + r.approvedHours, 0) * 100) / 100, records: records.length } };
  }

  async leaveSummary(query: ReportQueryDto) {
    const { from, to } = dateRange(query);
    const records = await this.prisma.leaveRequest.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        startDate: { lte: to },
        endDate: { gte: from },
      },
      select: {
        employeeId: true,
        days: true,
        status: true,
        leaveType: { select: { name: true } },
        employee: { select: employeeSelect },
      },
    });

    const map = new Map<string, { employee: (typeof records)[number]['employee']; total: number; approved: number; pending: number; rejected: number; byType: Map<string, number> }>();
    for (const r of records) {
      let acc = map.get(r.employeeId);
      if (!acc) {
        acc = { employee: r.employee, total: 0, approved: 0, pending: 0, rejected: 0, byType: new Map() };
        map.set(r.employeeId, acc);
      }
      acc.total += r.days;
      if (r.status === 'APPROVED') acc.approved += r.days;
      else if (r.status === 'PENDING') acc.pending += r.days;
      else if (r.status === 'REJECTED') acc.rejected += r.days;
      acc.byType.set(r.leaveType.name, (acc.byType.get(r.leaveType.name) ?? 0) + r.days);
    }

    const summary = Array.from(map.values())
      .map((s) => ({
        employee: s.employee,
        totalDays: Math.round(s.total * 100) / 100,
        approvedDays: Math.round(s.approved * 100) / 100,
        pendingDays: Math.round(s.pending * 100) / 100,
        rejectedDays: Math.round(s.rejected * 100) / 100,
        byType: Object.fromEntries(s.byType),
      }))
      .sort((a, b) => b.approvedDays - a.approvedDays);

    return { from, to, summary, meta: { totalDays: Math.round(summary.reduce((s, r) => s + r.approvedDays, 0) * 100) / 100, records: records.length } };
  }

  async dashboardSummary() {
    const cacheKey = CacheKeys.dashboardSummary();
    const cached = await this.cache.get<Record<string, unknown>>(cacheKey);
    if (cached) {
      return cached;
    }

    const today = startOfToday();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1, 0, 0, 0);

    const [
      employeesActive,
      employeesTotal,
      departmentsTotal,
      unitsTotal,
      rolesTotal,
      punchesToday,
      pendingLeaves,
      pendingOvertimes,
      monthOvertime,
    ] = await Promise.all([
      this.prisma.employee.count({ where: { status: 'ACTIVE' } }),
      this.prisma.employee.count(),
      this.prisma.department.count({ where: { isActive: true } }),
      this.prisma.unit.count({ where: { isActive: true } }),
      this.prisma.role.count({ where: { isActive: true } }),
      this.prisma.attendanceRecord.findMany({
        where: { timestamp: { gte: today } },
        select: { employeeId: true },
        distinct: ['employeeId'],
      }),
      this.prisma.leaveRequest.count({ where: { status: 'PENDING' } }),
      this.prisma.overtime.count({ where: { status: 'PENDING' } }),
      this.prisma.overtime.aggregate({
        where: { status: 'APPROVED', date: { gte: monthStart } },
        _sum: { hours: true },
      }),
    ]);

    const result = {
      today,
      employeesActive,
      employeesTotal,
      departmentsTotal,
      unitsTotal,
      rolesTotal,
      presentToday: punchesToday.length,
      pendingLeaves,
      pendingOvertimes,
      approvedOvertimeHoursMonth: Math.round((monthOvertime._sum.hours ?? 0) * 100) / 100,
    };

    await this.cache.set(cacheKey, result, CacheTTL.DASHBOARD_SUMMARY);
    return result;
  }

  async attendanceLog(query: ReportQueryDto) {
    const { from, to } = dateRange(query);
    const records = await this.prisma.attendanceRecord.findMany({
      where: {
        ...(query.employeeId ? { employeeId: query.employeeId } : {}),
        timestamp: { gte: from, lte: to },
      },
      select: {
        employeeId: true,
        type: true,
        timestamp: true,
        source: true,
        employee: { select: employeeSelect },
      },
      orderBy: { timestamp: 'asc' },
    });

    const map = new Map<
      string,
      {
        employee: (typeof records)[number]['employee'];
        date: string;
        checkIn?: { at: Date; source: PunchSource };
        checkOut?: { at: Date; source: PunchSource };
      }
    >();

    for (const r of records) {
      const date = r.timestamp.toISOString().slice(0, 10);
      const key = `${r.employeeId}|${date}`;
      const row =
        map.get(key) ??
        { employee: r.employee, date, checkIn: undefined, checkOut: undefined };
      if (r.type === PunchType.IN) {
        if (!row.checkIn) row.checkIn = { at: r.timestamp, source: r.source };
      } else if (!row.checkOut || r.timestamp > row.checkOut.at) {
        row.checkOut = { at: r.timestamp, source: r.source };
      }
      map.set(key, row);
    }

    const rows = Array.from(map.values()).sort(
      (a, b) => a.date.localeCompare(b.date) || `${a.employee.lastName} ${a.employee.firstName}`.localeCompare(`${b.employee.lastName} ${b.employee.firstName}`),
    );

    return {
      from,
      to,
      rows: rows.map((r) => ({
        ...r,
        workedMinutes: r.checkIn && r.checkOut && r.checkOut.at > r.checkIn.at ? Math.round((r.checkOut.at.getTime() - r.checkIn.at.getTime()) / 60000) : 0,
        worked: r.checkIn && r.checkOut && r.checkOut.at > r.checkIn.at ? hoursMin(Math.round((r.checkOut.at.getTime() - r.checkIn.at.getTime()) / 60000)) : undefined,
      })),
      meta: { totalRows: rows.length },
    };
  }

  async attendanceLogExcel(query: ReportQueryDto) {
    const { from, to, rows } = await this.attendanceLog(query);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Giriş-Çıkış');
    ws.addRow(['Tarih', 'Sicil No', 'Personel', 'Giriş', 'Çıkış', 'Çalışılan', 'Giriş Kaynağı', 'Çıkış Kaynağı']);
    ws.getRow(1).font = { bold: true };
    const hhmm = (d?: Date) => (d ? `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` : '-');
    const src = (s?: PunchSource) => (s ? (s === PunchSource.MANUAL ? 'Manuel' : 'QrSü') : '-');
    for (const row of rows) {
      ws.addRow([
        row.date,
        row.employee.employeeNo ?? '',
        `${row.employee.firstName} ${row.employee.lastName}`,
        hhmm(row.checkIn?.at),
        hhmm(row.checkOut?.at),
        row.worked ?? '-',
        src(row.checkIn?.source),
        src(row.checkOut?.source),
      ]);
    }
    ws.addRow([]);
    ws.addRow(['Dönem', from.toISOString().slice(0, 10), '', to.toISOString().slice(0, 10), '', '', '', '']);
    ws.columns.forEach((col) => (col.width = 16));
    const buffer = await wb.xlsx.writeBuffer();
    return this.toFile('giris-cikis-raporu.xlsx', buffer);
  }

  async attendanceExcel(query: ReportQueryDto) {
    const { from, to, summary, meta } = await this.attendanceSummary(query);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Puantaj');
    ws.addRow(['Personel', 'Sicil No', 'Kayıt', 'Giriş', 'Çıkış', 'Çalışılan Süre', 'Gün Sayısı']);
    ws.getRow(1).font = { bold: true };
    for (const row of summary) {
      ws.addRow([`${row.employee.firstName} ${row.employee.lastName}`, row.employee.employeeNo ?? '', row.totalRecords, row.totalIn, row.totalOut, row.worked, row.days]);
    }
    ws.addRow([]);
    ws.addRow(['TOPLAM', '', meta.totalRecords, '', '', hoursMin(meta.totalWorkedMinutes), '']);
    ws.getRow(ws.rowCount).font = { bold: true };
    ws.columns.forEach((col) => (col.width = 18));
    const buffer = await wb.xlsx.writeBuffer();
    return this.toFile('puantaj-raporu.xlsx', buffer);
  }

  async overtimeExcel(query: ReportQueryDto) {
    const { summary } = await this.overtimeSummary(query);
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Mesai');
    ws.addRow(['Personel', 'Sicil No', 'Onaylı Saat', 'Toplam Saat', 'Kayıt']);
    ws.getRow(1).font = { bold: true };
    for (const row of summary) {
      ws.addRow([`${row.employee.firstName} ${row.employee.lastName}`, row.employee.employeeNo ?? '', row.approvedHours, row.totalHours, row.records]);
    }
    ws.columns.forEach((col) => (col.width = 18));
    const buffer = await wb.xlsx.writeBuffer();
    return this.toFile('mesai-raporu.xlsx', buffer);
  }

  async leaveExcel(query: ReportQueryDto) {
    const { summary } = await this.leaveSummary(query);
    const typeNames = Array.from(new Set(summary.flatMap((s) => Object.keys(s.byType))));
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('İzin');
    ws.addRow(['Personel', 'Sicil No', 'Onaylı Gün', 'Bekleyen', 'Toplam Gün', ...typeNames]);
    ws.getRow(1).font = { bold: true };
    for (const row of summary) {
      ws.addRow([`${row.employee.firstName} ${row.employee.lastName}`, row.employee.employeeNo ?? '', row.approvedDays, row.pendingDays, row.totalDays, ...typeNames.map((t) => row.byType[t] ?? 0)]);
    }
    ws.columns.forEach((col) => (col.width = 16));
    const buffer = await wb.xlsx.writeBuffer();
    return this.toFile('izin-raporu.xlsx', buffer);
  }

  private toFile(filename: string, buffer: ArrayBuffer | Buffer) {
    const buf = Buffer.from(buffer as ArrayBuffer);
    return {
      filename,
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      base64: buf.toString('base64'),
    };
  }
}