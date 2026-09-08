import { useMemo, useState } from 'react';
import { ArrowLeft, Banknote, CalendarDays, Calculator, CalendarX, ChevronRight, Clock, CreditCard, FileChartColumn, Grid3x3, IdCard, MoonStar, Phone, Search, Timer, UserCheck, UserMinus, UserPlus, Wrench, type LucideIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Tabs } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth';
import { employeesApi } from '@/features/personel/api';
import { FULL_NAME } from '@/features/raporlar/api';
import {
  GENEL_REPORTS,
  HESAP_REPORTS,
  ReportView,
  type ReportDef,
  type ReportParams,
  type ReportSection,
} from './report-views';

const LAST_30 = new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10);
const TODAY = new Date().toISOString().slice(0, 10);
const CURRENT_MONTH = new Date().toISOString().slice(0, 7);

const ICONS: [string, LucideIcon][] = [
  ['genel-giris-cikis', Clock],
  ['kisi-giris-cikis', Clock],
  ['genel-gec-kalanlar', Timer],
  ['kisi-gec-kalanlar', Timer],
  ['genel-erken-cikanlar', Timer],
  ['kisi-erken-cikanlar', Timer],
  ['mesai', Timer],
  ['devamsizlar', CalendarX],
  ['giris-kart-yok', IdCard],
  ['cikis-kart-yok', IdCard],
  ['kart-yok', IdCard],
  ['iceride', UserCheck],
  ['elle-mudahale', Wrench],
  ['nobet', MoonStar],
  ['irtibat', Phone],
  ['ise-girenler', UserPlus],
  ['isten-ayrilanlar', UserMinus],
  ['tatil-calisan', CalendarDays],
  ['izin', CalendarDays],
  ['avans', CreditCard],
  ['prim', Banknote],
  ['aylik-devam', Grid3x3],
  ['puantaj', Calculator],
  ['maas-genel', Banknote],
  ['maas-kisi', Banknote],
  ['maas-pusula', FileChartColumn],
  ['maas-grup', Calculator],
];

function iconFor(id: string): LucideIcon {
  return ICONS.find(([key]) => key === id)?.[1] ?? FileChartColumn;
}

export function RaporlarPage() {
  const hasPermission = useAuthStore((s) => s.hasPermission);
  const [tab, setTab] = useState<ReportSection>('genel');
  const [search, setSearch] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);

  const [from, setFrom] = useState(LAST_30);
  const [to, setTo] = useState(TODAY);
  const [month, setMonth] = useState(CURRENT_MONTH);
  const [employeeId, setEmployeeId] = useState('');

  const { data: employeesData } = useQuery({
    queryKey: ['employees-all'],
    queryFn: () => employeesApi.list({ pageSize: 500 }),
  });
  const employees = employeesData?.items ?? [];

  const activeDef = useMemo(() => {
    const all = [...GENEL_REPORTS, ...HESAP_REPORTS];
    return all.find((r) => r.id === activeId) ?? null;
  }, [activeId]);

  const params: ReportParams = useMemo(
    () => ({
      from: from || undefined,
      to: to || undefined,
      month: month || undefined,
      employeeId: employeeId || undefined,
    }),
    [from, to, month, employeeId],
  );

  const genelVisible = GENEL_REPORTS.filter((r) => hasPermission(r.permission));
  const hesapVisible = HESAP_REPORTS.filter((r) => hasPermission(r.permission));

  const catalog = useMemo(() => {
    const pool = tab === 'genel' ? genelVisible : hesapVisible;
    const q = search.trim().toLocaleLowerCase('tr-TR');
    if (!q) return pool;
    return pool.filter((r) => (r.title + ' ' + r.description).toLocaleLowerCase('tr-TR').includes(q));
  }, [tab, search, genelVisible, hesapVisible]);

  const goBack = () => {
    setActiveId(null);
    setSearch('');
  };

  return (
    <div className="space-y-4">
      <PageHeader title="Raporlar" description="Genel ve hesap raporları kataloğu" />

      {activeDef ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" size="sm" onClick={goBack}>
              <ArrowLeft /> Raporlar
            </Button>
            <div className="flex flex-wrap items-end gap-3">
              {activeDef.kind === 'range' && (
                <>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Başlangıç</label>
                    <Input type="date" className="w-40" value={from} onChange={(e) => setFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Bitiş</label>
                    <Input type="date" className="w-40" value={to} onChange={(e) => setTo(e.target.value)} />
                  </div>
                </>
              )}
              {activeDef.kind === 'month' && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Dönem</label>
                  <Input type="month" className="w-44" value={month} onChange={(e) => setMonth(e.target.value)} />
                </div>
              )}
              {activeDef.employee && (
                <div className="space-y-1">
                  <label className="text-xs text-muted-foreground">Personel</label>
                  <Select className="w-56" value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
                    <option value="">Tüm personel</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {FULL_NAME(emp)}
                      </option>
                    ))}
                  </Select>
                </div>
              )}
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold">{activeDef.title}</h2>
            <p className="text-sm text-muted-foreground">{activeDef.description}</p>
          </div>
          <ReportView def={activeDef} params={params} employees={employees} />
        </div>
      ) : (
        <div className="space-y-4">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as ReportSection)}
            tabs={[
              { value: 'genel', label: `Genel Raporlar (${genelVisible.length})` },
              { value: 'hesap', label: `Hesap Raporları (${hesapVisible.length})` },
            ]}
          />

          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rapor ara..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {catalog.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-sm text-muted-foreground">
                Arama sonucu bulunamadı.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {catalog.map((report) => {
                const Icon = iconFor(report.id);
                return (
                  <ReportCard
                    key={report.id}
                    report={report}
                    icon={<Icon className="size-4" />}
                    onOpen={() => setActiveId(report.id)}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportCard({ report, icon, onOpen }: { report: ReportDef; icon: React.ReactNode; onOpen: () => void }) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left"
    >
      <Card className="h-full transition-colors hover:border-primary">
        <CardHeader className="flex-row items-start gap-3 space-y-0">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            {icon}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm leading-tight">{report.title}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2">{report.description}</CardDescription>
          </div>
          <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </CardHeader>
      </Card>
    </button>
  );
}