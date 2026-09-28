// The Reg-Finder Worker. It serves the page from public/ and gives three API routes:
//   GET  /regfinder/api/config  the start concurrency for the DVLA queue
//   POST /regfinder/api/lookup  checks one plate against the DVLA Vehicle Enquiry API
//   POST /regfinder/api/model   gets the model of one vehicle from instantcarcheck.co.uk
// The browser makes the candidate plates and runs the queues. The API key stays secret here.

const DVLA_URL = 'https://driver-vehicle-licensing.api.gov.uk/vehicle-enquiry/v1/vehicles';
const MODEL_URL = 'https://www.instantcarcheck.co.uk/product-selection';
/** The DVLA does not publish its limit. The limit is set for each API key. Set DVLA_CONCURRENCY to change this value. */
const DEFAULT_CONCURRENCY = 10;
const PLATE = /^[A-Z0-9]{2,8}$/;

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...headers } });

/** Reads and checks the plate in the request body. Returns null if the plate is not valid. */
async function readPlate(request) {
  const body = await request.json().catch(() => null);
  return typeof body?.plate === 'string' && PLATE.test(body.plate) ? body.plate : null;
}

async function handleLookup(plate, env) {
  if (!env.DVLA_API_KEY) return json({ error: 'The lookup is not set up yet.' }, 503);
  const response = await fetch(DVLA_URL, {
    method: 'POST',
    headers: { 'x-api-key': env.DVLA_API_KEY, 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationNumber: plate }),
  });
  if (response.status === 404 || response.status === 400) return json({ vehicle: null });
  if (response.status === 429) {
    // Pass the throttle to the browser, so that its queue slows down.
    const retryAfter = Number(response.headers.get('Retry-After')) || 1;
    return json({ error: 'Throttled', retryAfter }, 429, { 'Retry-After': String(retryAfter) });
  }
  if (!response.ok) return json({ error: `DVLA status ${response.status}` }, 502);
  const v = await response.json();
  return json({
    vehicle: {
      registration: plate,
      make: v.make ?? '',
      colour: v.colour ?? '',
      year: v.yearOfManufacture ?? null,
      fuel: v.fuelType ?? '',
      engine: v.engineCapacity ?? null,
      tax: v.taxStatus ?? '',
      mot: v.motStatus ?? '',
    },
  });
}

/** Returns the text inside the first element with data-test="carInfo". It counts nested divs to find the end. */
export function carInfoText(html) {
  const start = html.search(/<div[^>]*data-test=["']carInfo["'][^>]*>/i);
  if (start < 0) return null;
  const open = html.indexOf('>', start) + 1;
  const tag = /<\/?div\b[^>]*>/gi;
  tag.lastIndex = open;
  let depth = 1;
  let m;
  while ((m = tag.exec(html))) {
    depth += m[0][1] === '/' ? -1 : 1;
    if (depth === 0) {
      const text = html.slice(open, m.index).replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
      return text || null;
    }
  }
  return null;
}

async function handleModel(plate) {
  // The same request as the Flask version. The browser sends model requests one at a time.
  const response = await fetch(MODEL_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-GB,en;q=0.6',
      Origin: 'https://www.instantcarcheck.co.uk',
      Referer: 'https://www.instantcarcheck.co.uk/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36',
    },
    body: `vrm=${plate}`,
  });
  if (!response.ok) return json({ model: null, status: response.status });
  return json({ model: carInfoText(await response.text()) });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/regfinder/api/')) return env.ASSETS.fetch(request);

    // Accept API requests only from the page on this site.
    const origin = request.headers.get('Origin');
    if (origin && new URL(origin).host !== url.host) return json({ error: 'Forbidden' }, 403);

    if (url.pathname === '/regfinder/api/config' && request.method === 'GET') {
      return json({ concurrency: Number(env.DVLA_CONCURRENCY) || DEFAULT_CONCURRENCY });
    }
    if (request.method !== 'POST') return json({ error: 'Not found.' }, 404);
    const plate = await readPlate(request);
    if (!plate) return json({ error: 'Send one plate of letters and digits.' }, 400);
    if (url.pathname === '/regfinder/api/lookup') return handleLookup(plate, env);
    if (url.pathname === '/regfinder/api/model') return handleModel(plate);
    return json({ error: 'Not found.' }, 404);
  },
};
