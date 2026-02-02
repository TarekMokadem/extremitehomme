# ============================================================
# Script PowerShell pour combiner les fichiers de migration
# Extrémités Homme - Migration MySQL vers Supabase
# ============================================================

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Combinaison des fichiers de migration" -ForegroundColor Cyan  
Write-Host "============================================================" -ForegroundColor Cyan

$outputDir = "migration_output"
$combinedDir = "migration_combined"

# Créer le répertoire de sortie
if (-not (Test-Path $combinedDir)) {
    New-Item -ItemType Directory -Path $combinedDir | Out-Null
}

# Fonction pour combiner les fichiers
function Combine-Files {
    param (
        [string]$pattern,
        [string]$outputFile
    )
    
    $files = Get-ChildItem -Path $outputDir -Filter $pattern | Sort-Object Name
    
    if ($files.Count -eq 0) {
        Write-Host "  Aucun fichier trouvé pour $pattern" -ForegroundColor Yellow
        return 0
    }
    
    Write-Host "  Combinaison de $($files.Count) fichiers -> $outputFile"
    
    $content = @()
    foreach ($file in $files) {
        $content += "-- ====== Source: $($file.Name) ======"
        $content += Get-Content $file.FullName -Encoding UTF8
        $content += ""
    }
    
    $content | Out-File -FilePath "$combinedDir\$outputFile" -Encoding UTF8
    
    return $files.Count
}

Write-Host ""
Write-Host "1. Copie des fichiers individuels..." -ForegroundColor Green

# Copier les fichiers individuels
Copy-Item "$outputDir\01_clients.sql" "$combinedDir\01_clients.sql" -Force
Write-Host "   -> 01_clients.sql"

Copy-Item "$outputDir\02_products.sql" "$combinedDir\02_products.sql" -Force
Write-Host "   -> 02_products.sql"

Write-Host ""
Write-Host "2. Combinaison des fichiers batch..." -ForegroundColor Green

# Combiner les ventes
$salesCount = Combine-Files -pattern "03_sales_batch_*.sql" -outputFile "03_sales_combined.sql"

# Combiner les sale_items
$itemsCount = Combine-Files -pattern "04_sale_items_batch_*.sql" -outputFile "04_sale_items_combined.sql"

# Combiner les paiements
$paymentsCount = Combine-Files -pattern "05_payments_batch_*.sql" -outputFile "05_payments_combined.sql"

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "RÉSUMÉ" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Fichiers créés dans $combinedDir :"
Write-Host "  - 01_clients.sql"
Write-Host "  - 02_products.sql"
Write-Host "  - 03_sales_combined.sql ($salesCount fichiers combinés)"
Write-Host "  - 04_sale_items_combined.sql ($itemsCount fichiers combinés)"
Write-Host "  - 05_payments_combined.sql ($paymentsCount fichiers combinés)"
Write-Host ""
Write-Host "ORDRE D'EXÉCUTION DANS SUPABASE:" -ForegroundColor Yellow
Write-Host "  1. MIGRATION-01-VENDORS.sql"
Write-Host "  2. MIGRATION-02-CATEGORIES.sql"
Write-Host "  3. migration_combined/01_clients.sql"
Write-Host "  4. migration_combined/02_products.sql"
Write-Host "  5. migration_combined/03_sales_combined.sql"
Write-Host "  6. migration_combined/04_sale_items_combined.sql"
Write-Host "  7. migration_combined/05_payments_combined.sql"
Write-Host ""
Write-Host "ATTENTION: Les fichiers combinés peuvent être volumineux!" -ForegroundColor Red
Write-Host "Si Supabase timeout, exécutez les fichiers batch individuellement." -ForegroundColor Red
