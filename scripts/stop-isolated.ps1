param([int]$Port=3345)
$ErrorActionPreference='Stop'
if ($Port -eq 3333) { throw 'Refusing to touch production port 3333.' }
$listener=Get-NetTCPConnection -LocalPort $Port -State Listen -ErrorAction SilentlyContinue
foreach($item in $listener){
  $process=Get-CimInstance Win32_Process -Filter "ProcessId=$($item.OwningProcess)"
  if($process.CommandLine -notmatch '--profile\s+carl-test' -or $process.CommandLine -notmatch "--port\s+$Port(\s|$)") { throw 'Port is not owned by the Carl isolated profile. Nothing stopped.' }
  Write-Output "Stopping only verified carl-test PID $($process.ProcessId), port $Port"
  Stop-Process -Id $process.ProcessId
}
