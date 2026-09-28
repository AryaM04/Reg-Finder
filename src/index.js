// The Reg-Finder Worker. It serves the page from public/ and checks plates against the DVLA Vehicle Enquiry API.
// The browser makes the candidate plates and sends them here in small batches, so that the API key stays secret.

const DVLA_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
/** The maximum plates in one request. The free Workers plan allows 50 subrequests for each request. */
const MAX_BATCH = 20;
/** The number of DVLA requests at the same time. */
const PARALLEL = 5;
const PLATE = /^[A-Z0-9]{2,8}$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' } });

/** Returns the vehicle for one plate, or null if the plate is not registered. */
async function lookup(plate, key) {
  const response = await fetch(DVLA_URL, {
    method: 'POST',
    headers: { 'x-api-key': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber: plate }),
  });
  if (response.status === 404 || response.status === 400) return null;
  if (!response.ok) throw new Error(`DVLA status ${response.status}`);
  const v = await response.json();
  return {
    registration: plate,
    make: v.make ?? '',
    colour: v.colour ?? '',
    year: v.yearOfManufacture ?? null,
    fuel: v.fuelType ?? '',
    engine: v.engineCapacity ?? null,
    tax: v.taxStatus ?? '',
    mot: v.motStatus ?? '',
  };
}

async function handleLookup(request, env) {
  if (!env.DVLA_API_KEY) return json({ error: 'The lookup is not set up yet.' }, 503);
  // Accept requests only from the page on this site.
  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) return json({ error: 'Forbidden' }, 403);

  const body = await request.json().catch(() => null);
  const plates = Array.isArray(body?.plates) ? body.plates : [];
  if (plates.length === 0 || plates.length > MAX_BATCH || !plates.every((p) => typeof p === 'string' && PLATE.test(p))) {
    return json({ error: `Send 1 to ${MAX_BATCH} plates of letters and digits.` }, 400);
  }

  const vehicles = [];
  let failed = 0;
  for (let i = 0; i < plates.length; i += PARALLEL) {
    const results = await Promise.allSettled(plates.slice(i, i + PARALLEL).map((p) => lookup(p, env.DVLA_API_KEY)));
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) vehicles.push(r.value);
      if (r.status === 'rejected') failed++;
    }
  }
  return json({ vehicles, failed });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/regfinder/api/lookup') {
      if (request.method !== 'POST') return json({ error: 'Use POST.' }, 405);
      return handleLookup(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
