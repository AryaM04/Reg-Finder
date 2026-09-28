# Reg-Finder

Reg-Finder finds UK vehicles from a partial number plate. Type `?` for each unknown character. Reg-Finder makes every valid plate that fits the pattern and checks each plate against the DVLA Vehicle Enquiry API.

Try it at [akm.dev/regfinder](https://akm.dev/regfinder).

## How it works

- `public/regfinder/plates.js` makes the candidate plates in the browser. It knows the current, prefix, suffix, dateless, Northern Ireland and diplomatic formats. It uses only the characters that each format allows in each position.
- `src/index.js` is a Cloudflare Worker. It checks batches of up to 20 plates against the DVLA API. The API key stays a secret on the server.
- The page filters the results by make and colour. It also shows the fuel type, the engine size and the MOT and tax status.

The DVLA API does not give the model of a vehicle. Thus, you cannot filter by model.

## Example searches

Make your searches as narrow as possible.

A good search finds all BMW vehicles with plates that start with AB12X:

- Registration: `AB12X??`
- Make: `BMW`

A bad search finds all blue Fords with a full unknown plate. It makes too many plates, and the page refuses it.

## Test

1. Run `npm test`.
2. Run `npm run dev` to start the Worker on your computer. Without a key, the lookup returns status 503.

## Deploy

1. Get a DVLA Vehicle Enquiry API key from the DVLA developer portal.
2. Run `npx wrangler login`.
3. Run `npx wrangler secret put DVLA_API_KEY` and paste the key.
4. Run `npm run deploy`.

The route in `wrangler.toml` sends `akm.dev/regfinder*` to the Worker. The portfolio on Cloudflare Pages serves all other paths on `akm.dev`. The page uses the fonts and the icon of the portfolio.

CAUTION: Each plate is one DVLA request. The page allows a maximum of 3,000 plates for each search, to protect the API quota.

## History

The first version was a Flask app on an Apache server. It is in the git history before the move to Cloudflare Workers.
