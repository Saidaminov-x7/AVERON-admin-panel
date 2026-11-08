import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const adminCss = readFileSync(resolve(root, 'src/index.css'), 'utf8');
const storefrontCss = readFileSync(resolve(root, '../AVERON_frontend/app/[locale]/globals.css'), 'utf8');

function tokenBlock(source, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return source.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`))?.[1] ?? '';
}

function tokenValue(block, name) {
  return block.match(new RegExp(`--${name}:\\s*([^;]+);`))?.[1].trim() ?? null;
}

const sharedTokens = ['radius-control', 'radius-xs', 'radius-sm', 'radius-md', 'radius-lg'];
const storefrontRoot = tokenBlock(storefrontCss, ':root');
const adminRoot = tokenBlock(adminCss, ':root');
const storefrontDark = tokenBlock(storefrontCss, ':root.dark');
const adminDark = tokenBlock(adminCss, '.dark');
const mismatches = [];

for (const name of sharedTokens) {
  const expected = tokenValue(storefrontRoot, name);
  const actual = tokenValue(adminRoot, name);
  if (actual !== expected) mismatches.push(`light --${name}: expected ${expected}, got ${actual}`);
  const darkExpected = tokenValue(storefrontDark, name) ?? expected;
  const darkActual = tokenValue(adminDark, name) ?? actual;
  if (darkActual !== darkExpected) mismatches.push(`dark --${name}: expected ${darkExpected}, got ${darkActual}`);
}

for (const [name, expected] of [['color-bg', '#111315'], ['color-surface', '#181b1f'], ['color-surface-soft', '#20242a']]) {
  if (tokenValue(adminDark, name) !== expected) mismatches.push(`dark --${name}: expected ${expected}, got ${tokenValue(adminDark, name)}`);
}

if (mismatches.length) {
  console.error(mismatches.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${sharedTokens.length} light/dark radius tokens and 3 dark palette tokens match storefront.`);
}
