#!/usr/bin/env node
/**
 * Database backup.
 *
 * Supabase's free tier has NO automatic backups, so during beta this is the
 * only thing standing between a farmer and losing their records. Run it on a
 * schedule (Task Scheduler on Windows, cron elsewhere).
 *
 *   npm run db:backup                 # the linked cloud project
 *   npm run db:backup -- --local      # local dev database
 *
 * Restore with:
 *   psql "<connection-string>" -f backups/<file>.sql
 *
 * A backup you have never restored is a hope, not a backup. Rehearse it.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, statSync, unlinkSync } from "node:fs";
import { join } from "node:path";

const BACKUP_DIR = "backups";
const KEEP = 14;

const useLocal = process.argv.includes("--local");
const LOCAL_DB_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

/** Delete all but the newest KEEP dumps, so the folder cannot grow forever. */
function pruneOldBackups() {
  const files = readdirSync(BACKUP_DIR)
    .filter((name) => name.endsWith(".sql"))
    .map((name) => ({ name, time: statSync(join(BACKUP_DIR, name)).mtimeMs }))
    .sort((a, b) => b.time - a.time);

  for (const file of files.slice(KEEP)) {
    unlinkSync(join(BACKUP_DIR, file.name));
    console.log(`  pruned ${file.name}`);
  }
}

function main() {
  mkdirSync(BACKUP_DIR, { recursive: true });

  const outFile = join(BACKUP_DIR, `layerflow-${timestamp()}.sql`);

  // --data-only would lose the schema; a full dump is what you can actually
  // restore from into an empty project.
  const args = ["supabase", "db", "dump", "-f", outFile];

  if (useLocal) {
    args.push("--db-url", LOCAL_DB_URL);
  } else if (process.env.SUPABASE_DB_URL) {
    args.push("--db-url", process.env.SUPABASE_DB_URL);
  } else {
    args.push("--linked");
  }

  console.log(`Backing up to ${outFile} ...`);

  try {
    execFileSync("npx", args, { stdio: "inherit", shell: process.platform === "win32" });
  } catch {
    console.error(
      "\nBackup failed.\n" +
        "  - local:  start the stack first (npm run db:start), then use --local\n" +
        "  - cloud:  npx supabase link --project-ref <ref>, or set SUPABASE_DB_URL\n"
    );
    process.exit(1);
  }

  const { size } = statSync(outFile);
  console.log(`Done: ${(size / 1024).toFixed(0)} KB`);

  pruneOldBackups();

  console.log(
    "\nThis file contains real farm data. Copy it somewhere that is not Supabase --\n" +
      "losing your provider and your only backup together is what ends a business."
  );
}

main();
