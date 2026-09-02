import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { announcementApi, type AnnouncementTargetType, ANNOUNCEMENT_TARGET_META } from '@/features/duyuru/api';
import { formatError } from '@/lib/utils';

export function DuyuruCreatePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetType, setTargetType] = useState<AnnouncementTargetType>('ALL');
  // targetId ve targetEmployeeIds ileride eklenebilir, şimdilik basit MVP
  const [publishAt, setPublishAt] = useState('');
  const [expireAt, setExpireAt] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const createMutation = useMutation({
    mutationFn: (status: 'DRAFT' | 'PUBLISHED') =>
      announcementApi.create({
        title,
        content,
        targetType,
        status,
        publishAt: publishAt ? new Date(publishAt).toISOString() : undefined,
        expireAt: expireAt ? new Date(expireAt).toISOString() : undefined,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['announcements-admin'] });
      await queryClient.invalidateQueries({ queryKey: ['announcements-my'] });
      navigate('/duyurular');
    },
    onError: (error) => setErrorMessage(formatError(error)),
  });

  const canSubmit = Boolean(title && content);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Yeni Duyuru / Bildirim"
        description="Personellere iletilecek duyuruları oluşturun"
        actions={
          <Link to="/duyurular" className={buttonVariants({ variant: 'outline' })}>
            <ArrowLeft /> Listeye Dön
          </Link>
        }
      />

      <Card>
        <CardHeader><CardTitle>İçerik ve Hedef Kitle</CardTitle></CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>Başlık *</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Örn: Yıllık İzin Planlamaları Hakkında" />
          </div>

          <div className="space-y-2 md:col-span-2">
            <Label>Duyuru Metni *</Label>
            <textarea
              className="min-h-32 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Duyuru detaylarını buraya yazın..."
            />
          </div>

          <div className="space-y-2">
            <Label>Hedef Kitle</Label>
            <Select value={targetType} onChange={(e) => setTargetType(e.target.value as AnnouncementTargetType)}>
              {Object.entries(ANNOUNCEMENT_TARGET_META).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </Select>
          </div>
          <div className="space-y-2"></div> {/* Boş kolon */}

          <div className="space-y-2">
            <Label>Yayınlanma Zamanı (Boşsa hemen yayınlanır)</Label>
            <Input type="datetime-local" value={publishAt} onChange={(e) => setPublishAt(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label>Bitiş Zamanı (Boşsa süresiz kalır)</Label>
            <Input type="datetime-local" value={expireAt} onChange={(e) => setExpireAt(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

      <div className="flex justify-end gap-2">
        <Link to="/duyurular" className={buttonVariants({ variant: 'outline' })}>Vazgeç</Link>
        <Button variant="secondary" disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate('DRAFT')}>
          Taslak Kaydet
        </Button>
        <Button disabled={!canSubmit || createMutation.isPending} onClick={() => createMutation.mutate('PUBLISHED')}>
          <Save className="mr-2 h-4 w-4" /> {createMutation.isPending ? 'İşleniyor…' : 'Yayınla'}
        </Button>
      </div>
    </div>
  );
}
