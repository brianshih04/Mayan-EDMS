# Start the Avision Portal system: build + preview server + Cloudflare tunnel.
# Both processes are launched detached with rotated logs under the portal state dir.
# PIDs are recorded so stop-system.ps1 can clean them up.
#
# Env overrides:
#   AVISION_PORTAL_STATE_DIR     portal state/log root (default E:\Mayan-EDMS-Docker\data\portal)
#   AVISION_CLOUDFLARED_CONFIG   cloudflared config yml (default E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml)
#   AVISION_SKIP_BUILD           set to "1" to skip the production build

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$StateDir = if ($env:AVISION_PORTAL_STATE_DIR) { $env:AVISION_PORTAL_STATE_DIR } else { 'E:\Mayan-EDMS-Docker\data\portal' }
$CloudflaredConfig = if ($env:AVISION_CLOUDFLARED_CONFIG) { $env:AVISION_CLOUDFLARED_CONFIG } else { 'E:\Mayan-EDMS-Docker\cloudflared-mayan-emds.yml' }
$LogDir = Join-Path $StateDir 'logs'
$PidFile = Join-Path $LogDir 'system-pids.json'

New-Item -ItemType Directory -Force -Path $LogDir | Out-Null

if (-not $env:MAYAN_SERVICE_TOKEN) {
    $userServiceToken = [Environment]::GetEnvironmentVariable('MAYAN_SERVICE_TOKEN', 'User')
    if ($userServiceToken) {
        $env:MAYAN_SERVICE_TOKEN = $userServiceToken
    } else {
        Write-Warning 'MAYAN_SERVICE_TOKEN is not set. Mayan document-type and import APIs will fail.'
    }
}

function Get-StalePids {
    if (Test-Path $PidFile) {
        try { return (Get-Content $PidFile -Raw | ConvertFrom-Json) } catch { return $null }
    }
    return $null
}

# Stop a prior instance to avoid duplicate preview / tunnel processes.
$prior = Get-StalePids
if ($prior) {
    foreach ($pidValue in @($prior.previewPid, $prior.cloudflaredPid)) {
        if ($pidValue) {
            try { Stop-Process -Id $pidValue -Force -ErrorAction Stop } catch { }
        }
    }
}

# 1. Production build (skippable for fast restarts).
if ($env:AVISION_SKIP_BUILD -ne '1') {
    Write-Host '[start-system] Building portal...' -ForegroundColor Cyan
    & npm run build
    if ($LASTEXITCODE -ne 0) { throw 'npm run build failed' }
}

# 2. Preview server (serves dist/ on 0.0.0.0:5174).
$previewLog = Join-Path $LogDir 'preview.log'
$previewErr = Join-Path $LogDir 'preview.err.log'
Write-Host '[start-system] Starting preview server...' -ForegroundColor Cyan
$preview = Start-Process -FilePath 'npm.cmd' -ArgumentList 'run','preview' `
    -WorkingDirectory $PSScriptRoot -WindowStyle Hidden `
    -RedirectStandardOutput $previewLog -RedirectStandardError $previewErr -PassThru

# 3. Cloudflare tunnel (forwards mayan-portal + mayan-emds hostnames).
# Skip if a cloudflared process is already running (e.g. managed separately).
$cfLog = Join-Path $LogDir 'cloudflared.log'
$cfErr = Join-Path $LogDir 'cloudflared.err.log'
$existingCf = Get-Process -Name 'cloudflared' -ErrorAction SilentlyContinue
if ($existingCf) {
    Write-Host '[start-system] cloudflared already running (PID ' -NoNewline -ForegroundColor DarkGray
    Write-Host ($existingCf.Id -join ',') -NoNewline -ForegroundColor DarkGray
    Write-Host ') — skipping.' -ForegroundColor DarkGray
    $cloudflared = $existingCf[0]
} else {
    Write-Host '[start-system] Starting Cloudflare tunnel...' -ForegroundColor Cyan
    $cloudflared = Start-Process -FilePath 'cloudflared' `
        -ArgumentList @('tunnel', '--config', $CloudflaredConfig, 'run') `
        -WindowStyle Hidden -RedirectStandardOutput $cfLog -RedirectStandardError $cfErr -PassThru
}

# Persist PIDs. cloudflaredPid is null when we reused an already-running tunnel
# (so stop-system.ps1 won't kill an externally-managed cloudflared).
$cfPidValue = if ($existingCf) { $null } else { $cloudflared.Id }
$pids = @{ previewPid = $preview.Id; cloudflaredPid = $cfPidValue; startedAt = (Get-Date).ToString('o') }
$pids | ConvertTo-Json | Set-Content -Path $PidFile

# 4. Wait for the preview port to answer.
Write-Host '[start-system] Waiting for http://localhost:5174 ...' -ForegroundColor Cyan
$ready = $false
for ($i = 0; $i -lt 30; $i++) {
    Start-Sleep -Seconds 2
    try {
        $null = Invoke-WebRequest -Uri 'http://localhost:5174/' -UseBasicParsing -TimeoutSec 3
        $ready = $true; break
    } catch { }
}
if (-not $ready) {
    Write-Warning 'Preview server did not become ready within 60s. Check logs:'
    Write-Host "  $previewLog"
} else {
    Write-Host '[start-system] Preview ready.' -ForegroundColor Green
}

Write-Host ''
Write-Host 'Avision Portal system started.' -ForegroundColor Green
Write-Host "  preview PID:     $($preview.Id)  (log: $previewLog)"
Write-Host "  cloudflared PID: $($cloudflared.Id)  (log: $cfLog)"
Write-Host "  Public portal:   https://mayan-portal.avision-gb10.org"
Write-Host "  Mayan backend:   https://mayan-emds.avision-gb10.org"
Write-Host "Stop with: .\stop-system.ps1"
