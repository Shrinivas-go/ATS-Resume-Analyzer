# ATS Resume Checker — frontend

React 19 + Vite. The design ("the proof sheet") is described in
[`../docs/design-direction.md`](../docs/design-direction.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5173 (needs the backend on VITE_API_URL for login/scans)
npm test           # vitest
npm run build
```

### Previewing the desk without logging in (dev only)

`npm run dev` adds three routes with made-up sample data. They don't exist in production builds.

- `/dev/form`: the empty scan form
- `/dev/scanning`: the loading state
- `/dev/results`: a sample result with a marked-up posting

## Where things live

| Path | What |
|---|---|
| `src/styles/tokens.css` | Palette, fonts, spacing, easing (edit colours here) |
| `src/styles/base.css` | Fonts, resets, type roles (`.display`, `.label`, `.hand`), buttons |
| `src/content/landing.js` | All landing-page copy, the scoring rubric and the field list |
| `src/sections/` | Landing sections: Hero, Rubric, Passes, Fields, Finale |
| `src/components/ProofText.jsx` | The signature: posting text with highlighter / red-pencil marks |
| `src/components/desk/` | Scan desk pieces: history, form, scanning state, results |
| `src/pages/` | Landing and Dashboard (the scan desk) |
| `src/lib/` | `markup.js` (keyword matching), `tiers.js`, `report.js` (PDF), reveal hooks |

The rubric weights and the 11 classifier fields in `src/content/landing.js` mirror
`backend/ats_checker.js`, so update both together.

## Libraries

- **Dialogs and menus:** Radix (`@radix-ui/react-dialog`, `@radix-ui/react-dropdown-menu`)
- **Toasts:** Sonner
- **Animated score:** NumberFlow
- **Motion:** `framer-motion`
- **PDF report:** jsPDF, lazy-loaded
- **Fonts:** Fontsource (self-hosted Bodoni Moda, Instrument Sans, Caveat, IBM Plex Mono)
