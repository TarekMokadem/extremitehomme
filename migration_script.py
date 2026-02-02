"""
Script de migration de l'ancienne base MySQL vers Supabase PostgreSQL
Extrémités Homme - POS Migration

Usage:
    python migration_script.py

Ce script génère des fichiers SQL prêts à être exécutés dans Supabase.
"""

import re
import os
from datetime import datetime

# Configuration
INPUT_FILE = "DB extremite homme.sql"
OUTPUT_DIR = "migration_output"

# Créer le répertoire de sortie
os.makedirs(OUTPUT_DIR, exist_ok=True)

def escape_sql(value):
    """Échappe les apostrophes pour SQL"""
    if value is None:
        return None
    return str(value).replace("'", "''").replace("\\", "\\\\")

def parse_date(date_str):
    """Parse une date au format MySQL vers PostgreSQL"""
    if not date_str or date_str == 'NULL' or date_str == "'NULL'":
        return "NULL"
    
    date_str = date_str.strip().strip("'")
    
    if not date_str or date_str == '0000-00-00 00:00:00':
        return "NULL"
    
    try:
        # Format datetime MySQL
        if ' ' in date_str:
            return f"'{date_str}'"
        return f"'{date_str}'"
    except:
        return "NULL"

def parse_birthday(bday_str):
    """Parse les dates d'anniversaire (format variable)"""
    if not bday_str or bday_str.strip() == '':
        return "NULL"
    
    bday_str = bday_str.strip()
    
    # Différents formats possibles: dd/mm, dd/mm/yy, dd/mm/yyyy, dd.mm.yy
    parts = re.split(r'[/\.\-:]', bday_str)
    
    if len(parts) >= 2:
        try:
            day = int(parts[0])
            month = int(parts[1])
            
            if len(parts) >= 3:
                year = int(parts[2])
                if year < 100:
                    year = 1900 + year if year > 50 else 2000 + year
            else:
                # Pas d'année spécifiée - on utilise 2000 (année bissextile) 
                # pour éviter les problèmes avec le 29 février
                year = 2000
            
            # Validation de la date
            if 1 <= month <= 12 and 1 <= day <= 31:
                # Vérifier les jours par mois
                days_in_month = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
                
                # Année bissextile ?
                if (year % 4 == 0 and year % 100 != 0) or (year % 400 == 0):
                    days_in_month[1] = 29
                
                if day <= days_in_month[month - 1]:
                    return f"'{year:04d}-{month:02d}-{day:02d}'"
                else:
                    # Date invalide (ex: 29 février sur année non bissextile)
                    # On met le jour au max valide
                    day = days_in_month[month - 1]
                    return f"'{year:04d}-{month:02d}-{day:02d}'"
        except:
            pass
    
    return "NULL"

def extract_clients(content):
    """Extrait et transforme les données clients"""
    print("Extraction des clients...")
    
    # Trouver toutes les sections INSERT INTO `client`
    # Le dump peut avoir plusieurs INSERT statements
    all_inserts = re.findall(
        r"INSERT INTO `client`[^;]+;",
        content,
        re.DOTALL
    )
    
    if not all_inserts:
        print("Section clients non trouvée!")
        return []
    
    print(f"  -> {len(all_inserts)} blocs INSERT trouvés")
    
    clients = []
    
    for insert_block in all_inserts:
        # Pattern pour chaque ligne de valeurs - gère les apostrophes échappées
        # Format: (id, numcli, 'nom', 'prenom', 'adresse', 'ville', 'cp', 'tel_1', 'tel_2', 'email', 'anniversaire', 'commentaire', 'created_at', 'updated_at', magasin_id, actif, number)
        
        # Utiliser un pattern plus flexible
        lines = insert_block.split('\n')
        for line in lines:
            # Matcher les tuples de valeurs
            if line.strip().startswith('(') and ',' in line:
                # Extraire les valeurs entre parenthèses
                tuple_match = re.search(r'\(([^;]+)\)', line)
                if tuple_match:
                    values_str = tuple_match.group(1)
                    
                    # Parser les valeurs manuellement
                    try:
                        # Split par virgule mais respecter les strings
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
                            
                            if char == "'" and not escape_next:
                                in_string = not in_string
                                current += char
                            elif char == ',' and not in_string:
                                values.append(current.strip())
                                current = ""
                            else:
                                current += char
                        
                        if len(values) >= 16:
                            old_id = int(values[0])
                            numcli = values[1]
                            nom = values[2].strip("'").replace("''", "'")
                            prenom = values[3].strip("'").replace("''", "'")
                            adresse = values[4].strip("'").replace("''", "'")
                            ville = values[5].strip("'").replace("''", "'")
                            cp = values[6].strip("'").replace("''", "'")
                            tel1 = values[7].strip("'").replace("''", "'")
                            tel2 = values[8].strip("'").replace("''", "'")
                            email = values[9].strip("'").replace("''", "'")
                            anniversaire = values[10].strip("'").replace("''", "'")
                            commentaire = values[11].strip("'").replace("''", "'") if len(values) > 11 else ""
                            created_at = parse_date(values[12].strip("'")) if len(values) > 12 else "NULL"
                            updated_at = parse_date(values[13].strip("'")) if len(values) > 13 else "NULL"
                            
                            clients.append({
                                'old_id': old_id,
                                'first_name': escape_sql(prenom),
                                'last_name': escape_sql(nom),
                                'phone': escape_sql(tel1),
                                'phone2': escape_sql(tel2),
                                'email': escape_sql(email),
                                'address': escape_sql(adresse),
                                'city': escape_sql(ville),
                                'postal_code': escape_sql(cp),
                                'birth_date': parse_birthday(anniversaire),
                                'notes': escape_sql(commentaire),
                                'created_at': created_at,
                                'updated_at': updated_at
                            })
                    except Exception as e:
                        pass  # Skip malformed lines
    
    print(f"  -> {len(clients)} clients extraits")
    return clients

def extract_articles(content):
    """Extrait les articles (services)"""
    print("Extraction des articles (services)...")
    
    pattern = r"\((\d+),\s*(\d+),\s*'([^']*)',\s*([^,]*),\s*'([^']*)',"
    
    article_section = re.search(
        r"INSERT INTO `articles`[^;]+;",
        content,
        re.DOTALL
    )
    
    if not article_section:
        print("Section articles non trouvée!")
        return []
    
    # Pattern plus précis pour les articles
    values_pattern = r"\((\d+),\s*(\d+),\s*'([^']*)',\s*([^,]*),\s*'([^']*)',\s*([^,]*),\s*([^,]*),\s*(\d+),\s*(\d+)\)"
    
    matches = re.findall(values_pattern, article_section.group())
    
    print(f"  -> {len(matches)} articles trouvés")
    
    articles = []
    for m in matches:
        old_id = int(m[0])
        code = int(m[1])
        libelle = escape_sql(m[2])
        prix = m[3].strip()
        categorie = escape_sql(m[4])
        actif = int(m[8])
        
        # Parser le prix
        try:
            prix_val = float(prix) if prix and prix != 'NULL' else 0
        except:
            prix_val = 0
        
        articles.append({
            'old_id': old_id,
            'code': str(code),
            'name': libelle,
            'price_ttc': prix_val,
            'category': categorie,
            'is_active': actif == 1
        })
    
    return articles

def extract_tickets(content):
    """Extrait les tickets (ventes)"""
    print("Extraction des tickets (ventes)...")
    
    # Trouver toutes les sections INSERT INTO `ticket`
    all_inserts = re.findall(
        r"INSERT INTO `ticket`[^;]+;",
        content,
        re.DOTALL
    )
    
    if not all_inserts:
        print("Section tickets non trouvée!")
        return []
    
    print(f"  -> {len(all_inserts)} blocs INSERT trouvés")
    
    tickets = []
    
    for insert_block in all_inserts:
        # Pattern: (id, 'date', 'heure', numero, client_id, magasin_id, planning_id)
        values_pattern = r"\((\d+),\s*'([^']*)',\s*'([^']*)',\s*(\d+),\s*(\d+|NULL),\s*(\d+|NULL),\s*(\d+|NULL)\)"
        
        matches = re.findall(values_pattern, insert_block)
        
        for m in matches:
            try:
                old_id = int(m[0])
                date = m[1]
                heure = m[2]
                numero = int(m[3])
                client_id = int(m[4]) if m[4] != 'NULL' else None
                
                tickets.append({
                    'old_id': old_id,
                    'date': date,
                    'heure': heure,
                    'numero': numero,
                    'client_id': client_id
                })
            except:
                pass
    
    print(f"  -> {len(tickets)} tickets extraits")
    return tickets

def extract_ligne_tickets(content):
    """Extrait les lignes de tickets"""
    print("Extraction des lignes de tickets...")
    
    # Trouver toutes les sections INSERT INTO `ligne_ticket`
    all_inserts = re.findall(
        r"INSERT INTO `ligne_ticket`[^;]+;",
        content,
        re.DOTALL
    )
    
    if not all_inserts:
        print("Section ligne_ticket non trouvée!")
        return []
    
    print(f"  -> {len(all_inserts)} blocs INSERT trouvés")
    
    # Pattern: (id, ticket_id, employe_id, article_id, produits_id, grilles_valeurs_id, article_prix, article_prix_remise, type_promotion_id, montant_promotion, date_retour, quantite, montant_retour)
    values_pattern = r"\((\d+),\s*(\d+),\s*(\d+),\s*(-?\d+),\s*(\d+|NULL),\s*(\d+|NULL),\s*([^,]+),\s*([^,]+),\s*(\d+|NULL),\s*([^,]+),\s*([^,]+),\s*([^,]+),\s*([^)]+)\)"
    
    lignes = []
    for insert_block in all_inserts:
        matches = re.findall(values_pattern, insert_block)
        
        for m in matches:
            try:
                old_id = int(m[0])
                ticket_id = int(m[1])
                employe_id = int(m[2])
                article_id = int(m[3])
                produit_id = int(m[4]) if m[4] != 'NULL' else None
                prix = float(m[6]) if m[6] != 'NULL' else 0
                quantite = float(m[11].strip()) if m[11].strip() != 'NULL' else 1
                
                lignes.append({
                    'old_id': old_id,
                    'ticket_id': ticket_id,
                    'employe_id': employe_id,
                    'article_id': article_id,
                    'produit_id': produit_id,
                    'prix': prix,
                    'quantite': quantite
                })
            except Exception as e:
                pass  # Skip malformed entries
    
    print(f"  -> {len(lignes)} lignes extraites")
    return lignes

def extract_paiements(content):
    """Extrait les paiements"""
    print("Extraction des paiements...")
    
    # Trouver toutes les sections INSERT INTO `paiement_ticket`
    all_inserts = re.findall(
        r"INSERT INTO `paiement_ticket`[^;]+;",
        content,
        re.DOTALL
    )
    
    if not all_inserts:
        print("Section paiement_ticket non trouvée!")
        return []
    
    print(f"  -> {len(all_inserts)} blocs INSERT trouvés")
    
    values_pattern = r"\((\d+),\s*(\d+),\s*(\d+),\s*([^,]+),\s*([^,]+),\s*(\d+)\)"
    
    # Mapping des modes de paiement
    payment_methods = {
        '1': 'cash',       # Espèces
        '2': 'card',       # CB
        '3': 'other',      # Gratuit
        '4': 'check',      # Chèque
        '5': 'card',       # Amex
        '6': 'contactless', # Sans contact
        '7': 'gift_card',  # Chèques cadeau
        '8': 'other'       # Bons ArtiCom
    }
    
    paiements = []
    for insert_block in all_inserts:
        matches = re.findall(values_pattern, insert_block)
        
        for m in matches:
            try:
                old_id = int(m[0])
                ticket_id = int(m[1])
                mode_id = m[2]
                montant = float(m[3]) if m[3] != 'NULL' else 0
                
                paiements.append({
                    'old_id': old_id,
                    'ticket_id': ticket_id,
                    'method': payment_methods.get(mode_id, 'other'),
                    'amount': montant
                })
            except:
                pass
    
    print(f"  -> {len(paiements)} paiements extraits")
    return paiements

def generate_clients_sql(clients):
    """Génère le SQL pour les clients"""
    print("Génération du SQL clients...")
    
    sql = """-- Migration des clients
-- Généré automatiquement

-- Ajouter colonne temporaire pour le mapping
ALTER TABLE clients ADD COLUMN IF NOT EXISTS old_mysql_id BIGINT;

-- Insertion des clients
INSERT INTO clients (id, first_name, last_name, phone, phone2, email, address, city, postal_code, birth_date, notes, loyalty_points, total_spent, visit_count, created_at, updated_at, old_mysql_id)
VALUES
"""
    
    lines = []
    for c in clients:
        birth_date = c['birth_date']
        created_at = c['created_at'] if c['created_at'] != 'NULL' else 'NOW()'
        updated_at = c['updated_at'] if c['updated_at'] != 'NULL' else 'NOW()'
        
        line = f"(gen_random_uuid(), '{c['first_name']}', '{c['last_name']}', '{c['phone']}', '{c['phone2']}', '{c['email']}', '{c['address']}', '{c['city']}', '{c['postal_code']}', {birth_date}, '{c['notes']}', 0, 0, 0, {created_at}, {updated_at}, {c['old_id']})"
        lines.append(line)
    
    sql += ",\n".join(lines)
    sql += "\nON CONFLICT DO NOTHING;\n"
    
    sql += """
-- Créer la table de mapping
CREATE TABLE IF NOT EXISTS migration_client_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL
);

TRUNCATE TABLE migration_client_mapping;

INSERT INTO migration_client_mapping (old_id, new_id)
SELECT old_mysql_id, id FROM clients WHERE old_mysql_id IS NOT NULL;

-- Vérification
SELECT 'Clients migrés:' as info, COUNT(*) as total FROM clients;
SELECT 'Mapping créé:' as info, COUNT(*) as total FROM migration_client_mapping;
"""
    
    return sql

def generate_products_sql(articles):
    """Génère le SQL pour les produits/services"""
    print("Génération du SQL produits...")
    
    sql = """-- Migration des articles (services)
-- Généré automatiquement

-- Ajouter colonne temporaire pour le mapping
ALTER TABLE products ADD COLUMN IF NOT EXISTS old_mysql_id BIGINT;

-- Mapping des catégories
-- On utilise la catégorie "Coupe" par défaut pour les services

-- Note: price_ttc est une colonne générée, on ne l'inclut pas

-- Insertion des services
INSERT INTO products (id, code, name, type, category_id, price_ht, tva_rate, is_active, old_mysql_id)
VALUES
"""
    
    lines = []
    for a in articles:
        # Calculer HT depuis TTC (TVA 20%)
        price_ttc = a['price_ttc']
        price_ht = round(price_ttc / 1.20, 2)
        tva_rate = 0.20  # Format décimal (0.20 = 20%)
        
        is_active = 'true' if a['is_active'] else 'false'
        
        # Ne pas inclure price_ttc car c'est une colonne générée
        line = f"(gen_random_uuid(), '{a['code']}', '{a['name']}', 'service', (SELECT id FROM categories WHERE slug = 'coupe' LIMIT 1), {price_ht}, {tva_rate}, {is_active}, {a['old_id']})"
        lines.append(line)
    
    sql += ",\n".join(lines)
    sql += "\nON CONFLICT DO NOTHING;\n"
    
    sql += """
-- Créer la table de mapping
CREATE TABLE IF NOT EXISTS migration_product_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL,
    is_article BOOLEAN DEFAULT true
);

TRUNCATE TABLE migration_product_mapping;

INSERT INTO migration_product_mapping (old_id, new_id, is_article)
SELECT old_mysql_id, id, true FROM products WHERE old_mysql_id IS NOT NULL;

-- Vérification
SELECT 'Produits/Services migrés:' as info, COUNT(*) as total FROM products;
"""
    
    return sql

def generate_sales_sql(tickets, paiements, lignes, output_dir):
    """Génère le SQL pour les ventes par batch"""
    print("Génération du SQL ventes...")
    
    # Calculer les totaux par ticket
    ticket_totals = {}
    for l in lignes:
        tid = l['ticket_id']
        if tid not in ticket_totals:
            ticket_totals[tid] = 0
        ticket_totals[tid] += l['prix'] * l['quantite']
    
    # Premier vendeur par ticket
    ticket_vendors = {}
    for l in lignes:
        tid = l['ticket_id']
        if tid not in ticket_vendors:
            ticket_vendors[tid] = l['employe_id']
    
    BATCH_SIZE = 500
    num_batches = (len(tickets) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"  -> Génération de {num_batches} fichiers batch pour {len(tickets)} ventes")
    
    for batch_num in range(num_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min((batch_num + 1) * BATCH_SIZE, len(tickets))
        batch_tickets = tickets[start_idx:end_idx]
        
        sql = f"""-- Migration des ventes (tickets) - Batch {batch_num + 1}/{num_batches}
-- Généré automatiquement
-- Tickets {start_idx + 1} à {end_idx}

"""
        
        if batch_num == 0:
            sql += """-- Ajouter colonne temporaire pour le mapping
ALTER TABLE sales ADD COLUMN IF NOT EXISTS old_mysql_id BIGINT;

-- Créer la table de mapping
CREATE TABLE IF NOT EXISTS migration_sale_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL
);

"""
        
        sql += """-- Insertion des ventes
INSERT INTO sales (id, ticket_number, vendor_id, client_id, subtotal_ht, total_tva, subtotal_ttc, total, status, created_at, old_mysql_id)
VALUES
"""
        
        lines = []
        for t in batch_tickets:
            total = ticket_totals.get(t['old_id'], 0)
            total_ht = round(total / 1.20, 2)
            total_tva = round(total - total_ht, 2)
            
            vendor_old_id = ticket_vendors.get(t['old_id'], 1)
            
            # Format ticket number: T-YYYYMMDD-XXXX
            date_part = t['date'].replace('-', '').split(' ')[0] if t['date'] else '20180101'
            ticket_num = f"T-{date_part}-{t['numero']:04d}"
            
            # Client - use COALESCE to handle missing mappings
            if t['client_id']:
                client_id = f"(SELECT new_id FROM migration_client_mapping WHERE old_id = {t['client_id']})"
            else:
                client_id = "NULL"
            
            # Vendor - use COALESCE with fallback
            vendor_id = f"COALESCE((SELECT new_id FROM migration_vendor_mapping WHERE old_id = {vendor_old_id}), (SELECT id FROM vendors LIMIT 1))"
            
            # Date/heure
            created_at = f"'{t['date']}'" if t['date'] else 'NOW()'
            
            line = f"(gen_random_uuid(), '{ticket_num}', {vendor_id}, {client_id}, {total_ht}, {total_tva}, {total}, {total}, 'completed', {created_at}, {t['old_id']})"
            lines.append(line)
        
        sql += ",\n".join(lines)
        sql += "\nON CONFLICT DO NOTHING;\n"
        
        sql += """
-- Mettre à jour le mapping
INSERT INTO migration_sale_mapping (old_id, new_id)
SELECT old_mysql_id, id FROM sales WHERE old_mysql_id IS NOT NULL
ON CONFLICT DO NOTHING;
"""
        
        if batch_num == num_batches - 1:
            sql += """
-- Vérification finale
SELECT 'Ventes migrées:' as info, COUNT(*) as total FROM sales;
SELECT 'Mapping créé:' as info, COUNT(*) as total FROM migration_sale_mapping;
"""
        
        # Écrire le fichier batch
        filename = f"03_sales_batch_{batch_num + 1:03d}.sql"
        with open(os.path.join(output_dir, filename), 'w', encoding='utf-8') as f:
            f.write(sql)
    
    return num_batches

def generate_sale_items_sql(lignes, output_dir):
    """Génère le SQL pour les lignes de ventes"""
    print("Génération du SQL sale_items...")
    
    BATCH_SIZE = 1000
    num_batches = (len(lignes) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"  -> Génération de {num_batches} fichiers batch pour {len(lignes)} lignes")
    
    for batch_num in range(num_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min((batch_num + 1) * BATCH_SIZE, len(lignes))
        batch_lignes = lignes[start_idx:end_idx]
        
        sql = f"""-- Migration des lignes de ventes - Batch {batch_num + 1}/{num_batches}
-- Généré automatiquement
-- Lignes {start_idx + 1} à {end_idx}

-- Insertion des sale_items
INSERT INTO sale_items (id, sale_id, product_id, product_name, price_ht, tva_rate, quantity, subtotal_ht, tva, subtotal_ttc, vendor_id)
VALUES
"""
        
        lines = []
        for l in batch_lignes:
            prix_ttc = l['prix']
            prix_ht = round(prix_ttc / 1.20, 2)
            tva = round(prix_ttc - prix_ht, 2)
            quantite = int(l['quantite']) if l['quantite'] else 1
            subtotal_ht = round(prix_ht * quantite, 2)
            subtotal_tva = round(tva * quantite, 2)
            subtotal_ttc = round(prix_ttc * quantite, 2)
            
            # Sale ID
            sale_id = f"(SELECT new_id FROM migration_sale_mapping WHERE old_id = {l['ticket_id']})"
            
            # Product - priorité au produit physique, sinon article
            if l['produit_id']:
                product_id = f"COALESCE((SELECT new_id FROM migration_product_mapping WHERE old_id = {l['produit_id']} AND is_article = false), (SELECT id FROM products LIMIT 1))"
                product_name = "'Produit'"
            else:
                product_id = f"COALESCE((SELECT new_id FROM migration_product_mapping WHERE old_id = {abs(l['article_id'])}), (SELECT id FROM products LIMIT 1))"
                product_name = f"COALESCE((SELECT name FROM products WHERE id = (SELECT new_id FROM migration_product_mapping WHERE old_id = {abs(l['article_id'])})), 'Service')"
            
            # Vendor
            vendor_id = f"(SELECT new_id FROM migration_vendor_mapping WHERE old_id = {l['employe_id']})"
            
            line = f"(gen_random_uuid(), {sale_id}, {product_id}, {product_name}, {prix_ht}, 0.20, {quantite}, {subtotal_ht}, {subtotal_tva}, {subtotal_ttc}, {vendor_id})"
            lines.append(line)
        
        sql += ",\n".join(lines)
        sql += "\nON CONFLICT DO NOTHING;\n"
        
        if batch_num == num_batches - 1:
            sql += """
-- Vérification finale
SELECT 'Sale items migrés:' as info, COUNT(*) as total FROM sale_items;
"""
        
        filename = f"04_sale_items_batch_{batch_num + 1:03d}.sql"
        with open(os.path.join(output_dir, filename), 'w', encoding='utf-8') as f:
            f.write(sql)
    
    return num_batches

def generate_payments_sql(paiements, output_dir):
    """Génère le SQL pour les paiements"""
    print("Génération du SQL payments...")
    
    BATCH_SIZE = 1000
    num_batches = (len(paiements) + BATCH_SIZE - 1) // BATCH_SIZE
    
    print(f"  -> Génération de {num_batches} fichiers batch pour {len(paiements)} paiements")
    
    for batch_num in range(num_batches):
        start_idx = batch_num * BATCH_SIZE
        end_idx = min((batch_num + 1) * BATCH_SIZE, len(paiements))
        batch_paiements = paiements[start_idx:end_idx]
        
        sql = f"""-- Migration des paiements - Batch {batch_num + 1}/{num_batches}
-- Généré automatiquement
-- Paiements {start_idx + 1} à {end_idx}

-- Insertion des paiements
INSERT INTO payments (id, sale_id, method, amount)
VALUES
"""
        
        lines = []
        for p in batch_paiements:
            sale_id = f"(SELECT new_id FROM migration_sale_mapping WHERE old_id = {p['ticket_id']})"
            method = p['method']
            amount = p['amount']
            
            line = f"(gen_random_uuid(), {sale_id}, '{method}', {amount})"
            lines.append(line)
        
        sql += ",\n".join(lines)
        sql += "\nON CONFLICT DO NOTHING;\n"
        
        if batch_num == num_batches - 1:
            sql += """
-- Vérification finale
SELECT 'Paiements migrés:' as info, COUNT(*) as total FROM payments;
"""
        
        filename = f"05_payments_batch_{batch_num + 1:03d}.sql"
        with open(os.path.join(output_dir, filename), 'w', encoding='utf-8') as f:
            f.write(sql)
    
    return num_batches

def main():
    print("=" * 60)
    print("Migration Extrémités Homme - MySQL vers Supabase")
    print("=" * 60)
    
    # Lire le fichier MySQL dump
    print(f"\nLecture de {INPUT_FILE}...")
    
    try:
        # Essayer différents encodages
        for encoding in ['utf-8', 'latin-1', 'cp1252']:
            try:
                with open(INPUT_FILE, 'r', encoding=encoding) as f:
                    content = f.read()
                print(f"  -> Fichier lu avec encodage {encoding}")
                break
            except UnicodeDecodeError:
                continue
    except FileNotFoundError:
        print(f"ERREUR: Fichier {INPUT_FILE} non trouvé!")
        return
    
    print(f"  -> Taille: {len(content):,} caractères")
    
    # Extraire les données
    clients = extract_clients(content)
    articles = extract_articles(content)
    tickets = extract_tickets(content)
    lignes = extract_ligne_tickets(content)
    paiements = extract_paiements(content)
    
    # Générer les fichiers SQL
    print("\n" + "=" * 60)
    print("Génération des fichiers SQL...")
    print("=" * 60)
    
    # Clients
    clients_sql = generate_clients_sql(clients)
    with open(os.path.join(OUTPUT_DIR, "01_clients.sql"), 'w', encoding='utf-8') as f:
        f.write(clients_sql)
    print(f"  -> {OUTPUT_DIR}/01_clients.sql")
    
    # Products (articles)
    products_sql = generate_products_sql(articles)
    with open(os.path.join(OUTPUT_DIR, "02_products.sql"), 'w', encoding='utf-8') as f:
        f.write(products_sql)
    print(f"  -> {OUTPUT_DIR}/02_products.sql")
    
    # Sales (par batch)
    num_sales_batches = generate_sales_sql(tickets, paiements, lignes, OUTPUT_DIR)
    print(f"  -> {OUTPUT_DIR}/03_sales_batch_*.sql ({num_sales_batches} fichiers)")
    
    # Sale Items (par batch)
    num_items_batches = generate_sale_items_sql(lignes, OUTPUT_DIR)
    print(f"  -> {OUTPUT_DIR}/04_sale_items_batch_*.sql ({num_items_batches} fichiers)")
    
    # Payments (par batch)
    num_payments_batches = generate_payments_sql(paiements, OUTPUT_DIR)
    print(f"  -> {OUTPUT_DIR}/05_payments_batch_*.sql ({num_payments_batches} fichiers)")
    
    print("\n" + "=" * 60)
    print("RÉSUMÉ")
    print("=" * 60)
    print(f"  Clients:  {len(clients):,}")
    print(f"  Articles: {len(articles):,}")
    print(f"  Tickets:  {len(tickets):,}")
    print(f"  Lignes:   {len(lignes):,}")
    print(f"  Paiements: {len(paiements):,}")
    
    print("\n" + "=" * 60)
    print("INSTRUCTIONS")
    print("=" * 60)
    print(f"""
1. Exécutez d'abord les scripts de préparation (dans Supabase SQL Editor):
   - MIGRATION-01-VENDORS.sql
   - MIGRATION-02-CATEGORIES.sql

2. Puis exécutez les fichiers générés DANS L'ORDRE:
   a) migration_output/01_clients.sql
   b) migration_output/02_products.sql
   c) migration_output/03_sales_batch_*.sql ({num_sales_batches} fichiers)
   d) migration_output/04_sale_items_batch_*.sql ({num_items_batches} fichiers)
   e) migration_output/05_payments_batch_*.sql ({num_payments_batches} fichiers)

3. Vérifiez les données migrées dans Supabase

4. Nettoyage (une fois la migration validée):
   ALTER TABLE clients DROP COLUMN IF EXISTS old_mysql_id;
   ALTER TABLE products DROP COLUMN IF EXISTS old_mysql_id;
   ALTER TABLE sales DROP COLUMN IF EXISTS old_mysql_id;
   DROP TABLE IF EXISTS migration_client_mapping;
   DROP TABLE IF EXISTS migration_vendor_mapping;
   DROP TABLE IF EXISTS migration_category_mapping;
   DROP TABLE IF EXISTS migration_product_mapping;
   DROP TABLE IF EXISTS migration_sale_mapping;
""")

if __name__ == "__main__":
    main()
