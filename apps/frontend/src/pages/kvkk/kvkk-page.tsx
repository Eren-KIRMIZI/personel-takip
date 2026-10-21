import { useState } from 'react';
import {
  Shield,
  FileText,
  Download,
  Clock,
  Send,
  CheckCircle2,
  Lock,
  Server,
  Layers,
  ChevronDown,
  ChevronUp,
  UserCheck,
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from '@/components/ui/toast';
import { cn } from '@/lib/utils';

interface DataRequest {
  id: string;
  type: string;
  createdAt: string;
  deadline: string;
  daysRemaining: number;
  status: 'PENDING' | 'IN_REVIEW' | 'COMPLETED' | 'REJECTED';
  detail: string;
}

const MOCK_REQUESTS: DataRequest[] = [
  {
    id: 'KVKK-2026-041',
    type: 'Bilgi Alma & Döküm Talebi (m.11/1-b)',
    createdAt: '18.10.2026',
    deadline: '17.11.2026',
    daysRemaining: 27,
    status: 'IN_REVIEW',
    detail: '2026 yılına ait PDKS giriş-çıkış ve fazla mesai dökümlerinin iletilmesi talebi.',
  },
  {
    id: 'KVKK-2026-018',
    type: 'İletişim Bilgisi Düzeltme (m.11/1-d)',
    createdAt: '02.09.2026',
    deadline: '02.10.2026',
    daysRemaining: 0,
    status: 'COMPLETED',
    detail: 'İkametgah adres değişikliğinin özlük sistemine işlenmesi.',
  },
];

export function KvkkPage() {
  const profile = useAuthStore((s) => s.profile);
  const session = useAuthStore((s) => s.session);

  const [activeTab, setActiveTab] = useState('aydinlatma');
  const [requests, setRequests] = useState<DataRequest[]>(MOCK_REQUESTS);
  const [selectedReqType, setSelectedReqType] = useState('bilgi');
  const [requestDetail, setRequestDetail] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  // İlgili Kişi Talep Gönderme
  const handleCreateRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestDetail.trim()) {
      toast({
        type: 'error',
        title: 'Hata',
        message: 'Lütfen talep detayınızı belirtiniz.',
      });
      return;
    }

    const typeLabels: Record<string, string> = {
      bilgi: 'Bilgi Alma & Döküm Talebi (m.11/1-b)',
      duzeltme: 'Kişisel Veri Düzeltme Talebi (m.11/1-d)',
      silme: 'Silme / Yok Etme Talebi (m.11/1-e)',
      aktarim: 'Aktarılan Üçüncü Kişileri Öğrenme (m.11/1-ç)',
      itiraz: 'Otomatik Analize İtiraz (m.11/1-g)',
    };

    const now = new Date();
    const deadlineDate = new Date();
    deadlineDate.setDate(now.getDate() + 30);

    const newReq: DataRequest = {
      id: `KVKK-2026-${Math.floor(100 + Math.random() * 900)}`,
      type: typeLabels[selectedReqType] || 'Genel Başvuru',
      createdAt: now.toLocaleDateString('tr-TR'),
      deadline: deadlineDate.toLocaleDateString('tr-TR'),
      daysRemaining: 30,
      status: 'PENDING',
      detail: requestDetail,
    };

    setRequests([newReq, ...requests]);
    setRequestDetail('');
    toast({
      type: 'success',
      title: 'Talep Başarıyla Alındı',
      message: `${newReq.id} nolu başvurunuz kaydedildi. KVKK m. 13 uyarınca 30 gün içinde yanıtlanacaktır.`,
    });
  };

  // Verilerimi İndir (JSON Portatif Döküm)
  const handleDownloadMyData = () => {
    const dataExport = {
      _title: 'Yenişehir Belediyesi - KVKK m. 11 Kişisel Veri Dökümü',
      exportDate: new Date().toISOString(),
      user: {
        userId: profile?.userId ?? session?.user.id,
        username: profile?.username,
        email: profile?.email ?? session?.user.email,
        employeeId: profile?.employeeId,
        roles: profile?.roles ?? [],
        permissions: profile?.permissions ?? [],
      },
      system: {
        name: 'Personel Takip Sistemi',
        databaseRegion: 'Supabase (Frankfurt / eu-central-1)',
        cacheLayer: 'Upstash Redis (TTL Managed)',
        biometricDataProcessed: false,
        retentionPolicy: '10 Yıl Özlük, 5 Yıl İzin, 2 Yıl PDKS',
      },
      noticeVersion: '2026.v2.6',
    };

    const blob = new Blob([JSON.stringify(dataExport, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `kisisel-verilerim-${profile?.username ?? 'personel'}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);

    toast({
      type: 'success',
      title: 'Verileriniz Hazırlandı',
      message: 'KVKK m. 11 veri taşınabilirliği kapsamında kişisel verileriniz JSON formatında indirildi.',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* ── Üst Başlık & KVKK rozeti ── */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-blue-600/10 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400">
              <Shield className="size-5" />
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight">KVKK & Gizlilik Merkezi</h1>
              <p className="text-sm text-muted-foreground">
                6698 sayılı Kanun ve 2026 Kurul İlkeleri Uyarınca Kişisel Veri Yönetimi
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 py-1.5 px-3">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            2026 İlke Kararlarına Uyumlu
          </Badge>

          <Button onClick={handleDownloadMyData} className="gap-2 bg-primary">
            <Download className="size-4" />
            Verilerimi İndir (JSON)
          </Button>
        </div>
      </div>

      {/* ── 2026 İlkeleri Özet Bilgi Bandı ── */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-blue-500/20 bg-blue-500/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400">
              <UserCheck className="size-4" />
              2026/347 İlke Kararı
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs leading-relaxed text-muted-foreground">
            Aydınlatma ve Açık Rıza birbirinden ayrılmıştır. Sisteme erişiminiz aydınlatma onayına bağlanmamıştır.
          </CardContent>
        </Card>

        <Card className="border-amber-500/20 bg-amber-500/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="size-4" />
              2026/921 Biyometri İlkesi
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs leading-relaxed text-muted-foreground">
            Sistemimizde parmak izi, yüz veya retina gibi biyometrik veriler <strong>kesinlikle işlenmez</strong>. Yalnızca RFID ve dinamik QR kullanılır.
          </CardContent>
        </Card>

        <Card className="border-purple-500/20 bg-purple-500/5">
          <CardHeader className="p-4 pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold text-purple-600 dark:text-purple-400">
              <Clock className="size-4" />
              30 Günlük Yasal SLA
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 pt-0 text-xs leading-relaxed text-muted-foreground">
            KVKK m. 13 uyarınca çalışanların bilgi alma, düzeltme veya silme başvuruları en geç 30 gün içinde yanıtlanır.
          </CardContent>
        </Card>
      </div>

      {/* ── Ana Sekmeler ── */}
      <div className="flex flex-wrap gap-2 border-b border-border/80 pb-3">
        {[
          { id: 'aydinlatma', label: 'Aydınlatma Metni', icon: FileText },
          { id: 'verilerim', label: 'Hakkımdaki Veriler', icon: Layers },
          { id: 'talepler', label: `Başvuru & Taleplerim (${requests.length})`, icon: Send },
          { id: 'altyapi', label: 'Altyapı & Aktarım', icon: Server },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-2 rounded-lg px-4 py-2 text-xs md:text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Icon className="size-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── 1. SEKME: Aydınlatma Metni ── */}
      {activeTab === 'aydinlatma' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Yenişehir Belediyesi Personel Takip Sistemi Aydınlatma Metni</CardTitle>
                  <CardDescription>6698 sayılı KVKK 10. maddesi kapsamında çalışan bilgilendirme metni (Sürüm: 2026.v2)</CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">v2.6 Güncel</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6 text-sm leading-relaxed text-muted-foreground">
              <div className="space-y-3 rounded-xl bg-muted/40 p-4 border text-foreground">
                <h3 className="font-semibold text-sm">1. Veri Sorumlusu</h3>
                <p className="text-xs text-muted-foreground">
                  Yenişehir Belediyesi İnsan Kaynakları ve Eğitim Müdürlüğü tarafından işletilen Personel Takip Sistemi, kurum personellerinin yasal çalışma saatleri, özlük, izin ve devam durumlarının takibi amacıyla kullanılmaktadır.
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold text-foreground">2. İşlenen Kişisel Veri Kategorileri ve Hukuki Sebepleri</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3 bg-card">
                    <p className="font-medium text-xs text-foreground">Kimlik & Özlük Bilgileri</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Ad, soyad, TCKN, doğum tarihi, unvan, departman, işe giriş tarihi.</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">m. 5/2-ç Hukuki Yükümlülük (4857 s. Kanun)</Badge>
                  </div>
                  <div className="rounded-lg border p-3 bg-card">
                    <p className="font-medium text-xs text-foreground">PDKS & Giriş-Çıkış Kayıtları</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Kart okutma zamanları, dinamik QR okutma zamanı, vardiya ve çalışma süresi.</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">m. 5/2-f Meşru Menfaat & Güvenlik</Badge>
                  </div>
                  <div className="rounded-lg border p-3 bg-card">
                    <p className="font-medium text-xs text-foreground">İzin ve Mazeret Kayıtları</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Yıllık izin talepleri, mazeret gerekçeleri, onay durumları.</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">m. 5/2-c İş Sözleşmesi İfası</Badge>
                  </div>
                  <div className="rounded-lg border p-3 bg-card">
                    <p className="font-medium text-xs text-foreground">Finansal Veriler (Maaş / Bordro)</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">Bordro tahakkuku, banka IBAN bilgisi, prim ve avans kayıtları.</p>
                    <Badge variant="secondary" className="mt-2 text-[10px]">m. 5/2-ç Vergi Usul Kanunu & SGK</Badge>
                  </div>
                </div>
              </div>

              {/* Akordeon SSS / Maddeler */}
              <div className="space-y-2 pt-2">
                <h3 className="font-semibold text-foreground">3. Detaylı Haklar ve Yükümlülükler</h3>
                {[
                  {
                    title: 'Biyometrik Veri Kullanılmaması Güvencesi (2026/921 İlke Kararı)',
                    content: 'Yenişehir Belediyesi, mesai ve devam takibinde parmak izi, yüz tanıma veya retina gibi biyometrik verileri İŞLEMEMEKTEDİR. Takip yalnızca RFID kartlar ve QR ile yapılır.',
                  },
                  {
                    title: 'Verilerin Saklanma Süreleri ve Otomatik İmha',
                    content: 'Özlük dosyaları iş akdi bitiminden itibaren 10 yıl, bordro kayıtları 10 yıl, izin kayıtları 5 yıl, PDKS giriş-çıkış logları ise 2 yıl süreyle saklanır ve ardından periyodik imha prosedürüyle güvenle silinir.',
                  },
                  {
                    title: 'Kişisel Verilerin Aktarıldığı Taraflar',
                    content: 'Maaş ödemeleri için anlaşmalı bankalar, yasal zorunluluk gereği SGK ve Gelir İdaresi Başkanlığı, ve bulut altyapısı standart sözleşmeleri uyarınca güvenli sunucular haricinde hiçbir üçüncü kişiye aktarılmaz.',
                  },
                  {
                    title: 'KVKK 11. Madde Uyarınca Haklarınız',
                    content: 'Verilerinizin işlenip işlenmediğini öğrenme, dökümünü alma, eksik veya yanlışsa düzeltilmesini talep etme ve kanuni şartlar oluştuğunda silinmesini isteme hakkına sahipsiniz.',
                  },
                ].map((item, idx) => (
                  <div key={idx} className="rounded-lg border bg-card/60">
                    <button
                      onClick={() => setExpandedFaq(expandedFaq === idx ? null : idx)}
                      className="flex w-full items-center justify-between p-3.5 text-left text-xs font-semibold text-foreground"
                    >
                      <span>{item.title}</span>
                      {expandedFaq === idx ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                    </button>
                    {expandedFaq === idx && (
                      <div className="px-3.5 pb-3.5 text-xs text-muted-foreground border-t pt-2.5">
                        {item.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 2. SEKME: Hakkımdaki Veriler (Veri Portatifliği) ── */}
      {activeTab === 'verilerim' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">Sistemde Kayıtlı Kişisel Verileriniz</CardTitle>
                  <CardDescription>KVKK m. 11/1-b uyarınca kurum veritabanında adınıza işlenen aktif veri dökümü</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={handleDownloadMyData} className="gap-2">
                  <Download className="size-3.5" />
                  JSON Dışa Aktar
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Kimlik ve Hesap Bilgileri</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Kullanıcı Adı:</span>
                      <span className="font-semibold">{profile?.username ?? 'Giriş yapılmadı'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">E-posta:</span>
                      <span className="font-semibold">{profile?.email ?? session?.user.email ?? '—'}</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Sistem Rolleri:</span>
                      <span className="font-semibold">{profile?.roles.join(', ') || 'Personel'}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Oturum Tipi:</span>
                      <span className="text-emerald-500 font-semibold">Aktif JWT (Şifreli)</span>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border p-4 space-y-3 bg-muted/20">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-primary">Veri Güvenliği ve Kriptografi</h4>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Şifreleme Algoritması:</span>
                      <span className="font-semibold">Argon2id (Kriptografik)</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Aktarım Güvenliği:</span>
                      <span className="font-semibold">TLS 1.3 / HTTPS</span>
                    </div>
                    <div className="flex justify-between py-1 border-b border-border/50">
                      <span className="text-muted-foreground">Biyometrik Veri:</span>
                      <span className="text-emerald-600 font-semibold">0 (Kullanılmıyor)</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-muted-foreground">Önbellek TTL:</span>
                      <span className="font-semibold">Otomatik 24 Saatlik Tahliye</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
                <Shield className="size-5 text-blue-500 shrink-0 mt-0.5" />
                <div className="text-xs space-y-1">
                  <p className="font-semibold text-blue-600 dark:text-blue-400">Veri Doğruluk ve Güncellik İlkesi</p>
                  <p className="text-muted-foreground">
                    Verilerinizde bir yanlışlık veya değişiklik olması hâlinde, İlgili Kişi Talep Sistemi üzerinden anında düzeltme başvurusu yapabilirsiniz.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── 3. SEKME: Başvuru & Taleplerim (30 Günlük SLA) ── */}
      {activeTab === 'talepler' && (
        <div className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-5">
            {/* Sol: Yeni Talep Formu */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Yeni KVKK Talebi Oluştur</CardTitle>
                <CardDescription className="text-xs">
                  KVKK m. 11 kapsamındaki yasal haklarınıza istinaden başvuru iletin.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleCreateRequest} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs">Talep Türü</Label>
                    <select
                      value={selectedReqType}
                      onChange={(e) => setSelectedReqType(e.target.value)}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="bilgi">Bilgi Alma & Veri Dökümü Talebi (m.11/1-b)</option>
                      <option value="duzeltme">Kişisel Veri Düzeltme Talebi (m.11/1-d)</option>
                      <option value="silme">Silme / Yok Etme Talebi (m.11/1-e)</option>
                      <option value="aktarim">Aktarılan Üçüncü Kişileri Öğrenme (m.11/1-ç)</option>
                      <option value="itiraz">Otomatik Analiz Sonucuna İtiraz (m.11/1-g)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs">Talep Detayı ve Gerekçe</Label>
                    <textarea
                      value={requestDetail}
                      onChange={(e) => setRequestDetail(e.target.value)}
                      placeholder="Talebinizi, ilgili dönem veya veri kalemlerini ayrıntılı olarak açıklayınız..."
                      rows={4}
                      className="w-full rounded-md border border-input bg-background p-3 text-xs ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    />
                  </div>

                  <div className="rounded-lg bg-muted p-2.5 text-[11px] text-muted-foreground flex items-center gap-2">
                    <Clock className="size-4 text-primary shrink-0" />
                    <span>Yasal gereklilik uyarınca başvurunuza en geç <strong>30 gün</strong> içinde yanıt verilecektir.</span>
                  </div>

                  <Button type="submit" className="w-full gap-2 text-xs">
                    <Send className="size-3.5" />
                    Talebi İlet (Resmi Başvuru)
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Sağ: Aktif ve Geçmiş Talepler */}
            <Card className="lg:col-span-3">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">Talep Geçmişi ve Yasal Süre (SLA)</CardTitle>
                    <CardDescription className="text-xs">Kayıtlı başvurularınız ve 30 günlük yasal süre takibi</CardDescription>
                  </div>
                  <Badge variant="outline">{requests.length} Talep</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {requests.map((r) => (
                  <div key={r.id} className="rounded-xl border p-4 space-y-2.5 bg-card/50 hover:bg-card transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-primary">{r.id}</span>
                          <span className="text-xs font-semibold">{r.type}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5">Başvuru: {r.createdAt} • Yasal Son Tarih: {r.deadline}</p>
                      </div>

                      {r.status === 'COMPLETED' ? (
                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 text-[10px]">
                          <CheckCircle2 className="size-3" />
                          Tamamlandı
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 gap-1 text-[10px]">
                          <Clock className="size-3" />
                          İnceleniyor
                        </Badge>
                      )}
                    </div>

                    <p className="text-xs text-muted-foreground bg-muted/40 rounded p-2">
                      "{r.detail}"
                    </p>

                    <div className="flex items-center justify-between pt-1 text-[11px]">
                      <span className="text-muted-foreground">Yasal SLA Kalan Süre:</span>
                      {r.daysRemaining > 0 ? (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          ⏱️ {r.daysRemaining} gün kaldı (30 gün sınırı)
                        </span>
                      ) : (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          ✓ Süresi içinde yanıtlandı
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── 4. SEKME: Altyapı ve Veri Aktarımı ── */}
      {activeTab === 'altyapi' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bulut Mimarisi & Yurt Dışı Veri Aktarım Şeffaflığı</CardTitle>
              <CardDescription>
                2024 KVKK m. 9 reformu ve 2026 Standart Sözleşme (SCC) güvenceleri doğrultusunda sistem bileşenleri
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Server className="size-4 text-emerald-500" />
                    Supabase PostgreSQL
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Konum:</strong> Frankfurt / eu-central-1 (Avrupa Birliği)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Hukuki Güvence:</strong> Standart Sözleşmeler (SCC) & Veri İşleme Sözleşmesi (DPA).
                  </p>
                  <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-500/30">AES-256 Şifreli</Badge>
                </div>

                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Layers className="size-4 text-red-500" />
                    Upstash Redis
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Konum:</strong> Frankfurt / eu-central-1
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Veri Minimizasyonu:</strong> Redis üzerinde kimlik no veya maaş ASLA tutulmaz; yalnızca oturum ID ve yetki izinleri tutulur.
                  </p>
                  <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30">Kısa TTL (Memory Only)</Badge>
                </div>

                <div className="rounded-xl border p-4 space-y-2 bg-muted/20">
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <Shield className="size-4 text-purple-500" />
                    Vercel Edge
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>Konum:</strong> Frankfurt Edge Node
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    <strong>İşlev:</strong> Statik arayüz ve sunucusuz API yönlendirmesi. Veri tabanı barındırmaz.
                  </p>
                  <Badge variant="outline" className="text-[10px] text-purple-600 border-purple-500/30">TLS 1.3 / Zero-Log</Badge>
                </div>
              </div>

              {/* Veri Saklama Süreleri Tablosu */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Veri Saklama & İmha Standartları</h4>
                <div className="overflow-x-auto rounded-lg border">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-muted/60 text-muted-foreground border-b">
                      <tr>
                        <th className="p-3">Veri Grubu</th>
                        <th className="p-3">Dayanak Kanun</th>
                        <th className="p-3">Yasal Süre</th>
                        <th className="p-3">İmha Yöntemi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      <tr>
                        <td className="p-3 font-medium">Özlük Dosyası & Belgeler</td>
                        <td className="p-3 text-muted-foreground">4857 s. İş Kanunu m. 75, TBK m. 146</td>
                        <td className="p-3 font-semibold text-emerald-600">İşten ayrılma + 10 Yıl</td>
                        <td className="p-3 text-muted-foreground">Anonimleştirme / Silme</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Bordro & Maaş Ödemeleri</td>
                        <td className="p-3 text-muted-foreground">213 s. VUK m. 253, 6102 s. TTK m. 82</td>
                        <td className="p-3 font-semibold text-emerald-600">10 Yıl</td>
                        <td className="p-3 text-muted-foreground">Kriptografik Silme</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">İzin & Devamsızlık Kayıtları</td>
                        <td className="p-3 text-muted-foreground">4857 s. İş Kanunu</td>
                        <td className="p-3 font-semibold text-blue-600">5 Yıl</td>
                        <td className="p-3 text-muted-foreground">Veritabanından Silme</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">PDKS Giriş-Çıkış Zamanları</td>
                        <td className="p-3 text-muted-foreground">İş Kanunu & Güvenlik Politikası</td>
                        <td className="p-3 font-semibold text-blue-600">2 Yıl</td>
                        <td className="p-3 text-muted-foreground">Periyodik İmha</td>
                      </tr>
                      <tr>
                        <td className="p-3 font-medium">Dinamik QR Kodları</td>
                        <td className="p-3 text-muted-foreground">Oturum Güvenliği</td>
                        <td className="p-3 font-semibold text-amber-600">24 Saat</td>
                        <td className="p-3 text-muted-foreground">Otomatik Expire</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
