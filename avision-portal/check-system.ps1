# Health check for the Avision Portal system. Prints pass/fail for each endpoint
# and exits non-zero if any fail. Safe to run from a scheduled task or CI.
$ErrorActionPreference = 'Continue'

$endpoints = @(
    @{ Label = 'Portal (local)      '; Url = 'http://localhost:5174/' },
    @{ Label = 'Portal (public)      '; Url = 'https://mayan-portal.avision-gb10.org/' },
    @{ Label = 'Portal scanner API   '; Url = 'https://mayan-portal.avision-gb10.org/api/scanner/watch-folder' },
    @{ Label = 'Mayan backend (public)'; Url = 'https://mayan-emds.avision-gb10.org/' }
)

$failures = 0
foreach ($endpoint in $endpoints) {
    try {
        $response = Invoke-WebRequest -Uri $endpoint.Url -UseBasicParsing -TimeoutSec 10
        Write-Host ("[PASS] {0} {1}  ({2})" -f $endpoint.Label, $response.StatusCode, $endpoint.Url) -ForegroundColor Green
    } catch {
        $code = $_.Exception.Response.StatusCode.value__
        if ($code) {
            Write-Host ("[FAIL] {0} HTTP {1}  ({2})" -f $endpoint.Label, $code, $endpoint.Url) -ForegroundColor Red
        } else {
            Write-Host ("[FAIL] {0} unreachable  ({1})" -f $endpoint.Label, $endpoint.Url) -ForegroundColor Red
        }
        $failures++
    }
}

if ($failures -gt 0) {
    Write-Host ""
    Write-Host "$failures endpoint(s) failed." -ForegroundColor Red
    exit 1
}
Write-Host ""
Write-Host "All endpoints healthy." -ForegroundColor Green
exit 0
