import { countPlates, iteratePlates, normalise } from './plates.js';
import { SerialQueue, runQueue } from './queue.js';
import { SORTS, sortResults } from './sort.js';

/** The largest search that the page allows. Each plate is one DVLA request. Type "unlock" outside a text box to remove the limit. */
const MAX_PLATES = 3000;
/** The gap between model lookups. It is the same rate as the Flask version, so that the model site does not block us. */
const MODEL_GAP_MS = 100;

const $ = (id) => document.getElementById(id);
let unlocked = false;
let stopped = false;
let concurrency = 10;
/** The results of the current search: { vehicle, model, index, el }. */
let results = [];

for (const [key, { label }] of Object.entries(SORTS)) $('sort').append(new Option(label, key));

/** Puts the result cards in the order that the user picked. append() moves a card that is already on the page. */
function render() {
  $('results').append(...sortResults(results, $('sort').value).map((r) => r.el));
  $('toolbar').hidden = results.length < 2;
}
$('sort').addEventListener('change', render);

fetch('/regfinder/api/config')
  .then((r) => r.json())
  .then((c) => (concurrency = c.concurrency ?? concurrency))
  .catch(() => {});

function describe() {
  const pattern = normalise($('plate').value);
  if (!pattern) return ($('count').textContent = 'Use ? for each unknown character.');
  const n = countPlates(pattern);
  $('count').textContent =
    n === 0
      ? "That doesn't match any UK plate format."
      : n > MAX_PLATES && !unlocked
        ? `That's up to ${n.toLocaleString()} plates. Fill in a few more characters (the limit is ${MAX_PLATES.toLocaleString()}).`
        : `Up to ${n.toLocaleString()} plate${n === 1 ? '' : 's'} to check.`;
}

// Type "unlock" anywhere outside a text box to turn the search limit on or off.
let typed = '';
document.addEventListener('keydown', (e) => {
  if (e.target.closest?.('input, textarea, select, [contenteditable]') || e.key.length !== 1) return;
  typed = (typed + e.key.toLowerCase()).slice(-6);
  if (typed !== 'unlock') return;
  typed = '';
  unlocked = !unlocked;
  $('unlocked').hidden = !unlocked;
  describe();
});

function notify(title, body) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const n = new Notification(title, { body, icon: '/assets/favicon/akm.ico', tag: 'regfinder' });
  n.onclick = () => {
    window.focus();
    n.close();
  };
}

function card(v) {
  // Each result opens the full vehicle check on carcheck.co.uk, like the Flask version.
  const el = document.createElement('a');
  el.className = 'vehicle';
  el.href = `https://www.carcheck.co.uk/reg?i=${encodeURIComponent(v.registration)}`;
  el.target = '_blank';
  el.rel = 'noopener noreferrer';
  el.title = `Open the full check for ${v.registration} on carcheck.co.uk`;
  const title = document.createElement('p');
  title.className = 'reg';
  title.textContent = v.registration;
  const details = document.createElement('p');
  details.textContent = [v.colour, v.make, v.year].filter(Boolean).join(' · ');
  const model = document.createElement('p');
  model.className = 'model';
  model.textContent = 'Looking up the model…';
  const extra = document.createElement('p');
  extra.className = 'hint';
  extra.textContent = [v.fuel, v.engine && `${v.engine} cc`, v.mot && `MOT: ${v.mot}`, v.tax && `Tax: ${v.tax}`].filter(Boolean).join(' · ');
  el.append(title, details, model, extra);
  return { el, model };
}

const post = (path, plate) =>
  fetch(`/regfinder/api/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plate }) });

async function search(event) {
  event.preventDefault();
  const pattern = normalise($('plate').value);
  const make = $('make').value.trim().toUpperCase();
  const model = $('model').value.trim().toUpperCase();
  const colour = $('colour').value.trim().toUpperCase();
  const total = countPlates(pattern);
  $('error').textContent = '';
  if (total === 0) return ($('error').textContent = "That doesn't match any UK plate format.");
  if (total > MAX_PLATES && !unlocked) return ($('error').textContent = 'That search is too big. Fill in a few more characters.');

  // Ask once for permission to show a desktop notification when the search is done.
  if ('Notification' in window && Notification.permission === 'default') Notification.requestPermission();

  stopped = false;
  $('search').disabled = true;
  $('stop').hidden = false;
  $('progress').hidden = false;
  $('results').replaceChildren();
  results = [];
  $('toolbar').hidden = true;
  $('status').textContent = 'Starting the search…';
  $('fill').style.width = '0%';
  let checked = 0;
  let found = 0;
  let failed = 0;
  let limit = concurrency;
  let fatal = null;

  const status = () => {
    $('fill').style.width = `${(100 * checked) / total}%`;
    const models = modelQueue.size ? ` · ${modelQueue.size} model${modelQueue.size === 1 ? '' : 's'} to look up` : '';
    $('status').textContent = `Checked ${checked.toLocaleString()} of up to ${total.toLocaleString()} · ${found} found · ${limit} at a time${models}`;
  };

  // The model queue: one request at a time, with a gap, so that the model site does not block us.
  const modelQueue = new SerialQueue(async ({ plate, cardParts, result }) => {
    const data = await (await post('model', plate)).json().catch(() => ({}));
    cardParts.model.textContent = data.model ?? 'Model unknown';
    result.model = data.model ?? null;
    if (model && data.model && !data.model.toUpperCase().includes(model)) {
      cardParts.el.remove();
      results = results.filter((r) => r !== result);
      found--;
    }
    if ($('sort').value === 'model') render();
    status();
  }, MODEL_GAP_MS);

  // The DVLA queue: many requests at the same time. It slows down when the DVLA says "too many requests".
  await runQueue({
    items: iteratePlates(pattern),
    max: concurrency,
    stopped: () => stopped || fatal !== null,
    onChange: (s) => (limit = s.limit),
    task: async (plate) => {
      const response = await post('lookup', plate);
      const data = await response.json().catch(() => ({}));
      if (response.status === 429) return { throttled: true, retryAfter: data.retryAfter };
      checked++;
      if (response.status === 503) fatal = data.error;
      else if (!response.ok) failed++;
      const v = data.vehicle;
      if (v && (!make || v.make.toUpperCase().includes(make)) && (!colour || v.colour.toUpperCase().includes(colour))) {
        found++;
        const cardParts = card(v);
        const result = { vehicle: v, model: null, index: results.length, el: cardParts.el };
        results.push(result);
        render();
        modelQueue.push({ plate, cardParts, result });
      }
      status();
    },
  });

  if (stopped || fatal) modelQueue.stop();
  await modelQueue.idle();

  if (fatal) $('error').textContent = fatal;
  $('fill').style.width = fatal ? '0%' : '100%';
  const summary = `${found} vehicle${found === 1 ? '' : 's'} found.${failed ? ` ${failed} plate${failed === 1 ? '' : 's'} could not be checked.` : ''}`;
  $('status').textContent = `${fatal ? 'The search stopped early' : stopped ? 'Stopped' : 'Done'}. ${summary}`;
  if (!fatal) notify(stopped ? 'Reg-Finder search stopped' : 'Reg-Finder search done', `${pattern}: ${summary}`);
  $('search').disabled = false;
  $('stop').hidden = true;
}

$('plate').addEventListener('input', describe);
$('stop').addEventListener('click', () => (stopped = true));
$('form').addEventListener('submit', search);
