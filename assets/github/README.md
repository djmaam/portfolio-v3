# assets/github

GitHub profile README, built from the same tokens and copy as the site.
Not part of the site build: nothing here ships to `dist/`.

- `gen-header.py` — writes `header-{dark,light}.html`. The colors are the two branches of
  every `light-dark()` token in `src/styles/app.css`, the copy is the hero of
  `handoff/content.json` and the figures come from `src/lib/ui.ts`; the node cloud uses
  the projection of `src/lib/motion/network.ts` with a fixed seed, so the output is
  reproducible and both themes get the identical cloud.
- `shot.mjs` — renders each HTML to `header-{dark,light}.png`, 1280×360 at 2x (2560×720).
- `profile-readme.md` — the profile README itself, ready to publish.
- `workflows/snake.yml` — the GitHub Action that draws the contribution grid as a snake
  and pushes the two SVGs to the `output` branch of the profile repo, once a day. Goes to
  `.github/workflows/` of that repo, not of this one.

The `.html` and `.png` are generated and git-ignored: they embed the woff2 fonts as
base64 and weigh over a megabyte together.

## Regenerate

```bash
python3 assets/github/gen-header.py
bun assets/github/shot.mjs
```

Run both whenever the hero copy in `handoff/content.json`, the figures in `src/lib/ui.ts`
or the color tokens in `src/styles/app.css` change.

## Publish

GitHub renders the README of a repository named after the account on the profile page.
That repository does not exist yet:

```bash
gh repo create djmaam --public --description "Profile README" --clone
cd djmaam && mkdir -p assets
cp ../portfolio-v3/assets/github/profile-readme.md README.md
cp ../portfolio-v3/assets/github/header-*.png assets/
mkdir -p .github/workflows
cp ../portfolio-v3/assets/github/workflows/snake.yml .github/workflows/
git add . && git commit -m "feat: profile README" && git push
gh workflow run "Contribution snake" --repo djmaam/djmaam
```

The snake images 404 until that first run finishes and the `output` branch exists.

The `<picture>` at the top swaps the header with the reader's GitHub theme, and the two
stats cards are drawn on a transparent background for the same reason.

## English only

The site and the LinkedIn profile are bilingual; this one is not. GitHub has no language
switch, the audience is international, and a second copy of the README under a `<details>`
would go stale the first time only one of the two is edited.

## Three things left out

- **Logos for AWS, LinkedIn and Playwright.** simple-icons dropped those marks, so
  shields.io serves the badges without an icon. They are written logo-less on purpose.
- **`github-readme-stats` cards.** The public instance answers 503 often enough that a
  broken image on the profile is the likely state, not the exception. The snake replaces
  them, and it is served from the profile repo itself.
- **The experience section.** Six products in one line and a link to the site is the whole
  of it: the site, the CV and LinkedIn each tell the long version already.
