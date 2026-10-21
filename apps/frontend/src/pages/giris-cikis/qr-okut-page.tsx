import { useEffect, useRef, useState, useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BrowserQRCodeReader } from '@zxing/browser';
import type { IScannerControls } from '@zxing/browser';
import { CheckCircle2, XCircle, QrCode, Camera, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth';
import { attendanceApi, type PunchResult, PUNCH_TYPE_LABEL } from '@/features/giris-cikis/api';
import { formatError, cn } from '@/lib/utils';

type ScanState = 'scanning' | 'success' | 'error' | 'no-camera';

export function QrOkutPage() {
  const queryClient = useQueryClient();
  const profile = useAuthStore((s) => s.profile);
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const readerRef = useRef<BrowserQRCodeReader | null>(null);
  const scanLockRef = useRef(false);

  const [scanState, setScanState] = useState<ScanState>('scanning');
  const [result, setResult] = useState<PunchResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [cameraReady, setCameraReady] = useState(false);

  const scanMutation = useMutation({
    mutationFn: (token: string) => attendanceApi.scanSelf(token),
    onSuccess: async (data) => {
      setResult(data);
      setScanState('success');
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['attendance'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-daily'] }),
        queryClient.invalidateQueries({ queryKey: ['attendance-summary'] }),
      ]);
      setTimeout(() => {
        setResult(null);
        setScanState('scanning');
        scanLockRef.current = false;
        void startScanner();
      }, 3000);
    },
    onError: (err) => {
      setErrorMsg(formatError(err));
      setScanState('error');
      setTimeout(() => {
        setScanState('scanning');
        scanLockRef.current = false;
        void startScanner();
      }, 3000);
    },
  });

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    try {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }

      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 300,
      });
      readerRef.current = reader;

      const devices = await BrowserQRCodeReader.listVideoInputDevices();
      if (devices.length === 0) {
        setScanState('no-camera');
        setErrorMsg('Cihazda kamera bulunamadı.');
        return;
      }

      const backCamera = devices.find(
        (d) =>
          d.label.toLowerCase().includes('back') ||
          d.label.toLowerCase().includes('arka') ||
          d.label.toLowerCase().includes('environment'),
      );
      const deviceId = backCamera?.deviceId ?? devices[devices.length - 1].deviceId;

      setCameraReady(false);
      const controls = await reader.decodeFromVideoDevice(
        deviceId,
        videoRef.current,
        (res, _err, ctrl) => {
          if (res && !scanLockRef.current) {
            scanLockRef.current = true;
            ctrl.stop();
            controlsRef.current = null;
            scanMutation.mutate(res.getText());
          }
        },
      );

      controlsRef.current = controls;
      setCameraReady(true);
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setScanState('no-camera');
        setErrorMsg('Kamera izni reddedildi. Tarayıcı ayarlarından izin verin.');
      } else {
        setScanState('no-camera');
        setErrorMsg('Kamera başlatılamadı.');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void startScanner();
    return () => {
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const displayName = profile?.username ?? profile?.email ?? 'Kullanıcı';

  return (
    <div className="flex min-h-[calc(100vh-8rem)] flex-col items-center justify-center gap-6 px-4">
      {/* Başlık */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
          <QrCode className="h-7 w-7 text-primary" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">QR Okut</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Giriş noktasındaki QR kodu kameraya tutun
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground/70">{displayName}</p>
      </div>

      {/* Kamera Kutusu */}
      <div className="relative w-full max-w-sm">
        <div
          className={cn(
            'relative overflow-hidden rounded-2xl border-2 transition-all duration-500',
            scanState === 'success'
              ? 'border-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
              : scanState === 'error'
                ? 'border-destructive shadow-[0_0_30px_rgba(239,68,68,0.3)]'
                : 'border-primary/30',
          )}
          style={{ aspectRatio: '1 / 1' }}
        >
          {/* Video */}
          <video
            ref={videoRef}
            className={cn(
              'h-full w-full object-cover transition-opacity duration-300',
              scanState !== 'scanning' ? 'opacity-20' : 'opacity-100',
            )}
            muted
            playsInline
          />

          {/* Tarama çerçevesi */}
          {scanState === 'scanning' && cameraReady && (
            <>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="relative h-48 w-48">
                  <span className="absolute left-0 top-0 h-8 w-8 rounded-tl-lg border-l-4 border-t-4 border-primary" />
                  <span className="absolute right-0 top-0 h-8 w-8 rounded-tr-lg border-r-4 border-t-4 border-primary" />
                  <span className="absolute bottom-0 left-0 h-8 w-8 rounded-bl-lg border-b-4 border-l-4 border-primary" />
                  <span className="absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-4 border-r-4 border-primary" />
                </div>
              </div>
              <div className="pointer-events-none absolute inset-x-8 h-0.5 rounded-full bg-primary/70 shadow-[0_0_8px_rgba(99,102,241,0.8)] qr-scan-line" />
            </>
          )}

          {/* Kamera hazırlanıyor */}
          {scanState === 'scanning' && !cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-background/80 backdrop-blur-sm">
              <Camera className="h-10 w-10 animate-pulse text-muted-foreground" />
              <p className="text-sm text-muted-foreground">Kamera başlatılıyor…</p>
            </div>
          )}

          {/* Başarı */}
          {scanState === 'success' && result && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-emerald-950/80 backdrop-blur-sm">
              <CheckCircle2 className="h-16 w-16 text-emerald-400 qr-bounce" />
              <div className="text-center">
                <p className="text-lg font-bold text-white">
                  {PUNCH_TYPE_LABEL[result.type]} Kaydedildi!
                </p>
                <p className="mt-1 text-sm text-emerald-300">
                  {result.employee.firstName} {result.employee.lastName}
                </p>
                <p className="text-xs text-emerald-400/70">
                  {new Date(result.timestamp).toLocaleTimeString('tr-TR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
                {result.location && (
                  <p className="mt-1 text-xs text-white/60">{result.location.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Hata */}
          {scanState === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-red-950/80 backdrop-blur-sm px-4">
              <XCircle className="h-14 w-14 text-red-400" />
              <div className="text-center">
                <p className="text-base font-bold text-white">Hata!</p>
                <p className="mt-1 text-sm text-red-300">{errorMsg}</p>
              </div>
            </div>
          )}

          {/* Kamera bulunamadı */}
          {scanState === 'no-camera' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-background/95 backdrop-blur-sm px-6">
              <Camera className="h-14 w-14 text-muted-foreground/50" />
              <div className="text-center">
                <p className="font-semibold text-foreground">Kamera Bulunamadı</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {errorMsg || 'Kamera izni gereklidir.'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setScanState('scanning');
                  setErrorMsg('');
                  scanLockRef.current = false;
                  void startScanner();
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Tekrar Dene
              </Button>
            </div>
          )}
        </div>

        {scanState === 'scanning' && cameraReady && (
          <p className="mt-3 text-center text-xs text-muted-foreground animate-pulse">
            QR kodu kameraya tutun — otomatik okunacak
          </p>
        )}
        {(scanState === 'success' || scanState === 'error') && (
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Kamera 3 saniye içinde tekrar aktif olacak…
          </p>
        )}
      </div>

      {scanState === 'scanning' && (
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground"
          onClick={() => {
            scanLockRef.current = false;
            void startScanner();
          }}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Kamerayı Yenile
        </Button>
      )}

      <style>{`
        .qr-scan-line {
          animation: qr-scan 2s ease-in-out infinite;
          position: absolute;
        }
        @keyframes qr-scan {
          0%   { top: 20%; }
          50%  { top: 75%; }
          100% { top: 20%; }
        }
        .qr-bounce {
          animation: qr-bounce-anim 0.6s ease-out;
        }
        @keyframes qr-bounce-anim {
          0%, 100% { transform: scale(1); }
          30%       { transform: scale(1.2); }
          60%       { transform: scale(0.95); }
        }
      `}</style>
    </div>
  );
}
