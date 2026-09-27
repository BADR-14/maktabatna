# Restores a backup made by backup.ps1, replacing what is in the server database now.
#   .\scripts\restore.ps1 -File backups\maktabatna-2026-09-27_2100.dump
param([Parameter(Mandatory = $true)][string]$File)
$ErrorActionPreference = "Stop"
Set-Location (Join-Path $PSScriptRoot "..")

$answer = Read-Host "This replaces the server's data with $File. Type YES to continue"
if ($answer -ne "YES") { Write-Host "Cancelled."; exit 1 }

docker compose cp $File db:/tmp/restore.dump
docker compose exec -T db pg_restore -U maktabatna -d maktabatna --clean --if-exists /tmp/restore.dump
if ($LASTEXITCODE -ne 0) { throw "pg_restore reported errors (see above)." }
docker compose restart api
Write-Host "Restored. Phones pick up the restored data on their next sync."
