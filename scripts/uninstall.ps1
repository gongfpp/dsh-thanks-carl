param(
  [Parameter(Mandatory=$true)][string]$Profile,
  [string]$DshHome = $(if($env:DSH_HOME){$env:DSH_HOME}else{Join-Path $env:USERPROFILE '.dsh'})
)
$ErrorActionPreference='Stop'
if ($Profile -notmatch '^[a-zA-Z0-9_-]+$') { throw 'Invalid profile name.' }
$Root=Split-Path $PSScriptRoot -Parent
$ProfileDir=Join-Path $DshHome "profiles\$Profile"
$ManifestPath=Join-Path $ProfileDir 'package.json'
$Manifest=Get-Content -LiteralPath $ManifestPath -Raw | ConvertFrom-Json -AsHashtable
$Target=[IO.Path]::GetFullPath((Join-Path $ProfileDir 'node_modules\dsh-thanks-carl'))
# Verify the exact absolute path and junction target BEFORE deleting. Do not recurse.
if(Test-Path -LiteralPath $Target){
  $Item=Get-Item -LiteralPath $Target
  if($Item.LinkType -ne 'Junction' -or $Item.ResolvedTarget -ne $Root){throw 'Refusing to remove anything except this project junction.'}
  Write-Output "Removing verified junction only: $Target -> $Root"
  $Item.Delete()
}
if($Manifest.dependencies){$Manifest.dependencies.Remove('dsh-thanks-carl') | Out-Null}
if($Manifest.dsh.profile){$Manifest.dsh.profile.bundles=@($Manifest.dsh.profile.bundles | Where-Object {$_ -ne 'dsh-thanks-carl'})}
$Manifest | ConvertTo-Json -Depth 64 | Set-Content -LiteralPath $ManifestPath -Encoding utf8NoBOM
Write-Output "Unlinked Thanks Carl from profile '$Profile'; other dependencies and config preserved. No process restarted."
Write-Output 'Turn off 启用卡尔 in the Thanks Carl settings for immediate hiding; complete unload happens on the next normal launch.'
Write-Output 'Optional browser cleanup: remove localStorage keys beginning thanks-carl. in this origin only.'
