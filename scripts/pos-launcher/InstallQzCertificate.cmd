<# :
@echo off
net session >nul 2>&1 || (powershell -NoProfile -Command "Start-Process -Verb RunAs -FilePath '%~f0'" & exit /b)
set "QZCERT_SCRIPT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -Command "iex ([IO.File]::ReadAllText($env:QZCERT_SCRIPT))"
pause
exit /b
#>

function Install-QzCertificate {
    $qzDir = "$env:ProgramFiles\QZ Tray"
    if (-not (Test-Path $qzDir)) {
        Write-Host "QZ Tray is not installed ($qzDir)." -ForegroundColor Red
        return
    }

    $certs = @(Get-ChildItem -LiteralPath (Split-Path $env:QZCERT_SCRIPT) -Filter *.crt)
    if ($certs.Count -ne 1) {
        Write-Host "Expected exactly one .crt file next to this script, found $($certs.Count)." -ForegroundColor Red
        return
    }
    $cert = $certs[0]
    if ((Get-Content -Raw -LiteralPath $cert.FullName) -notmatch "BEGIN CERTIFICATE") {
        Write-Host "$($cert.Name) is not a PEM certificate." -ForegroundColor Red
        return
    }

    $target = Join-Path $qzDir $cert.Name
    Copy-Item -LiteralPath $cert.FullName -Destination $target -Force

    $props = "$qzDir\qz-tray.properties"
    $line = "authcert.override=" + ($target -replace '\\', '/')
    $content = if (Test-Path $props) { @(Get-Content $props | Where-Object { $_ -notmatch '^\s*authcert\.override\s*=' }) } else { @() }
    Set-Content $props ($content + $line) -Encoding ASCII

    Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like "$qzDir\*" } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    Start-Sleep -Seconds 2
    Start-Process explorer.exe "`"$qzDir\qz-tray.exe`""

    Write-Host "Installed $($cert.Name) into QZ Tray and restarted it." -ForegroundColor Green
}
Install-QzCertificate
