<# : Batch part: double-click runs this file with PowerShell
@echo off
set "BROCKIPOS_SCRIPT=%~f0"
powershell -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -Command "iex ([IO.File]::ReadAllText($env:BROCKIPOS_SCRIPT))"
exit /b
#>

$Url = "https://erp-test.blaueskreuz.ch/pos"
$EdgeProfile = "$env:LOCALAPPDATA\BrockiPOS\EdgeProfile"
$Edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"

Add-Type @"
using System; using System.Runtime.InteropServices;
public static class Win {
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern uint GetWindowThreadProcessId(IntPtr h, out uint pid);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr h, int cmd);
    [DllImport("user32.dll")] public static extern bool MoveWindow(IntPtr h, int x, int y, int w, int ht, bool repaint);
}
"@
[Win]::SetProcessDPIAware() | Out-Null   # real pixels, also with display scaling
Add-Type -AssemblyName System.Windows.Forms

Get-CimInstance Win32_Process -Filter "Name='msedge.exe'" | Where-Object { $_.CommandLine -like "*$EdgeProfile*" } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep -Seconds 1
$prefs = "$EdgeProfile\Default\Preferences"
if (Test-Path $prefs) {
    [IO.File]::WriteAllText($prefs, ([IO.File]::ReadAllText($prefs) -replace '"exit_type":"\w+"', '"exit_type":"Normal"'))
}

function Open-Fullscreen([string]$Page, $Screen) {
    $before = [Win]::GetForegroundWindow()
    Start-Process $Edge "--user-data-dir=`"$EdgeProfile`" --app=$Url/$Page --no-first-run --disable-pinch --overscroll-history-navigation=0"
    # Wait until the new Edge window has the focus
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Milliseconds 500
        $h = [Win]::GetForegroundWindow(); $procId = 0
        [Win]::GetWindowThreadProcessId($h, [ref]$procId) | Out-Null
        if ($h -ne $before -and (Get-Process -Id $procId).Name -eq "msedge") { break }
    }
    $b = $Screen.Bounds
    [Win]::ShowWindow($h, 9) | Out-Null   # un-maximize, otherwise it can't be moved
    [Win]::MoveWindow($h, $b.X, $b.Y, $b.Width, $b.Height, $true) | Out-Null
    Start-Sleep -Milliseconds 500
    if ([Win]::GetForegroundWindow() -eq $h) { [System.Windows.Forms.SendKeys]::SendWait("{F11}") }
}

$second = [System.Windows.Forms.Screen]::AllScreens | Where-Object { -not $_.Primary } | Select-Object -First 1
if ($second) { Open-Fullscreen "customer-display" $second }
Open-Fullscreen "" ([System.Windows.Forms.Screen]::PrimaryScreen)
