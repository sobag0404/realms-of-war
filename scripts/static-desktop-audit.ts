import { existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

type Finding = {
  severity: 'blocker' | 'known';
  file: string;
  detail: string;
};

const root = process.cwd();
const findings: Finding[] = [];

function readProjectFile(path: string): Promise<string> {
  return Bun.file(join(root, path)).text();
}

function walk(dir: string): string[] {
  const absolute = join(root, dir);
  if (!existsSync(absolute)) return [];

  const files: string[] = [];
  for (const entry of readdirSync(absolute)) {
    const path = join(absolute, entry);
    const stats = statSync(path);
    if (stats.isDirectory()) {
      files.push(...walk(relative(root, path)));
      continue;
    }
    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(relative(root, path).replace(/\\/g, '/'));
    }
  }
  return files;
}

const layout = await readProjectFile('src/app/layout.tsx');
if (layout.includes('next/font/google')) {
  findings.push({
    severity: 'blocker',
    file: 'src/app/layout.tsx',
    detail: 'next/font/google keeps a build-time external font dependency in the desktop renderer path.',
  });
}

const nextConfig = await readProjectFile('next.config.ts');
if (!nextConfig.includes('REALMS_DESKTOP_STATIC_EXPORT')) {
  findings.push({
    severity: 'blocker',
    file: 'next.config.ts',
    detail: 'desktop static export mode is not externally selectable for manual/probe builds.',
  });
}

const directApiFetchAllowList = new Set([
  'src/save/serverSaveRepository.ts',
]);

for (const file of walk('src')) {
  if (file.includes('/api/__tests__/')) continue;
  const source = await readProjectFile(file);
  const usesApiFetch = /fetch\(\s*[`'"][^`'"]*\/api\//.test(source);
  if (usesApiFetch && !directApiFetchAllowList.has(file)) {
    findings.push({
      severity: 'blocker',
      file,
      detail: 'direct /api fetch outside ServerSaveRepository would couple desktop UI back to Next server routes.',
    });
  }
}

for (const file of walk('src/app/api')) {
  if (file.includes('/__tests__/')) continue;
  const source = await readProjectFile(file);
  if (/export\s+async\s+function\s+(POST|PUT|PATCH|DELETE)\b/.test(source)) {
    findings.push({
      severity: 'known',
      file,
      detail: 'mutating route handlers are preserved for web/dev compatibility and are not part of a static desktop export.',
    });
  }
  if (/NextRequest|request\.|new URL\(request\.url\)/.test(source)) {
    findings.push({
      severity: 'known',
      file,
      detail: 'request-dependent route handler logic cannot become static desktop renderer output.',
    });
  }
}

const blockers = findings.filter((finding) => finding.severity === 'blocker');
const known = findings.filter((finding) => finding.severity === 'known');

console.log('Realms of War static desktop readiness audit');
console.log('');

if (blockers.length === 0) {
  console.log('BLOCKERS  0 regression blockers found');
} else {
  console.log(`BLOCKERS  ${blockers.length}`);
  for (const finding of blockers) {
    console.log(`- ${finding.file}: ${finding.detail}`);
  }
}

console.log(`KNOWN     ${known.length}`);
for (const finding of known) {
  console.log(`- ${finding.file}: ${finding.detail}`);
}

console.log('');
console.log('Static export probe: REALMS_DESKTOP_STATIC_EXPORT=1 bun x next build');
console.log('Expected today: route/API blockers may still fail until server routes move out of the renderer build.');

if (blockers.length > 0) {
  process.exit(1);
}
