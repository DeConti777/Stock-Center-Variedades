# Encaminha webhooks Stripe para o Next.js local (nao depende de "stripe" no PATH).
param(
  [Parameter(ValueFromRemainingArguments = $true)]
  [string[]]$StripeArgs = @("listen", "--forward-to", "http://localhost:3000/api/webhooks/stripe")
)

$ErrorActionPreference = "Stop"

function Find-StripeExe {
  $cmd = Get-Command stripe -ErrorAction SilentlyContinue
  if ($cmd?.Source) {
    return $cmd.Source
  }

  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Packages\Stripe.StripeCli_Microsoft.Winget.Source_8wekyb3d8bbwe\stripe.exe"
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\stripe.exe"
  )

  foreach ($path in $candidates) {
    if (Test-Path $path) {
      return $path
    }
  }

  $wingetPackage = Get-ChildItem -Path "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Directory -Filter "Stripe.StripeCli*" -ErrorAction SilentlyContinue | Select-Object -First 1
  if ($wingetPackage) {
    $exe = Join-Path $wingetPackage.FullName "stripe.exe"
    if (Test-Path $exe) {
      return $exe
    }
  }

  throw @"
Nao encontrei stripe.exe.

Instale com:
  winget install -e --id Stripe.StripeCli

Depois feche e abra o terminal, ou rode:
  npm run stripe:listen
"@
}

$stripeExe = Find-StripeExe
Write-Host "Usando: $stripeExe" -ForegroundColor Cyan
Write-Host "Comando: stripe $($StripeArgs -join ' ')" -ForegroundColor DarkGray
Write-Host ""
Write-Host "Copie o whsec_... que aparecer para STRIPE_WEBHOOK_SECRET no .env" -ForegroundColor Yellow
Write-Host "Mantenha este terminal aberto durante a venda teste." -ForegroundColor Yellow
Write-Host ""

& $stripeExe @StripeArgs
