// Runs the combat engine tests: bundles each src/services/combat/__tests__/*.test.ts
// with esbuild (resolving the @site alias and JSON imports), then hands the bundles
// to node's built-in test runner.
import { build } from 'esbuild';
import { spawnSync } from 'node:child_process';
import { readdirSync, rmSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const repoRoot = process.cwd();
const testsDir = path.join(repoRoot, 'src/services/combat/__tests__');
const outDir = path.join(repoRoot, 'node_modules/.cache/test-combat');

const testFiles = readdirSync(testsDir).filter((name) => name.endsWith('.test.ts'));

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

await build({
  entryPoints: testFiles.map((name) => path.join(testsDir, name)),
  outdir: outDir,
  outExtension: { '.js': '.mjs' },
  bundle: true,
  platform: 'node',
  format: 'esm',
  alias: { '@site': repoRoot },
  loader: { '.json': 'json' },
  logLevel: 'error',
});

const bundles = testFiles.map((name) => path.join(outDir, name.replace(/\.ts$/, '.mjs')));
const result = spawnSync(process.execPath, ['--test', ...bundles], { stdio: 'inherit', env: process.env });
process.exit(result.status ?? 1);
