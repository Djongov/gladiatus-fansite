#!/usr/bin/env node
/**
 * Copies the docs/ structure into i18n/pl/docusaurus-plugin-content-docs/current/
 * - Skips files that already exist (safe to re-run)
 * - Copies _category_.json files as stubs ready for translation
 * - Copies .md files as-is (English content as placeholder)
 *
 * Usage: node setup-pl-docs.js [--force]
 *   --force  Overwrite existing files
 */

const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, 'docs');
const DEST = path.join(__dirname, 'i18n', 'pl', 'docusaurus-plugin-content-docs', 'current');
const FORCE = process.argv.includes('--force');

let copied = 0;
let skipped = 0;
let dirs = 0;

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  dirs++;

  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.name.endsWith('.md') || entry.name === '_category_.json') {
      if (!FORCE && fs.existsSync(destPath)) {
        skipped++;
        continue;
      }
      fs.copyFileSync(srcPath, destPath);
      copied++;
    }
  }
}

console.log(`Source:      ${SRC}`);
console.log(`Destination: ${DEST}`);
console.log(`Mode:        ${FORCE ? 'overwrite (--force)' : 'skip existing'}\n`);

copyDir(SRC, DEST);

console.log(`Done!`);
console.log(`  Directories created: ${dirs}`);
console.log(`  Files copied:        ${copied}`);
console.log(`  Files skipped:       ${skipped}`);
console.log(`\nNext: translate files in:\n  i18n/pl/docusaurus-plugin-content-docs/current/`);
