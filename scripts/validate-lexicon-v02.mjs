import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const lower = value => String(value ?? '').toLowerCase();
const digest = value => createHash('sha256').update(JSON.stringify(value ?? null)).digest('hex');

// Canonical JSON digests pin the original pilot independent of whitespace/newlines.
export const pilotDigests = Object.freeze({
  roots: '02ae8c72b4810918c52df91a3e266a0f7b879eb3446b025940dd91b7ceaf07fa',
  compounds: '969647c206a62156fdbfe0ac401784164f219cd0e065ab4baa68e52e1f7e53c3',
  sentences: '1076d276179e787c66cbcd60940a957a7cca221339dedc9d80ffd62ac2fa9df3',
  numbers: '3004012e71d1dc3cc3787ecfb46d44485716f5910879e88a59449848af30a8a6',
});

export function loadLexiconV02(root = defaultRoot) {
  return JSON.parse(readFileSync(resolve(root, 'data/lexicon-v02.json'), 'utf8'));
}

export function loadLegacyPilot(root = defaultRoot) {
  return Object.fromEntries(Object.keys(pilotDigests).map(name => [
    name, JSON.parse(readFileSync(resolve(root, 'data', `${name}.json`), 'utf8')),
  ]));
}

/** Validate the independently versioned 308-unit trial without upgrading its claims. */
export function validateLexiconV02(doc = loadLexiconV02(), legacy = loadLegacyPilot()) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  check(doc?.project === 'New Chinese English WordClassic', 'unexpected project');
  check(doc?.version === '0.2.0-trial', 'expected version 0.2.0-trial');
  check(doc?.status === 'reviewed-for-trial', 'document status must be reviewed-for-trial');
  check(nonempty(doc?.review?.limitations), 'missing trial-review limitations');
  check(nonempty(doc?.review?.scope), 'missing trial-review scope');
  const entries = Array.isArray(doc?.entries) ? doc.entries : [];
  const compounds = Array.isArray(doc?.compounds) ? doc.compounds : [];
  check(entries.length === 308, `expected 308 base units, got ${entries.length}`);
  check(compounds.length === 14, `expected 14 compounds, got ${compounds.length}`);
  const ids = new Set();
  const words = new Map();
  for (const [index, entry] of entries.entries()) {
    const label = `entries[${index}]`;
    check(nonempty(entry?.id) && !ids.has(entry?.id), `${label}: missing or duplicate ID`);
    ids.add(entry?.id);
    const wc = entry?.wc;
    const key = lower(wc);
    check(typeof wc === 'string' && /^[A-Za-z]+$/.test(wc), `${label}: invalid base word`);
    check(wc === (key === 'i' ? 'I' : key), `${label}: expected I or lowercase spelling`);
    check(!words.has(key), `${label}: duplicate base word ${wc}`);
    words.set(key, entry);
    check(nonempty(entry?.zh), `${label}: missing primary meaning`);
    check(nonempty(entry?.notes), `${label}: missing own semantic note`);
    check(entry?.unit === 'whole', `${label}: unit must be whole`);
    check(entry?.pronunciation_policy === 'original English', `${label}: missing pronunciation policy`);
    check(nonempty(entry?.reading_status), `${label}: missing reading status`);
    check(entry?.status === 'trial', `${label}: entry status must be trial`);
    check(entry?.review_status === 'reviewed-for-trial', `${label}: missing trial review status`);
    for (const field of ['dictionaryEnglish', 'sourceRecords', 'benchmark', 'frequency', 'sourceCharacterRanks']) {
      check(!(field in (entry ?? {})), `${label}: raw research field ${field} must stay local`);
    }
  }
  const relations = new Set(['person-age', 'class-membership', 'animal-sex', 'physical-size', 'animal-age', 'source-product', 'processed-state']);
  const compoundWords = new Set();
  for (const [index, entry] of compounds.entries()) {
    const label = `compounds[${index}]`;
    check(nonempty(entry?.id) && !ids.has(entry?.id), `${label}: missing or duplicate ID`);
    ids.add(entry?.id);
    const wc = entry?.wc;
    check(typeof wc === 'string' && /^[a-z]+$/.test(wc), `${label}: invalid compound spelling`);
    check(!compoundWords.has(wc) && !words.has(wc), `${label}: duplicate compound ${wc}`);
    compoundWords.add(wc);
    check(nonempty(entry?.zh) && nonempty(entry?.notes), `${label}: missing meaning or note`);
    check(Array.isArray(entry?.components) && entry.components.length >= 2, `${label}: expected at least two components`);
    const parts = Array.isArray(entry?.components) ? entry.components : [];
    check(parts.every(part => typeof part === 'string' && words.has(lower(part))), `${label}: unknown component`);
    check(parts.join('') === wc, `${label}: components do not join to compound`);
    check(relations.has(entry?.relation), `${label}: unregistered semantic relation`);
    check(entry?.status === 'trial' && entry?.review_status === 'reviewed-for-trial', `${label}: expected reviewed trial status`);
  }

  for (const [name, expectedDigest] of Object.entries(pilotDigests)) {
    check(digest(legacy?.[name]) === expectedDigest, `legacy ${name}: pilot data changed`);
  }
  const legacyEntries = legacy?.roots?.entries ?? [];
  for (const old of legacyEntries) {
    const current = words.get(lower(old.wc));
    check(current?.id === old.id, `legacy root identity changed: ${old.wc}`);
    if (old.wc !== 'milk') check(current?.zh === old.zh, `unrecorded legacy meaning change: ${old.wc}`);
  }
  for (const old of legacy?.compounds?.entries ?? []) {
    const current = compounds.find(entry => entry.wc === old.wc);
    check(current?.id === old.id && current?.zh === old.zh &&
      JSON.stringify(current?.components) === JSON.stringify(old.components), `legacy compound changed: ${old.wc}`);
  }
  const migration = doc?.meaning_migrations?.find(item => item.id === 'milk-sense-migration');
  check(doc?.meaning_migrations?.length === 1, 'expected exactly the recorded milk meaning migration');
  check(migration?.entry_id === 'r019' && migration?.wc === 'milk' && migration?.from_zh === '牛奶', 'incorrect milk migration origin');
  check(migration?.from_version === '0.1.0' && migration?.to_version === '0.2.0-trial', 'incorrect milk migration versions');
  check(migration?.to_zh === words.get('milk')?.zh && /哺乳动物/.test(migration?.to_zh ?? ''), 'milk must use the recorded general animal-milk meaning');
  check(migration?.specific_wc === 'cattlemilk' && migration?.specific_zh === '牛奶', 'milk-specific concept must be cattlemilk');
  check(migration?.status === 'accepted-for-trial' && nonempty(migration?.legacy_policy), 'missing accepted migration or legacy policy');
  check(compounds.some(item => item.wc === 'cattlemilk' && item.components.join('+') === 'cattle+milk'), 'missing source-specific cattle milk compound');
  check(words.has('dried') && /干制/.test(words.get('dried')?.zh ?? ''), 'dried must remain the fixed processed-food unit');
  check(doc?.form_policy?.general_past_inflection_enabled === false &&
    doc?.form_policy?.general_ed_derivation_enabled === false, 'fixed dried form must not enable general tense or -ed derivation');
  check(doc?.form_policy?.fixed_existing_forms?.some(item => item.wc === 'dried' && item.role === 'processed-food-state'), 'missing fixed dried form record');
  check(doc?.rule_changes?.some(item => item.id === 'composition-priority' && item.status === 'accepted-for-trial'), 'missing composition-priority trial rule');
  check(doc?.counts?.base_units === 308 && doc?.counts?.pilot_base_units === 72 &&
    doc?.counts?.added_base_units === 236 && doc?.counts?.compounds === 14 &&
    doc?.counts?.carried_compounds === 2 && doc?.counts?.added_compounds === 12, 'count metadata does not match this version');
  const serialized = JSON.stringify(doc);
  check(!/[A-Za-z]:[\\/]/.test(serialized) && !serialized.includes('file:///'), 'local source path in public lexicon');
  check(!serialized.includes('sourceRecords') && !serialized.includes('dictionaryEnglish'), 'raw dictionary content in public lexicon');
  if (errors.length) throw new Error(`Lexicon v0.2 validation failed:\n- ${errors.join('\n- ')}`);
  return { baseUnits: entries.length, carriedBaseUnits: 72, addedBaseUnits: 236, compounds: compounds.length, carriedCompounds: 2, addedCompounds: 12, meaningMigrations: 1, legacyPilotPreserved: true, status: 'reviewed-for-trial' };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    console.log(JSON.stringify(validateLexiconV02(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
