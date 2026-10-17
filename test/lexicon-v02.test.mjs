import test from 'node:test';
import assert from 'node:assert/strict';
import { loadLexiconV02, loadLegacyPilot, validateLexiconV02 } from '../scripts/validate-lexicon-v02.mjs';

const lexicon = loadLexiconV02();
const pilot = loadLegacyPilot();
const copy = () => structuredClone(lexicon);

test('v0.2 trial has 308 unique base units and 14 closed compounds, with its legacy pilot preserved', () => {
  assert.deepEqual(validateLexiconV02(lexicon, pilot), {
    baseUnits: 308, carriedBaseUnits: 72, addedBaseUnits: 236,
    compounds: 14, carriedCompounds: 2, addedCompounds: 12,
    meaningMigrations: 1, legacyPilotPreserved: true, status: 'reviewed-for-trial',
  });
  assert.equal(new Set(lexicon.entries.map(entry => entry.wc.toLowerCase())).size, 308);
  assert.equal(lexicon.entries.filter(entry => entry.origin === 'pilot-0.1.0').length, 72);
  assert.equal(lexicon.entries.filter(entry => entry.origin === 'AI-assisted-original-concept-selection').length, 236);
});

test('the 12 new family combinations preserve their explicit parts and semantic relationships', () => {
  const expected = {
    malepig: ['male', 'pig'], femalepig: ['female', 'pig'],
    smallpig: ['small', 'pig'], youngpig: ['young', 'pig'], pigmeat: ['pig', 'meat'],
    malecattle: ['male', 'cattle'], femalecattle: ['female', 'cattle'],
    youngcattle: ['young', 'cattle'], cattlemeat: ['cattle', 'meat'], cattlemilk: ['cattle', 'milk'],
    grapewine: ['grape', 'wine'], driedgrape: ['dried', 'grape'],
  };
  for (const [wc, parts] of Object.entries(expected)) {
    const compound = lexicon.compounds.find(entry => entry.wc === wc);
    assert.deepEqual(compound.components, parts);
    assert.equal(compound.status, 'trial');
  }
  const relation = wc => lexicon.compounds.find(entry => entry.wc === wc).relation;
  assert.equal(relation('smallpig'), 'physical-size');
  assert.equal(relation('youngpig'), 'animal-age');
  assert.equal(relation('cattlemilk'), 'source-product');
  assert.equal(relation('driedgrape'), 'processed-state');
});

test('milk migration applies only to the new snapshot and records the exact cow-milk expression', () => {
  const old = pilot.roots.entries.find(entry => entry.wc === 'milk');
  const next = lexicon.entries.find(entry => entry.wc === 'milk');
  assert.equal(old.zh, '牛奶');
  assert.equal(next.zh, '奶（哺乳动物乳汁，不限定牛）');
  assert.ok(pilot.sentences.entries.some(entry => entry.zh === '我不喝牛奶。' && entry.wc === 'I no drink milk.'));
  assert.equal(lexicon.meaning_migrations[0].specific_wc, 'cattlemilk');
  const changed = copy();
  changed.entries.find(entry => entry.wc === 'milk').zh = '牛奶';
  assert.throws(() => validateLexiconV02(changed, pilot), /general animal-milk meaning/);
});

test('dried is a fixed existing food-state word, not a general tense-generation rule', () => {
  const dried = lexicon.entries.find(entry => entry.wc === 'dried');
  assert.equal(dried.unit, 'whole');
  assert.equal(dried.pronunciation_policy, 'original English');
  assert.match(dried.zh, /干制/);
  const changed = copy();
  changed.form_policy.general_ed_derivation_enabled = true;
  assert.throws(() => validateLexiconV02(changed, pilot), /general tense or -ed derivation/);
});

test('duplicate and missing base words are rejected', () => {
  const duplicate = copy();
  duplicate.entries[1].wc = 'i';
  assert.throws(() => validateLexiconV02(duplicate, pilot), /duplicate base word/);
  const missing = copy();
  missing.entries.pop();
  assert.throws(() => validateLexiconV02(missing, pilot), /expected 308 base units/);
});

test('unknown compound parts and wrong joins are rejected', () => {
  const unknown = copy();
  unknown.compounds.find(entry => entry.wc === 'driedgrape').components = ['dry', 'grape'];
  assert.throws(() => validateLexiconV02(unknown, pilot), error => {
    assert.match(error.message, /unknown component/);
    assert.match(error.message, /components do not join/);
    return true;
  });
});

test('each unchanged pilot file is protected by a semantic JSON digest', () => {
  for (const name of ['roots', 'compounds', 'sentences', 'numbers']) {
    const changed = structuredClone(pilot);
    changed[name].entries[0].zh += '（改动）';
    assert.throws(() => validateLexiconV02(lexicon, changed), new RegExp(`legacy ${name}: pilot data changed`));
  }
});

test('only the explicitly recorded pilot meaning is migrated', () => {
  const changed = copy();
  changed.entries.find(entry => entry.wc === 'old').zh = '陈旧';
  assert.throws(() => validateLexiconV02(changed, pilot), /unrecorded legacy meaning change: old/);
});

test('public lexicon excludes local paths, benchmark rows and dictionary records', () => {
  const sourceRecord = copy();
  sourceRecord.entries[0].sourceRecords = [{ englishSenses: ['raw dictionary record'] }];
  assert.throws(() => validateLexiconV02(sourceRecord, pilot), /raw research field sourceRecords/);
  const privatePath = copy();
  privatePath.entries[0].notes = 'C:/private/source.txt';
  assert.throws(() => validateLexiconV02(privatePath, pilot), /local source path/);
});

test('selected primary meanings and retained whole units remain explicit', () => {
  const word = wc => lexicon.entries.find(entry => entry.wc === wc);
  for (const wc of ['teacher', 'student', 'grape', 'coffee', 'clothes']) assert.equal(word(wc).unit, 'whole');
  assert.match(word('class').zh, /类/);
  assert.match(word('old').zh, /年老/);
  assert.match(word('small').zh, /体积/);
  assert.match(word('young').zh, /年幼/);
  assert.match(word('wine').zh, /果酒类/);
  for (const wc of ['cow', 'pork', 'beef', 'raisin', 'boar', 'sow']) assert.equal(word(wc), undefined);
  assert.equal(lexicon.review.method, 'AI-assisted drafting followed by founder acceptance for trial use');
  assert.match(lexicon.review.limitations, /尚无独立学习者实验/);
});
