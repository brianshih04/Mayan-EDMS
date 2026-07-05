# Stop the Avision Portal system processes started by start-system.ps1.
$ErrorActionPreference = 'Continue'
$StateDir = if ($env:AVISION_PORTAL_STATE_DIR) { $env:AVISION_PORTAL_STATE_DIR } else { 'E:\Mayan-EDMS-Docker\data\portal' }
$PidFile = Join-Path $StateDir 'logs\system-pids.json'

if (-not (Test-Path $PidFile)) {
    Write-Host 'No PID file found — nothing recorded to stop.' -ForegroundColor Yellow
    return
}

$pids = Get-Content $PidFile -Raw | ConvertFrom-Json
foreach ($label in 'previewPid', 'cloudflaredPid') {
    $pidValue = $pids.$label
    if ($pidValue) {
        try {
            Stop-Process -Id $pidValue -Force -ErrorAction Stop
            Write-Host "Stopped $label ($pidValue)" -ForegroundColor Green
        } catch {
            Write-Host "$label ($pidValue) was not running." -ForegroundColor DarkGray
        }
    }
}
Remove-Item -Path $PidFile -Force -ErrorAction SilentlyContinue
