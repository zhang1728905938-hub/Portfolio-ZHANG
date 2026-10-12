$ErrorActionPreference = 'Stop'
$fontDirectory = Join-Path $PSScriptRoot '../public/fonts'
$fontSource = Get-Content -LiteralPath (Join-Path $fontDirectory 'google-fonts-source.css') -Raw
$localCss = ''
foreach ($block in [regex]::Matches($fontSource, '@font-face\s*\{[^}]+\}')) {
  $family = [regex]::Match($block.Value, "font-family: '([^']+)'").Groups[1].Value
  $weight = [regex]::Match($block.Value, 'font-weight: (\d+)').Groups[1].Value
  $url = [regex]::Match($block.Value, 'url\(([^)]+)\)').Groups[1].Value
  $name = $family.ToLower().Replace(' ', '-') + '-' + $weight + '.ttf'
  Invoke-WebRequest -Uri $url -OutFile (Join-Path $fontDirectory $name)
  $localCss += $block.Value.Replace($url, './' + $name) + "`n"
  Write-Output $name
}
Set-Content -LiteralPath (Join-Path $fontDirectory 'fonts.css') -Value $localCss
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt' -OutFile (Join-Path $fontDirectory 'dm-sans-license.txt')
Invoke-WebRequest -Uri 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt' -OutFile (Join-Path $fontDirectory 'manrope-license.txt')
