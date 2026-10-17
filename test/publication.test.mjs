import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import {
  allowed, pathFindings, contentFindings, publicationFiles, checkPublication, requiredLicenseFiles,
} from '../scripts/check-publication.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

test('all third-party novel samples and public chapter tools are withdrawn', () => {
  for (const chapter of ['01', '02']) {
    for (const suffix of ['wordclassic.json', 'wordclassic.txt', 'parallel.html']) {
      const file = `samples/release-the-witch/chapter-${chapter}.${suffix}`;
      assert.equal(fs.existsSync(path.join(root, file)), false, file);
      assert.equal(allowed(file), false, file);
    }
  }
  for (const file of ['scripts/build-chapters.mjs', 'scripts/validate-chapters.mjs', 'test/chapters.test.mjs']) {
    assert.equal(fs.existsSync(path.join(root, file)), false, file);
    assert.equal(allowed(file), false, file);
  }
});

test('private folders, generated files, traversal and withdrawn sample names are rejected', () => {
  for (const file of [
    'translations/private.json', '.local/source.json', 'public/index.html', 'dist/index.html',
    'node_modules/pkg/index.js', '.git/config', '.env', '.env.local', 'docs/.env.secret',
    'docs/translations/source.txt', 'docs/../translations/source.txt', '/docs/source.txt',
    'samples/release-the-witch/source.txt', 'docs/chapter-01.wordclassic.txt',
  ]) {
    assert.equal(allowed(file), false, file);
    assert.ok(pathFindings(file).length > 0, file);
  }
  assert.equal(allowed(['translations', 'private.txt'].join('\\')), false);
});

test('original project files and explicit license files remain publishable', () => {
  for (const file of [
    'data/roots.json', 'data/sentences.json', 'data/lexicon-v02.json',
    'docs/SPEC-v02.md', 'samples/README.md', 'src/numbers.mjs',
    'scripts/build.mjs', 'test/publication.test.mjs', 'LICENSE', 'DCO',
    'LICENSES/MIT.txt', 'LICENSES/CC-BY-SA-4.0.txt',
  ]) assert.equal(allowed(file), true, file);
  assert.equal(allowed('unreviewed.png'), false);
});

test('publication contents reject private paths, identifiers, credentials and novel source records', () => {
  const fixtures = [
    ['C:', 'Users', 'PRIVATE_USER', 'source.txt'].join(String.fromCharCode(92)),
    ['wx', 'id_private_identifier'].join(''),
    ['123456789', 'qq.com'].join('@'),
    ['ghp', 'x'.repeat(30)].join('_'),
    ['-----BEGIN ', 'PRIVATE KEY-----'].join(''),
    JSON.stringify({ ['source_paragraph_' + 'sha256']: 'redacted' }),
  ];
  for (const fixture of fixtures) assert.ok(contentFindings(fixture).length > 0);
  assert.deepEqual(contentFindings('I want drink water. 王正阳（笔名）'), []);
  assert.deepEqual(contentFindings('123456+project@users.noreply.github.com'), []);
});

test('required project license texts and contribution certificate are present', () => {
  for (const file of requiredLicenseFiles) {
    assert.ok(fs.existsSync(path.join(root, file)), file);
    assert.ok(fs.readFileSync(path.join(root, file), 'utf8').trim().length > 100, file);
  }
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.license, 'MIT');
});

test('publication listing excludes local archives and existing generated output', () => {
  const files = publicationFiles(root);
  assert.ok(files.includes('data/sentences.json'));
  assert.equal(files.some(file => /^(?:translations|\.local|public)\//.test(file)), false);
  assert.equal(files.some(file => /release-the-witch\//.test(file)), false);
});

test('sample guidance and build input keep publication original-only', () => {
  const guide = fs.readFileSync(path.join(root, 'samples', 'README.md'), 'utf8');
  assert.match(guide, /不发布第三方小说原文/);
  assert.doesNotMatch(guide, /\]\([^)]*chapter-\d+/);
  const builder = fs.readFileSync(path.join(root, 'scripts', 'build.mjs'), 'utf8');
  assert.doesNotMatch(builder, /build-chapters|validate-chapters|release-the-witch|chapter-0[12]/);
  assert.doesNotMatch(builder, /小说样本（单独管理）|共享许可证另行确定/);
});

test('publication audit rejects tracked private files and detects absent license terms', () => {
  const tempRoot = fs.realpathSync(os.tmpdir());
  const fixture = fs.mkdtempSync(path.join(tempRoot, 'wordclassic-publication-'));
  try {
    fs.writeFileSync(path.join(fixture, 'README.md'), 'Original project test fixture.');
    const result = checkPublication({ root: fixture, trackedFiles: ['translations/source.txt', 'unreviewed.png'] });
    assert.ok(result.findings.some(finding => finding.includes('translations/source.txt')));
    assert.ok(result.findings.some(finding => finding.includes('unreviewed.png')));
    for (const file of requiredLicenseFiles) assert.ok(result.findings.some(finding => finding.startsWith(`${file}:`)));
  } finally {
    assert.equal(path.dirname(fs.realpathSync(fixture)), tempRoot);
    assert.ok(path.basename(fixture).startsWith('wordclassic-publication-'));
    fs.rmSync(fixture, { recursive: true });
  }
});
