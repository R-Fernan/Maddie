$ProjectRoot = $PSScriptRoot

Write-Host "Initializing Project Startup..." -ForegroundColor Green

$HudPath = Join-Path $ProjectRoot "hud"
$ApiPath = Join-Path $ProjectRoot "api"

if (-not (Test-Path $HudPath)) {
	Write-Host "ERROR: hud directory not found: $HudPath" -ForegroundColor Red
	return
}

if (-not (Test-Path $ApiPath)) {
	Write-Host "ERROR: api directory not found: $ApiPath" -ForegroundColor Red
	return
}

Start-Process powershell -ArgumentList @(
	"-NoExit",
	"-Command",
	"Set-Location `"$HudPath`"; `$host.UI.RawUI.WindowTitle = 'HUD Server'; npm run dev"
)

Start-Process powershell -ArgumentList @(
	"-NoExit",
	"-Command",
	"Set-Location `"$ApiPath`"; `$host.UI.RawUI.WindowTitle = 'API Server'; npm run dev"
)

Write-Host "All servers are up and running, Sir!" -ForegroundColor Cyan