import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SerialQueue, runQueue } from '../public/regfinder/queue.js';

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test('the queue does every item and never passes the concurrency', async () => {
  let active = 0;
  let peak = 0;
  const done = [];
  await runQueue({
    items: [...Array(30).keys()].values(),
    max: 4,
    task: async (n) => {
      peak = Math.max(peak, ++active);
      await sleep(5);
      active--;
      done.push(n);
    },
  });
  assert.equal(done.length, 30);
  assert.equal(peak, 4);
});

test('a throttle puts the item back and halves the concurrency', async () => {
  const seen = [];
  const limits = [];
  let throttledOnce = false;
  await runQueue({
    items: [...Array(12).keys()].values(),
    max: 8,
    onChange: ({ limit }) => limits.push(limit),
    task: async (n) => {
      await sleep(2);
      if (n === 3 && !throttledOnce) {
        throttledOnce = true;
        return { throttled: true, retryAfter: 0.02 };
      }
      seen.push(n);
    },
  });
  assert.deepEqual([...seen].sort((a, b) => a - b), [...Array(12).keys()]);
  assert.ok(limits.includes(4), `limits: ${limits}`);
});

test('the queue stops when asked', async () => {
  let stop = false;
  let count = 0;
  await runQueue({
    items: [...Array(1000).keys()].values(),
    max: 2,
    stopped: () => stop,
    task: async () => {
      await sleep(1);
      if (++count === 10) stop = true;
    },
  });
  assert.ok(count < 20);
});

test('the serial queue runs one task at a time with a gap', async () => {
  let active = 0;
  let peak = 0;
  const starts = [];
  const q = new SerialQueue(async () => {
    starts.push(Date.now());
    peak = Math.max(peak, ++active);
    await sleep(5);
    active--;
  }, 100);
  q.push(1);
  q.push(2);
  q.push(3);
  await q.idle();
  assert.equal(peak, 1);
  assert.equal(starts.length, 3);
  for (let i = 1; i < starts.length; i++) assert.ok(starts[i] - starts[i - 1] >= 100, 'gap');
});
