# Full backup of the server database (all books, users, history) into backups\,
# and optionally onto a USB drive:   .\scripts\backup.ps1 -To E:\
# Keeps the newest 30 backups in backups\. Restore with .\scripts\restore.ps1 -File <path>.
param([string]$To = "")
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$stamp = Get-Date -Format "yyyy-MM-dd_HHmm"
New-Item -ItemType Directory -Force "backups" | Out-Null
$file = "backups\maktabatna-$stamp.dump"

docker compose exec -T db pg_dump -U maktabatna -Fc -f /tmp/backup.dump maktabatna
if ($LASTEXITCODE -ne 0) { throw "pg_dump failed. Is the server running (docker compose up -d)?" }
docker compose cp db:/tmp/backup.dump $file
if ($LASTEXITCODE -ne 0) { throw "Copying the backup out of the container failed." }
Write-Host "Backup saved: $file"

if ($To -ne "") {
  $dest = Join-Path $To "maktabatna-backups"
  New-Item -ItemType Directory -Force $dest | Out-Null
  Copy-Item $file $dest
  Write-Host "Copied to $dest"
}

Get-ChildItem "backups\maktabatna-*.dump" | Sort-Object Name -Descending | Select-Object -Skip 30 | Remove-Item
