import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import worker, { carInfoText } from '../src/index.js';

const realFetch = globalThis.fetch;
afterEach(() => (globalThis.fetch = realFetch));

/** A fake DVLA and a fake model site. The DVLA knows one vehicle. Plates that start with "SLOW" get a 429. */
function fakeServices() {
  const calls = [];
  globalThis.fetch = async (url, init) => {
    if (url.includes('instantcarcheck')) {
      calls.push({ site: 'model', body: init.body });
      return new Response('<html><div data-test="carInfo"><div><span>TOYOTA</span> MR2 GT-I</div></div><div>other</div></html>');
    }
    const { registrationNumber } = JSON.parse(init.body);
    calls.push({ site: 'dvla', key: init.headers['x-api-key'], plate: registrationNumber });
    if (registrationNumber.startsWith('SLOW')) return new Response('', { status: 429, headers: { 'Retry-After': '3' } });
    if (registrationNumber.startsWith('ERR')) return new Response('', { status: 500 });
    if (registrationNumber !== 'T377DBW') return new Response('', { status: 404 });
    return Response.json({ make: 'TOYOTA', colour: 'BLACK', yearOfManufacture: 1999, motStatus: 'Valid', taxStatus: 'Taxed' });
  };
  return calls;
}

const env = { DVLA_API_KEY: 'test-key', DVLA_CONCURRENCY: '6', ASSETS: { fetch: () => new Response('page') } };
const post = (path, body, headers = {}, e = env) =>
  worker.fetch(
    new Request(`https://akm.dev/regfinder/api/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    }),
    e,
  );

test('the config gives the start concurrency', async () => {
  const data = await (await worker.fetch(new Request('https://akm.dev/regfinder/api/config'), env)).json();
  assert.equal(data.concurrency, 6);
  const fallback = await (await worker.fetch(new Request('https://akm.dev/regfinder/api/config'), { ASSETS: env.ASSETS })).json();
  assert.equal(fallback.concurrency, 10);
});

test('the lookup returns a registered vehicle', async () => {
  const calls = fakeServices();
  const data = await (await post('lookup', { plate: 'T377DBW' })).json();
  assert.equal(data.vehicle.make, 'TOYOTA');
  assert.equal(data.vehicle.mot, 'Valid');
  assert.equal(calls[0].key, 'test-key');
});

test('the lookup returns null for a plate that is not registered', async () => {
  fakeServices();
  assert.deepEqual(await (await post('lookup', { plate: 'T377DBX' })).json(), { vehicle: null });
});

test('a DVLA throttle goes back to the browser with the wait time', async () => {
  fakeServices();
  const response = await post('lookup', { plate: 'SLOW1' });
  assert.equal(response.status, 429);
  assert.equal((await response.json()).retryAfter, 3);
});

test('other DVLA errors give status 502', async () => {
  fakeServices();
  assert.equal((await post('lookup', { plate: 'ERR1' })).status, 502);
});

test('the model lookup reads the car info from the page', async () => {
  const calls = fakeServices();
  const data = await (await post('model', { plate: 'T377DBW' })).json();
  assert.equal(data.model, 'TOYOTA MR2 GT-I');
  assert.equal(calls[0].body, 'vrm=T377DBW');
});

test('carInfoText handles nested and missing elements', () => {
  assert.equal(carInfoText('<div data-test="carInfo">A <div>B</div> C</div><div>D</div>'), 'A B C');
  assert.equal(carInfoText('<div>nothing</div>'), null);
});

test('the API refuses bad input', async () => {
  fakeServices();
  for (const body of [{}, { plate: '' }, { plate: 'AB12 CDE' }, { plate: '<script>' }, { plate: ['AB12CDE'] }]) {
    assert.equal((await post('lookup', body)).status, 400, JSON.stringify(body));
  }
});

test('the API refuses requests from other sites', async () => {
  fakeServices();
  assert.equal((await post('lookup', { plate: 'T377DBW' }, { Origin: 'https://evil.example' })).status, 403);
  assert.equal((await post('lookup', { plate: 'T377DBW' }, { Origin: 'https://akm.dev' })).status, 200);
});

test('the lookup says so when the API key is missing', async () => {
  assert.equal((await post('lookup', { plate: 'T377DBW' }, {}, { ASSETS: env.ASSETS })).status, 503);
});

test('other paths go to the static files', async () => {
  assert.equal(await (await worker.fetch(new Request('https://akm.dev/regfinder/'), env)).text(), 'page');
});

test('searches at the same time get only their own results', async () => {
  // The Flask version kept results in global variables, so two people saw each other's results.
  // The Worker keeps no state between requests. Each request returns only the vehicle for its own plate.
  globalThis.fetch = async (url, init) => {
    const { registrationNumber } = JSON.parse(init.body);
    await new Promise((r) => setTimeout(r, Math.random() * 20));
    return Response.json({ make: `MAKE-${registrationNumber}`, colour: 'BLACK' });
  };
  const plates = Array.from({ length: 40 }, (_, i) => `AB${String(i).padStart(2, '0')}CDE`);
  const results = await Promise.all(plates.map((plate) => post('lookup', { plate }).then((r) => r.json())));
  results.forEach((data, i) => {
    assert.equal(data.vehicle.registration, plates[i]);
    assert.equal(data.vehicle.make, `MAKE-${plates[i]}`);
  });
});
