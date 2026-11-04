$ErrorActionPreference='Stop'
$Root=Split-Path $PSScriptRoot -Parent
$TestHome=Join-Path $Root ('.runtime\install-test-' + [guid]::NewGuid().ToString('N'))
$ProfileDir=Join-Path $TestHome 'profiles\test'
New-Item -ItemType Directory -Force $ProfileDir | Out-Null
$ManifestPath=Join-Path $ProfileDir 'package.json'
if(Test-Path $ManifestPath){throw 'Test directory already exists; inspect it before rerunning or choose a fresh test root.'}
@{name='install-script-test';private=$true;dependencies=@{'unrelated-plugin'='1.2.3'};dsh=@{profile=@{bundles=@('unrelated-plugin')}}} | ConvertTo-Json -Depth 8 | Set-Content $ManifestPath -Encoding utf8NoBOM
& (Join-Path $PSScriptRoot 'install.ps1') -Profile test -DshHome $TestHome
& (Join-Path $PSScriptRoot 'install.ps1') -Profile test -DshHome $TestHome
$Installed=Get-Content $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
if(@($Installed.dsh.profile.bundles | Where-Object {$_ -eq 'dsh-thanks-carl'}).Count -ne 1){throw 'Install is not idempotent'}
& (Join-Path $PSScriptRoot 'uninstall.ps1') -Profile test -DshHome $TestHome
& (Join-Path $PSScriptRoot 'uninstall.ps1') -Profile test -DshHome $TestHome
$After=Get-Content $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
if($After.dependencies['unrelated-plugin'] -ne '1.2.3' -or $After.dsh.profile.bundles.Count -ne 1 -or $After.dsh.profile.bundles[0] -ne 'unrelated-plugin'){throw 'Unrelated profile content changed'}
if(!(Test-Path (Join-Path $Root 'client.js'))){throw 'Project target unexpectedly removed'}
Write-Output 'PASS: install twice, uninstall twice; unrelated dependency/bundle preserved; source untouched.'
