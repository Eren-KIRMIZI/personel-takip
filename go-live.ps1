# go-live.ps1
# Bakim modundan canliya donus
# 1) apps/frontend/index.html'i (anti-flash'li) geri yazar
# 2) public/maintenance.html'i temizler
# 3) Vercel production deploy yapar
# Kullanim: powershell -ExecutionPolicy Bypass -File go-live.ps1

$root = $PSScriptRoot
$indexPath = Join-Path $root 'apps\frontend\index.html'
$maintenanceFile = Join-Path $root 'apps\frontend\public\maintenance.html'

$originalIndex = @'
<!doctype html>
<html lang="tr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Personel ve İK</title>
    <script>
      try {
        var t = localStorage.getItem('pik_theme');
        if (t === 'dark' || (!t && matchMedia('(prefers-color-scheme:dark)').matches)) {
          document.documentElement.classList.add('dark');
        }
      } catch (_) {}
    </script>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
'@

Write-Host 'index.html geri yukleniyor...'
[System.IO.File]::WriteAllText($indexPath, $originalIndex, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "index.html guncellendi: $indexPath"

if (Test-Path -LiteralPath $maintenanceFile) {
  Remove-Item -LiteralPath $maintenanceFile -Force
  Write-Host 'public/maintenance.html silindi.'
} else {
  Write-Host 'public/maintenance.html zaten yok.'
}

Write-Host 'Vercel production deploy basliyor...'
& npx vercel --prod --yes
if ($LASTEXITCODE -eq 0) {
  Write-Host 'Canliya donus tamam. Site aktif.'
} else {
  Write-Host "Deploy kodu: $LASTEXITCODE - kontrol edin." -ForegroundColor Yellow
  exit $LASTEXITCODE
}