# Push project updates to GitHub (run from repo root on Windows)
# Usage:
#   .\deploy\push-to-github.ps1 "Your commit message here"
#
# Example:
#   .\deploy\push-to-github.ps1 "Update landing page and OTP email branding"

param(
    [Parameter(Mandatory = $true, Position = 0)]
    [string]$Message
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $Root

Write-Host "==> Git status" -ForegroundColor Cyan
git status --short

$Paths = @(
    "backend",
    "Frontend",
    "deploy",
    "docs",
    "supabase",
    "README.md",
    "SETUP.md",
    "PRODUCTION_SECURITY_CHECKLIST.md",
    ".gitignore"
)

Write-Host "`n==> Staging project files (no .env)" -ForegroundColor Cyan
git add @Paths

$Staged = git diff --cached --name-only
if (-not $Staged) {
    Write-Host "Nothing to commit. Working tree clean for tracked paths." -ForegroundColor Yellow
    exit 0
}

Write-Host "`n==> Staged files:" -ForegroundColor Cyan
$Staged | ForEach-Object { Write-Host "  $_" }

Write-Host "`n==> Commit" -ForegroundColor Cyan
git commit -m $Message

Write-Host "`n==> Push to origin/main" -ForegroundColor Cyan
git push origin main

Write-Host "`nDone. Next on VPS:" -ForegroundColor Green
Write-Host "  ssh root@187.127.233.203" -ForegroundColor Gray
Write-Host "  bash /var/www/e-tashleh/deploy/update-vps.sh" -ForegroundColor Gray
