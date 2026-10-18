# STRG: Earth AI presentation

A custom Mizzou-themed Quarto Reveal.js presentation for the Department of
Statistics and Data Science, University of Missouri–Columbia.

The presentation contains **24 slides** based on the agreed paper-discussion
outline. Speaker notes total **28 minutes**, with two minutes of buffer or
discussion for a half-hour slot. Every substantive slide includes a visible
paper reference and detailed source/context notes.

## Preview in RStudio

1. Open `STRG.Rproj`.
2. Open `earth-ai.qmd` in the **Source** editor.
3. Click **Render**. Use **Open in Browser** for the full interactive presentation.

The project intentionally uses `type: website` while retaining the Reveal.js
slide format. RStudio invokes `quarto preview` when you click Render. With
`type: default`, that preview path can skip project post-render hooks and
overwrite the portable HTML with a build that blocks OJS on `file://`.
The website project type ensures this workflow runs the export hook too.

After changing project/render settings, **stop an already-running RStudio
preview and click Render again**. Quarto keeps the project configuration in a
running preview process; reusing a session started before this setup can still
overwrite the HTML with the old behavior. Reloading the browser does not restart
that render process. There is no need to restart RStudio or close source files.

From a terminal with Quarto on PATH:

```sh
quarto preview earth-ai.qmd
```

The rendered presentation is **`_output/earth-ai.html`**. You can double-click
that HTML file to open it directly in a modern browser, with genuine OJS
reactivity. You can also copy just that file to another folder or computer:
the figures, chart module, data, styles, and runtimes are embedded.
The tested charts need no internet connection, local server, or R server.
The project currently uses no R or Python execution chunks.

Use the full project when rendering, so Quarto runs the post-render hook in
`_quarto.yml`. A live preview remains convenient while editing because it
updates after saves. The RStudio Viewer uses QtWebEngine, which Quarto's OJS
runtime does not support; use **Open in Browser** if the Viewer reports that
limitation.

RStudio's bundled Quarto can also render this project even if `quarto` is not on
your terminal PATH. On this Mac, its executable is:

```sh
/Applications/RStudio.app/Contents/Resources/app/quarto/bin/quarto render earth-ai.qmd
```

### Why direct opening now works

Quarto 1.9.37 unconditionally stops OJS on `file://`, even when every required
resource is embedded. `scripts/portable-ojs.ts` runs after rendering and verifies
the exact embedded chart module and JSON against the project sources before
removing the two file-protocol checks in **this generated HTML only**. It retains
the actual Quarto/Observable runtime and executes the original OJS cells—there
is no static screenshot or separate non-OJS fallback. No installed software or
browser security settings are changed.

This is deliberately a project-specific compatibility export, not a general
promise that any OJS document will run locally. Adding new attachments or module
imports requires reviewing the export; a changed Quarto runtime causes a clear
build failure instead of silently producing broken slides. Remote libraries or
`fetch()` calls can require a web server or network. Keep Quarto pinned to the
tested **1.9.37** until upgrades have been tested. Speaker-view popups and other
browser-restricted features are separate from the chart controls.

## GitHub Pages

Public presentation: [Earth AI slides](https://banerjeeabhisek.github.io/STRG/).

`.github/workflows/pages.yml` renders and deploys on every push to `main`, or
when run manually from GitHub's **Actions** tab. It installs Quarto 1.9.37, runs
the same portable export, and publishes `_output`. The export also makes an
identical `index.html` for the Pages home URL. Generated HTML stays out of Git;
the source, original figures, and published table values are versioned.

For a new clone/fork, set **Settings → Pages → Source → GitHub Actions** once.
No personal access token or additional repository secret is needed by this
workflow. Render locally after editing, then commit and push the source to
update the public deck. The deployed HTML can also be saved/downloaded and
opened directly.

Before publishing, the workflow also tests a single isolated HTML file via
`file://` with the browser offline, then via HTTP under `/STRG/`. It checks all
six chart controls, all published FEMA/health rows, images, and the actual OJS
runtime. Additional resource requests, JavaScript errors, or alert boxes fail
the build. To run those optional checks locally (Node 20+):

```sh
npm ci
npx playwright install chromium
npm run test:preview
npm test
```

`test:preview` launches RStudio's exact preview command, requires the export's
success message, then requests **two warm re-renders** from the same session and
checks that neither restores the file-protocol block. It stops only its own test
server. The browser checks exercise both the exact output path and an isolated
single-file copy of that preview-generated HTML, not just a CLI render.
To optionally check WebKit (the engine family used by Safari), install
it with `npx playwright install webkit` and run
`STRG_BROWSER_ENGINE=webkit npm test`. This does not change Safari's settings.

Node and Playwright are needed only for tests, not for rendering or viewing.

## Editing

| File | Purpose |
| --- | --- |
| `earth-ai.qmd` | Slide text, layouts, notes, and reactive OJS cells |
| `_quarto.yml` | Reveal.js and render settings |
| `_variables.yml` | Presenter, affiliation, and discussion group |
| `theme/mizzou.scss` | Colors, typography, and slide compositions |
| `theme/slides.css` | Interactive controls and figure styling |
| `scripts/figures.js` | Local figure functions imported by OJS |
| `scripts/slide-hooks.html` | Light/dark navigation and footer styling |
| `scripts/portable-ojs.ts` | Validated, automatic single-file OJS compatibility export |
| `.github/workflows/pages.yml` | Reproducible render and automatic Pages deployment |
| `data/paper-results.json` | Published values from Tables 3, 7, and 9–12 |
| `assets/paper/` | Figures 1–7 cropped directly from the supplied v4 PDF |
| `scripts/extract-paper-figures.py` | Reproducible extraction of the published figures |
| `assets/` | Original university shield and campus photograph |

To add a slide, start a new `## Slide title` section. Normal Markdown, Quarto
columns, equations, images, and `{ojs}` cells work inside slides. Layout classes
include `.cover`, `.closing`, `.image-layout`, `.results-layout`, `.temporal-layout`,
and `.helene-layout`. Keep content short enough for the fixed 16:9 canvas.

Six genuine OJS charts support dataset, metric, target, category, and interval
selection. The FEMA and CDC controls expose all 20 and 21 target rows. The Q&A
plot uses the published 95% intervals. The crisis plot retains all ten prompts
and shows intervals exactly as reported, including endpoints outside [0, 1].
Its reported mean excludes prompt 9, following Table 12. All chart values live
in the JSON file rather than being mixed with plotting code.

The charts use native browser controls and SVG through a local JavaScript module,
so they work without external JavaScript CDNs. Figures 5 and 6 remain original
images because the paper does not supply their underlying observations. There
are **no simulated curves, fabricated map results, or reconstructed ensemble
members**. The earlier synthetic uncertainty demonstration has been removed.
The Helene image appears twice intentionally: first to motivate the question,
then to explain the authors' answer. The Helene walkthrough presents the published
demonstration, not a live forecast or a new GIS computation.

## Talk pacing

| Slides | Focus | Minutes |
| --- | --- | ---: |
| 1–4 | Motivation and framework | 4 |
| 5–10 | Specialized models and their evidence | 7 |
| 11–16 | Combining models and predictive applications | 8 |
| 17–21 | Agent workflow and evaluation | 6 |
| 22–24 | Interpretation, limitations, and discussion | 3 |

Each slide's speaker notes include an individual time budget, cumulative time,
talking points, source pages, and caveats needed to interpret the results.
Arrow keys advance the planned reveal fragments before moving to the next slide.
The menu or overview can jump directly between slides.

## Re-extracting the published figures

The included PNGs are sufficient to render the presentation. To regenerate them,
use Python with `pdfplumber` and Poppler's `pdftoppm` on PATH:

```sh
python scripts/extract-paper-figures.py --pdf /path/to/2510.18318v4.pdf
```

The script uses the v4 PDF's image bounds at 300 dpi. Verified crop adjustments
for Figures 3 and 4 omit surrounding caption/header fragments while retaining
the complete diagram. See `assets/paper/README.md` for provenance.

Keyboard controls: arrow keys or Space to advance, `Esc` for slide overview,
`S` for speaker notes, `F` for fullscreen, and `?` for help. Keep popup permission
enabled if using the speaker view. HTML preserves the interactions. A PDF export
would only capture the currently selected state.

## Sources and branding

- Paper: [Bell et al., Earth AI, v4](https://arxiv.org/pdf/2510.18318v4).
  `data/paper-results.json` transcribes the published rounded values in Tables 3,
  7, 9–12. Display labels expand or simplify some abbreviations for readability.
- Department: [Statistics and Data Science](https://stat.missouri.edu/).
- Current digital colors: [Mizzou brand colors](https://brand.missouri.edu/brand-visuals/colors/).
  The theme uses Mizzou Gold `#FDB719` and Tiger Paw Black `#000000`.
- Shield: [Original university SVG](https://stat.missouri.edu/themes/contrib/miz_d8_theme_base/design-system/dist/images/signatures/university/mu-logo-48-stroked.svg).
  The artwork remains unchanged.
- Cover photo: [University campus aerial photograph](https://stat.missouri.edu/sites/default/files/banners/2025-04/20241028_cms_fall-drone_nja-028-large.jpeg),
  Nicholas Andrusisian / University of Missouri, from the department homepage.

This is a custom academic presentation, not an official departmental template or
an assertion of university endorsement. System fonts keep it portable without
requiring licensed university typefaces. Original university assets remain
subject to the university's [marks and content rules](https://missouri.edu/marks-identity-content).

Generated output and local preview files are ignored by Git. No GitHub push or
deployment is required for local authoring or direct-file presentation.
