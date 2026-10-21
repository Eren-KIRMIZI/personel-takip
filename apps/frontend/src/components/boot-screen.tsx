import { useEffect, useState } from 'react';
import type { WarmUpProgress, CheckItem } from '@/lib/warm-up-engine';

// Phoenix SVG path data (wings spread, pixel-dissolve base)
const PHOENIX_PATHS = {
  body: `M 200 140 C 195 155 190 175 192 200 C 194 225 200 250 200 280 
         C 200 310 195 340 200 360 C 205 340 210 310 208 280 
         C 208 250 206 225 208 200 C 210 175 205 155 200 140 Z`,
  leftWing: `M 200 180 C 180 170 155 165 130 155 C 105 145 80 140 60 148 
             C 40 156 30 175 35 195 C 40 215 60 228 85 230 
             C 110 232 140 220 165 205 C 185 193 198 183 200 180 Z`,
  rightWing: `M 200 180 C 220 170 245 165 270 155 C 295 145 320 140 340 148 
              C 360 156 370 175 365 195 C 360 215 340 228 315 230 
              C 290 232 260 220 235 205 C 215 193 202 183 200 180 Z`,
  leftFan: `M 60 148 C 40 135 25 120 20 100 C 15 80 20 60 30 50 
            C 50 60 65 80 75 100 C 85 120 80 140 60 148 Z`,
  rightFan: `M 340 148 C 360 135 375 120 380 100 C 385 80 380 60 370 50 
             C 350 60 335 80 325 100 C 315 120 320 140 340 148 Z`,
  tail: `M 200 360 C 185 375 170 395 165 420 C 160 445 165 465 175 475 
         C 185 455 195 435 200 415 C 205 435 215 455 225 475 
         C 235 465 240 445 235 420 C 230 395 215 375 200 360 Z`,
  head: `M 200 140 C 190 125 188 110 192 95 C 196 80 205 72 215 70 
         C 225 68 232 75 235 85 C 238 95 232 110 225 120 C 218 130 208 138 200 140 Z`,
  beak: `M 215 70 C 222 65 235 60 242 55 C 238 65 230 72 215 70 Z`,
};

// Piksel grid ayarlari
const GRID_COLS = 18;
const GRID_ROWS = 22;

interface PixelCell {
  col: number;
  row: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  color: string;
}

const PIXEL_COLORS = [
  '#60a5fa', '#818cf8', '#a78bfa', '#c084fc',
  '#e879f9', '#f472b6', '#fb7185', '#f97316',
  '#facc15', '#4ade80', '#34d399', '#22d3ee',
];

function buildPixelGrid(progress: number): PixelCell[] {
  const cells: PixelCell[] = [];
  const svgW = 400;
  const svgH = 500;
  const cellW = svgW / GRID_COLS;
  const cellH = svgH / GRID_ROWS;
  const size = Math.min(cellW, cellH) * 0.85;

  // bottom-to-top fill: progress 0-100
  // row 0 is top, row GRID_ROWS-1 is bottom
  // fill from bottom => unlocked rows = progress * GRID_ROWS / 100
  const unlockedRows = Math.floor((progress / 100) * GRID_ROWS);

  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      // bottom-to-top: row GRID_ROWS-1 fills first
      const fromBottom = GRID_ROWS - 1 - row;
      if (fromBottom < unlockedRows) {
        const cx = col * cellW + cellW / 2;
        const cy = row * cellH + cellH / 2;
        const colorIdx = (col + row * 3) % PIXEL_COLORS.length;
        const delay = (fromBottom / GRID_ROWS) * 0.3 + (col % 4) * 0.04;
        cells.push({ col, row, x: cx, y: cy, size, delay, color: PIXEL_COLORS[colorIdx] });
      }
    }
  }
  return cells;
}

// ─── Check List ───────────────────────────────────────────────────────────────
function CheckList({ checks }: { checks: CheckItem[] }) {
  return (
    <div className="boot-checks">
      {checks.map((c, i) => (
        <div key={i} className={`boot-check-item ${c.done ? 'done' : 'pending'}`}>
          <span className="boot-check-icon">
            {c.done ? (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="7" fill="url(#cg)" />
                <path d="M3.5 7L6 9.5L10.5 5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="14" y2="14" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#60a5fa" />
                    <stop offset="1" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="7" r="6" stroke="rgba(148,163,184,0.4)" strokeWidth="1.5" />
              </svg>
            )}
          </span>
          <span className="boot-check-label">{c.label}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Ana Boot Screen ──────────────────────────────────────────────────────────
interface BootScreenProps {
  progress: WarmUpProgress;
  onComplete: () => void;
}

export function BootScreen({ progress, onComplete }: BootScreenProps) {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);

  // %100 olunca cikis animasyonu
  useEffect(() => {
    if (progress.percent >= 100 && !exiting) {
      setExiting(true);
      const t = setTimeout(() => {
        setVisible(false);
        onComplete();
      }, 700);
      return () => clearTimeout(t);
    }
  }, [progress.percent, exiting, onComplete]);

  const pct = Math.min(progress.percent, 100);
  const pixels = buildPixelGrid(pct);

  if (!visible) return null;

  return (
    <>
      <style>{BOOT_CSS}</style>
      <div className={`boot-overlay ${exiting ? 'boot-exiting' : ''}`}>
        {/* Arka plan gradyan */}
        <div className="boot-bg" />

        {/* Merkez kart */}
        <div className="boot-card">
          {/* Phoenix SVG */}
          <div className="boot-phoenix-wrapper">
            <svg
              viewBox="0 0 400 500"
              className="boot-phoenix-svg"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="phGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#f97316" />
                  <stop offset="35%" stopColor="#e879f9" />
                  <stop offset="65%" stopColor="#818cf8" />
                  <stop offset="100%" stopColor="#60a5fa" />
                </linearGradient>
                <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feMerge>
                    <feMergeNode in="blur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <mask id="pixelMask">
                  {/* Piksel hucreler maskeyi seffaf acıyor */}
                  <rect width="400" height="500" fill="black" />
                  {pixels.map((p, i) => (
                    <rect
                      key={i}
                      x={p.x - p.size / 2}
                      y={p.y - p.size / 2}
                      width={p.size}
                      height={p.size}
                      rx="2"
                      fill="white"
                      style={{
                        opacity: 0,
                        animation: `pixelFadeIn 0.25s ease-out ${p.delay}s forwards`,
                      }}
                    />
                  ))}
                </mask>
                <mask id="outlineMask">
                  <rect width="400" height="500" fill="white" />
                  {pixels.map((p, i) => (
                    <rect
                      key={i}
                      x={p.x - p.size / 2}
                      y={p.y - p.size / 2}
                      width={p.size}
                      height={p.size}
                      rx="2"
                      fill="black"
                      style={{
                        opacity: 0,
                        animation: `pixelFadeIn 0.25s ease-out ${p.delay}s forwards`,
                      }}
                    />
                  ))}
                </mask>
              </defs>

              {/* Phoenix outline (her zaman gorünür, hafif) */}
              <g mask="url(#outlineMask)" opacity="0.18" filter="url(#glow)">
                <path d={PHOENIX_PATHS.leftFan} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.rightFan} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.leftWing} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.rightWing} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.body} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.tail} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.head} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.beak} fill="#facc15" />
              </g>

              {/* Phoenix renkli katman — pikseller acildikca gorünür */}
              <g mask="url(#pixelMask)" filter="url(#glow)">
                <path d={PHOENIX_PATHS.leftFan} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.rightFan} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.leftWing} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.rightWing} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.body} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.tail} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.head} fill="url(#phGrad)" />
                <path d={PHOENIX_PATHS.beak} fill="#facc15" />
              </g>

              {/* Piksel parcacikciklari (dekoratif, progress arttikca disariya dagiliyor) */}
              {pixels.filter((_, i) => i % 7 === 0 && pct < 95).map((p, i) => (
                <rect
                  key={'scatter-' + i}
                  x={p.x + (Math.sin(i * 1.7) * 35)}
                  y={p.y + (Math.cos(i * 2.3) * 30)}
                  width={Math.max(2, p.size * 0.35)}
                  height={Math.max(2, p.size * 0.35)}
                  rx="1"
                  fill={p.color}
                  opacity="0.5"
                  style={{
                    animation: `pixelFloat ${1.5 + (i % 3) * 0.5}s ease-in-out ${i * 0.1}s infinite alternate`,
                  }}
                />
              ))}
            </svg>
          </div>

          {/* Baslik */}
          <div className="boot-title">Personel Yönetim Sistemi</div>
          <div className="boot-subtitle">Yenişehir Belediyesi</div>

          {/* Durum mesaji */}
          <div className="boot-step">{progress.step}</div>

          {/* Progress bar */}
          <div className="boot-bar-track">
            <div className="boot-bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="boot-percent">{pct}%</div>

          {/* Check listesi */}
          <CheckList checks={progress.checks} />
        </div>
      </div>
    </>
  );
}

// ─── CSS ───────────────────────────────────────────────────────────────────────
const BOOT_CSS = `
@keyframes pixelFadeIn {
  from { opacity: 0; transform: scale(0.5); }
  to   { opacity: 1; transform: scale(1); }
}

@keyframes pixelFloat {
  from { transform: translateY(0px) rotate(0deg); opacity: 0.4; }
  to   { transform: translateY(-6px) rotate(8deg); opacity: 0.7; }
}

@keyframes bootFadeIn {
  from { opacity: 0; }
  to   { opacity: 1; }
}

@keyframes bootFadeOut {
  from { opacity: 1; transform: scale(1); }
  to   { opacity: 0; transform: scale(1.03); }
}

@keyframes barShimmer {
  0%   { background-position: 0% 50%; }
  100% { background-position: 200% 50%; }
}

@keyframes pulse-soft {
  0%, 100% { opacity: 0.7; }
  50%       { opacity: 1; }
}

.boot-overlay {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #060d1a;
  animation: bootFadeIn 0.3s ease-out forwards;
}

.boot-overlay.boot-exiting {
  animation: bootFadeOut 0.65s cubic-bezier(0.4, 0, 0.2, 1) forwards;
  pointer-events: none;
}

.boot-bg {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse 70% 70% at 50% 30%, rgba(99,102,241,0.12) 0%, transparent 70%),
              radial-gradient(ellipse 50% 40% at 20% 80%, rgba(249,115,22,0.07) 0%, transparent 60%),
              radial-gradient(ellipse 50% 40% at 80% 80%, rgba(236,72,153,0.07) 0%, transparent 60%);
}

.boot-card {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 40px 48px 36px;
  max-width: 420px;
  width: 90vw;
}

.boot-phoenix-wrapper {
  width: 200px;
  height: 250px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4px;
}

.boot-phoenix-svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 0 20px rgba(129,140,248,0.3));
}

.boot-title {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 18px;
  font-weight: 700;
  letter-spacing: 0.04em;
  background: linear-gradient(90deg, #60a5fa, #c084fc, #f472b6);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-align: center;
  line-height: 1.3;
}

.boot-subtitle {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 12px;
  font-weight: 500;
  color: rgba(148,163,184,0.7);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  margin-top: -6px;
}

.boot-step {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 13px;
  color: rgba(148,163,184,0.8);
  min-height: 18px;
  text-align: center;
  animation: pulse-soft 2s ease-in-out infinite;
  margin-top: 4px;
}

.boot-bar-track {
  width: 100%;
  height: 4px;
  background: rgba(255,255,255,0.07);
  border-radius: 99px;
  overflow: hidden;
  margin-top: 2px;
}

.boot-bar-fill {
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(90deg, #60a5fa, #818cf8, #c084fc, #f472b6, #60a5fa);
  background-size: 200% 100%;
  animation: barShimmer 1.8s linear infinite;
  transition: width 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.boot-percent {
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 11px;
  font-weight: 600;
  color: rgba(148,163,184,0.5);
  letter-spacing: 0.08em;
  margin-top: -4px;
}

.boot-checks {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
  width: 100%;
  padding: 0 8px;
}

.boot-check-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-family: 'Inter', -apple-system, sans-serif;
  font-size: 12.5px;
  transition: opacity 0.3s ease;
}

.boot-check-item.pending {
  opacity: 0.4;
}

.boot-check-item.done {
  opacity: 0.85;
}

.boot-check-icon {
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.boot-check-label {
  color: rgba(226,232,240,0.9);
}

.boot-check-item.done .boot-check-label {
  color: rgba(226,232,240,0.95);
}
`;
