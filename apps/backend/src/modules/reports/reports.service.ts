import { Injectable } from '@nestjs/common';
import { EmploymentStatus, PunchSource, PunchType, ShiftDay } from '@prisma/client';
import ExcelJS from 'exceljs';
import { PrismaService } from '../../prisma/prisma.service';
import { CacheService } from '../../common/cache/cache.service';
import { CacheKeys, CacheTTL } from '../../common/cache/cache.keys';
import { employeeEntityScopedWhere, employeeScopedWhere } from '../../common/scope';
import type { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { NonCardPunchQueryDto, PeriodicReportQueryDto, ReportQueryDto } from './dto/report.dto';

const employeeSelect = { id: true, firstName: true, lastName: true, employeeNo: true };

const DEFAULT_IN_MINUTES = 540; // 09:00
const DEFAULT_OUT_MINUTES = 1080; // 18:00

const WEEKDAY_NAMES = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

const JS_DOW_TO_SHIFT_DAY: Record<number, ShiftDay | undefined> = {
  0: ShiftDay.SUN,
  1: ShiftDay.MON,
  2: ShiftDay.TUE,
  3: ShiftDay.WED,
  4: ShiftDay.THU,
  5: ShiftDay.FRI,
  6: ShiftDay.SAT,
};

function hhmm(d: Date) {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function dateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseHHMM(value: string): number | null {
  const parts = value.trim().split(':').map(Number);
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function monthBounds(month?: string) {
  let year = new Date().getFullYear();
  let m = new Date().getMonth() + 1;
  if (month) {
    const parsed = month.split('-').map(Number);
    year = parsed[0];
    m = parsed[1];
  }
  const start = new Date(year, m - 1, 1, 0, 0, 0);
  const end = new Date(year, m, 0, 23, 59, 59, 999);
  return { year, month: m, start, end, label: `${year}-${String(m).padStart(2, '0')}` };
}

function weekdayDates(from: Date, to: Date) {
  const dates: Date[] = [];
  const last = new Date(to.getFullYear(), to.getMonth(), to.getDate());
  const cur = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  while (cur <= last) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) dates.push(new Date(cur));
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

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

  async attendanceSummary(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const base = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      timestamp: { gte: from, lte: to },
    };
    const where = actor ? employeeScopedWhere(actor, base) : base;
    const records = await this.prisma.attendanceRecord.findMany({
      where,
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

  async overtimeSummary(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const base = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      date: { gte: from, lte: to },
    };
    const where = actor ? employeeScopedWhere(actor, base) : base;
    const records = await this.prisma.overtime.findMany({
      where,
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

  async leaveSummary(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const base = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      startDate: { lte: to },
      endDate: { gte: from },
    };
    const where = actor ? employeeScopedWhere(actor, base) : base;
    const records = await this.prisma.leaveRequest.findMany({
      where,
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

  async attendanceLog(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const base = {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      timestamp: { gte: from, lte: to },
    };
    const where = actor ? employeeScopedWhere(actor, base) : base;
    const records = await this.prisma.attendanceRecord.findMany({
      where,
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

  async attendanceLogExcel(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to, rows } = await this.attendanceLog(query, actor);
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

  async attendanceExcel(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { from, to, summary, meta } = await this.attendanceSummary(query, actor);
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

  async overtimeExcel(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { summary } = await this.overtimeSummary(query, actor);
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

  async leaveExcel(query: ReportQueryDto, actor?: AuthenticatedUser) {
    const { summary } = await this.leaveSummary(query, actor);
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

  async attendanceEntries(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: {
        type: true,
        timestamp: true,
        source: true,
        employee: { select: employeeSelect },
        location: { select: { name: true } },
      },
      orderBy: [{ timestamp: 'asc' }, { employee: { lastName: 'asc' } }],
    });
    return {
      from,
      to,
      rows: records.map((r) => ({
        date: dateKey(r.timestamp),
        time: hhmm(r.timestamp),
        employee: r.employee,
        type: r.type,
        source: r.source,
        location: r.location?.name ?? null,
      })),
      meta: { total: records.length },
    };
  }

  private async shiftExpected(employeeIds: string[]) {
    const map = new Map<string, { start: number; end: number }>();
    if (employeeIds.length === 0) return map;
    const assignments = await this.prisma.shiftAssignment.findMany({
      where: { employeeId: { in: employeeIds } },
      select: { employeeId: true, day: true, shift: { select: { startTime: true, endTime: true } } },
    });
    for (const a of assignments) {
      const start = parseHHMM(a.shift.startTime);
      const end = parseHHMM(a.shift.endTime);
      if (start == null || end == null || start >= end) continue;
      map.set(`${a.employeeId}|${a.day}`, { start, end });
    }
    return map;
  }

  async lateArrivals(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      type: PunchType.IN,
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { employeeId: true, timestamp: true, source: true, employee: { select: employeeSelect } },
      orderBy: { timestamp: 'asc' },
    });
    const expected = await this.shiftExpected(Array.from(new Set(records.map((r) => r.employeeId))));
    const rows: Array<{
      employee: (typeof records)[number]['employee'];
      date: string;
      time: string;
      expected: string;
      lateMinutes: number;
      shiftUsed: boolean;
      source: PunchSource;
    }> = [];
    for (const r of records) {
      const exp = expected.get(`${r.employeeId}|${JS_DOW_TO_SHIFT_DAY[r.timestamp.getDay()]}`);
      const expectedMin = exp ? exp.start : DEFAULT_IN_MINUTES;
      const punchMin = r.timestamp.getHours() * 60 + r.timestamp.getMinutes();
      if (punchMin > expectedMin) {
        rows.push({
          employee: r.employee,
          date: dateKey(r.timestamp),
          time: hhmm(r.timestamp),
          expected: hoursMin(expectedMin),
          lateMinutes: punchMin - expectedMin,
          shiftUsed: !!exp,
          source: r.source,
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || b.lateMinutes - a.lateMinutes);
    return {
      from,
      to,
      rows,
      meta: { total: rows.length, totalLateMinutes: rows.reduce((sum, r) => sum + r.lateMinutes, 0) },
    };
  }

  async earlyDepartures(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      type: PunchType.OUT,
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { employeeId: true, timestamp: true, source: true, employee: { select: employeeSelect } },
      orderBy: { timestamp: 'asc' },
    });
    const expected = await this.shiftExpected(Array.from(new Set(records.map((r) => r.employeeId))));
    const rows: Array<{
      employee: (typeof records)[number]['employee'];
      date: string;
      time: string;
      expected: string;
      earlyMinutes: number;
      shiftUsed: boolean;
      source: PunchSource;
    }> = [];
    for (const r of records) {
      const exp = expected.get(`${r.employeeId}|${JS_DOW_TO_SHIFT_DAY[r.timestamp.getDay()]}`);
      const expectedMin = exp ? exp.end : DEFAULT_OUT_MINUTES;
      const punchMin = r.timestamp.getHours() * 60 + r.timestamp.getMinutes();
      if (punchMin < expectedMin) {
        rows.push({
          employee: r.employee,
          date: dateKey(r.timestamp),
          time: hhmm(r.timestamp),
          expected: hoursMin(expectedMin),
          earlyMinutes: expectedMin - punchMin,
          shiftUsed: !!exp,
          source: r.source,
        });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || b.earlyMinutes - a.earlyMinutes);
    return {
      from,
      to,
      rows,
      meta: { total: rows.length, totalEarlyMinutes: rows.reduce((sum, r) => sum + r.earlyMinutes, 0) },
    };
  }

  async absences(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const weekdays = weekdayDates(from, to);
    const employees = await this.prisma.employee.findMany({
      where: employeeEntityScopedWhere(actor, {
        status: EmploymentStatus.ACTIVE,
        AND: [
          { OR: [{ workStartDate: null }, { workStartDate: { lte: to } }] },
          { OR: [{ workEndDate: null }, { workEndDate: { gte: from } }] },
        ],
      }),
      select: { ...employeeSelect, employeeNo: true },
    });
    if (weekdays.length === 0 || employees.length === 0) {
      return { from, to, rows: [], meta: { total: 0, days: weekdays.length } };
    }
    const employeeIds = employees.map((e) => e.id);
    const [punches, leaves] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { employeeId: { in: employeeIds }, timestamp: { gte: from, lte: to } },
        select: { employeeId: true, timestamp: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          employeeId: { in: employeeIds },
          startDate: { lte: to },
          endDate: { gte: from },
        },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
    ]);

    const present = new Set(punches.map((p) => `${p.employeeId}|${dateKey(p.timestamp)}`));
    const covered: string[] = [];
    for (const leave of leaves) {
      let cur = new Date(leave.startDate.getFullYear(), leave.startDate.getMonth(), leave.startDate.getDate());
      const last = new Date(leave.endDate.getFullYear(), leave.endDate.getMonth(), leave.endDate.getDate());
      while (cur <= last) {
        if (cur.getDay() >= 1 && cur.getDay() <= 5) covered.push(`${leave.employeeId}|${dateKey(cur)}`);
        cur.setDate(cur.getDate() + 1);
      }
    }
    const coveredSet = new Set(covered);

    const rows: Array<{ employee: (typeof employees)[number]; date: string; dayName: string }> = [];
    for (const emp of employees) {
      for (const d of weekdays) {
        const key = `${emp.id}|${dateKey(d)}`;
        if (coveredSet.has(key) || present.has(key)) continue;
        rows.push({ employee: emp, date: dateKey(d), dayName: WEEKDAY_NAMES[d.getDay()] });
      }
    }
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.employee.lastName.localeCompare(b.employee.lastName));
    return { from, to, rows, meta: { total: rows.length, days: weekdays.length } };
  }

  async nonCardPunches(query: NonCardPunchQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      source: { not: PunchSource.CARD },
      type:
        query.side === 'IN'
          ? PunchType.IN
          : query.side === 'OUT'
            ? PunchType.OUT
            : undefined,
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: {
        type: true,
        timestamp: true,
        source: true,
        employee: { select: employeeSelect },
        location: { select: { name: true } },
      },
      orderBy: [{ timestamp: 'asc' }, { employee: { lastName: 'asc' } }],
    });
    return {
      from,
      to,
      side: query.side,
      rows: records.map((r) => ({
        date: dateKey(r.timestamp),
        time: hhmm(r.timestamp),
        employee: r.employee,
        type: r.type,
        source: r.source,
        location: r.location?.name ?? null,
      })),
      meta: { total: records.length },
    };
  }

  async presentNow() {
    const today = startOfToday();
    const records = await this.prisma.attendanceRecord.findMany({
      where: { timestamp: { gte: today } },
      select: { employeeId: true, type: true, timestamp: true, source: true, employee: { select: employeeSelect } },
      orderBy: { timestamp: 'asc' },
    });
    const map = new Map<
      string,
      { employee: (typeof records)[number]['employee']; firstIn?: Date; lastIn?: Date; lastOut?: Date }
    >();
    for (const r of records) {
      const acc = map.get(r.employeeId) ?? { employee: r.employee };
      if (r.type === PunchType.IN) {
        if (!acc.firstIn) acc.firstIn = r.timestamp;
        acc.lastIn = r.timestamp;
      } else {
        acc.lastOut = r.timestamp;
      }
      map.set(r.employeeId, acc);
    }
    const now = new Date();
    const rows = Array.from(map.values())
      .filter((a) => a.lastIn && (!a.lastOut || a.lastOut <= a.lastIn))
      .map((a) => ({
        employee: a.employee,
        firstIn: a.firstIn,
        lastIn: a.lastIn!,
        sinceMinutes: Math.round((now.getTime() - a.lastIn!.getTime()) / 60000),
        source: records.find((r) => r.employeeId === a.employee.id && r.type === PunchType.IN && r.timestamp.getTime() === a.lastIn!.getTime())?.source ?? null,
      }))
      .sort((a, b) => a.firstIn!.getTime() - b.firstIn!.getTime());
    return { date: dateKey(today), rows, meta: { total: rows.length } };
  }

  async manualPunches(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      source: PunchSource.MANUAL,
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: {
        type: true,
        timestamp: true,
        source: true,
        employee: { select: employeeSelect },
        location: { select: { name: true } },
      },
      orderBy: [{ timestamp: 'asc' }, { employee: { lastName: 'asc' } }],
    });
    return {
      from,
      to,
      rows: records.map((r) => ({
        date: dateKey(r.timestamp),
        time: hhmm(r.timestamp),
        employee: r.employee,
        type: r.type,
        source: r.source,
        location: r.location?.name ?? null,
      })),
      meta: { total: records.length },
    };
  }

  async newHires(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeEntityScopedWhere(actor, {
      workStartDate: { gte: from, lte: to },
    });
    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeNo: true,
        firstName: true,
        lastName: true,
        workStartDate: true,
        status: true,
        department: { select: { name: true } },
        unit: { select: { name: true } },
        workLocation: { select: { name: true } },
        title: { select: { name: true } },
      },
      orderBy: { workStartDate: 'asc' },
    });
    return {
      from,
      to,
      rows: employees.map((e) => ({
        employeeNo: e.employeeNo,
        firstName: e.firstName,
        lastName: e.lastName,
        startDate: dateKey(e.workStartDate!),
        status: e.status,
        department: e.department?.name ?? null,
        unit: e.unit?.name ?? null,
        location: e.workLocation?.name ?? null,
        title: e.title?.name ?? null,
      })),
      meta: { total: employees.length },
    };
  }

  async terminations(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeEntityScopedWhere(actor, {
      workEndDate: { gte: from, lte: to },
    });
    const employees = await this.prisma.employee.findMany({
      where,
      select: {
        id: true,
        employeeNo: true,
        firstName: true,
        lastName: true,
        workEndDate: true,
        status: true,
        department: { select: { name: true } },
        title: { select: { name: true } },
      },
      orderBy: { workEndDate: 'asc' },
    });
    return {
      from,
      to,
      rows: employees.map((e) => ({
        employeeNo: e.employeeNo,
        firstName: e.firstName,
        lastName: e.lastName,
        endDate: dateKey(e.workEndDate!),
        status: e.status,
        department: e.department?.name ?? null,
        title: e.title?.name ?? null,
      })),
      meta: { total: employees.length },
    };
  }

  async weekendWork(query: ReportQueryDto, actor: AuthenticatedUser) {
    const { from, to } = dateRange(query);
    const where = employeeScopedWhere(actor, {
      ...(query.employeeId ? { employeeId: query.employeeId } : {}),
      timestamp: { gte: from, lte: to },
    });
    const records = await this.prisma.attendanceRecord.findMany({
      where,
      select: { employeeId: true, type: true, timestamp: true, source: true, employee: { select: employeeSelect } },
      orderBy: { timestamp: 'asc' },
    });
    const map = new Map<string, { date: string; dayName: string; employee: (typeof records)[number]['employee']; firstIn?: Date; lastOut?: Date }>();
    for (const r of records) {
      const dow = r.timestamp.getDay();
      if (dow !== 0 && dow !== 6) continue;
      const date = dateKey(r.timestamp);
      const key = `${r.employeeId}|${date}`;
      const row = map.get(key) ?? { date, dayName: WEEKDAY_NAMES[dow], employee: r.employee };
      if (r.type === PunchType.IN) {
        if (!row.firstIn) row.firstIn = r.timestamp;
      } else {
        row.lastOut = r.timestamp;
      }
      map.set(key, row);
    }
    const rows = Array.from(map.values()).map((row) => ({
      date: row.date,
      dayName: row.dayName,
      employee: row.employee,
      in: row.firstIn ? hhmm(row.firstIn) : '-',
      out: row.lastOut ? hhmm(row.lastOut) : '-',
      worked:
        row.firstIn && row.lastOut && row.lastOut > row.firstIn
          ? hoursMin(Math.round((row.lastOut.getTime() - row.firstIn.getTime()) / 60000))
          : '-',
    }));
    rows.sort((a, b) => a.date.localeCompare(b.date) || a.employee.lastName.localeCompare(b.employee.lastName));
    return { from, to, rows, meta: { total: rows.length } };
  }

  async monthlyAttendance(query: PeriodicReportQueryDto, actor: AuthenticatedUser) {
    const { year, month, start, end, label } = monthBounds(query.month);
    const weekdays = weekdayDates(start, end);
    const employees = await this.prisma.employee.findMany({
      where: employeeEntityScopedWhere(actor, {
        status: EmploymentStatus.ACTIVE,
        AND: [
          { OR: [{ workStartDate: null }, { workStartDate: { lte: end } }] },
          { OR: [{ workEndDate: null }, { workEndDate: { gte: start } }] },
        ],
      }),
      select: { ...employeeSelect, employeeNo: true },
    });
    if (employees.length === 0) {
      return { year, month, label, weekdays: [], rows: [], meta: { employees: 0, days: 0, workedDays: 0 } };
    }
    const employeeIds = employees.map((e) => e.id);
    const [punches, leaves] = await Promise.all([
      this.prisma.attendanceRecord.findMany({
        where: { employeeId: { in: employeeIds }, timestamp: { gte: start, lte: end } },
        select: { employeeId: true, type: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          status: 'APPROVED',
          employeeId: { in: employeeIds },
          startDate: { lte: end },
          endDate: { gte: start },
        },
        select: { employeeId: true, startDate: true, endDate: true },
      }),
    ]);

    const byDay = new Map<string, Map<string, { in?: Date; out?: Date }>>();
    const setPresent = new Set<string>();
    const workedMinutesByEmployee = new Map<string, number>();
    for (const p of punches) {
      const date = dateKey(p.timestamp);
      setPresent.add(`${p.employeeId}|${date}`);
      let empMap = byDay.get(p.employeeId);
      if (!empMap) {
        empMap = new Map();
        byDay.set(p.employeeId, empMap);
      }
      const bucket = empMap.get(date) ?? {};
      if (p.type === PunchType.IN) {
        if (!bucket.in) bucket.in = p.timestamp;
      } else {
        bucket.out = p.timestamp;
      }
      empMap.set(date, bucket);
    }
    for (const [empId, empMap] of byDay) {
      let minutes = 0;
      for (const bucket of empMap.values()) {
        if (bucket.in && bucket.out && bucket.out > bucket.in) minutes += (bucket.out.getTime() - bucket.in.getTime()) / 60000;
      }
      workedMinutesByEmployee.set(empId, Math.round(minutes));
    }

    const coveredSet = new Set<string>();
    for (const leave of leaves) {
      let cur = new Date(leave.startDate.getFullYear(), leave.startDate.getMonth(), leave.startDate.getDate());
      const last = new Date(leave.endDate.getFullYear(), leave.endDate.getMonth(), leave.endDate.getDate());
      while (cur <= last) {
        const dow = cur.getDay();
        if (dow >= 1 && dow <= 5) coveredSet.add(`${leave.employeeId}|${dateKey(cur)}`);
        cur.setDate(cur.getDate() + 1);
      }
    }

    const rows = employees.map((emp) => {
      const seq = weekdays.map((d) => {
        const key = `${emp.id}|${dateKey(d)}`;
        if (coveredSet.has(key)) return 'İ';
        if (setPresent.has(key)) return 'P';
        return 'A';
      });
      return {
        employee: emp,
        seq: seq.join(''),
        presentCount: seq.filter((s) => s === 'P').length,
        workedMinutes: workedMinutesByEmployee.get(emp.id) ?? 0,
        worked: hoursMin(workedMinutesByEmployee.get(emp.id) ?? 0),
      };
    });
    rows.sort((a, b) => b.presentCount - a.presentCount || a.employee.lastName.localeCompare(b.employee.lastName));

    return {
      year,
      month,
      label,
      weekdays: weekdays.map((d) => ({ date: dateKey(d), dayName: WEEKDAY_NAMES[d.getDay()] })),
      rows,
      meta: {
        employees: rows.length,
        days: weekdays.length,
        workedDays: rows.reduce((sum, r) => sum + r.presentCount, 0),
      },
    };
  }

  async payrun(query: PeriodicReportQueryDto, actor: AuthenticatedUser) {
    const { year, month, start, end, label } = monthBounds(query.month);
    const employees = await this.prisma.employee.findMany({
      where: employeeEntityScopedWhere(actor, {
        status: EmploymentStatus.ACTIVE,
        AND: [{ OR: [{ workStartDate: null }, { workStartDate: { lte: end } }] }],
      }),
      select: {
        id: true,
        firstName: true,
        lastName: true,
        employeeNo: true,
        department: { select: { name: true } },
      },
    });
    if (employees.length === 0) {
      return { year, month, label, rows: [], meta: { employees: 0 } };
    }
    const employeeIds = employees.map((e) => e.id);

    const [payrollItems, overtimes, leaves, punches] = await Promise.all([
      this.prisma.payrollItem.findMany({
        where: { employeeId: { in: employeeIds } },
        orderBy: [{ periodYear: 'desc' }, { periodMonth: 'desc' }],
        select: { employeeId: true, periodYear: true, periodMonth: true, baseSalary: true },
      }),
      this.prisma.overtime.findMany({
        where: { employeeId: { in: employeeIds }, status: 'APPROVED', date: { gte: start, lte: end } },
        select: { employeeId: true, hours: true },
      }),
      this.prisma.leaveRequest.findMany({
        where: {
          employeeId: { in: employeeIds },
          status: 'APPROVED',
          startDate: { lte: end },
          endDate: { gte: start },
          leaveType: { isNot: { paid: true } },
        },
        select: { employeeId: true, days: true },
      }),
      this.prisma.attendanceRecord.findMany({
        where: { employeeId: { in: employeeIds }, timestamp: { gte: start, lte: end } },
        select: { employeeId: true, type: true, timestamp: true },
        orderBy: { timestamp: 'asc' },
      }),
    ]);

    const baseByEmployee = new Map<string, number>();
    for (const item of payrollItems) {
      if (!baseByEmployee.has(item.employeeId)) baseByEmployee.set(item.employeeId, Number(item.baseSalary));
    }

    const otByEmployee = new Map<string, number>();
    for (const o of overtimes) otByEmployee.set(o.employeeId, (otByEmployee.get(o.employeeId) ?? 0) + o.hours);

    const leaveByEmployee = new Map<string, number>();
    for (const l of leaves) leaveByEmployee.set(l.employeeId, (leaveByEmployee.get(l.employeeId) ?? 0) + l.days);

    const byDay = new Map<string, Map<string, { in?: Date; out?: Date }>>();
    for (const p of punches) {
      let empMap = byDay.get(p.employeeId);
      if (!empMap) {
        empMap = new Map();
        byDay.set(p.employeeId, empMap);
      }
      const date = dateKey(p.timestamp);
      const bucket = empMap.get(date) ?? {};
      if (p.type === PunchType.IN) {
        if (!bucket.in) bucket.in = p.timestamp;
      } else {
        bucket.out = p.timestamp;
      }
      empMap.set(date, bucket);
    }

    const rows = employees
      .map((emp) => {
        const base = baseByEmployee.get(emp.id) ?? 0;
        const otHours = otByEmployee.get(emp.id) ?? 0;
        const unpaidDays = leaveByEmployee.get(emp.id) ?? 0;
        const overtimeAmount = base > 0 ? Math.round(((base / 30 / 8) * otHours) * 100) / 100 : 0;
        const leaveDeduction = base > 0 ? Math.round(((base / 30) * unpaidDays) * 100) / 100 : 0;
        const gross = Math.round((base + overtimeAmount - leaveDeduction) * 100) / 100;
        let workedMinutes = 0;
        let workedDays = 0;
        const empMap = byDay.get(emp.id);
        if (empMap) {
          for (const bucket of empMap.values()) {
            if (bucket.in && bucket.out && bucket.out > bucket.in) {
              workedMinutes += (bucket.out.getTime() - bucket.in.getTime()) / 60000;
              workedDays += 1;
            }
          }
        }
        workedMinutes = Math.round(workedMinutes);
        return {
          employee: { id: emp.id, firstName: emp.firstName, lastName: emp.lastName, employeeNo: emp.employeeNo },
          department: emp.department?.name ?? null,
          baseSalary: base,
          overtimeHours: Math.round(otHours * 100) / 100,
          overtimeAmount,
          unpaidLeaveDays: Math.round(unpaidDays * 100) / 100,
          leaveDeduction,
          grossAmount: gross,
          netAmount: gross,
          workedDays,
          workedMinutes,
          worked: hoursMin(workedMinutes),
        };
      })
      .sort((a, b) => a.employee.lastName.localeCompare(b.employee.lastName));

    return {
      year,
      month,
      label,
      rows,
      meta: {
        employees: rows.length,
        totalGross: rows.reduce((sum, r) => sum + r.grossAmount, 0),
        totalNet: rows.reduce((sum, r) => sum + r.netAmount, 0),
        totalOvertime: rows.reduce((sum, r) => sum + r.overtimeAmount, 0),
        totalLeaveDeduction: rows.reduce((sum, r) => sum + r.leaveDeduction, 0),
      },
    };
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