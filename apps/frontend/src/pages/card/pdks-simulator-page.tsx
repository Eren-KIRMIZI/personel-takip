import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { cardApi } from '@/features/card/api';
import { formatError } from '@/lib/utils';
import { CreditCard, CheckCircle2, XCircle } from 'lucide-react';

interface DeviceOption {
  id: string;
  label: string;
  inactive: boolean;
}

export function PdksSimulatorPage() {
  const queryClient = useQueryClient();

  const { data: readersPage } = useQuery({
    queryKey: ['card-readers', 'sim'],
    queryFn: () => cardApi.readers({ pageSize: 100 }),
    staleTime: 60 * 1000,
  });

  const readers = readersPage?.items ?? [];
  const devices: DeviceOption[] = [
    { id: 'no-device', label: 'Cihaz seçilmedi (varsayılan)', inactive: true },
    ...readers.map((r) => ({
      id: r.id,
      label: r.isActive
        ? `${r.name}${r.location?.name ? ` - ${r.location.name}` : ''}`
        : `${r.name} (pasif)`,
      inactive: !r.isActive,
    })),
  ];

  const [readerId, setReaderId] = useState('no-device');
  const [cardUid, setCardUid] = useState('');
  const [result, setResult] = useState<{ ok: boolean; message: string; detail?: string } | null>(null);

  const scan = useMutation({
    mutationFn: () =>
      cardApi.scan({
        cardUid: cardUid.trim(),
        readerId: readerId === 'no-device' ? undefined : readerId,
      }),
    onSuccess: (res) => {
      void queryClient.invalidateQueries({ queryKey: ['attendance'] });
      const inOut = res.type === 'IN' ? 'Giriş' : 'Çıkış';
      const at = new Date(res.timestamp).toLocaleTimeString('tr-TR');
      setResult({
        ok: true,
        message: `${res.employee.firstName} ${res.employee.lastName}`,
        detail: `✓ ${inOut} kaydedildi - ${at}`,
      });
      setCardUid('');
    },
    onError: (err) => {
      setResult({ ok: false, message: 'Okutma başarısız', detail: formatError(err) });
    },
  });

  const submit = () => {
    if (!cardUid.trim() || scan.isPending) return;
    setResult(null);
    scan.mutate();
  };

  return (
    <div className="space-y-6 animate-fade-in max-w-3xl mx-auto">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">PDKS Cihaz Simülatörü</h1>
        <p className="text-sm text-muted-foreground">
          Gerçek kart okuyucu gelene kadar kart okutma akışını test etmek için kullanılır. Simülatör
          yalnızca kart okuyucuyu taklit eder; giriş-çıkış kaydı gerçek sisteme (aynı toggle mantığı)
          yazılır. Cihaz geldiğinde sadece kart okuyucu buraya bağlanacak, iş mantığı değişmeyecek.
        </p>
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <CreditCard className="size-4" /> Kart Okutma
          </CardTitle>
          <CardDescription className="text-xs">
            Cihazı ve kart ID'sini seçip okutun.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Cihaz</Label>
              <Select value={readerId} onChange={(e) => setReaderId(e.target.value)}>
                {devices.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Kart ID</Label>
              <Input
                value={cardUid}
                onChange={(e) => setCardUid(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submit()}
                placeholder="TEST-CARD-001"
                autoFocus
              />
            </div>
          </div>

          <Button className="w-full" size="lg" disabled={!cardUid.trim() || scan.isPending} onClick={submit}>
            {scan.isPending ? 'Okutuluyor…' : 'KARTI OKUT'}
          </Button>

          {result && (
            <div
              className={`flex flex-col items-center gap-1 rounded-lg border p-5 text-center ${
                result.ok ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
              }`}
            >
              {result.ok ? (
                <CheckCircle2 className="size-6 text-emerald-600" />
              ) : (
                <XCircle className="size-6 text-red-600" />
              )}
              <div className={`text-lg font-semibold ${result.ok ? 'text-emerald-700' : 'text-red-700'}`}>
                {result.message}
              </div>
              <div className="text-sm text-muted-foreground">{result.detail}</div>
            </div>
          )}
        </CardContent>
      </Card>

      <pre className="rounded-lg bg-muted p-4 text-xs text-muted-foreground overflow-x-auto font-mono">
        {`SIMULATOR\n    ↓\nCARD SCAN (POST /api/card/scan)\n    ↓\nCardService.scan()\n    ↓\nattendance_records (source: CARD)`}
      </pre>
    </div>
  );
}