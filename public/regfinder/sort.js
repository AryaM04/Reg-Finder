// Sort orders for the results. Each result is { vehicle, model, index }, where index is the order in which it was found.

const text = (s) => (s ?? '').toString().trim().toUpperCase();
/** Compares two texts. Empty or unknown values go last in every order. */
const byText = (a, b) => (!a ? (b ? 1 : 0) : !b ? -1 : a.localeCompare(b, 'en', { numeric: true }));
/** Compares two years. Unknown years go last in every order. */
const byYear = (a, b, newest) => (a == null ? (b == null ? 0 : 1) : b == null ? -1 : newest ? b - a : a - b);

export const SORTS = {
  found: { label: 'Order found', compare: (a, b) => a.index - b.index },
  newest: { label: 'Newest first', compare: (a, b) => byYear(a.vehicle.year, b.vehicle.year, true) },
  oldest: { label: 'Oldest first', compare: (a, b) => byYear(a.vehicle.year, b.vehicle.year, false) },
  make: { label: 'Make (A to Z)', compare: (a, b) => byText(text(a.vehicle.make), text(b.vehicle.make)) },
  model: { label: 'Model (A to Z)', compare: (a, b) => byText(text(a.model), text(b.model)) },
  colour: { label: 'Colour (A to Z)', compare: (a, b) => byText(text(a.vehicle.colour), text(b.vehicle.colour)) },
  registration: { label: 'Registration (A to Z)', compare: (a, b) => byText(a.vehicle.registration, b.vehicle.registration) },
};

/** Returns a sorted copy. Results that are equal stay in the order found. */
export function sortResults(results, key) {
  const sort = SORTS[key] ?? SORTS.found;
  return [...results].sort((a, b) => sort.compare(a, b) || a.index - b.index);
}
