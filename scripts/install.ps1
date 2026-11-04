param(
  [Parameter(Mandatory=$true)][string]$Profile,
  [string]$DshHome = $(if($env:DSH_HOME){$env:DSH_HOME}else{Join-Path $env:USERPROFILE '.dsh'})
)
$ErrorActionPreference='Stop'
if ($Profile -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Invalid profile name.' }
$Root=Split-Path $PSScriptRoot -Parent
$ProfileDir=Join-Path $DshHome "profiles\$Profile"
$ManifestPath=Join-Path $ProfileDir 'package.json'
if (!(Test-Path -LiteralPath $ManifestPath)) { throw 'Existing profile required; never create or replace another profile.' }
if (!(Test-Path (Join-Path $Root 'lib\client.js'))) { throw 'Run npm run build first.' }
$Manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
$Target=Join-Path $ProfileDir 'node_modules\dsh-thanks-carl'
if(Test-Path -LiteralPath $Target){
  $Resolved=(Get-Item -LiteralPath $Target).ResolvedTarget
  if($Resolved -ne $Root){throw "Existing dsh-thanks-carl is not this project. No overwrite."}
}
$Backup=Join-Path $ProfileDir 'thanks-carl.install-backup.json'
if(!(Test-Path $Backup)){ Copy-Item -LiteralPath $ManifestPath -Destination $Backup }
if(!$Manifest.dependencies){$Manifest.dependencies=@{}}
$Manifest.dependencies['dsh-thanks-carl']="link:$($Root.Replace('\','/'))"
if(!$Manifest.dsh){$Manifest.dsh=@{}}
if(!$Manifest.dsh.profile){$Manifest.dsh.profile=@{bundles=@()}}
$Bundles=@($Manifest.dsh.profile.bundles)
if('dsh-thanks-carl' -notin $Bundles){$Manifest.dsh.profile.bundles=$Bundles+@('dsh-thanks-carl')}
New-Item -ItemType Directory -Force (Join-Path $ProfileDir 'node_modules') | Out-Null
if(!(Test-Path $Target)){New-Item -ItemType Junction -Path $Target -Target $Root | Out-Null}
$Manifest | ConvertTo-Json -Depth 64 | Set-Content -LiteralPath $ManifestPath -Encoding utf8NoBOM
Write-Output "Linked Thanks Carl only in profile '$Profile'. Repeating this command is safe."
Write-Output 'No running process restarted. Bundle composition is read at launch: use the next normal launch of this profile to activate.'
