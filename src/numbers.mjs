export const digitRoots = Object.freeze(['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine']);

export function numberParts(value) {
  if (!Number.isInteger(value) || value < 0 || value > 99) throw new RangeError('Expected an integer from 0 through 99.');
  if (value < 10) return [digitRoots[value]];
  const tens = Math.floor(value / 10);
  const units = value % 10;
  return [...(tens > 1 ? [digitRoots[tens]] : []), 'ten', ...(units ? [digitRoots[units]] : [])];
}

export function numberWord(value) {
  return numberParts(value).join('');
}
