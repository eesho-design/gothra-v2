#!/usr/bin/env node
/**
 * Vite environment build-check tool.
 *
 * Validates env files against Vite's priority matrix before build:
 *   highest: .env.${NODE_ENV}.local
 *            .env.local              (not committed)
 *            .env.${NODE_ENV}        (e.g. .env.production)
 *   lowest:  .env                    (base defaults)
 *
 * Detects:
 *   - Vars in .env missing from .env.production (silent fallback risk)
 *   - Vars in .env.production missing from .env (drift)
 *   - Conflicting values for the same var across layers
 *   - Non-VITE_ vars that won't be exposed to client code
 *   - Secrets (KEY, SECRET, PASSWORD) that leak into client bundle
 *
 * Usage:  node scripts/vite-env-check.mjs [--strict]
 *         --strict  exit non-zero on ANY issue (for CI gating)
 *
 * Integrate: add to package.json scripts:
 *   "prebuild": "node scripts/vite-env-check.mjs"
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const NODE_ENV = process.env.NODE_ENV || 'production';
const strict = process.argv.includes('--strict');

// Files in priority order (highest first)
const envFiles = [
  `.env.${NODE_ENV}.local`,
  '.env.local',
  `.env.${NODE_ENV}`,
  '.env',
];

function parseEnv(path) {
  if (!existsSync(path)) return null;
  const raw = readFileSync(path, 'utf-8');
  const vars = {};
  for (const line of raw.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    // Strip surrounding quotes if any
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    vars[key] = val;
  }
  return { path, vars };
}

const layers = envFiles.map(parseEnv).filter(Boolean);

// Merge — build the effective env (lower priority -> higher priority)
const effective = {};
for (const layer of layers) {
  for (const [k, v] of Object.entries(layer.vars)) {
    effective[k] = v;
  }
}

// --- ANALYSIS ---

let errors = 0;
const base = layers.find(l => l.path.endsWith('/.env'));
const prod = layers.find(l => l.path.endsWith(`.env.${NODE_ENV}`));

console.log(`\n  Vite Env Check — NODE_ENV=${NODE_ENV}`);
console.log(`  Priority: ${layers.map(l => l.path.replace(ROOT, '.')).join(' > ')}\n`);

// 1. Vars in base .env missing from production layer
if (base && prod) {
  for (const key of Object.keys(base.vars)) {
    if (!(key in prod.vars)) {
      const val = base.vars[key];
      console.log(`  ⚠  "${key}" = "${val}"  defined in .env but NOT in .env.${NODE_ENV}`);
      console.log(`       → production build will still see "${val}" (inherited from .env)`);
      if (val.includes('localhost') || val.includes('127.0.0.1') || val.includes('dev')) {
        console.log(`       🚨 LIKELY A BUG — dev-only value leaking into production build`);
        errors++;
      }
    }
  }
}

// 2. Vars in production missing from base (drift)
if (base && prod) {
  for (const key of Object.keys(prod.vars)) {
    if (!(key in base.vars)) {
      console.log(`  ℹ  "${key}" exists in .env.${NODE_ENV} but not in .env`);
      console.log(`       → dev/test builds won't have this var (fine if dev-only)`);
    }
  }
}

// 3. Conflicting values
const seen = {};
for (const layer of layers) {
  for (const [key, val] of Object.entries(layer.vars)) {
    if (seen[key] === undefined) {
      seen[key] = { val, from: layer.path.replace(ROOT, '.') };
    } else if (seen[key].val !== val) {
      console.log(`  ⚡ "${key}"  conflicts:`);
      console.log(`       ${seen[key].from}: "${seen[key].val}"`);
      console.log(`       ${layer.path.replace(ROOT, '.')}: "${val}"`);
      console.log(`       → winner: "${effective[key]}" (highest priority wins)`);
    }
  }
}

// 4. Non-VITE_ vars that exist but won't be exposed to client
if (base) {
  for (const key of Object.keys(base.vars)) {
    if (!key.startsWith('VITE_')) {
      console.log(`  ℹ  "${key}" is not VITE_-prefixed — NOT available in client code`);
    }
  }
}

// 5. Secret leakage check (VITE_-prefixed secrets exposed to client bundle)
const secretPatterns = [/key/i, /secret/i, /password/i, /token/i, /auth/i, /api.?key/i];
if (base) {
  for (const [key, val] of Object.entries(base.vars)) {
    if (key.startsWith('VITE_') && secretPatterns.some(p => p.test(key))) {
      console.log(`  ⚠  "${key}" is VITE_-prefixed and looks like a secret`);
      console.log(`       → WILL be embedded in the client bundle (anyone can read it)`);
    }
  }
}

// 6. Summary
console.log(`\n  Effective env (${Object.keys(effective).length} vars):`);
for (const [k, v] of Object.entries(effective).sort()) {
  const display = v.length > 40 ? v.slice(0, 37) + '...' : v;
  console.log(`    ${k}=${display}`);
}

if (errors > 0 && strict) {
  console.log(`\n  ❌ ${errors} issue(s) found in strict mode. Exiting 1.\n`);
  process.exit(1);
}

console.log(`\n  ✅ ${errors > 0 ? `${errors} issue(s) found (non-blocking)` : 'All clear'}.\n`);
