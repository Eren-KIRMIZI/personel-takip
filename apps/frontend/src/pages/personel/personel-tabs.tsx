import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge, StatusBadge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuthStore } from '@/stores/auth';
import { leaveApi } from '@/features/izin/api';
import { overtimeApi, formatDate as otDate } from '@/features/mesai/api';
import { attendanceApi, formatDateTime, PUNCH_TYPE_LABEL, PUNCH_SOURCE_LABEL } from '@/features/giris-cikis/api';
import { cardApi } from '@/features/card/api';
import { advanceApi, ADVANCE_STATUS_META, formatMoney as advMoney, monthLabel as advMonth } from '@/features/avans/api';
import {
  employeeRecordApi,
  RECORD_TYPE_LABELS,
} from '@/features/personel-kayitlari/api';
import { payrollApi, formatMoney, monthLabel } from '@/features/maas/api';
import { SHIFT_DAY_LABEL, SHIFT_DAY_ORDER, shiftApi } from '@/features/vardiya/api';
import { assetApi, ASSET_STATUS_META } from '@/features/zimmet/api';
import { taskApi, TASK_STATUS_META, TASK_PRIORITY_META } from '@/features/gorev/api';
import { documentApi, DOCUMENT_STATUS_META, DOCUMENT_PRIORITY_META } from '@/features/evrak/api';
import { formatError } from '@/lib/utils';

function SubCard({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {action}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function EmptyState({ label }: { label: string }) {
  return <p className="py-6 text-center text-sm text-muted-foreground">{label}</p>;
}

function TableSkeleton({ cols }: { cols: number }) {
  return (
    <Table>
      <TableBody>
        {Array.from({ length: 4 }).map((_, i) => (
          <TableRow key={i}><TableCell colSpan={cols}><Skeleton className="h-7 w-full" /></TableCell></TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function formatDateShorthand(iso?: string | null) {
  return iso ? new Date(iso).toLocaleDateString('tr-TR') : '-';
}

export function IzinlerTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-leaves', employeeId],
    queryFn: () => leaveApi.list({ employeeId, pageSize: 15 }),
    staleTime: 2 * 60 * 1000,
  });
  return (
    <SubCard title="İzinler">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tip</TableHead>
              <TableHead>Başlangıç</TableHead>
              <TableHead>Bitiş</TableHead>
              <TableHead className="text-right">Gün</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((l) => (
              <TableRow key={l.id}>
                <TableCell>{l.leaveType?.name ?? '-'}</TableCell>
                <TableCell>{formatDateShorthand(l.startDate)}</TableCell>
                <TableCell>{formatDateShorthand(l.endDate)}</TableCell>
                <TableCell className="text-right">{l.days}</TableCell>
                <TableCell><StatusBadge status={l.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="İzin kaydı yok" />
      )}
    </SubCard>
  );
}

export function MesaiTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-ot', employeeId],
    queryFn: () => overtimeApi.list({ employeeId, pageSize: 15 }),
    staleTime: 2 * 60 * 1000,
  });
  return (
    <SubCard title="Mesai Kayıtları">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Saat</TableHead>
              <TableHead className="text-right">Katsayı</TableHead>
              <TableHead className="text-right">Hesap</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((o) => (
              <TableRow key={o.id}>
                <TableCell>{otDate(o.date)}</TableCell>
                <TableCell className="text-right">{o.hours}</TableCell>
                <TableCell className="text-right">{o.rate}×</TableCell>
                <TableCell className="text-right">{(o.hours * o.rate).toFixed(1)}s</TableCell>
                <TableCell><StatusBadge status={o.status} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Mesai kaydı yok" />
      )}
    </SubCard>
  );
}

export function GirisCikisTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-attendance', employeeId],
    queryFn: () => attendanceApi.list({ employeeId, pageSize: 15 }),
    staleTime: 60 * 1000,
  });
  return (
    <SubCard title="Giriş-Çıkış Hareketleri">
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Zaman</TableHead>
              <TableHead>Tür</TableHead>
              <TableHead>Kaynak</TableHead>
              <TableHead>Konum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDateTime(a.timestamp)}</TableCell>
                <TableCell>
                  <Badge variant={a.type === 'IN' ? 'success' : 'secondary'}>{PUNCH_TYPE_LABEL[a.type]}</Badge>
                </TableCell>
                <TableCell>{PUNCH_SOURCE_LABEL[a.source]}</TableCell>
                <TableCell className="text-muted-foreground">{a.location?.name ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Hareket kaydı yok" />
      )}
    </SubCard>
  );
}

export function CalismaPlaniTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-shifts', employeeId],
    queryFn: () => shiftApi.assignments({ employeeId }),
    staleTime: 5 * 60 * 1000,
  });
  const hasWrite = useAuthStore((s) => s.hasPermission('shift:write'));

  const byDay = SHIFT_DAY_ORDER.map((day) => ({
    day,
    rows: (data ?? []).filter((a) => a.day === day),
  }));

  return (
    <SubCard title="Çalışma Planı / Haftalık Vardiya">
      {isLoading ? (
        <TableSkeleton cols={3} />
      ) : data && data.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Gün</TableHead>
              <TableHead>Vardiya</TableHead>
              <TableHead>Saat</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {byDay.map(({ day, rows }) => (
              <TableRow key={day}>
                <TableCell className="font-medium">{SHIFT_DAY_LABEL[day]}</TableCell>
                <TableCell>
                  {rows.length ? rows.map((r) => r.shift?.name).filter(Boolean).join(', ') : <span className="text-muted-foreground">İzin / Boş</span>}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {rows.length ? rows.map((r) => r.shift ? `${r.shift.startTime}–${r.shift.endTime}` : '?').join(', ') : '-'}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : hasWrite ? (
        <EmptyState label="Vardiya ataması yok. Vardiyalar sayfasından atayın." />
      ) : (
        <EmptyState label="Vardiya ataması yok." />
      )}
    </SubCard>
  );
}

export function MaasBordroTab({ employeeId }: { employeeId: string }) {
  const hasWrite = useAuthStore((s) => s.hasPermission('payroll:write'));
  const queryClient = useQueryClient();

  const { data: salary } = useQuery({
    queryKey: ['mid-salary', employeeId],
    queryFn: () => payrollApi.getEmployeeSalary(employeeId),
    staleTime: 5 * 60 * 1000,
  });
  const { data: items, isLoading } = useQuery({
    queryKey: ['mid-payroll', employeeId],
    queryFn: () => payrollApi.list({ employeeId, pageSize: 12 }),
    staleTime: 5 * 60 * 1000,
  });

  const [salaryOpen, setSalaryOpen] = useState(false);
  const [baseSalary, setBaseSalary] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const setSalary = useMutation({
    mutationFn: () => payrollApi.setSalary(employeeId, baseSalary, undefined),
    onSuccess: () => {
      setSalaryOpen(false);
      setBaseSalary('');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['mid-salary', employeeId] });
      void queryClient.invalidateQueries({ queryKey: ['mid-payroll', employeeId] });
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const submitSalary = () => {
    if (!baseSalary) return;
    setSalary.mutate();
  };

  return (
    <div className="space-y-4">
      <SubCard
        title="Cari Maaş"
        action={
          hasWrite ? (
            <Button variant="outline" size="sm" onClick={() => setSalaryOpen(true)}>
              Maaş Belirle
            </Button>
          ) : undefined
        }
      >
        {errorMessage && <p className="mb-2 text-sm text-destructive">{errorMessage}</p>}
        {salary?.baseSalary != null ? (
          <div className="space-y-0.5">
            <div className="text-2xl font-semibold">{formatMoney(salary.baseSalary)} brüt</div>
            {salary.lastPeriod && (
              <div className="text-xs text-muted-foreground">
                Son dönem {monthLabel(salary.lastPeriod.month)} {salary.lastPeriod.year}
              </div>
            )}
          </div>
        ) : (
          <EmptyState label={hasWrite ? 'Maaş tanımlanmamış. Maaş Belirle ile başlayın.' : 'Maaş tanımlanmamış.'} />
        )}
      </SubCard>

      <SubCard title="Dönemsel Bordrolar">
        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : items && items.items.length ? (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dönem</TableHead>
                <TableHead className="text-right">Brüt</TableHead>
                <TableHead className="text-right">Mesai</TableHead>
                <TableHead className="text-right">Net</TableHead>
                <TableHead>Durum</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.items.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{monthLabel(p.periodMonth)} {p.periodYear}</TableCell>
                  <TableCell className="text-right">{formatMoney(p.baseSalary)}</TableCell>
                  <TableCell className="text-right">+{formatMoney(p.overtimeAmount)}</TableCell>
                  <TableCell className="text-right font-medium">{formatMoney(p.netAmount)}</TableCell>
                  <TableCell><StatusBadge status={p.status} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <EmptyState label="Bordro kaydı yok. Maaş sayfasından dönemsel üretim yapın." />
        )}
      </SubCard>

      <Dialog
        open={salaryOpen}
        onClose={() => setSalaryOpen(false)}
        title="Maaş Belirle"
        description="Brüt aylık maaş"
        footer={
          <>
            <Button variant="outline" onClick={() => setSalaryOpen(false)}>Vazgeç</Button>
            <Button disabled={!baseSalary || setSalary.isPending} onClick={submitSalary}>
              {setSalary.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="space-y-2">
          <Label>Brüt Maaş (TL)</Label>
          <Input type="number" min="0" step="0.01" value={baseSalary} onChange={(e) => setBaseSalary(e.target.value)} placeholder="35000.00" />
        </div>
      </Dialog>
    </div>
  );
}

export function AvanslarTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-advances', employeeId],
    queryFn: () => advanceApi.list({ employeeId, pageSize: 10 }),
    staleTime: 2 * 60 * 1000,
  });
  return (
    <SubCard title="Avans Talepleri">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tarih</TableHead>
              <TableHead className="text-right">Tutar</TableHead>
              <TableHead>Dönem</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead>Gerekçe</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell>{formatDateShorthand(a.createdAt)}</TableCell>
                <TableCell className="text-right font-medium">{advMoney(a.amount)}</TableCell>
                <TableCell>{advMonth(a.periodMonth)} {a.periodYear}</TableCell>
                <TableCell><Badge variant={ADVANCE_STATUS_META[a.status].variant}>{ADVANCE_STATUS_META[a.status].label}</Badge></TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{a.description ?? a.rejectionReason ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Avans kaydı yok." />
      )}
    </SubCard>
  );
}

export function CezaTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-records-DISC', employeeId],
    queryFn: () => employeeRecordApi.list({ employeeId, category: 'DISCIPLINARY', pageSize: 10 }),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <SubCard title="Disiplin Kayıtları">
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tür</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="destructive">{RECORD_TYPE_LABELS[r.type]}</Badge></TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{formatDateShorthand(r.date)}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{r.description ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Disiplin kaydı yok." />
      )}
    </SubCard>
  );
}

export function OdulTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-records-REWARD', employeeId],
    queryFn: () => employeeRecordApi.list({ employeeId, category: 'REWARD', pageSize: 10 }),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <SubCard title="Ödül Kayıtları">
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tür</TableHead>
              <TableHead>Başlık</TableHead>
              <TableHead>Tarih</TableHead>
              <TableHead>Açıklama</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((r) => (
              <TableRow key={r.id}>
                <TableCell><Badge variant="success">{RECORD_TYPE_LABELS[r.type]}</Badge></TableCell>
                <TableCell className="font-medium">{r.title}</TableCell>
                <TableCell>{formatDateShorthand(r.date)}</TableCell>
                <TableCell className="text-xs text-muted-foreground max-w-48 truncate">{r.description ?? '-'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Ödül kaydı yok." />
      )}
    </SubCard>
  );
}

export function ZimmetTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-assets', employeeId],
    queryFn: () => assetApi.list({ employeeId, pageSize: 10 }),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <SubCard title="Zimmet Kayıtları">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Malzeme</TableHead>
              <TableHead>Seri No</TableHead>
              <TableHead>Kategori</TableHead>
              <TableHead>Teslim</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.name}</TableCell>
                <TableCell className="text-muted-foreground">{a.serialNo ?? '-'}</TableCell>
                <TableCell>{a.category ?? '-'}</TableCell>
                <TableCell>{formatDateShorthand(a.assignedDate)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={ASSET_STATUS_META[a.status].variant} 
                  >
                    {ASSET_STATUS_META[a.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Personele ait zimmet kaydı yok." />
      )}
    </SubCard>
  );
}

export function GorevTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-tasks', employeeId],
    queryFn: () => taskApi.list({ employeeId, pageSize: 10 }),
    staleTime: 2 * 60 * 1000,
  });
  return (
    <SubCard title="Görevler">
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Görev</TableHead>
              <TableHead>Bitiş Tarihi</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.title}</TableCell>
                <TableCell>{formatDateShorthand(t.dueDate)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={TASK_PRIORITY_META[t.priority].variant} 
                  >
                    {TASK_PRIORITY_META[t.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={TASK_STATUS_META[t.status].variant} 
                  >
                    {TASK_STATUS_META[t.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Personele atanmış görev yok." />
      )}
    </SubCard>
  );
}

export function EvrakTab({ employeeId }: { employeeId: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['personal-documents', employeeId],
    queryFn: () => documentApi.list({ employeeId, pageSize: 10 }),
    staleTime: 5 * 60 * 1000,
  });
  return (
    <SubCard title="İlgili Evraklar">
      {isLoading ? (
        <TableSkeleton cols={5} />
      ) : data && data.items.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Evrak No</TableHead>
              <TableHead>Konu</TableHead>
              <TableHead>Geliş Tarihi</TableHead>
              <TableHead>Öncelik</TableHead>
              <TableHead>Durum</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.items.map((d) => (
              <TableRow key={d.id}>
                <TableCell className="font-mono text-sm">{d.documentNo ?? '-'}</TableCell>
                <TableCell className="font-medium">{d.subject}</TableCell>
                <TableCell>{formatDateShorthand(d.receivedAt)}</TableCell>
                <TableCell>
                  <Badge 
                    variant={DOCUMENT_PRIORITY_META[d.priority].variant} 
                  >
                    {DOCUMENT_PRIORITY_META[d.priority].label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={DOCUMENT_STATUS_META[d.status].variant} 
                  >
                    {DOCUMENT_STATUS_META[d.status].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Personelle ilişkilendirilmiş evrak yok." />
      )}
    </SubCard>
  );
}

export function KartBilgileriTab({ employeeId }: { employeeId: string }) {
  const queryClient = useQueryClient();
  const hasWrite = useAuthStore((s) => s.hasPermission('attendance:write'));

  const { data, isLoading } = useQuery({
    queryKey: ['personal-cards', employeeId],
    queryFn: () => cardApi.credentials({ employeeId, pageSize: 20 }),
    staleTime: 60 * 1000,
  });

  const [addOpen, setAddOpen] = useState(false);
  const [cardUid, setCardUid] = useState('');
  const [note, setNote] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => cardApi.createCredential({ employeeId, cardUid: cardUid.trim(), note: note || undefined }),
    onSuccess: () => {
      setAddOpen(false);
      setCardUid('');
      setNote('');
      setErrorMessage(null);
      void queryClient.invalidateQueries({ queryKey: ['personal-cards', employeeId] });
    },
    onError: (err) => setErrorMessage(formatError(err)),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      cardApi.updateCredential(id, { isActive: !isActive }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['personal-cards', employeeId] });
    },
  });

  const cards = data?.items ?? [];

  return (
    <SubCard
      title="Kart Bilgileri"
      action={
        hasWrite ? (
          <Button variant="outline" size="sm" onClick={() => setAddOpen(true)}>
            Kart Tanımla
          </Button>
        ) : undefined
      }
    >
      {errorMessage && addOpen && <p className="mb-2 text-sm text-destructive">{errorMessage}</p>}
      {isLoading ? (
        <TableSkeleton cols={4} />
      ) : cards.length ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kart ID</TableHead>
              <TableHead>Not</TableHead>
              <TableHead>Durum</TableHead>
              {hasWrite && <TableHead className="text-right">Aksiyon</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cards.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-mono text-sm">{c.cardUid}</TableCell>
                <TableCell className="text-xs text-muted-foreground">{c.note ?? '-'}</TableCell>
                <TableCell>
                  <Badge variant={c.isActive ? 'success' : 'secondary'}>
                    {c.isActive ? 'Aktif' : 'Pasif'}
                  </Badge>
                </TableCell>
                {hasWrite && (
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={toggle.isPending}
                      onClick={() => toggle.mutate({ id: c.id, isActive: c.isActive })}
                    >
                      {c.isActive ? 'Devre Dışı' : 'Aktif Et'}
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <EmptyState label="Bu personele tanımlı kart yok." />
      )}

      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Kart Tanımla"
        description="Bu personele yeni bir kart ID tanımlayın."
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Vazgeç</Button>
            <Button disabled={!cardUid.trim() || create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? 'Kaydediliyor…' : 'Kaydet'}
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="space-y-2">
            <Label>Kart ID</Label>
            <Input value={cardUid} onChange={(e) => setCardUid(e.target.value)} placeholder="TEST-CARD-001" />
          </div>
          <div className="space-y-2">
            <Label>Not (opsiyonel)</Label>
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Ör. Bordo kart" />
          </div>
        </div>
      </Dialog>
    </SubCard>
  );
}