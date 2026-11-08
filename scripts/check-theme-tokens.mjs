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

const sharedTokens = [
  'layout-max-width', 'color-primary', 'color-action-bg', 'color-button-hover', 'color-on-action',
  'color-bg', 'color-surface', 'color-surface-soft', 'color-image-surface', 'color-text',
  'color-text-secondary', 'color-border', 'color-border-hover', 'color-muted', 'color-success',
  'color-warning', 'color-error', 'color-info', 'radius-xs', 'radius-sm', 'radius-md',
  'radius-lg', 'radius-card', 'radius-control', 'font-family',
];
const storefrontRoot = tokenBlock(storefrontCss, ':root');
const adminRoot = tokenBlock(adminCss, ':root');
const storefrontDark = tokenBlock(storefrontCss, ':root.dark');
const adminDark = tokenBlock(adminCss, '.dark');
const mismatches = [];

if (!storefrontRoot || !adminRoot || !storefrontDark || !adminDark) {
  console.error('FAIL: could not parse one or more storefront/admin light and dark token blocks.');
  process.exit(1);
}

for (const name of sharedTokens) {
  const expected = tokenValue(storefrontRoot, name);
  const actual = tokenValue(adminRoot, name);
  if (actual !== expected) mismatches.push(`light --${name}: expected ${expected}, got ${actual}`);
  const darkExpected = tokenValue(storefrontDark, name) ?? expected;
  const darkActual = tokenValue(adminDark, name) ?? actual;
  if (darkActual !== darkExpected) mismatches.push(`dark --${name}: expected ${darkExpected}, got ${darkActual}`);
}

if (mismatches.length) {
  console.error(mismatches.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${sharedTokens.length} light/dark brand, typography, layout, and radius tokens match storefront.`);
}
