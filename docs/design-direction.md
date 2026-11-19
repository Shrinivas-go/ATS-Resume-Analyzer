# ATS Resume Checker — design direction

## Research note (2026-11-18)

**Sources studied:** Jobscan (jobscan.co), Enhancv resume checker, Hemingway Editor,
plus the app's own current UI. Teal's match tool page returned a 404.

1. **User references:** none supplied, so I picked the sources myself.
2. **Domain must-haves:**
   - The upload action comes first. Enhancv puts the dropzone in the hero.
   - A match score with a plain-language tier.
   - Matched vs missing skills.
   - An explanation of how the score is built (both competitors spend a section on it).
   - Privacy reassurance near the upload.
   - A downloadable report and history for returning users.
3. **Ideas to adapt:**
   - *Hemingway's hero is the tool working on its own copy*: coloured highlights explain
     the feature before any paragraph does. Here, the hero is a job posting marked up
     live: found keywords get highlighted, missing ones get circled in proof red.
   - *Enhancv's "two-tier score" explainer* becomes a typeset scoring rubric. It uses
     the real weights from `backend/ats_checker.js` (30/20/15/10/10/5/5/5), not marketing claims.
   - *Jobscan's match report* becomes the results page. The key change is that the
     user's own pasted posting comes back marked up with their real matches and gaps.
4. **Palette/type cues:**
   - The material is office paper: photocopy grey-white sheets, graphite pencil,
     highlighter yellow, a proofreader's red.
   - The type contrast is the human-printed page (didone) against the machine's
     parse output (mono), with a reviewer's hand in the margins.
5. **Clichés to avoid:**
   - "Beat the bots" robot imagery, blue/green SaaS pills, semicircle gauges,
     traffic-light score colours.
   - Dotted grid backgrounds (the current site has one).
   - Fake browser-frame screenshots, emoji ticks and warnings.
   - Claims the code doesn't back up. The old copy said "Logistic Regression trained on
     24,000 resumes, 24 categories". The backend is a keyword classifier over 11 fields.
6. **Signature candidates:**
   - (a) the markup pass: highlighter sweeps plus red-pencil circles. **Chosen**,
     because it is literally what the tool does.
   - (b) a scanner light sweeping a sheet while the analysis runs (kept for the
     loading state).
   - (c) a stacked rubric bar drawing in on scroll (kept for the rubric).
   - No 3D, per the user's answer.

## Art direction

- **Concept:** *The proof sheet.* Your resume gets read twice: first by a parser, then
  by a person. This app shows the parser's markup (highlighter, red pencil, margin
  notes) before anyone else sees it.
- **Palette:** light, cool photocopy paper, with one graphite inverse section.
  - `--bg` #E6E5DF photocopy paper
  - `--bg-2` #F3F2ED fresh sheet
  - `--ink` #17181A graphite
  - `--mute` #55575B
  - `--line` rgba(23,24,26,.14)
  - `--accent` #F4D50B highlighter yellow (always a *background* behind ink, never text on paper)
  - `--signal` #C4213A proof red (missing / errors only)
  - Inverse: graphite canvas, paper ink, highlighter accent
- **Type:**
  - Display: Bodoni Moda (opsz, 700–800). The printed page: hero, section heads, the score.
  - Second voice: Caveat (600). The reviewer's hand, used only for margin notes and
    annotations, never in body copy.
  - Body: Instrument Sans.
  - Label: IBM Plex Mono. The machine voice: parse output, indexes, weights, dates.
- **Layout concept:**
  - Hero archetype is **Dashboard/console**. Headline and action on the left; a live
    "proof sheet" (a sample posting being marked up, score ticking in the margin) on
    the right. On phone the sheet sits under the action.
  - Rhythm:
    1. Console hero
    2. Dense rubric table with a drawn stacked bar
    3. A quiet, numbered three-pass process (no cards)
    4. Graphite inverse section with the 11 fields the classifier knows, as index rows
    5. Finale action
- **Signature:** *the markup pass*. Highlighter strokes sweep left-to-right behind
  matched keywords, a red pencil ellipse draws around each missing one, and a Caveat
  margin note appears. The same component renders the user's real job description
  on the results page.
- **Shape language:** sharp sheets (0–2px radius), hairline rules, no shadows except a
  thin paper "lift" on the sheet. Buttons are rectangular ink slabs; the primary one
  gets a highlighter swipe on hover.
- **Components and stack:**
  - Stays on React 19 + Vite + React Router (existing).
  - Motion (`framer-motion`, already installed) for reveals and state changes.
  - `@radix-ui/react-dialog` for the auth modal and `@radix-ui/react-dropdown-menu`
    (already installed) for the account menu.
  - Sonner for toasts.
  - `@number-flow/react` for the score and counts.
  - Fontsource for self-hosted fonts.
  - jsPDF (existing) report restyled to the palette.
  - Backend untouched.

## Sibling test

| | Portfolio / Kaapi Lab | Mitti | ATS (this) |
|---|---|---|---|
| Palette | warm black / cream / orange | clay / smoked ink / laterite | photocopy grey / graphite / highlighter yellow + proof red |
| Type | Anton / Instrument Serif / Hanken / JetBrains | Archivo Exp / Fraunces / Figtree / DM Mono | Bodoni Moda / Caveat / Instrument Sans / IBM Plex Mono |
| Hero | Type wall / split | Object stage (3D) | Dashboard/console (live proof sheet) |
| Signature | horizontal track / roast curve | throw-and-fire bottle | highlighter + red-pencil markup pass |

All four differ, so the test passes.
