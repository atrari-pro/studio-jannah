#!/usr/bin/env node
/**
 * Copie minimale tarteaucitron.js → public/tarteaucitron (self-hébergé).
 */
import { cpSync, existsSync, mkdirSync, rmSync, copyFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pkgRoot = dirname(require.resolve("tarteaucitronjs/package.json"));
const dest = join(__dirname, "..", "public", "tarteaucitron");

if (!existsSync(pkgRoot)) {
  console.error("tarteaucitronjs introuvable — pnpm add tarteaucitronjs");
  process.exit(1);
}

rmSync(dest, { recursive: true, force: true });
mkdirSync(join(dest, "css"), { recursive: true });
mkdirSync(join(dest, "lang"), { recursive: true });

const files = [
  "tarteaucitron.js",
  "tarteaucitron.services.js",
  "css/tarteaucitron.css",
  "lang/tarteaucitron.fr.js",
];

for (const rel of files) {
  copyFileSync(join(pkgRoot, rel), join(dest, rel));
}

// Dossier css peut contenir plus — copie complète légère
cpSync(join(pkgRoot, "css"), join(dest, "css"), { recursive: true });
cpSync(join(pkgRoot, "lang"), join(dest, "lang"), { recursive: true });

console.log(`tarteaucitron copié → ${dest} (${files.length}+ assets)`);
