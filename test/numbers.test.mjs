import test from 'node:test';
import assert from 'node:assert/strict';
import { digitRoots, numberParts, numberWord } from '../src/numbers.mjs';

test('the ten digit roots are fixed and immutable', () => {
  assert.deepEqual(digitRoots, ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']);
  assert.equal(Object.isFrozen(digitRoots), true);
});

const examples = [
  [0, ['zero'], 'zero'],
  [10, ['ten'], 'ten'],
  [11, ['ten', 'one'], 'tenone'],
  [12, ['ten', 'two'], 'tentwo'],
  [20, ['two', 'ten'], 'twoten'],
  [21, ['two', 'ten', 'one'], 'twotenone'],
  [23, ['two', 'ten', 'three'], 'twotenthree'],
  [32, ['three', 'ten', 'two'], 'threetentwo'],
  [99, ['nine', 'ten', 'nine'], 'ninetennine'],
];

for (const [value, parts, word] of examples) {
  test('number ' + value + ' has predictable parts and spelling', () => {
    assert.deepEqual(numberParts(value), parts);
    assert.equal(numberWord(value), word);
  });
}

test('every number 0–99 joins its parts without changing the fixed roots', () => {
  const allowed = new Set([...digitRoots, 'ten']);
  const words = new Set();
  for (let value = 0; value <= 99; value++) {
    const parts = numberParts(value);
    assert.ok(parts.every(part => allowed.has(part)));
    assert.equal(numberWord(value), parts.join(''));
    assert.equal(words.has(numberWord(value)), false, 'duplicate number word for ' + value);
    words.add(numberWord(value));
  }
  assert.equal(words.size, 100);
});

test('numberParts returns fresh arrays, preserving subsequent calls', () => {
  const parts = numberParts(21);
  parts.push('changed');
  assert.deepEqual(numberParts(21), ['two', 'ten', 'one']);
});

test('out-of-range and noninteger inputs are rejected consistently', () => {
  for (const value of [-1, 100, 1.5, NaN, Infinity, -Infinity, '12', '', null, undefined, true, false, 12n, {}, []]) {
    assert.throws(() => numberParts(value), RangeError, 'numberParts input: ' + String(value));
    assert.throws(() => numberWord(value), RangeError, 'numberWord input: ' + String(value));
  }
});
