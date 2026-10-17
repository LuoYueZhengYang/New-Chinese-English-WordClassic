import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { digitRoots, numberParts, numberWord } from '../src/numbers.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const corpusNames = ['roots', 'compounds', 'sentences', 'numbers'];
const expectedCounts = { roots: 72, compounds: 2, sentences: 60, numbers: 100 };
const originalSource = 'original project examples';
const projectName = 'New Chinese English WordClassic';
const normalized = value => String(value ?? '').toLowerCase();
const nonempty = value => typeof value === 'string' && value.trim().length > 0;

export function loadCorpus(root = defaultRoot) {
  return Object.fromEntries(corpusNames.map(name => [
    name,
    JSON.parse(readFileSync(resolve(root, 'data', name + '.json'), 'utf8')),
  ]));
}

/**
 * Validate the checked-in original pilot corpus, not a claimed 5,000-word lexicon.
 * Returns measured counts; throws an Error listing all detected problems.
 */
export function validateCorpus(corpus = loadCorpus()) {
  const errors = [];
  const check = (condition, message) => { if (!condition) errors.push(message); };
  const entries = {};
  for (const name of corpusNames) {
    const doc = corpus?.[name];
    check(doc && typeof doc === 'object', name + ': missing document');
    check(doc?.project === projectName, name + ': unexpected project');
    check(doc?.source === originalSource, name + ': source must be original project examples');
    check(doc?.status === 'draft', name + ': document status must be draft');
    check(nonempty(doc?.version), name + ': missing version');
    check(Array.isArray(doc?.entries), name + ': entries must be an array');
    entries[name] = Array.isArray(doc?.entries) ? doc.entries : [];
    check(entries[name].length === expectedCounts[name],
      name + ': expected ' + expectedCounts[name] + ' entries, got ' + entries[name].length);

    const ids = new Set();
    for (const [index, entry] of entries[name].entries()) {
      const label = name + '[' + index + ']';
      check(entry && typeof entry === 'object', label + ': entry must be an object');
      check(nonempty(entry?.id), label + ': missing id');
      check(!ids.has(entry?.id), label + ': duplicate id ' + entry?.id);
      ids.add(entry?.id);
      check(nonempty(entry?.zh), label + ': missing Chinese meaning');
      check(nonempty(entry?.wc), label + ': missing WordClassic expression');
      if (name !== 'numbers') check(entry?.status === 'draft', label + ': status must be draft');
    }
  }

  // These source/chapter markers have no place in the original example data.
  const serialized = JSON.stringify(corpus);
  for (const marker of ['放开那个女巫', '从今天开始做王子']) {
    check(!serialized?.includes(marker), 'Original corpus contains external novel marker: ' + marker);
  }

  const rootWords = new Set();
  for (const entry of entries.roots) {
    const wc = entry?.wc;
    const key = normalized(wc);
    check(typeof wc === 'string' && /^[A-Za-z]+$/.test(wc), 'roots: invalid base word ' + wc);
    check(!rootWords.has(key), 'roots: duplicate base word (case-insensitive) ' + wc);
    rootWords.add(key);
    check(wc === (key === 'i' ? 'I' : key), 'roots: use I or lowercase base-word spelling: ' + wc);
    check(entry?.pronunciation_policy === 'original English', 'roots: missing original-English pronunciation policy for ' + wc);
    check(nonempty(entry?.reading_status), 'roots: missing reading status for ' + wc);
  }

  for (const root of [...digitRoots, 'ten']) {
    check(rootWords.has(root), 'roots: missing fixed numerical root ' + root);
  }

  const compoundWords = new Set();
  for (const entry of entries.compounds) {
    const wc = entry?.wc;
    const key = normalized(wc);
    check(typeof wc === 'string' && /^[a-z]+$/.test(wc), 'compounds: invalid expression ' + wc);
    check(!compoundWords.has(key), 'compounds: duplicate expression ' + wc);
    check(!rootWords.has(key), 'compounds: expression already exists as a base word ' + wc);
    compoundWords.add(key);
    const parts = Array.isArray(entry?.components) ? entry.components : [];
    check(parts.length >= 2, 'compounds: at least two components required for ' + wc);
    for (const part of parts) {
      check(rootWords.has(normalized(part)), 'compounds: unknown root ' + part + ' in ' + wc);
    }
    check(parts.join('') === wc, 'compounds: components do not concatenate to ' + wc);
  }

  const chineseDigits = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九'];
  const numberWords = new Set();
  for (const [index, entry] of entries.numbers.entries()) {
    const value = entry?.value;
    const valid = Number.isInteger(value) && value >= 0 && value <= 99;
    check(valid, 'numbers[' + index + ']: value must be an integer in 0–99');
    check(value === index, 'numbers[' + index + ']: values must be complete and ordered 0–99');
    check(entry?.id === String(index).padStart(3, '0'), 'numbers[' + index + ']: unexpected id');
    if (valid) {
      const tens = Math.floor(value / 10);
      const units = value % 10;
      const zh = value < 10 ? chineseDigits[value]
        : (tens === 1 ? '' : chineseDigits[tens]) + '十' + (units ? chineseDigits[units] : '');
      check(entry.wc === numberWord(value), 'numbers[' + index + ']: spelling differs from numberWord');
      check(entry.zh === zh, 'numbers[' + index + ']: incorrect Chinese number');
      for (const part of numberParts(value)) {
        check(rootWords.has(part), 'numbers[' + index + ']: unknown root ' + part);
      }
    }
    check(!numberWords.has(normalized(entry?.wc)), 'numbers: duplicate expression ' + entry?.wc);
    numberWords.add(normalized(entry?.wc));
  }

  const vocabulary = new Set([...rootWords, ...compoundWords, ...numberWords]);
  let sentenceTokens = 0;
  for (const [index, entry] of entries.sentences.entries()) {
    const id = String(index + 1).padStart(3, '0');
    check(entry?.id === id, 'sentences[' + index + ']: expected consecutive id ' + id);
    const wc = typeof entry?.wc === 'string' ? entry.wc : '';
    check(/^[A-Za-z]+(?: [A-Za-z]+)*[.?]$/.test(wc), 'sentences ' + id + ': invalid spelling or punctuation');
    const tokens = wc.match(/[A-Za-z]+/g) ?? [];
    sentenceTokens += tokens.length;
    for (const token of tokens) {
      check(vocabulary.has(normalized(token)), 'sentences ' + id + ': unknown token ' + token);
    }
  }
  const sentence040 = entries.sentences.find(entry => entry?.id === '040');
  check(sentence040?.zh === '你看见书吗？' && sentence040?.wc === 'You see book?',
    'sentences 040: preserve the reviewed Chinese question without added completion meaning');

  if (errors.length) {
    const error = new Error('Corpus validation failed:\n- ' + errors.join('\n- '));
    error.name = 'CorpusValidationError';
    error.problems = errors;
    throw error;
  }
  return Object.freeze({
    roots: entries.roots.length,
    compounds: entries.compounds.length,
    sentences: entries.sentences.length,
    numbers: entries.numbers.length,
    sentenceTokens,
    targetBaseUnits: 5000,
    targetReached: entries.roots.length >= 5000,
  });
}

const invoked = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (invoked) {
  try {
    const result = validateCorpus();
    console.log('Validated: ' + result.roots + ' base words, ' + result.compounds
      + ' compounds, ' + result.sentences + ' sentences (' + result.sentenceTokens
      + ' word tokens), ' + result.numbers + ' number entries.');
    console.log('5,000 base units is a design goal; this original 0.1 pilot has ' + result.roots + ' base words. The versioned 0.2 lexicon is checked separately.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
