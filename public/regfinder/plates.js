// Make every valid UK plate that matches a pattern. A "?" in the pattern is an unknown character.
// Each format is a list of slots. Each slot is the set of characters that the format allows in that place.

const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const DIGITS = '0123456789';
// Current plates (2001 onwards) do not use I, Q or Z in the letters.
const CURRENT = 'ABCDEFGHJKLMNOPRSTUVWXY';
// The first digit of the age identifier.
const AGE = '012567';
// Prefix plates (1983 to 2001) do not use I, O, U or Z as the year letter.
const PREFIX_YEAR = 'ABCDEFGHJKLMNPRSTVWXY';

const repeat = (set, n) => Array(n).fill(set);
const range = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => from + i);

/** All plate formats, as lists of slots. */
export const FORMATS = [
  // Current: AB12 CDE
  [CURRENT, CURRENT, AGE, DIGITS, CURRENT, CURRENT, CURRENT],
  // Prefix: A123 BCD
  ...range(1, 3).map((n) => [PREFIX_YEAR, ...repeat(DIGITS, n), ...repeat(ALL, 3)]),
  // Suffix: ABC 123D
  ...range(1, 3).map((n) => [...repeat(ALL, 3), ...repeat(DIGITS, n), ALL]),
  // Dateless and Northern Ireland: 1234 AB, AB 1234 and similar
  ...range(1, 4).flatMap((d) => range(1, 3).flatMap((l) => [[...repeat(DIGITS, d), ...repeat(ALL, l)], [...repeat(ALL, l), ...repeat(DIGITS, d)]])),
  // Diplomatic: 123 D 456
  [...repeat(DIGITS, 3), 'DX', ...repeat(DIGITS, 3)],
];

/** The slot choices for one format, or null if the pattern cannot fit the format. */
function choices(pattern, format) {
  if (pattern.length !== format.length) return null;
  const out = [];
  for (let i = 0; i < pattern.length; i++) {
    const c = pattern[i];
    if (c === '?') out.push(format[i]);
    else if (format[i].includes(c)) out.push(c);
    else return null;
  }
  return out;
}

/** The number of plates that the pattern makes. Formats can overlap, so this is an upper limit. */
export function countPlates(pattern) {
  const p = normalise(pattern);
  return FORMATS.reduce((sum, f) => {
    const c = choices(p, f);
    return c ? sum + c.reduce((n, s) => n * s.length, 1) : sum;
  }, 0);
}

/** True if the plate fits the format. */
const fits = (plate, format) => plate.length === format.length && [...plate].every((c, i) => format[i].includes(c));

/** Every combination of one character from each slot, in order. */
function* combine(slots, head = '') {
  if (head.length === slots.length) return yield head;
  for (const c of slots[head.length]) yield* combine(slots, head + c);
}

/**
 * All matching plates, one at a time, with no duplicates. It does not keep a list, so large searches use little memory.
 * A plate that also fits an earlier format is a duplicate, so it is skipped.
 */
export function* iteratePlates(pattern) {
  const p = normalise(pattern);
  const fitting = FORMATS.map((f) => choices(p, f));
  for (let i = 0; i < FORMATS.length; i++) {
    if (!fitting[i]) continue;
    for (const plate of combine(fitting[i])) {
      if (!FORMATS.slice(0, i).some((f, j) => fitting[j] && fits(plate, f))) yield plate;
    }
  }
}

/** All matching plates as a list. Use iteratePlates for large patterns. */
export const generatePlates = (pattern) => [...iteratePlates(pattern)];

export const normalise = (pattern) => pattern.toUpperCase().replace(/\s+/g, '');
