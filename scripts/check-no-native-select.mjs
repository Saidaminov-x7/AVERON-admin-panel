import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const roots = [
  resolve(scriptDirectory, '../src'),
  resolve(scriptDirectory, '../../AVERON_frontend/app'),
  resolve(scriptDirectory, '../../AVERON_frontend/components'),
];
const sourceExtensions = new Set(['.ts', '.tsx', '.js', '.jsx']);
const violations = [];

function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      scan(path);
      continue;
    }
    if (!sourceExtensions.has(path.slice(path.lastIndexOf('.')))) continue;
    if (/\.(?:test|spec)\.[jt]sx?$/.test(path)) continue;
    const source = readFileSync(path, 'utf8');
    if (/<\s*select(?=[\s>])/.test(source)) violations.push(relative(scriptDirectory, path));
  }
}

for (const root of roots) {
  if (existsSync(root)) scan(root);
}

if (violations.length) {
  console.error(`Native <select> controls are not allowed:\n${violations.map((path) => `- ${path}`).join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('No native <select> controls found in available storefront or admin source.');
}
