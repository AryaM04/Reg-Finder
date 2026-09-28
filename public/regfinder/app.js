import { countPlates, generatePlates, normalise } from './plates.js';

/** The largest search that the page allows. Each plate is one DVLA request. */
const MAX_PLATES = 3000;
const BATCH = 20;

const $ = (id) => document.getElementById(id);
const form = $('form');
let stopped = false;

function describe() {
  const pattern = normalise($('plate').value);
  if (!pattern) return ($('count').textContent = 'Use ? for each unknown character.');
  const n = countPlates(pattern);
  $('count').textContent =
    n === 0
      ? "That doesn't match any UK plate format."
      : n > MAX_PLATES
        ? `That's up to ${n.toLocaleString()} plates. Fill in a few more characters (the limit is ${MAX_PLATES.toLocaleString()}).`
        : `Up to ${n.toLocaleString()} plate${n === 1 ? '' : 's'} to check.`;
}

function card(v) {
  const el = document.createElement('article');
  el.className = 'vehicle';
  const title = document.createElement('p');
  title.className = 'reg';
  title.textContent = v.registration;
  const details = document.createElement('p');
  details.textContent = [v.colour, v.make, v.year].filter(Boolean).join(' · ');
  const extra = document.createElement('p');
  extra.className = 'hint';
  extra.textContent = [v.fuel, v.engine && `${v.engine} cc`, v.mot && `MOT: ${v.mot}`, v.tax && `Tax: ${v.tax}`].filter(Boolean).join(' · ');
  el.append(title, details, extra);
  return el;
}

async function search(event) {
  event.preventDefault();
  const pattern = normalise($('plate').value);
  const make = $('make').value.trim().toUpperCase();
  const colour = $('colour').value.trim().toUpperCase();
  const plates = generatePlates(pattern);
  $('error').textContent = '';
  if (plates.length === 0) return ($('error').textContent = "That doesn't match any UK plate format.");
  if (plates.length > MAX_PLATES) return ($('error').textContent = 'That search is too big. Fill in a few more characters.');

  stopped = false;
  $('search').disabled = true;
  $('stop').hidden = false;
  $('progress').hidden = false;
  $('results').replaceChildren();
  let found = 0;
  let failed = 0;
  let broken = false;

  for (let i = 0; i < plates.length && !stopped; i += BATCH) {
    const batch = plates.slice(i, i + BATCH);
    $('status').textContent = `Checking ${batch[0]}… (${i.toLocaleString()} of ${plates.length.toLocaleString()}, ${found} found)`;
    $('fill').style.width = `${(100 * i) / plates.length}%`;
    try {
      const response = await fetch('/regfinder/api/lookup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plates: batch }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Something went wrong.');
      failed += data.failed;
      for (const v of data.vehicles) {
        if (make && !v.make.toUpperCase().includes(make)) continue;
        if (colour && !v.colour.toUpperCase().includes(colour)) continue;
        found++;
        $('results').append(card(v));
      }
    } catch (error) {
      $('error').textContent = error.message;
      broken = true;
      break;
    }
  }

  $('fill').style.width = broken ? '0%' : '100%';
  $('status').textContent = `${broken ? 'The search stopped early' : stopped ? 'Stopped' : 'Done'}. ${found} vehicle${found === 1 ? '' : 's'} found.${failed ? ` ${failed} plate${failed === 1 ? '' : 's'} could not be checked.` : ''}`;
  $('search').disabled = false;
  $('stop').hidden = true;
}

$('plate').addEventListener('input', describe);
$('stop').addEventListener('click', () => (stopped = true));
form.addEventListener('submit', search);
