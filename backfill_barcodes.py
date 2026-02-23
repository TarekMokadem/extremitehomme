"""
Script de backfill des codes-barres depuis l'ancienne base MySQL vers Supabase.

Extrait les codes-barres de:
  - produit_code_barre (produits_id, grilles_valeurs_id, code_barre)
  - stock (produits_id, grilles_valeurs_id, code_barre) — en complément

Pour les produits avec plusieurs variantes (ex. tailles), un seul code-barres
est assigné au produit (le premier par ordre alphabétique pour cohérence).

Usage:
    python backfill_barcodes.py

Génère: migration_output/backfill_barcodes.sql
À exécuter dans Supabase SQL Editor après la migration des produits.
"""

import re
import os
from collections import defaultdict

INPUT_FILE = "DB extremite homme.sql"
OUTPUT_DIR = "migration_output"
OUTPUT_FILE = os.path.join(OUTPUT_DIR, "backfill_barcodes.sql")


def _parse_value_row(values_str):
    """Parse une ligne de valeurs SQL (virgules, chaînes avec apostrophes)."""
    values = []
    current = ""
    in_string = False
    escape_next = False
    for char in values_str + ',':
        if escape_next:
            current += char
            escape_next = False
            continue
        if char == '\\':
            escape_next = True
            current += char
            continue
        if char == "'":
            in_string = not in_string
            current += char
        elif char == ',' and not in_string:
            values.append(current.strip())
            current = ""
        else:
            current += char
    return values


def escape_sql(value):
    """Échappe les apostrophes pour SQL."""
    if value is None:
        return None
    return str(value).replace("'", "''").replace("\\", "\\\\")


def extract_produit_code_barre(content):
    """Extrait (produits_id, code_barre) depuis produit_code_barre."""
    all_inserts = re.findall(
        r"INSERT INTO `produit_code_barre`[^;]+;",
        content,
        re.DOTALL
    )
    result = defaultdict(set)  # produits_id -> set of code_barre
    for insert_block in all_inserts:
        lines = insert_block.split('\n')
        for line in lines:
            if not line.strip().startswith('(') or ',' not in line:
                continue
            tuple_match = re.search(r'\(([^;]+)\)', line)
            if not tuple_match:
                continue
            try:
                values = _parse_value_row(tuple_match.group(1))
                if len(values) < 4:
                    continue
                produits_id = int(values[1])
                code_barre = values[3].strip().strip("'").replace("''", "'")
                if code_barre and code_barre != 'NULL':
                    result[produits_id].add(code_barre)
            except Exception:
                continue
    return result


def extract_stock_barcodes(content):
    """Extrait (produits_id, code_barre) depuis stock (en complément)."""
    all_inserts = re.findall(
        r"INSERT INTO `stock`[^;]+;",
        content,
        re.DOTALL
    )
    result = defaultdict(set)
    for insert_block in all_inserts:
        lines = insert_block.split('\n')
        for line in lines:
            if not line.strip().startswith('(') or ',' not in line:
                continue
            tuple_match = re.search(r'\(([^;]+)\)', line)
            if not tuple_match:
                continue
            try:
                values = _parse_value_row(tuple_match.group(1))
                # stock: id, produits_id, grilles_valeurs_id, quantite, magasin_id, code_barre, ...
                if len(values) < 6:
                    continue
                produits_id = int(values[1])
                code_barre = values[5].strip().strip("'").replace("''", "'")
                if code_barre and code_barre != 'NULL':
                    result[produits_id].add(code_barre)
            except Exception:
                continue
    return result


def main():
    print("Backfill des codes-barres - Extrémités Homme")
    print("=" * 50)

    if not os.path.exists(INPUT_FILE):
        print(f"Erreur: fichier {INPUT_FILE} introuvable.")
        return 1

    with open(INPUT_FILE, "r", encoding="utf-8", errors="replace") as f:
        content = f.read()

    # 1. Extraire produit_code_barre
    pcb = extract_produit_code_barre(content)
    print(f"produit_code_barre: {sum(len(v) for v in pcb.values())} codes pour {len(pcb)} produits")

    # 2. Extraire stock (complément)
    stock_bc = extract_stock_barcodes(content)
    print(f"stock: {sum(len(v) for v in stock_bc.values())} codes pour {len(stock_bc)} produits")

    # 3. Fusion: priorité à produit_code_barre, puis stock
    merged = dict(pcb)
    for pid, codes in stock_bc.items():
        merged[pid] = merged.get(pid, set()) | codes

    # 4. Un code par produit, sans doublon (contrainte unique sur barcode)
    # Si un code-barres apparaît pour plusieurs produits, on l'assigne au plus petit old_id
    used_barcodes = set()
    barcode_by_old_id = {}
    for pid in sorted(merged.keys()):
        for barcode in sorted(merged[pid]):
            if barcode not in used_barcodes:
                barcode_by_old_id[pid] = barcode
                used_barcodes.add(barcode)
                break

    skipped = len(merged) - len(barcode_by_old_id)
    if skipped:
        print(f"Conflits: {skipped} produits sans code (barcode deja assigne)")
    print(f"Total: {len(barcode_by_old_id)} produits avec code-barres uniques")

    # 5. Générer le SQL
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    lines = [
        "-- =====================================================",
        "-- Backfill des codes-barres (produits physiques)",
        "-- =====================================================",
        "-- Généré par backfill_barcodes.py",
        "-- À exécuter dans Supabase SQL Editor après migration des produits.",
        "-- Prérequis: colonne barcode sur products (PRODUCTS-BARCODE.sql)",
        "--           table migration_product_mapping",
        "-- =====================================================",
        "",
        "UPDATE products p",
        "SET barcode = sub.barcode",
        "FROM (",
        "  SELECT m.new_id, b.barcode",
        "  FROM (VALUES",
    ]

    # Valeurs (old_id, barcode)
    values = []
    for old_id in sorted(barcode_by_old_id.keys()):
        barcode = barcode_by_old_id[old_id]
        values.append(f"    ({old_id}::bigint, '{escape_sql(barcode)}')")
    lines.append(",\n".join(values))
    lines.extend([
        "  ) AS b(old_id, barcode)",
        "  JOIN migration_product_mapping m ON m.old_id = b.old_id AND m.is_article = false",
        ") AS sub",
        "WHERE p.id = sub.new_id;",
        "",
        f"SELECT 'Backfill terminé: ' || COUNT(*) || ' produits mis à jour' AS status",
        "FROM products WHERE barcode IS NOT NULL;",
    ])

    sql = "\n".join(lines)
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(sql)

    print(f"\nFichier généré: {OUTPUT_FILE}")
    print("Executer ce fichier dans Supabase SQL Editor.")
    return 0


if __name__ == "__main__":
    exit(main())
