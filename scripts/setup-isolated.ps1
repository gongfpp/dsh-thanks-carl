param([string]$DshRoot = 'C:\DevTools\dsh', [int]$Port = 3345)
$ErrorActionPreference = 'Stop'
$Root = Split-Path $PSScriptRoot -Parent
$Runtime = Join-Path $Root '.runtime'
$HomeDir = Join-Path $Runtime 'home'
$Profile = Join-Path $HomeDir 'profiles\carl-test'
New-Item -ItemType Directory -Force $Profile, (Join-Path $Profile 'node_modules'), (Join-Path $Runtime 'workspace') | Out-Null
$Manifest = @{ name='thanks-carl-isolated'; private=$true; dependencies=@{'dsh-thanks-carl'="link:$($Root.Replace('\','/'))"}; dsh=@{profile=@{bundles=@('@deepseek-ai/dsh-base','@deepseek-ai/dsh-web-app','dsh-thanks-carl')}} }
$Manifest | ConvertTo-Json -Depth 8 | Set-Content (Join-Path $Profile 'package.json') -Encoding utf8NoBOM
'[]' | Set-Content (Join-Path $Profile 'cordis.yml') -Encoding utf8NoBOM
# No real profile, home env file, credentials, sessions or third-party plugins copied.
@'
- id: session-title-llm
  disabled: true
- id: web-runtime
  config:
    openBrowser: false
    printUrl: true
    surfaceContext: false
- id: ui-settings-general
  config:
    welcomeNoticeVersion: 2026-09-28.1
'@ | Set-Content (Join-Path $Profile 'cordis.patch.yml') -Encoding utf8NoBOM
$link = Join-Path $Profile 'node_modules\dsh-thanks-carl'
if (!(Test-Path $link)) { New-Item -ItemType Junction -Path $link -Target $Root | Out-Null }
# Core resolution uses the installed DSH anchor; no global modules are changed.
@{root=$Root; home=$HomeDir; profile=$Profile; port=$Port; dshRoot=$DshRoot; originalPort=3333; originalPid=17956} | ConvertTo-Json | Set-Content (Join-Path $Runtime 'isolation.json') -Encoding utf8NoBOM
Write-Output "Prepared private DSH home: $HomeDir; port $Port. Existing port 3333 untouched."
