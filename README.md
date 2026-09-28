# Reg-Finder

Reg-Finder finds UK vehicles from a partial number plate. Type `?` for each unknown character. Reg-Finder makes every valid plate that fits the pattern and checks each plate against the DVLA Vehicle Enquiry API.

Try it at [akm.dev/regfinder](https://akm.dev/regfinder).

## How it works

- `public/regfinder/plates.js` makes the candidate plates in the browser, one at a time. It knows the current, prefix, suffix, dateless, Northern Ireland and diplomatic formats. It uses only the characters that each format allows in each position.
- `public/regfinder/queue.js` has two queues:
  - The DVLA queue checks many plates at the same time. It starts at `DVLA_CONCURRENCY` in `wrangler.toml` (the default is 10). When the DVLA replies 429 ("too many requests"), the queue puts the plate back, halves the concurrency and waits for the time that the DVLA gives. After a run of successes, it adds one to the concurrency again, up to the start value.
  - The model queue gets the model of each match from instantcarcheck.co.uk. It sends one request at a time, with a 100 ms gap, which is the same rate as the Flask version. Do not make it faster, or the site can block the Worker.
- `src/index.js` is a Cloudflare Worker. It checks one plate for each request, so that the browser queue controls the concurrency. The DVLA API key stays a secret on the server.
- The page filters the results by make, model and colour. It also shows the fuel type, the engine size and the MOT and tax status.
- When a search is done, the page shows a desktop notification. The browser asks for permission on the first search.

The DVLA does not publish one concurrency limit for the Vehicle Enquiry API. It sets a limit in requests for each second for each API key. If you know the limit of your key, set `DVLA_CONCURRENCY` to that value.

## Search limit

The page allows a maximum of 3,000 plates for each search, to protect the API quota. To remove the limit, type `unlock` when no text box has focus. A "Search limit off" badge shows. Type `unlock` again to turn the limit back on.

CAUTION: Large searches use many DVLA requests and many Worker requests. The free Workers plan allows 100,000 requests each day.

## Example searches

Make your searches as narrow as possible.

A good search finds all BMW vehicles with plates that start with AB12X:

- Registration: `AB12X??`
- Make: `BMW`

A bad search finds all blue Ford Focus cars with a full unknown plate. It makes millions of plates.

## Test

1. Run `npm test`.
2. Run `npm run dev` to start the Worker on your computer. Without a key, the lookup returns status 503.

## Deploy

GitHub Actions deploys the Worker on each push to `main` (`.github/workflows/deploy.yml`). The workflow runs the tests first. If a test fails, it does not deploy.

### Set up the automatic deploys (one time)

1. In the Cloudflare dashboard, go to My Profile > API Tokens.
2. Create a token from the "Edit Cloudflare Workers" template. Set the account to your account and the zone to `akm.dev`.
3. Copy your account ID. `npx wrangler whoami` shows it.
4. In the GitHub repository, go to Settings > Secrets and variables > Actions.
5. Add the secret `CLOUDFLARE_API_TOKEN` with the token.
6. Add the secret `CLOUDFLARE_ACCOUNT_ID` with the account ID.

The DVLA API key stays a Worker secret in Cloudflare. A deploy does not change it.

To deploy without a push, open the Actions tab, select "Deploy" and click "Run workflow".

### Deploy by hand

1. Get a DVLA Vehicle Enquiry API key from the DVLA developer portal.
2. Run `npx wrangler login`.
3. Run `npx wrangler secret put DVLA_API_KEY` and paste the key.
4. Run `npm run deploy`.

The route in `wrangler.toml` sends `akm.dev/regfinder*` to the Worker. The portfolio on Cloudflare Pages serves all other paths on `akm.dev`. The page uses the fonts and the icon of the portfolio.

## History

The first version was a Flask app on an Apache server. It is in the git history before the move to Cloudflare Workers.
