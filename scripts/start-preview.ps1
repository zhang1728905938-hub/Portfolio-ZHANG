$ErrorActionPreference = 'Stop'
$previewRoot = Split-Path -Parent $PSScriptRoot
$previewUrl = 'http://localhost:5173/'
$previewProbeUrl = 'http://127.0.0.1:5173/'

function Test-PortfolioPreview {
    try {
        $response = Invoke-WebRequest -Uri $previewProbeUrl -UseBasicParsing -TimeoutSec 5
        return $response.StatusCode -eq 200 -and $response.Content -match '<title>Rui Zhang Portfolio'
    } catch {
        return $false
    }
}

try {
    if (Test-PortfolioPreview) {
        Write-Host "Portfolio is already running: $previewUrl"
        Write-Host 'You can close this window; the preview will keep running.'
        exit 0
    }

    if (Get-NetTCPConnection -LocalPort 5173 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Port 5173 is occupied but the portfolio is not responding. No existing process was stopped.'
    }

    $nodeCommand = Get-Command node.exe -CommandType Application -ErrorAction SilentlyContinue
    $previewNode = if ($nodeCommand) { $nodeCommand.Source } else {
        Join-Path $env:USERPROFILE '.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
    }
    if (-not (Test-Path -LiteralPath $previewNode -PathType Leaf)) {
        throw 'Node.js was not found. Install Node.js, then run this launcher again.'
    }
    if (-not (Test-Path -LiteralPath (Join-Path $previewRoot 'node_modules\vite\bin\vite.js'))) {
        throw 'Vite is missing. Run npm install in the portfolio folder first.'
    }

    $logDirectory = Join-Path $previewRoot '.preview'
    New-Item -ItemType Directory -Path $logDirectory -Force | Out-Null
    $runId = '{0}-{1}' -f (Get-Date -Format 'yyyyMMdd-HHmmss'), ([guid]::NewGuid().ToString('N').Substring(0, 8))
    $outputLog = Join-Path $logDirectory "vite-$runId.out.log"
    $errorLog = Join-Path $logDirectory "vite-$runId.err.log"
    $previewProcess = Start-Process -FilePath $previewNode -ArgumentList @(
        'node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '5173', '--strictPort'
    ) -WorkingDirectory $previewRoot -WindowStyle Hidden -RedirectStandardOutput $outputLog -RedirectStandardError $errorLog -PassThru

    for ($attempt = 0; $attempt -lt 15; $attempt++) {
        if (Test-PortfolioPreview) {
            Write-Host "Portfolio is ready: $previewUrl"
            Write-Host 'You can close this window; the preview will keep running.'
            exit 0
        }
        if ($previewProcess.HasExited) { break }
        Start-Sleep -Milliseconds 500
    }
    throw "The preview did not become ready. Check the logs in: $logDirectory"
} catch {
    Write-Host "Could not start the portfolio: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}
