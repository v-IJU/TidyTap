# TidyTap

Take a photo of a messy room. Tap any object in it. TidyTap tells you where
that object should go. Built as an installable PWA (Next.js) that runs
object detection **on-device in the browser** — no backend or API key
required by default. Optionally, tapping an object can also call Groq or
Gemini for a sharper AI-written tip — see "Choosing an AI provider" below.

## How it works

1. **Capture** — `CameraCapture.tsx` opens the phone's camera (or file
   picker on desktop) via a plain `<input type="file" capture="environment">`.
2. **Detect** — `SceneCanvas.tsx` loads the photo, then runs
   [`@tensorflow-models/coco-ssd`](https://github.com/tensorflow/tfjs-models/tree/master/coco-ssd)
   (TensorFlow.js) directly in the browser to find objects and their
   bounding boxes.
3. **Tap** — each detected object gets an invisible tap target positioned
   over its bounding box. Tapping it looks up a suggestion.
4. **Suggest** — `lib/objectMap.ts` maps the detected label (e.g. `"cup"`,
   `"backpack"`, `"book"`) to a friendly name + a "goes to" suggestion,
   shown in the sticky-note-style sheet at the bottom.
5. **Track** — tapped objects get a checkmark and count toward the
   progress dots at the top. "Retake photo" resets everything.

## Choosing an AI provider (`AI_PROVIDER`)

Object detection (COCO-SSD) **always** runs locally in the browser, for
every mode below — that part never touches an API or needs a key. What
changes is only the _enrichment_ step: the richer name + tip you see after
a tap. This is controlled by one line in `.env.local`:

```bash
cp .env.local.example .env.local
```

Then set **one** of:

```bash
AI_PROVIDER=none     # default. No key needed. Pure on-device: COCO-SSD +
                      # lib/objectMap.ts dictionary. No network call at all
                      # on tap. Fastest, free, works offline after first load.

AI_PROVIDER=groq     # also set GROQ_API_KEY (free key: console.groq.com/keys)
                      # Fast inference, generous-ish free tier, but the
                      # default model (qwen3.6-27b) is a "thinking" model
                      # that needs the reasoning_effort workaround already
                      # built into app/api/identify/route.ts, and its free
                      # tokens-per-minute limit is easy to hit with several
                      # taps in a row.

AI_PROVIDER=gemini   # also set GEMINI_API_KEY (free key: aistudio.google.com/app/apikey)
                      # Free tier is more usable for repeated testing, has
                      # a native structured-JSON mode that works cleanly
                      # with image input, and no hidden-thinking-tokens
                      # surprise.
```

**Restart `npm run dev` after changing `.env.local`** — Next.js only reads
it on server startup, so edits made while the server is running won't
take effect until you stop and restart.

Whichever mode you pick, tapping an object always shows the local
dictionary answer _immediately_ first. With `groq` or `gemini` set, that
answer then silently upgrades in place ~1.5–4 seconds later once the
model responds. If the provider call fails, is slow, or the key is
missing, the local answer just stays as the final one — the app never
blocks on the network either way.

**Where to look in the code:**

- `app/api/identify/route.ts` — everything provider-related lives here.
  `callGroq()` and `callGemini()` are separate, clearly-labeled functions;
  the `POST` handler at the bottom just picks one based on `AI_PROVIDER`.
  To add a fourth provider, copy the shape of either function and add one
  line to that switch.
- `lib/aiSuggest.ts` — the client-side fetch to `/api/identify`. Doesn't
  need to change no matter which provider you pick server-side.
- `lib/objectMap.ts` — the local dictionary, used in `none` mode and as
  the fallback in every other mode.

**Cost/latency notes, if using `groq` or `gemini`:** every tap becomes one
API call. Both have free tiers suitable for a school project, but check
current rates (https://groq.com/pricing, https://ai.google.dev/pricing)
before a live demo with lots of taps. Groq's free tier has a
tokens-per-minute limit that a burst of rapid taps can hit — if you see
`429`s in the terminal, just pause a few seconds between taps; nothing
breaks, that tap just keeps its local-dictionary answer. Both providers'
model lineups change fairly often — if `GROQ_VISION_MODEL` or
`GEMINI_VISION_MODEL` starts erroring, check their docs pages (linked in
`route.ts`) for the current vision-capable model name.

## Getting started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. To try it on your phone, make sure your
phone and computer are on the same Wi-Fi network and visit
`http://<your-computer's-local-ip>:3000`, or deploy it (e.g. to Vercel)
and open the live URL on your phone.

To install it as an app on your phone: open the URL in Chrome (Android)
or Safari (iOS) and choose **"Add to Home Screen"**.

For the offline-caching service worker to kick in, use a production
build rather than `next dev`:

```bash
npm run build
npm run start
```

## Notes & limitations

- **First load needs internet.** The COCO-SSD model weights (a few MB)
  are fetched from a CDN the first time detection runs. The browser
  caches them after that.
- **The detector only knows 80 general categories** (COCO dataset):
  things like `backpack`, `book`, `cup`, `chair`, `cell phone`, `bottle`,
  etc. It won't say "blue sneaker" — just "shoe"-adjacent classes it was
  trained on. See the full list and how each maps to a suggestion in
  `lib/objectMap.ts` — that's the file to edit to make suggestions
  smarter or more specific.
- **Confidence threshold** is set to 0.55 in `lib/detect.ts` — lower it
  to catch more (noisier) detections, raise it to be stricter.
- Furniture-type classes (chair, couch, bed, table, TV, fridge...) get a
  "already in place" style tip instead of a destination, since you
  don't usually move those to tidy up.

## Project structure

```
app/
  layout.tsx              root layout, PWA metadata, registers the service worker
  page.tsx                top-level state: capture -> detect -> tap -> tidy -> AI upgrade
  globals.css              all styling (CSS variables + component classes)
  api/identify/route.ts    provider-agnostic AI route (none / groq / gemini)
components/
  CameraCapture.tsx        photo capture / upload screen
  SceneCanvas.tsx           renders the photo, runs detection, draws tap targets, crops taps
  SuggestionSheet.tsx       the sticky-note bottom sheet (with AI-tip loading state)
  ProgressStrip.tsx         top bar: brand, retake button, tidied-count dots
  ServiceWorkerRegister.tsx registers public/sw.js on mount
lib/
  detect.ts                loads TF.js + COCO-SSD, runs detection
  objectMap.ts              label -> {name, suggestion} local fallback lookup table
  aiSuggest.ts               client helper that calls /api/identify
public/
  manifest.json             PWA manifest
  sw.js                      minimal offline app-shell cache
  icons/                     app icons
```

## Gemini

500 taps/day is generous for a school project — you'd need to tap roughly 500 objects across all your testing in a single day to hit it, and even then it resets daily. Nothing to worry about for a demo. If you ever do see a 429 from Gemini, the app already falls back silently to the local dictionary answer for that tap (same behavior as the Groq fallback), so it won't break anything mid-demo.
