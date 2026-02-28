#!/usr/bin/env node
/**
 * Script de migration - Exécute tous les fichiers SQL vers Supabase
 * Sans conflits (ON CONFLICT / idempotent).
 *
 * Prérequis: npm install pg dotenv
 * Config: créez .env.migration avec SUPABASE_DB_URI="postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres"
 *
 * Usage:
 *   node run-migrations.js              # Lance tout (prep + clients + products + sales + items + payments)
 *   node run-migrations.js --from sales # Déjà fait clients/products : commence aux ventes
 *   node run-migrations.js --dry-run    # Affiche les fichiers sans exécuter
 */

import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname);

// Charger dotenv si dispo (pour .env.migration ou .env)
try {
  const dotenv = await import('dotenv');
  if (existsSync(join(root, '.env.migration'))) {
    dotenv.config({ path: join(root, '.env.migration') });
  } else {
    dotenv.config();
  }
} catch (_) {}

const SUPABASE_DB_URI = process.env.SUPABASE_DB_URI || process.env.DATABASE_URL;

const STEPS = [
  { id: 'prep', label: 'Préparation (idempotent)', file: 'documentation/migrations/MIGRATION-PREP-IDEMPOTENT.sql' },
  { id: 'clients', label: 'Clients', file: 'documentation/migrations/combined/01_clients.sql' },
  { id: 'products', label: 'Produits', file: 'documentation/migrations/combined/02_products.sql' },
  { id: 'sales', label: 'Ventes', file: 'documentation/migrations/combined/03_sales_combined.sql' },
  { id: 'sale_items', label: 'Lignes de ventes', file: 'documentation/migrations/combined/04_sale_items_combined.sql' },
  { id: 'payments', label: 'Paiements', file: 'documentation/migrations/combined/05_payments_combined.sql' },
];

function parseArgs() {
  const args = process.argv.slice(2);
  let from = null;
  let dryRun = false;
  for (const a of args) {
    if (a === '--from' && args[args.indexOf(a) + 1]) {
      from = args[args.indexOf(a) + 1];
    } else if (a === '--dry-run') {
      dryRun = true;
    }
  }
  return { from, dryRun };
}

async function run() {
  const { from, dryRun } = parseArgs();

  if (!SUPABASE_DB_URI && !dryRun) {
    console.error('');
    console.error('❌ Variable d’environnement manquante: SUPABASE_DB_URI ou DATABASE_URL');
    console.error('');
    console.error('Créez un fichier .env.migration à la racine du projet avec:');
    console.error('  SUPABASE_DB_URI="postgresql://postgres:VOTRE_MOT_DE_PASSE@db.xxx.supabase.co:5432/postgres"');
    console.error('');
    console.error('(Supabase Dashboard → Settings → Database → Connection string → URI)');
    process.exit(1);
  }

  const pg = await import('pg');
  const client = dryRun ? null : new pg.default.Client({ connectionString: SUPABASE_DB_URI });

  if (!dryRun) {
    try {
      await client.connect();
    } catch (e) {
      console.error('❌ Connexion à la base impossible:', e.message);
      process.exit(1);
    }
  }

  let started = false;
  const stepIds = STEPS.map(s => s.id);
  const startIndex = from ? stepIds.indexOf(from) : 0;
  if (from && startIndex === -1) {
    console.error('❌ --from inconnu. Valeurs: ' + stepIds.join(', '));
    process.exit(1);
  }

  console.log('');
  console.log('========================================');
  console.log('  Migration Supabase - Extrémités Homme');
  console.log('========================================');
  if (dryRun) console.log('  (mode dry-run: aucun SQL exécuté)');
  console.log('');

  for (let i = startIndex; i < STEPS.length; i++) {
    const step = STEPS[i];
    const label = step.label || step.id;

    if (step.file) {
      const path = join(root, step.file);
      if (!existsSync(path)) {
        console.log(`⏭️  ${label}: fichier absent (${step.file})`);
        continue;
      }
      if (dryRun) {
        console.log(`📄 ${label}: ${step.file}`);
        continue;
      }
      const sql = readFileSync(path, 'utf8');
      console.log(`▶️  ${label}...`);
      try {
        await client.query(sql);
        console.log(`   ✅ OK`);
      } catch (e) {
        console.error(`   ❌ Erreur:`, e.message);
        await client.end();
        process.exit(1);
      }
      continue;
    }

    if (typeof step.files === 'function') {
      const files = step.files();
      if (dryRun) {
        console.log(`📄 ${label}: ${files.length} fichiers (${files[0]} … ${files[files.length - 1]})`);
        continue;
      }
      console.log(`▶️  ${label} (${files.length} fichiers)...`);
      let ok = 0, err = 0;
      for (const rel of files) {
        const path = join(root, rel);
        if (!existsSync(path)) continue;
        const sql = readFileSync(path, 'utf8');
        try {
          await client.query(sql);
          ok++;
          if (ok % 10 === 0) process.stdout.write(`   ${ok}/${files.length}\r`);
        } catch (e) {
          err++;
          console.error(`\n   ❌ ${rel}: ${e.message}`);
        }
      }
      console.log(`   ✅ ${ok} exécutés${err ? `, ❌ ${err} erreurs` : ''}`);
    }
  }

  if (!dryRun) {
    await client.end();
  }
  console.log('');
  console.log('========================================');
  console.log('  Migration terminée.');
  console.log('========================================');
  console.log('');
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
