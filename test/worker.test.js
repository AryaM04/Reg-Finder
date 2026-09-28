import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker from '../src/index.js';

const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

/** A fake DVLA. It knows one vehicle and fails for plates that start with "ERR". */
function fakeDvla() {
  const calls = [];
  globalThis.fetch = async (_url, init) => {
    const { registrationNumber } = JSON.parse(init.body);
    calls.push({ key: init.headers['x-api-key'], plate: registrationNumber });
    if (registrationNumber.startsWith('ERR')) return new Response('', { status: 500 });
    if (registrationNumber !== 'T377DBW') return new Response('', { status: 404 });
    return Response.json({ make: 'TOYOTA', colour: 'BLACK', yearOfManufacture: 1999, motStatus: 'Valid', taxStatus: 'Taxed' });
  };
  return calls;
}

const env = { DVLA_API_KEY: 'test-key', ASSETS: { fetch: () => new Response('page') } };
const lookup = (body, headers = {}) =>
  worker.fetch(
    new Request('https://akm.dev/regfinder/api/lookup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );

test('the lookup returns only registered vehicles', async () => {
  const calls = fakeDvla();
  const response = await lookup({ plates: ['T377DBW', 'T377DBX'] });
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.vehicles.length, 1);
  assert.equal(data.vehicles[0].make, 'TOYOTA');
  assert.equal(data.vehicles[0].mot, 'Valid');
  assert.equal(data.failed, 0);
  assert.ok(calls.every((c) => c.key === 'test-key'));
});

test('DVLA errors are counted, not hidden', async () => {
  fakeDvla();
  const data = await (await lookup({ plates: ['ERR1', 'T377DBW'] })).json();
  assert.equal(data.failed, 1);
  assert.equal(data.vehicles.length, 1);
});

test('the lookup refuses bad input', async () => {
  fakeDvla();
  for (const plates of [[], Array(21).fill('AB12CDE'), ['AB12 CDE'], ['<script>'], 'AB12CDE']) {
    assert.equal((await lookup({ plates })).status, 400, JSON.stringify(plates));
  }
});

test('the lookup refuses requests from other sites', async () => {
  fakeDvla();
  assert.equal((await lookup({ plates: ['T377DBW'] }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await lookup({ plates: ['T377DBW'] }, { Origin: 'https://akm.dev' })).status, 200);
});

test('the lookup says so when the API key is missing', async () => {
  const response = await worker.fetch(
    new Request('https://akm.dev/regfinder/api/lookup', { method: 'POST', body: '{"plates":["T377DBW"]}' }),
    { ASSETS: env.ASSETS },
  );
  assert.equal(response.status, 503);
});

test('other paths go to the static files', async () => {
  assert.equal(await (await worker.fetch(new Request('https://akm.dev/regfinder/'), env)).text(), 'page');
});
