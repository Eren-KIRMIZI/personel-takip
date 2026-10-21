import { useEffect, useState, useRef } from 'react';
import {
  prefetchAllChunks,
  prefetchAllCoreData,
  wakeUpBackendAndDatabase,
} from '@/lib/warm-up-engine';

const phoenixImg = '/phoenix.jpg';

interface BootScreenProps {
  onComplete: () => void;
}

interface CheckItem {
  id: string;
  label: string;
  color: string;
  status: 'pending' | 'running' | 'done';
}

// 15 Saniyelik Akıllı Warm-Up Sekansı: 3.5s x 4 faz (14s) + 400ms tamamlanma + 600ms pürüzsüz cross-fade = Tam 15.0 saniye
const PHASES = [
  {
    targetPercent: 25,
    durationMs: 3500,
    stepText: 'Kimlik doğrulama ve oturum çözümleniyor...',
    activeCheckId: 'auth',
  },
  {
    targetPercent: 50,
    durationMs: 3500,
    stepText: 'Kullanıcı yetkileri ve modüller taranıyor...',
    activeCheckId: 'permissions',
  },
  {
    targetPercent: 75,
    durationMs: 3500,
    stepText: 'Sistem bileşenleri ve sayfalar önbelleğe alınıyor...',
    activeCheckId: 'components',
  },
  {
    targetPercent: 100,
    durationMs: 3500,
    stepText: 'Sayfa verileri hazırlandı, önbellek etkin...',
    activeCheckId: 'data',
  },
];

const INITIAL_CHECKS: CheckItem[] = [
  { id: 'auth',        label: 'Kimlik doğrulama',       color: '#38bdf8', status: 'running' },
  { id: 'permissions', label: 'Kullanıcı yetkileri',     color: '#a855f7', status: 'pending' },
  { id: 'components',  label: 'Sistem bileşenleri',      color: '#ec4899', status: 'pending' },
  { id: 'data',        label: 'Sayfa verileri & önbellek', color: '#f97316', status: 'pending' },
];

export function BootScreen({ onComplete }: BootScreenProps) {
  const [percent, setPercent] = useState(0);
  const [stepText, setStepText] = useState('Sistem başlatılıyor...');
  const [checks, setChecks] = useState<CheckItem[]>(INITIAL_CHECKS);
  const [isExiting, setIsExiting] = useState(false);
  const [isDone, setIsDone] = useState(false);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    let isCancelled = false;

    // 1. Arka planda derin cold start uyandırması (Vercel Serverless + Prisma PostgreSQL + Supabase)
    void wakeUpBackendAndDatabase();

    // 2. Tüm uygulama sayfaları, modülleri ve API chunk'larını V8 motoruna yükle
    void prefetchAllChunks();

    const runTimeline = async () => {
      let currentPct = 0;

      for (let i = 0; i < PHASES.length; i++) {
        if (isCancelled) return;
        const phase = PHASES[i];
        setStepText(phase.stepText);

        // Checklist durumlarını güncelle
        setChecks((prev) =>
          prev.map((c, idx) => {
            if (idx < i) return { ...c, status: 'done' };
            if (idx === i) return { ...c, status: 'running' };
            return { ...c, status: 'pending' };
          }),
        );

        // Faz 3 başladığında (oturum ve yetkiler çözülmüşken) gerçek API sorgularını arka planda RAM'e al
        if (i === 2) {
          void prefetchAllCoreData();
        }

        const startPct = currentPct;
        const targetPct = phase.targetPercent;
        const steps = 35;
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

      // Tüm kontrolleri 'done' yap
      setChecks((prev) => prev.map((c) => ({ ...c, status: 'done' })));
      setStepText('Sistem hazır!');
      setPercent(100);

      // %100 durumunda 400ms bekle, ardından pürüzsüz cross-fade başlat
      await new Promise((r) => setTimeout(r, 400));
      if (isCancelled) return;
      setIsExiting(true);

      // 600ms fade-out sonrası bileşeni DOM'dan kaldır
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
    <div className={`boot-overlay ${isExiting ? 'boot-exit' : ''}`}>
      <style>{BOOT_CSS}</style>

      {/* Arka plan derin atmosferik parlama */}
      <div className="boot-bg-radial" />

      {/* Yükselen dijital piksel közleri */}
      <div className="boot-pixels-container">
        {[...Array(16)].map((_, i) => (
          <span key={i} className={`boot-pixel-spark spark-${i + 1}`} />
        ))}
      </div>

      <div className="boot-content">
        {/* ── Phoenix Görseli (Alttan Yukarıya Renk Doldurma Efekti) ── */}
        <div className="phoenix-frame">
          {/* Katman 1: Soluk, loş silüet (renksiz/karanlık temel) */}
          <img
            src={phoenixImg}
            alt="Phoenix Outline"
            className="phoenix-layer phoenix-base"
          />

          {/* Katman 2: Alttan yukarıya açılan tam renkli neon ışığı */}
          <div
            className="phoenix-reveal-container"
            style={{
              clipPath: `inset(${100 - percent}% 0 0 0)`,
            }}
          >
            <img
              src={phoenixImg}
              alt="Phoenix Active"
              className="phoenix-layer phoenix-active"
            />
          </div>

          {/* Katman 3: Dolum sınırında ilerleyen lazer/ışık çizgisi */}
          {percent > 2 && percent < 99 && (
            <div
              className="phoenix-scan-line"
              style={{
                top: `${100 - percent}%`,
              }}
            />
          )}
        </div>

        {/* ── Başlık: Sistem Hazırlanıyor... ── */}
        <h1 className="boot-title">Sistem Hazırlanıyor...</h1>

        {/* ── Canlı İlerleme Çubuğu ── */}
        <div className="boot-bar-wrapper">
          <div className="boot-bar-track">
            <div
              className="boot-bar-fill"
              style={{ width: `${percent}%` }}
            >
              <div className="boot-bar-glow-edge" />
            </div>
          </div>
        </div>

        {/* ── % Göstergesi (Örn: %68) ── */}
        <div className="boot-percent-text">%{percent}</div>

        {/* ── Aşama Detay Açıklaması ── */}
        <div className="boot-step-detail">{stepText}</div>

        {/* ── 4'lü Kontrol Listesi ── */}
        <div className="boot-checklist">
          {checks.map((c) => (
            <div key={c.id} className={`check-row check-${c.status}`}>
              <div
                className="check-icon-circle"
                style={{
                  backgroundColor: c.status === 'done' ? c.color : 'transparent',
                  borderColor: c.status === 'done' ? c.color : 'rgba(148, 163, 184, 0.35)',
                  boxShadow: c.status === 'done' ? `0 0 10px ${c.color}66` : 'none',
                }}
              >
                {c.status === 'done' ? (
                  <svg
                    className="check-svg"
                    viewBox="0 0 16 16"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      d="M4 8.2L6.5 10.7L12 5.3"
                      stroke="#ffffff"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                ) : c.status === 'running' ? (
                  <div
                    className="check-pulse-dot"
                    style={{ backgroundColor: c.color }}
                  />
                ) : null}
              </div>
              <span className="check-label">{c.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Kusursuz Tasarım ve Akıcı Animasyon Stilleri ──────────────────────────────
const BOOT_CSS = `
.boot-overlay {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #080d1a;
  color: #ffffff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
  opacity: 1;
  transition: opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1), transform 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}

.boot-overlay.boot-exit {
  opacity: 0;
  transform: scale(1.02);
  pointer-events: none;
}

/* Arka plan derin uzay aurası */
.boot-bg-radial {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: 
    radial-gradient(circle at 50% 32%, rgba(56, 189, 248, 0.08) 0%, rgba(192, 132, 252, 0.08) 35%, transparent 65%),
    radial-gradient(circle at 50% 75%, rgba(249, 115, 22, 0.05) 0%, transparent 55%);
}

/* Yükselen Piksel Parçacıkları (Voxel Embers) */
.boot-pixels-container {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.boot-pixel-spark {
  position: absolute;
  bottom: -15px;
  width: 4px;
  height: 4px;
  border-radius: 1px;
  opacity: 0;
  animation: voxelRise 6s linear infinite;
}

.spark-1  { left: 35%; background: #38bdf8; animation-duration: 5.5s; animation-delay: 0.2s; box-shadow: 0 0 8px #38bdf8; }
.spark-2  { left: 42%; background: #a855f7; animation-duration: 6.2s; animation-delay: 1.1s; box-shadow: 0 0 8px #a855f7; }
.spark-3  { left: 58%; background: #ec4899; animation-duration: 5.8s; animation-delay: 0.7s; box-shadow: 0 0 8px #ec4899; }
.spark-4  { left: 64%; background: #f97316; animation-duration: 6.5s; animation-delay: 1.8s; box-shadow: 0 0 8px #f97316; }
.spark-5  { left: 48%; background: #60a5fa; animation-duration: 7.0s; animation-delay: 2.3s; box-shadow: 0 0 8px #60a5fa; }
.spark-6  { left: 52%; background: #c084fc; animation-duration: 5.2s; animation-delay: 3.1s; box-shadow: 0 0 8px #c084fc; }
.spark-7  { left: 38%; background: #f43f5e; animation-duration: 6.8s; animation-delay: 2.9s; box-shadow: 0 0 8px #f43f5e; }
.spark-8  { left: 61%; background: #fbbf24; animation-duration: 6.1s; animation-delay: 3.8s; box-shadow: 0 0 8px #fbbf24; }
.spark-9  { left: 44%; background: #38bdf8; animation-duration: 5.9s; animation-delay: 4.4s; box-shadow: 0 0 8px #38bdf8; }
.spark-10 { left: 56%; background: #ec4899; animation-duration: 6.4s; animation-delay: 4.9s; box-shadow: 0 0 8px #ec4899; }
.spark-11 { left: 40%; background: #a855f7; animation-duration: 7.2s; animation-delay: 1.5s; box-shadow: 0 0 8px #a855f7; }
.spark-12 { left: 60%; background: #f97316; animation-duration: 5.7s; animation-delay: 3.5s; box-shadow: 0 0 8px #f97316; }
.spark-13 { left: 46%; background: #06b6d4; animation-duration: 6.6s; animation-delay: 2.0s; box-shadow: 0 0 8px #06b6d4; }
.spark-14 { left: 54%; background: #e879f9; animation-duration: 6.0s; animation-delay: 0.9s; box-shadow: 0 0 8px #e879f9; }
.spark-15 { left: 49%; background: #fb923c; animation-duration: 5.4s; animation-delay: 2.7s; box-shadow: 0 0 8px #fb923c; }
.spark-16 { left: 51%; background: #38bdf8; animation-duration: 6.9s; animation-delay: 4.1s; box-shadow: 0 0 8px #38bdf8; }

@keyframes voxelRise {
  0% {
    transform: translateY(0) scale(0.6);
    opacity: 0;
  }
  20% {
    opacity: 0.85;
  }
  80% {
    opacity: 0.6;
    transform: translateY(-75vh) scale(1);
  }
  100% {
    transform: translateY(-100vh) scale(0.3);
    opacity: 0;
  }
}

/* Ana İçerik Kapsayıcı */
.boot-content {
  position: relative;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 480px;
  padding: 20px 24px;
}

/* ── Phoenix Katmanları ── */
.phoenix-frame {
  position: relative;
  width: 290px;
  height: 290px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  mask-image: radial-gradient(circle at 50% 50%, black 72%, transparent 98%);
  -webkit-mask-image: radial-gradient(circle at 50% 50%, black 72%, transparent 98%);
}

.phoenix-layer {
  width: 100%;
  height: 100%;
  object-fit: contain;
  mix-blend-mode: screen;
  user-select: none;
  -webkit-user-drag: none;
}

/* Taban Soluk Katman */
.phoenix-base {
  position: absolute;
  inset: 0;
  filter: brightness(0.22) saturate(0.3) contrast(1.1);
  opacity: 0.35;
}

/* Üst Renkli Parlak Katman (Alttan yukarı açılan) */
.phoenix-reveal-container {
  position: absolute;
  inset: 0;
  transition: clip-path 0.14s linear;
}

.phoenix-active {
  position: absolute;
  inset: 0;
  filter: drop-shadow(0 0 25px rgba(56, 189, 248, 0.45)) drop-shadow(0 0 40px rgba(236, 72, 153, 0.4));
}

/* Dolum Seviyesi Işık Çizgisi */
.phoenix-scan-line {
  position: absolute;
  left: 15%;
  right: 15%;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, #38bdf8 25%, #c084fc 50%, #f472b6 75%, transparent 100%);
  box-shadow: 0 0 14px #c084fc, 0 0 28px #38bdf8;
  border-radius: 999px;
  transform: translateY(-50%);
  pointer-events: none;
  transition: top 0.14s linear;
  opacity: 0.95;
  filter: blur(0.5px);
}

/* ── Başlık ── */
.boot-title {
  margin: 0 0 18px 0;
  font-size: 23px;
  font-weight: 700;
  letter-spacing: -0.01em;
  background: linear-gradient(90deg, #38bdf8 0%, #c084fc 40%, #f472b6 75%, #fb923c 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
}

/* ── İlerleme Çubuğu ── */
.boot-bar-wrapper {
  width: 360px;
  max-width: 86vw;
  margin-bottom: 8px;
}

.boot-bar-track {
  position: relative;
  width: 100%;
  height: 10px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  overflow: hidden;
  box-shadow: inset 0 1px 3px rgba(0, 0, 0, 0.6);
  padding: 1.5px;
}

.boot-bar-fill {
  position: relative;
  height: 100%;
  border-radius: 999px;
  background: linear-gradient(90deg, #06b6d4 0%, #3b82f6 25%, #a855f7 55%, #ec4899 80%, #f97316 100%);
  box-shadow: 0 0 12px rgba(249, 115, 22, 0.7), 0 0 20px rgba(168, 85, 247, 0.45);
  transition: width 0.12s linear;
}

.boot-bar-glow-edge {
  position: absolute;
  right: 0;
  top: 0;
  bottom: 0;
  width: 10px;
  background: #ffffff;
  border-radius: 999px;
  box-shadow: 0 0 8px #ffffff;
  opacity: 0.8;
}

/* ── % Değeri ── */
.boot-percent-text {
  font-size: 13px;
  font-weight: 600;
  color: #94a3b8;
  letter-spacing: 0.04em;
  margin-bottom: 12px;
}

/* ── Detay Mesajı ── */
.boot-step-detail {
  font-size: 13px;
  font-weight: 400;
  color: rgba(148, 163, 184, 0.72);
  margin-bottom: 24px;
  text-align: center;
  min-height: 20px;
}

/* ── 4'lü Kontrol Listesi ── */
.boot-checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 230px;
}

.check-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.check-icon-circle {
  width: 19px;
  height: 19px;
  border-radius: 50%;
  border: 1.5px solid rgba(148, 163, 184, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.28s ease;
}

.check-svg {
  width: 12px;
  height: 12px;
}

.check-pulse-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  animation: pulseCenter 1.2s ease-in-out infinite;
}

@keyframes pulseCenter {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.4; }
}

.check-label {
  font-size: 13.5px;
  font-weight: 500;
  color: rgba(226, 232, 240, 0.75);
  transition: color 0.2s ease;
}

.check-row.check-done .check-label {
  color: #f1f5f9;
}

.check-row.check-running .check-label {
  color: #ffffff;
}

.check-row.check-pending .check-label {
  color: rgba(148, 163, 184, 0.4);
}
`;
