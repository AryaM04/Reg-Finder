import assert from 'node:assert/strict';
import { test } from 'node:test';
import { sortResults } from '../public/regfinder/sort.js';

const r = (index, registration, make, year, colour, model) => ({ index, model, vehicle: { registration, make, year, colour } });
const results = [
  r(0, 'T377DBC', 'TOYOTA', 1999, 'BLACK', 'MR2 GT-I'),
  r(1, 'AB12CDE', 'BMW', 2011, 'WHITE', '320I M SPORT'),
  r(2, 'X9ZZZ', 'AUDI', null, '', null),
  r(3, 'M4DEF', 'bmw', 2005, 'BLUE', '120D'),
];
const regs = (list) => list.map((x) => x.vehicle.registration);

test('order found keeps the arrival order', () => {
  assert.deepEqual(regs(sortResults(results, 'found')), ['T377DBC', 'AB12CDE', 'X9ZZZ', 'M4DEF']);
});

test('newest and oldest sort by year, with unknown years last', () => {
  assert.deepEqual(regs(sortResults(results, 'newest')), ['AB12CDE', 'M4DEF', 'T377DBC', 'X9ZZZ']);
  assert.deepEqual(regs(sortResults(results, 'oldest')), ['T377DBC', 'M4DEF', 'AB12CDE', 'X9ZZZ']);
});

test('make ignores case and keeps equal makes in the order found', () => {
  assert.deepEqual(regs(sortResults(results, 'make')), ['X9ZZZ', 'AB12CDE', 'M4DEF', 'T377DBC']);
});

test('model puts unknown models last and sorts numbers naturally', () => {
  assert.deepEqual(regs(sortResults(results, 'model')), ['M4DEF', 'AB12CDE', 'T377DBC', 'X9ZZZ']);
});

test('colour puts an empty colour last', () => {
  assert.deepEqual(regs(sortResults(results, 'colour')), ['T377DBC', 'M4DEF', 'AB12CDE', 'X9ZZZ']);
});

test('registration sorts A to Z', () => {
  assert.deepEqual(regs(sortResults(results, 'registration')), ['AB12CDE', 'M4DEF', 'T377DBC', 'X9ZZZ']);
});

test('sorting does not change the original list', () => {
  const before = regs(results);
  sortResults(results, 'make');
  assert.deepEqual(regs(results), before);
});
