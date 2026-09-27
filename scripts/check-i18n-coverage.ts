// scripts/check-i18n-coverage.ts
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const RUSSIAN_TEXT_REGEX = />[^<>{}\n]*[а-яёА-ЯЁ][^<>{}\n]*</g;

function getFilesRecursively(dir: string): string[] {
  let results: string[] = [];
  const list = readdirSync(dir);
  for (const file of list) {
    const filePath = join(dir, file);
    const stat = statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getFilesRecursively(filePath));
    } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
      results.push(filePath);
    }
  }
  return results;
}

function checkCoverage() {
  const pagesDir = join(process.cwd(), 'src', 'pages');
  const files = getFilesRecursively(pagesDir);
  let totalIssues = 0;
  const fileReports: { file: string; count: number; samples: string[] }[] = [];

  for (const file of files) {
    const content = readFileSync(file, 'utf-8');
    const matches = content.match(RUSSIAN_TEXT_REGEX) || [];
    if (matches.length > 0) {
      const samples = matches.slice(0, 3).map((m) => m.replace(/^[>]/, '').replace(/[<]$/, '').trim());
      fileReports.push({ file: file.replace(process.cwd(), ''), count: matches.length, samples });
      totalIssues += matches.length;
    }
  }

  console.log('=== i18n Coverage Report ===');
  fileReports.sort((a, b) => b.count - a.count);
  for (const r of fileReports) {
    console.log(`- ${r.file}: ${r.count} строк (напр. "${r.samples.join('", "')}")`);
  }
  console.log(`\nВсего потенциально непереведённых строк в JSX: ${totalIssues}`);
}

checkCoverage();
