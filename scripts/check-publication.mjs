import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';

const projectRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rootFiles = new Set([
  'README.md', 'CONTRIBUTING.md', 'CONTRIBUTORS.md', 'NOTICE.md',
  'LICENSE', 'LICENSE-STATUS.md', 'DCO', '.gitignore', '.gitattributes', 'package.json',
]);
const folders = new Set(['docs', 'data', 'src', 'scripts', 'test', '.github', 'samples', 'LICENSES']);
export const requiredLicenseFiles = Object.freeze([
  'LICENSE', 'LICENSE-STATUS.md', 'LICENSES/MIT.txt', 'LICENSES/CC-BY-SA-4.0.txt', 'DCO',
]);

const normalize = file => String(file).replaceAll('\\', '/');
const privatePath = /(?:^|\/)(?:translations|\.local|dist|public|node_modules|\.git)(?:\/|$)|(?:^|\/)\.env(?:\.|\/|$)/i;
const withdrawnSample = /(?:^|\/)release-the-witch(?:\/|$)|(?:^|\/)chapter-\d+\.(?:wordclassic\.(?:json|txt)|parallel\.html)$|(?:^|\/)(?:build-chapters|validate-chapters)\.mjs$|(?:^|\/)chapters\.test\.mjs$/i;

export function pathFindings(file) {
  const normalized = normalize(file);
  const findings = [];
  if (path.posix.isAbsolute(normalized) || /^[A-Za-z]:/.test(normalized) || normalized.split('/').includes('..')) {
    findings.push('absolute or parent-traversal path');
  }
  if (privatePath.test(normalized)) findings.push('private or generated directory');
  if (withdrawnSample.test(normalized)) findings.push('withdrawn third-party novel sample or tool');
  return findings;
}

export const allowed = file => {
  const normalized = normalize(file);
  return pathFindings(normalized).length === 0
    && (rootFiles.has(normalized) || folders.has(normalized.split('/')[0]));
};

const contentPatterns = [
  ['private Windows home path', /[A-Za-z]:[\\/]Users[\\/][^\s"<>]+/],
  ['private messaging account marker', new RegExp('wx' + 'id_[A-Za-z0-9_]+')],
  ['personal numeric email', /\b\d{6,}@qq\.com\b/i],
  ['GitHub credential pattern', /\bgh[pousr]_[A-Za-z0-9]{20,}\b/],
  ['private key material', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/],
  ['withdrawn novel paragraph source record', /"source_paragraph_sha256"\s*:/],
];

// Digests identify the six withdrawn artifacts without publishing their contents.
const withdrawnContentDigests = new Set([
  'fb94e160348dbe6eeaf741eeb11beea4ac4ac64b9ce82a72c2a643b8cfac0077',
  'e4c6a438859910e194dc70143af39a7aa135b3bf03c3bbd250733a0d4b81a9e1',
  '2e6ea0498d3d0746cef737d699ff2ee70a9f7ec026e05d6c05c18898ff1e1708',
  '8d98fb943461486d99e4d45d1d569b796709486420680d75646ea821fea3c394',
  '37d322df40a501e7595e067ef939bcbc324855bfb9fb7d7f21f70a3210f5d854',
  '73c03bc6152951b3f7b8b5e5aaf8c11bf5c37ec24dc13dcae24ab21a20daf4df',
]);

export function contentFindings(text) {
  const findings = contentPatterns.filter(([, expression]) => expression.test(String(text))).map(([label]) => label);
  if (withdrawnContentDigests.has(createHash('sha256').update(text).digest('hex'))) {
    findings.push('withdrawn third-party novel artifact content');
  }
  return findings;
}

function walk(directory, root) {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const full = path.join(directory, entry.name);
    if (entry.isSymbolicLink()) throw new Error('Symbolic links require explicit review.');
    return entry.isDirectory() ? walk(full, root) : [normalize(path.relative(root, full))];
  });
}

export function publicationFiles(root = projectRoot) {
  return [...rootFiles].filter(file => fs.existsSync(path.join(root, file)))
    .concat([...folders].filter(folder => fs.existsSync(path.join(root, folder)))
      .flatMap(folder => walk(path.join(root, folder), root)))
    .sort();
}

export function checkPublication({ root = projectRoot, trackedFiles = [] } = {}) {
  const findings = [];
  const files = publicationFiles(root);
  for (const file of requiredLicenseFiles) {
    if (!fs.existsSync(path.join(root, file))) findings.push(`${file}: required license or contribution terms missing`);
  }
  for (const file of files) {
    for (const finding of pathFindings(file)) findings.push(`${file}: ${finding}`);
    for (const finding of contentFindings(fs.readFileSync(path.join(root, file)))) {
      findings.push(`${file}: ${finding}`);
    }
  }
  for (const file of trackedFiles) {
    if (!allowed(file)) findings.push(`${normalize(file)}: tracked file outside publication scope`);
  }
  return { files, findings };
}

if (process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url) {
  const tracked = spawnSync('git', ['ls-files', '-z'], { cwd: projectRoot, encoding: 'utf8', windowsHide: true });
  if (tracked.status !== 0) {
    console.error('Publication check requires a readable Git index.');
    process.exitCode = 1;
  } else {
    const result = checkPublication({ trackedFiles: tracked.stdout.split('\0').filter(Boolean) });
    if (result.findings.length) {
      console.error(result.findings.join('\n'));
      process.exitCode = 1;
    } else {
      console.log(`Publication check passed: ${result.files.length} allowlisted files; local literature and generated files excluded.`);
    }
  }
}
