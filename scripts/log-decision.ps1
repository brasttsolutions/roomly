param(
  [Parameter(Mandatory = $true)][string]$LogFile,
  [Parameter(Mandatory = $true)][string]$Phase,
  [Parameter(Mandatory = $true)][string]$Decision,
  [Parameter(Mandatory = $true)][string]$Why,
  [Parameter(Mandatory = $true)][string]$Evidence,
  [Parameter(Mandatory = $true)][string]$Result
)

$resolvedParent = Split-Path -Parent $LogFile
if ($resolvedParent) {
  New-Item -ItemType Directory -Force -Path $resolvedParent | Out-Null
}

function ConvertTo-SafeCell([string]$Value) {
  $cell = $Value -replace "[\t\r\n]", " "
  if ($cell -match "^[=+\-@]") {
    return "'$cell"
  }

  return $cell
}

if (-not (Test-Path -LiteralPath $LogFile)) {
  "ts`tphase`tdecision`twhy`tevidence`tresult" | Set-Content -LiteralPath $LogFile -Encoding utf8
}

$row = @(
  (Get-Date).ToUniversalTime().ToString("o"),
  (ConvertTo-SafeCell $Phase),
  (ConvertTo-SafeCell $Decision),
  (ConvertTo-SafeCell $Why),
  (ConvertTo-SafeCell $Evidence),
  (ConvertTo-SafeCell $Result)
) -join "`t"

$row | Add-Content -LiteralPath $LogFile -Encoding utf8
