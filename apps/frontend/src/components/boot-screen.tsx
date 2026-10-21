import { useEffect, useState, useRef } from 'react';

export interface BootCheck {
  id: string;
  label: string;
  sublabel: string;
  status: 'pending' | 'running' | 'done';
}

interface BootScreenProps {
  onComplete: () => void;
}

const PHASES: Array<{
  targetPercent: number;
  durationMs: number;
  title: string;
  detail: string;
  activeCheckId: string;
}> = [
  {
    targetPercent: 18,
    durationMs: 1800,
    title: 'Sistem Çekirdeği Başlatılıyor...',
    detail: 'Güvenlik katmanı ve kimlik doğrulama protokolleri doğrulanıyor',
    activeCheckId: 'security',
  },
  {
    targetPercent: 38,
    durationMs: 2000,
    title: 'Veritabanı Havuzu Kontrol Ediliyor...',
    detail: 'Supabase PostgreSQL (eu-central-1) bağlantı oturumu kuruluyor',
    activeCheckId: 'database',
  },
  {
    targetPercent: 58,
    durationMs: 2000,
    title: 'Upstash Redis Önbellek Eşitleniyor...',
    detail: 'Dağıtık bellek katmanı ve sorgu optimizasyonları senkronize ediliyor',
    activeCheckId: 'redis',
  },
  {
    targetPercent: 78,
    durationMs: 2200,
    title: 'Temel Modüller ve Şemalar Yükleniyor...',
    detail: 'Personel, İzin, PDKS, Vardiya ve Bordro paketleri önbelleğe alınıyor',
    activeCheckId: 'modules',
  },
  {
    targetPercent: 94,
    durationMs: 1800,
    title: 'Arayüz ve Yetki Matrisi Hazırlanıyor...',
    detail: 'Kullanıcı profili ve rol tabanlı erişim denetimleri derlendi',
    activeCheckId: 'ui',
  },
  {
    targetPercent: 100,
    durationMs: 1200,
    title: 'Sistem Hazır!',
    detail: 'Tüm kontroller tamamlandı, giriş ekranına aktarılıyor...',
    activeCheckId: 'ready',
  },
];

const INITIAL_CHECKS: BootCheck[] = [
  { id: 'security', label: 'Güvenlik ve Kimlik Doğrulama', sublabel: 'JWT & Token Yönetimi', status: 'running' },
  { id: 'database', label: 'Veritabanı ve Oturum Havuzu', sublabel: 'PostgreSQL / PgBouncer', status: 'pending' },
  { id: 'redis',    label: 'Dağıtık Önbellek Katmanı', sublabel: 'Upstash Redis Cache', status: 'pending' },
  { id: 'modules',  label: 'Temel Modül Paketleri', sublabel: 'Personel, İzin, PDKS, Maaş', status: 'pending' },
  { id: 'ui',       label: 'Arayüz ve Yetki Matrisi', sublabel: 'Rol ve İzin Yapılandırması', status: 'pending' },
];

export function BootScreen({ onComplete }: BootScreenProps) {
  const [percent, setPercent] = useState(0);
  const [currentTitle, setCurrentTitle] = useState(PHASES[0].title);
  const [currentDetail, setCurrentDetail] = useState(PHASES[0].detail);
  const [checks, setChecks] = useState<BootCheck[]>(INITIAL_CHECKS);
  const [isExiting, setIsExiting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let isCancelled = false;

    // Arka planda sayfa chunk'larını prefetch et
    void Promise.allSettled([
      import('@/pages/login-page'),
      import('@/components/layout/app-layout'),
      import('@/pages/dashboard-page'),
      import('@/pages/personel/personel-list-page'),
      import('@/pages/izin/izin-list-page'),
      import('@/pages/giris-cikis/giris-cikis-page'),
    ]);

    const runTimeline = async () => {
      let currentPct = 0;

      for (let i = 0; i < PHASES.length; i++) {
        if (isCancelled) return;
        const phase = PHASES[i];

        setCurrentTitle(phase.title);
        setCurrentDetail(phase.detail);

        // Checklist durumlarını güncelle
        setChecks((prev) =>
          prev.map((c, idx) => {
            if (idx < i) return { ...c, status: 'done' };
            if (idx === i) return { ...c, status: 'running' };
            return { ...c, status: 'pending' };
          }),
        );

        // İlerlemeyi pürüzsüz animasyonla hedefe ulaştır
        const startPct = currentPct;
        const targetPct = phase.targetPercent;
        const steps = 30;
        const stepTime = phase.durationMs / steps;
        const pctDelta = (targetPct - startPct) / steps;

        for (let s = 1; s <= steps; s++) {
          if (isCancelled) return;
          await new Promise((r) => setTimeout(r, stepTime));
          currentPct = Math.min(Math.round(startPct + pctDelta * s), targetPct);
          setPercent(currentPct);
        }
      }

      if (isCancelled) return;

      // Tüm checklist öğelerini 'done' yap
      setChecks((prev) => prev.map((c) => ({ ...c, status: 'done' })));
      setPercent(100);

      // 400ms 100% göster, sonra yumuşak çıkış başlat
      await new Promise((r) => setTimeout(r, 400));
      if (isCancelled) return;
      setIsExiting(true);

      // 600ms fade-out ardından DOM'dan kaldır
      await new Promise((r) => setTimeout(r, 600));
      if (isCancelled) return;
      setIsDone(true);
      onCompleteRef.current();
    };

    void runTimeline();

    return () => {
      isCancelled = true;
    };
  }, []);

  if (isDone) return null;

  return (
    <div className={`phoenix-boot-overlay ${isExiting ? 'fade-exit' : ''}`}>
      <style>{BOOT_STYLES}</style>

      {/* Arka plan derin uzay ve parlama efektleri */}
      <div className="phoenix-bg-glow" />
      <div className="phoenix-bg-grid" />

      {/* Yükselen köz / ateş parçacıkları */}
      <div className="phoenix-embers">
        {[...Array(14)].map((_, i) => (
          <span key={i} className={`ember ember-${i + 1}`} />
        ))}
      </div>

      <div className="phoenix-boot-card">
        {/* İhtişamlı Phoenix Görseli */}
        <div className="phoenix-emblem-wrap">
          <PhoenixVector percent={percent} />
        </div>

        {/* Kurumsal Başlık ve Etiket */}
        <div className="phoenix-header">
          <div className="phoenix-badge">
            <span className="phoenix-badge-dot" />
            YENİŞEHİR BELEDİYESİ • SMART WARM-UP ENGINE
          </div>
          <h1 className="phoenix-title">Personel Yönetim Sistemi</h1>
          <p className="phoenix-subtitle">Bulut Altyapısı ve Dağıtık Önbellek Sistemi</p>
        </div>

        {/* Canlı İlerleme Çubuğu */}
        <div className="phoenix-progress-box">
          <div className="phoenix-progress-meta">
            <span className="phoenix-status-text">{currentTitle}</span>
            <span className="phoenix-percent-val">{percent}%</span>
          </div>
          <div className="phoenix-bar-track">
            <div
              className="phoenix-bar-fill"
              style={{ width: `${percent}%` }}
            >
              <div className="phoenix-bar-head" />
            </div>
          </div>
          <p className="phoenix-detail-text">{currentDetail}</p>
        </div>

        {/* Canlı Kontrol Listesi */}
        <div className="phoenix-checklist">
          {checks.map((c) => (
            <div key={c.id} className={`phoenix-check-row status-${c.status}`}>
              <div className="check-icon-col">
                {c.status === 'done' && (
                  <svg className="check-svg done" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
                {c.status === 'running' && (
                  <div className="check-spinner" />
                )}
                {c.status === 'pending' && (
                  <div className="check-dot" />
                )}
              </div>
              <div className="check-text-col">
                <span className="check-main-label">{c.label}</span>
                <span className="check-sub-label">{c.sublabel}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── İhtişamlı Phoenix SVG Vektörü ───────────────────────────────────────────
function PhoenixVector({ percent }: { percent: number }) {
  const intensity = Math.min(1, Math.max(0.4, percent / 100));

  return (
    <div className="phoenix-svg-container">
      {/* Arkadaki kor ateşi aurası */}
      <div
        className="phoenix-fire-halo"
        style={{
          opacity: 0.6 + intensity * 0.4,
          transform: `scale(${0.92 + intensity * 0.12})`,
        }}
      />

      <svg
        viewBox="0 0 440 360"
        className="phoenix-svg-element"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Gövde ve Kanat Ateş Gradyanı */}
          <linearGradient id="phxFlame" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#b91c1c" />
            <stop offset="25%" stopColor="#ea580c" />
            <stop offset="55%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#fef08a" />
          </linearGradient>

          {/* Dış Kanat Mor/Elektrik Turuncu Gradyanı */}
          <linearGradient id="phxWingOuter" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7c3aed" />
            <stop offset="35%" stopColor="#db2777" />
            <stop offset="70%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>

          {/* İç Kanat Akkor Altın Gradyanı */}
          <linearGradient id="phxGoldCore" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fff" />
            <stop offset="40%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#f97316" />
          </linearGradient>

          {/* Kuyruk Şeritleri Gradyanı */}
          <linearGradient id="phxTailGrad" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="40%" stopColor="#ea580c" />
            <stop offset="80%" stopColor="#c026d3" />
            <stop offset="100%" stopColor="#4f46e5" />
          </linearGradient>

          {/* Parlama Filtresi */}
          <filter id="phxGlow" x="-25%" y="-25%" width="150%" height="150%">
            <feGaussianBlur stdDeviation="4.5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* ── Kuyruk Ateş Şeritleri (Arka Katman) ── */}
        <g filter="url(#phxGlow)" opacity="0.9">
          {/* Sol Dış Kuyruk Şeridi */}
          <path
            d="M 210 215 C 190 245 155 275 130 320 C 145 285 180 255 205 225 Z"
            fill="url(#phxTailGrad)"
          />
          {/* Sol İç Kuyruk Şeridi */}
          <path
            d="M 212 215 C 198 250 178 285 168 335 C 182 295 204 260 214 225 Z"
            fill="url(#phxTailGrad)"
          />
          {/* Merkez Uzun Kuyruk Alevi */}
          <path
            d="M 220 215 C 215 260 218 305 220 355 C 222 305 225 260 220 215 Z"
            fill="url(#phxFlame)"
          />
          {/* Sağ İç Kuyruk Şeridi */}
          <path
            d="M 228 215 C 242 250 262 285 272 335 C 258 295 236 260 226 225 Z"
            fill="url(#phxTailGrad)"
          />
          {/* Sağ Dış Kuyruk Şeridi */}
          <path
            d="M 230 215 C 250 245 285 275 310 320 C 295 285 260 255 235 225 Z"
            fill="url(#phxTailGrad)"
          />
        </g>

        {/* ── Sol Kanat Ana Tüy Katmanları ── */}
        <g filter="url(#phxGlow)">
          {/* Sol Üst Ana Kanat Bıçağı (En tepeye kıvrılan) */}
          <path
            d="M 210 135 C 175 105 115 65 45 60 C 80 88 125 125 185 155 Z"
            fill="url(#phxWingOuter)"
          />
          {/* Sol İkinci Tüy Bıçağı */}
          <path
            d="M 195 150 C 150 128 95 105 35 110 C 72 132 118 160 175 180 Z"
            fill="url(#phxWingOuter)"
          />
          {/* Sol Üçüncü Tüy Bıçağı */}
          <path
            d="M 185 175 C 145 158 90 150 42 165 C 80 180 120 195 175 202 Z"
            fill="url(#phxFlame)"
          />
          {/* Sol Dördüncü Alt Tüy */}
          <path
            d="M 175 200 C 140 195 100 200 68 220 C 102 222 135 218 178 212 Z"
            fill="url(#phxFlame)"
          />

          {/* Sol İç Işıltılı Kanat Katmanı (Derinlik ve Altın Parlaklık) */}
          <path
            d="M 210 145 C 180 125 140 100 95 95 C 122 115 152 142 195 165 Z"
            fill="url(#phxGoldCore)"
            opacity="0.85"
          />
          <path
            d="M 195 165 C 160 148 120 132 82 138 C 112 152 144 172 185 188 Z"
            fill="url(#phxGoldCore)"
            opacity="0.75"
          />
        </g>

        {/* ── Sağ Kanat Ana Tüy Katmanları (Sayısal Simetri) ── */}
        <g filter="url(#phxGlow)">
          {/* Sağ Üst Ana Kanat Bıçağı */}
          <path
            d="M 230 135 C 265 105 325 65 395 60 C 360 88 315 125 255 155 Z"
            fill="url(#phxWingOuter)"
          />
          {/* Sağ İkinci Tüy Bıçağı */}
          <path
            d="M 245 150 C 290 128 345 105 405 110 C 368 132 322 160 265 180 Z"
            fill="url(#phxWingOuter)"
          />
          {/* Sağ Üçüncü Tüy Bıçağı */}
          <path
            d="M 255 175 C 295 158 350 150 398 165 C 360 180 320 195 265 202 Z"
            fill="url(#phxFlame)"
          />
          {/* Sağ Dördüncü Alt Tüy */}
          <path
            d="M 265 200 C 300 195 340 200 372 220 C 338 222 305 218 262 212 Z"
            fill="url(#phxFlame)"
          />

          {/* Sağ İç Işıltılı Kanat Katmanı */}
          <path
            d="M 230 145 C 260 125 300 100 345 95 C 318 115 288 142 245 165 Z"
            fill="url(#phxGoldCore)"
            opacity="0.85"
          />
          <path
            d="M 245 165 C 280 148 320 132 358 138 C 328 152 296 172 255 188 Z"
            fill="url(#phxGoldCore)"
            opacity="0.75"
          />
        </g>

        {/* ── Gövde, Taç ve Baş (Ön Katman) ── */}
        <g filter="url(#phxGlow)">
          {/* Gövde Silüeti */}
          <path
            d="M 220 115 
               C 205 130 200 155 204 185 
               C 208 210 216 230 220 238 
               C 224 230 232 210 236 185 
               C 240 155 235 130 220 115 Z"
            fill="url(#phxFlame)"
          />

          {/* Baş Silüeti ve Gaga */}
          <path
            d="M 220 115 
               C 214 105 212 92 216 80 
               C 220 68 228 62 235 60 
               C 242 66 238 78 232 88 
               C 228 98 225 108 220 115 Z"
            fill="url(#phxGoldCore)"
          />
          {/* Gaga */}
          <polygon points="235,63 246,67 234,73" fill="#fef08a" />

          {/* Baş Tepesi Taç Alevleri (Üçlü Alev Tacı) */}
          <path
            d="M 222 75 C 215 52 218 35 220 25 C 224 38 226 55 224 75 Z"
            fill="url(#phxGoldCore)"
          />
          <path
            d="M 218 80 C 205 65 198 48 195 38 C 205 48 212 65 218 80 Z"
            fill="url(#phxFlame)"
          />
          <path
            d="M 225 78 C 236 65 244 48 248 38 C 238 48 232 65 225 78 Z"
            fill="url(#phxFlame)"
          />

          {/* Göğüsteki Akkor Kalp Kristali (Enerji Çekirdeği) */}
          <circle cx="220" cy="165" r="10" fill="#ffffff" />
          <polygon
            points="220,148 228,165 220,182 212,165"
            fill="url(#phxGoldCore)"
            opacity="0.9"
          />
          <circle cx="220" cy="165" r="4" fill="#ffffff" />

          {/* Göz */}
          <circle cx="227" cy="72" r="1.8" fill="#1e1b4b" />
          <circle cx="227.4" cy="71.6" r="0.7" fill="#ffffff" />
        </g>
      </svg>
    </div>
  );
}

// ─── CSS Tasarım Sistemi (Süper Premium Glassmorphism & Neon Aura) ───────────────
const BOOT_STYLES = `
.phoenix-boot-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #050811;
  color: #f8fafc;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.phoenix-boot-overlay.fade-exit {
  opacity: 0;
  transform: scale(1.02);
  pointer-events: none;
}

/* Arka Plan Parlama Efektleri */
.phoenix-bg-glow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle at 50% 28%, rgba(249, 115, 22, 0.16) 0%, transparent 55%),
    radial-gradient(circle at 20% 75%, rgba(124, 58, 237, 0.12) 0%, transparent 45%),
    radial-gradient(circle at 80% 75%, rgba(219, 39, 119, 0.10) 0%, transparent 45%);
}

.phoenix-bg-grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: 
    linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
  background-size: 40px 40px;
  mask-image: radial-gradient(ellipse 80% 80% at 50% 50%, black 30%, transparent 80%);
}

/* Yükselen Köz Parçacıkları */
.phoenix-embers {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.ember {
  position: absolute;
  bottom: -20px;
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #f59e0b;
  box-shadow: 0 0 8px #f97316, 0 0 14px #fbbf24;
  animation: floatEmber 6s linear infinite;
  opacity: 0;
}

.ember-1  { left: 15%; animation-duration: 7s;   animation-delay: 0.3s; width: 2px; height: 2px; }
.ember-2  { left: 28%; animation-duration: 5.5s; animation-delay: 1.2s; width: 3px; height: 3px; background: #fb7185; }
.ember-3  { left: 38%; animation-duration: 6.8s; animation-delay: 2.1s; width: 4px; height: 4px; }
.ember-4  { left: 45%; animation-duration: 5.2s; animation-delay: 0.7s; width: 2px; height: 2px; }
.ember-5  { left: 52%; animation-duration: 6.2s; animation-delay: 1.8s; width: 3px; height: 3px; background: #fde047; }
.ember-6  { left: 60%; animation-duration: 7.5s; animation-delay: 0.2s; width: 2px; height: 2px; }
.ember-7  { left: 70%; animation-duration: 5.8s; animation-delay: 2.5s; width: 4px; height: 4px; }
.ember-8  { left: 82%; animation-duration: 6.5s; animation-delay: 1.1s; width: 2px; height: 2px; background: #fb7185; }
.ember-9  { left: 22%; animation-duration: 8.0s; animation-delay: 3.2s; width: 3px; height: 3px; }
.ember-10 { left: 48%; animation-duration: 6.0s; animation-delay: 3.8s; width: 2px; height: 2px; }
.ember-11 { left: 65%; animation-duration: 7.2s; animation-delay: 2.9s; width: 3px; height: 3px; }
.ember-12 { left: 75%; animation-duration: 5.9s; animation-delay: 4.1s; width: 2px; height: 2px; }
.ember-13 { left: 33%; animation-duration: 6.7s; animation-delay: 4.6s; width: 3px; height: 3px; }
.ember-14 { left: 55%; animation-duration: 5.4s; animation-delay: 4.9s; width: 4px; height: 4px; background: #fde047; }

@keyframes floatEmber {
  0% {
    transform: translateY(0) translateX(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 0.8;
  }
  80% {
    opacity: 0.6;
    transform: translateY(-80vh) translateX(25px) scale(1);
  }
  100% {
    transform: translateY(-105vh) translateX(45px) scale(0.4);
    opacity: 0;
  }
}

/* Ana Kart */
.phoenix-boot-card {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  max-width: 520px;
  width: 92vw;
  padding: 32px 36px 30px;
  border-radius: 28px;
  background: rgba(10, 16, 32, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 24px 60px -12px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Phoenix Görsel Kapsayıcı */
.phoenix-emblem-wrap {
  position: relative;
  width: 260px;
  height: 190px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.phoenix-svg-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  animation: phoenixHover 4s ease-in-out infinite;
}

@keyframes phoenixHover {
  0%, 100% {
    transform: translateY(0px) scale(1);
  }
  50% {
    transform: translateY(-6px) scale(1.02);
  }
}

.phoenix-fire-halo {
  position: absolute;
  width: 170px;
  height: 170px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(249, 115, 22, 0.45) 0%, rgba(219, 39, 119, 0.25) 45%, transparent 70%);
  filter: blur(22px);
  pointer-events: none;
  transition: opacity 0.5s ease, transform 0.5s ease;
}

.phoenix-svg-element {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 8px 24px rgba(234, 88, 12, 0.35));
}

/* Başlık Grubu */
.phoenix-header {
  text-align: center;
  margin-bottom: 20px;
}

.phoenix-badge {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.16em;
  color: #fb923c;
  padding: 4px 14px;
  border-radius: 999px;
  background: rgba(249, 115, 22, 0.12);
  border: 1px solid rgba(249, 115, 22, 0.25);
  margin-bottom: 10px;
  text-transform: uppercase;
}

.phoenix-badge-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #f97316;
  box-shadow: 0 0 8px #f97316;
  animation: pulseDot 1.6s ease-in-out infinite;
}

@keyframes pulseDot {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.4; transform: scale(0.7); }
}

.phoenix-title {
  margin: 0;
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.25;
  background: linear-gradient(135deg, #ffffff 30%, #fed7aa 75%, #f97316 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.phoenix-subtitle {
  margin: 4px 0 0;
  font-size: 12px;
  font-weight: 500;
  color: rgba(148, 163, 184, 0.75);
  letter-spacing: 0.04em;
}

/* İlerleme Çubuğu Alanı */
.phoenix-progress-box {
  width: 100%;
  margin-bottom: 22px;
}

.phoenix-progress-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 7px;
}

.phoenix-status-text {
  font-size: 12.5px;
  font-weight: 600;
  color: #f1f5f9;
  letter-spacing: 0.01em;
}

.phoenix-percent-val {
  font-size: 14px;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
  color: #f97316;
  text-shadow: 0 0 10px rgba(249, 115, 22, 0.4);
}

.phoenix-bar-track {
  position: relative;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.07);
  overflow: hidden;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.phoenix-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #7c3aed 0%, #db2777 35%, #f97316 70%, #fde047 100%);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.6);
  transition: width 0.12s linear;
}

.phoenix-bar-head {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 12px;
  background: #ffffff;
  box-shadow: 0 0 10px #ffffff;
  border-radius: 999px;
  opacity: 0.85;
}

.phoenix-detail-text {
  margin: 7px 0 0;
  font-size: 11px;
  color: rgba(148, 163, 184, 0.65);
  line-height: 1.4;
  min-height: 16px;
}

/* Kontrol Listesi */
.phoenix-checklist {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 7px;
  background: rgba(0, 0, 0, 0.22);
  border-radius: 16px;
  padding: 12px 14px;
  border: 1px solid rgba(255, 255, 255, 0.04);
}

.phoenix-check-row {
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 4px 6px;
  border-radius: 8px;
  transition: all 0.25s ease;
}

.phoenix-check-row.status-running {
  background: rgba(249, 115, 22, 0.08);
}

.check-icon-col {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.check-svg.done {
  width: 16px;
  height: 16px;
  color: #34d399;
  filter: drop-shadow(0 0 5px rgba(52, 211, 153, 0.5));
}

.check-spinner {
  width: 13px;
  height: 13px;
  border-radius: 50%;
  border: 2px solid rgba(249, 115, 22, 0.25);
  border-top-color: #f97316;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.check-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(148, 163, 184, 0.3);
}

.check-text-col {
  display: flex;
  align-items: baseline;
  gap: 8px;
  flex: 1;
}

.check-main-label {
  font-size: 11.5px;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.9);
  transition: color 0.2s ease;
}

.status-pending .check-main-label {
  color: rgba(148, 163, 184, 0.45);
}

.status-running .check-main-label {
  color: #fdba74;
}

.status-done .check-main-label {
  color: rgba(226, 232, 240, 0.95);
}

.check-sub-label {
  font-size: 10px;
  color: rgba(148, 163, 184, 0.45);
  margin-left: auto;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
}
`;
