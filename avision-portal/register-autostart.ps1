# Register (or update) a Windows Scheduled Task that starts the Avision Portal
# system at user logon. Per-user task — no administrator elevation required.
$ErrorActionPreference = 'Stop'

$TaskName = 'AvisionPortalSystem'
$StartScript = Join-Path $PSScriptRoot 'start-system.ps1'

if (-not (Test-Path $StartScript)) { throw "start-system.ps1 not found at $StartScript" }

$action = New-ScheduledTaskAction -Execute 'powershell.exe' `
    -Argument "-ExecutionPolicy Bypass -NoProfile -WindowStyle Hidden -File `"$StartScript`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$settings = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -ExecutionTimeLimit ([TimeSpan]::Zero)

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger `
    -Settings $settings -RunLevel Limited -Description 'Start Avision Portal + Cloudflare tunnel at logon' -Force | Out-Null

Write-Host "Registered scheduled task '$TaskName' to run at $env:USERNAME logon." -ForegroundColor Green
Write-Host "Uninstall with: Unregister-ScheduledTask -TaskName '$TaskName' -Confirm:`$false"
