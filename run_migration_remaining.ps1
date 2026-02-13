# ============================================================
# Migration des données restantes (sans doublons)
# À exécuter après avoir déjà fait: 01_clients, 02_products, et
# une partie des 03_sales_batch (ex. 001 à 040).
# ============================================================
#
# 1. Modifiez ci-dessous votre URI Supabase (Settings > Database > Connection string > URI)
# 2. Indiquez le premier batch de ventes à exécuter (ex. 41 si vous avez fait 001 à 040)
# 3. Exécutez: powershell -ExecutionPolicy Bypass -File run_migration_remaining.ps1
# ============================================================

# --- CONFIGURATION (à adapter) ---
# Option A: URI avec mot de passe inclus
$DB_URI = "postgresql://postgres.[PROJECT_REF]:[MOT_DE_PASSE]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Option B: Utiliser des variables d'environnement (plus sûr)
# $env:PGPASSWORD = "votre_mot_de_passe"
# $DB_URI = "postgresql://postgres.[PROJECT_REF]@aws-0-eu-central-1.pooler.supabase.com:6543/postgres"

# Premier batch de ventes à exécuter (41 = exécuter 041 à 097 si vous avez déjà fait 001-040)
$FirstSalesBatch = 41
$LastSalesBatch = 97

# --- SCRIPT ---
$ErrorActionPreference = "Stop"
$ProjectRoot = $PSScriptRoot

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Migration restante - Extrémités Homme" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier que psql est disponible
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Host "ERREUR: psql introuvable. Installez PostgreSQL (https://www.postgresql.org/download/windows/)" -ForegroundColor Red
    exit 1
}

# 1. Batches ventes (041 à 097)
Write-Host "1. Exécution des batches ventes $FirstSalesBatch à $LastSalesBatch ..." -ForegroundColor Green
$count = 0
for ($i = $FirstSalesBatch; $i -le $LastSalesBatch; $i++) {
    $n = $i.ToString("000")
    $f = Join-Path $ProjectRoot "migration_output\03_sales_batch_$n.sql"
    if (Test-Path $f) {
        Write-Host "   -> 03_sales_batch_$n.sql"
        & psql $DB_URI -f $f 2>&1 | Out-Null
        if ($LASTEXITCODE -ne 0) {
            Write-Host "   Erreur sur $f (code $LASTEXITCODE)" -ForegroundColor Yellow
        }
        $count++
    }
}
Write-Host "   $count fichiers exécutés." -ForegroundColor Gray
Write-Host ""

# 2. Sale items
Write-Host "2. Exécution 04_sale_items_combined.sql ..." -ForegroundColor Green
$f = Join-Path $ProjectRoot "migration_combined\04_sale_items_combined.sql"
if (Test-Path $f) {
    & psql $DB_URI -f $f
    Write-Host "   Terminé." -ForegroundColor Gray
} else {
    Write-Host "   Fichier non trouvé." -ForegroundColor Yellow
}
Write-Host ""

# 3. Payments
Write-Host "3. Exécution 05_payments_combined.sql ..." -ForegroundColor Green
$f = Join-Path $ProjectRoot "migration_combined\05_payments_combined.sql"
if (Test-Path $f) {
    & psql $DB_URI -f $f
    Write-Host "   Terminé." -ForegroundColor Gray
} else {
    Write-Host "   Fichier non trouvé." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Migration terminée." -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
