import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countPlates, generatePlates, iteratePlates } from '../public/regfinder/plates.js';

test('a full current plate gives only that plate', () => {
  assert.deepEqual(generatePlates('AB12CDE'), ['AB12CDE']);
});

test('spaces and lower case letters are accepted', () => {
  assert.deepEqual(generatePlates('ab12 cde'), ['AB12CDE']);
});

test('an unknown letter on a current plate skips I, Q and Z', () => {
  const plates = generatePlates('AB12CD?');
  assert.equal(plates.length, 23);
  assert.ok(!plates.includes('AB12CDI'));
  assert.ok(!plates.includes('AB12CDZ'));
});

test('an unknown age digit uses only valid age identifiers', () => {
  assert.deepEqual(generatePlates('AB?2CDE').sort(), ['AB02CDE', 'AB12CDE', 'AB22CDE', 'AB52CDE', 'AB62CDE', 'AB72CDE']);
});

test('a prefix plate with an unknown year letter skips I, O, U and Z', () => {
  // The pattern also fits a dateless plate, for example 1123 ABC. That gives the ten digit results.
  const letters = generatePlates('?123ABC').filter((p) => /^[A-Z]/.test(p));
  assert.equal(letters.length, 21);
  assert.ok(!letters.includes('I123ABC'));
});

test('a short dateless plate with a short number works', () => {
  // The Python version gave letters in the number part for this pattern.
  assert.ok(generatePlates('1?A').includes('12A'));
});

test('patterns that fit two formats give no duplicates', () => {
  const plates = generatePlates('A1??');
  assert.equal(plates.length, new Set(plates).size);
});

test('the count is an upper limit for the list', () => {
  for (const p of ['AB12???', '??12ABC', 'A1??', '123?456']) assert.ok(countPlates(p) >= generatePlates(p).length);
});

test('a pattern that fits no format gives no plates', () => {
  assert.deepEqual(generatePlates('!!!!'), []);
});

test('the iterator gives plates one at a time without making the full list', () => {
  // Seven unknown characters make millions of plates. Take only the first ten.
  const it = iteratePlates('???????');
  const first = Array.from({ length: 10 }, () => it.next().value);
  assert.equal(new Set(first).size, 10);
  assert.ok(countPlates('???????') > 1_000_000);
});
