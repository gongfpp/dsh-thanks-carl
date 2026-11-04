param([string]$DshRoot = 'C:\DevTools\dsh', [int]$Port = 3345, [switch]$Fixture)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$State = Join-Path $Root '.runtime\isolation.json'
if (!(Test-Path $State)) { throw 'Run scripts/setup-isolated.ps1 first.' }
$env:DSH_HOME = Join-Path $Root '.runtime\home'
# Eliminate inherited session identity, custom profile, private env keys and proxies.
foreach ($key in @('DSH_PROFILE','DSH_PROFILE_DIR','DSH_SESSION_ID','DSH_WEB_URL','DSH_SHELL','DEEPSEEK_API_KEY','OPENAI_API_KEY','ANTHROPIC_API_KEY','OPENROUTER_API_KEY','SENSENOVA_API_KEY')) { Remove-Item "Env:$key" -ErrorAction SilentlyContinue }
$env:DSH_DISABLE_TELEMETRY = '1'
$env:CARL_FIXTURE = if($Fixture){'1'}else{'0'}
$env:CARL_TEST_WORKSPACE = Join-Path $Root '.runtime\workspace'
$argsList = @((Join-Path $DshRoot 'node_modules\@deepseek-ai\dsh\lib\bin.js'),'--profile','carl-test')
if ($Fixture) { $argsList += @('--patch',(Join-Path $Root 'test\fixture.patch.yml')) }
$argsList += @('--port',"$Port",'--host','127.0.0.1','--no-open')
& node @argsList
exit $LASTEXITCODE
