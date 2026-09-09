# assets/linkedin

LinkedIn banner and profile copy, built from the same tokens and copy as the site.
Not part of the site build: nothing here ships to `dist/`.

- `gen-banner.py` — writes `banner-{es,en}.html`. Copy comes from `handoff/content.json`
  and the figures from `src/lib/ui.ts`; the node cloud uses the projection of
  `src/lib/motion/network.ts` with a fixed seed, so the output is reproducible.
- `shot.mjs` — renders each HTML to `banner-{es,en}.png`, 1584×396 at 2x (3168×792),
  the size LinkedIn asks for.
- `profile.md` — headline, about, experience and a profile checklist, Spanish and English.

The `.html` and `.png` are generated and git-ignored: they embed the woff2 fonts as
base64 and weigh over a megabyte together.

## Regenerate

```bash
python3 assets/linkedin/gen-banner.py
bun assets/linkedin/shot.mjs
```

Run both whenever the hero copy in `handoff/content.json` or the figures in
`src/lib/ui.ts` change, or the banner drifts from the site.

## Layout note

The lower-left corner is left empty on purpose: LinkedIn draws the profile photo there.
