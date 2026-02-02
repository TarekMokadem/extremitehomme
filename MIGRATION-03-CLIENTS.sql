-- ============================================================
-- MIGRATION 03: Clients
-- Source: MySQL table `client`
-- Target: Supabase table `clients`
-- ============================================================

-- Table de mapping pour les clients
CREATE TABLE IF NOT EXISTS migration_client_mapping (
    old_id BIGINT PRIMARY KEY,
    new_id UUID NOT NULL
);

TRUNCATE TABLE migration_client_mapping;

-- ============================================================
-- INSTRUCTIONS DE MIGRATION
-- ============================================================
-- 
-- Le fichier MySQL contient environ 3853 clients.
-- Pour les migrer, vous devez:
--
-- 1. Extraire les INSERT de la table `client` du dump MySQL
-- 2. Transformer chaque ligne avec ce format:
--
-- MySQL format:
-- (id, numcli, nom, prenom, adresse, ville, cp, tel_1, tel_2, email, anniversaire, commentaire, created_at, updated_at, magasin_id, actif, number)
--
-- PostgreSQL format:
-- INSERT INTO clients (id, first_name, last_name, phone, phone2, email, address, city, postal_code, birth_date, notes, created_at, updated_at)
-- VALUES (gen_random_uuid(), 'Prenom', 'Nom', 'tel_1', 'tel_2', 'email', 'adresse', 'ville', 'cp', NULL, 'commentaire', 'created_at', 'updated_at');
--
-- ============================================================

-- Fonction pour parser les dates d'anniversaire (format variable: dd/mm, dd/mm/yy, dd/mm/yyyy)
CREATE OR REPLACE FUNCTION parse_birthday(birthday_str TEXT)
RETURNS DATE AS $$
DECLARE
    parts TEXT[];
    day_val INT;
    month_val INT;
    year_val INT;
BEGIN
    IF birthday_str IS NULL OR birthday_str = '' THEN
        RETURN NULL;
    END IF;
    
    -- Nettoyer les espaces
    birthday_str := TRIM(birthday_str);
    
    -- Essayer de parser différents formats
    -- Format: dd/mm/yyyy ou dd/mm/yy ou dd/mm
    parts := string_to_array(birthday_str, '/');
    
    IF array_length(parts, 1) >= 2 THEN
        BEGIN
            day_val := parts[1]::INT;
            month_val := parts[2]::INT;
            
            IF array_length(parts, 1) = 3 THEN
                year_val := parts[3]::INT;
                -- Si année sur 2 chiffres
                IF year_val < 100 THEN
                    IF year_val > 50 THEN
                        year_val := 1900 + year_val;
                    ELSE
                        year_val := 2000 + year_val;
                    END IF;
                END IF;
            ELSE
                -- Pas d'année, on met une année par défaut (1970)
                year_val := 1970;
            END IF;
            
            -- Validation basique
            IF day_val BETWEEN 1 AND 31 AND month_val BETWEEN 1 AND 12 THEN
                RETURN make_date(year_val, month_val, day_val);
            END IF;
        EXCEPTION WHEN OTHERS THEN
            RETURN NULL;
        END;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- INSERTION DES CLIENTS (Échantillon - Les 50 premiers)
-- À compléter avec tous les clients du dump
-- ============================================================

INSERT INTO clients (id, first_name, last_name, phone, phone2, email, address, city, postal_code, birth_date, notes, loyalty_points, total_spent, visit_count, created_at, updated_at)
VALUES 
(gen_random_uuid(), 'Christophe', 'Durteste', '0670809884', '', 'contact@cdurteste.fr', '1131 avenue du général De Gaulle', 'Bondues', '', parse_birthday('19/05'), '', 0, 0, 0, '2014-04-03 14:51:08', '2014-05-19 07:35:56'),
(gen_random_uuid(), 'Mathieu', 'Pollet', '0633301027', '', 'mathieupollet721@gmail.com', '', 'Linselles', '', parse_birthday('20/06/88'), '', 0, 0, 0, '2014-04-03 16:34:45', '2021-01-16 08:27:14'),
(gen_random_uuid(), 'Didier', 'Decarne', '0615411274', '', 'didierdecarne@gmail.com', '32b Alle De La Houblonniere', 'Bondues', '59910', parse_birthday('14/09/49'), '1 tamp 25', 0, 0, 0, '2014-04-04 07:10:26', '2018-12-11 08:38:28'),
(gen_random_uuid(), 'claude', 'papet', '0777378155', '0320231042', '', '426 domaine de la vigne', 'bondues', '59910', parse_birthday('27/08/38'), '', 0, 0, 0, '2014-04-04 07:45:34', '2014-04-04 07:45:34'),
(gen_random_uuid(), 'Olivier', 'Dubar', '', '', '', '3 Av Fosch', 'Mouvaux', '59420', NULL, '', 0, 0, 0, '2014-04-04 08:07:54', '2022-03-11 09:05:02'),
(gen_random_uuid(), 'Jean Luc', 'Vandame', '0644336804', '', '', '870 Domaine De La Vigne', 'Bondues', '59910', parse_birthday('30/10'), 'tampons 25 e ', 0, 0, 0, '2014-04-04 09:33:27', '2018-10-18 09:30:44'),
(gen_random_uuid(), 'octave', 'kwaterowski', '0617198032', '', '', '28 rue louis pasteur', 'bondues', '59910', NULL, '', 0, 0, 0, '2014-04-04 13:37:27', '2014-04-04 13:40:36'),
(gen_random_uuid(), 'Jean Eric', 'Bielle', '0687706623', '', '', '822 Domaine De La Vigne', 'Bondues', '59910', parse_birthday('03/11'), 'doit un tampon a 24', 0, 0, 0, '2014-04-04 13:43:27', '2016-01-13 10:33:19'),
(gen_random_uuid(), 'Olivier', 'Daniel', '0683287929', '', '', '475 Bois D Achelles', 'Bondues', '59910', NULL, 'doit 5 tampon a 25', 0, 0, 0, '2014-04-04 15:35:27', '2018-08-25 12:50:52'),
(gen_random_uuid(), 'Jean Pierre', 'Tonneau', '0608543026', '', '', '14 Pave Des Bois Blancs', 'Bondues', '59910', parse_birthday('25/11'), '', 0, 0, 0, '2014-04-04 17:08:31', '2019-07-05 16:38:07')
ON CONFLICT DO NOTHING;

-- ============================================================
-- SCRIPT PYTHON POUR GÉNÉRER TOUTES LES INSERTIONS
-- ============================================================
-- 
-- Créez un fichier Python pour transformer le dump MySQL:
--
-- ```python
-- import re
-- 
-- # Lire le fichier SQL
-- with open('DB extremite homme.sql', 'r', encoding='latin-1') as f:
--     content = f.read()
-- 
-- # Trouver toutes les insertions de clients
-- pattern = r"\((\d+), (\d+), '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', '([^']*)', ([^,]*), (\d+), ([^)]*)\)"
-- 
-- matches = re.findall(pattern, content)
-- 
-- with open('clients_insert.sql', 'w', encoding='utf-8') as out:
--     out.write("INSERT INTO clients (id, first_name, last_name, phone, phone2, email, address, city, postal_code, birth_date, notes, loyalty_points, total_spent, visit_count, created_at, updated_at) VALUES\n")
--     
--     for i, m in enumerate(matches):
--         old_id, numcli, nom, prenom, adresse, ville, cp, tel1, tel2, email, anniversaire, commentaire, created, updated, magasin, actif, number = m
--         
--         # Échapper les apostrophes
--         nom = nom.replace("'", "''")
--         prenom = prenom.replace("'", "''")
--         adresse = adresse.replace("'", "''")
--         commentaire = commentaire.replace("'", "''")
--         
--         birth_date = f"parse_birthday('{anniversaire}')" if anniversaire else "NULL"
--         
--         line = f"(gen_random_uuid(), '{prenom}', '{nom}', '{tel1}', '{tel2}', '{email}', '{adresse}', '{ville}', '{cp}', {birth_date}, '{commentaire}', 0, 0, 0, '{created}', '{updated}')"
--         
--         if i < len(matches) - 1:
--             out.write(line + ",\n")
--         else:
--             out.write(line + ";\n")
-- ```
-- 
-- ============================================================

-- Après insertion, créer le mapping (nécessaire pour les ventes)
-- Note: Cela nécessite de connaître les correspondances old_id -> new_id
-- Une approche: stocker temporairement l'ancien ID dans les notes ou créer une colonne temporaire

-- Alternative: Ajouter une colonne temporaire pour le mapping
ALTER TABLE clients ADD COLUMN IF NOT EXISTS old_mysql_id BIGINT;

-- Puis lors de l'insertion, inclure l'ancien ID:
-- INSERT INTO clients (..., old_mysql_id) VALUES (..., 77);

-- Et créer le mapping:
-- INSERT INTO migration_client_mapping (old_id, new_id)
-- SELECT old_mysql_id, id FROM clients WHERE old_mysql_id IS NOT NULL;

-- Vérification
SELECT 'Clients migrés:' as info, COUNT(*) as total FROM clients;
