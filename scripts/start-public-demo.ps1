param(
    [int]$LocalPort = 8011,
    [int]$WaitSeconds = 45
)

$ErrorActionPreference = "Stop"
$composeFile = "compose.public.yml"

if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
    throw "Docker is not installed or not on PATH."
}

Write-Host "Starting doc2dash with a public tunnel..." -ForegroundColor Cyan
$env:DOC2DASH_LOCAL_PORT = $LocalPort
docker compose -f $composeFile up --build -d

$publicUrl = $null
$deadline = (Get-Date).AddSeconds($WaitSeconds)

while ((Get-Date) -lt $deadline -and -not $publicUrl) {
    Start-Sleep -Seconds 2
    $logs = docker compose -f $composeFile logs tunnel --no-color 2>$null
    if ($logs) {
        $match = $logs | Select-String -Pattern 'https://[-a-z0-9]+\.trycloudflare\.com' | Select-Object -First 1
        if ($match) {
            $publicUrl = $match.Matches[0].Value
        }
    }
}

Write-Host ""
Write-Host "Local URL:  http://localhost:$LocalPort/" -ForegroundColor Green
if ($publicUrl) {
    Write-Host "Public URL: $publicUrl" -ForegroundColor Green
} else {
    Write-Host "Public URL not found yet. Run the command below to inspect tunnel logs:" -ForegroundColor Yellow
    Write-Host "docker compose -f $composeFile logs tunnel --no-color" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Stop the stack with:" -ForegroundColor Cyan
Write-Host ".\\scripts\\stop-public-demo.ps1" -ForegroundColor Cyan
