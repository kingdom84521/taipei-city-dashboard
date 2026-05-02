---
slug: datalab-scaffold
date: 2026-05-02
status: complete
---

# Summary — DataLab Scaffold

## What was done

Scaffolded a clean injection point for a future N-component data view at `/datalab`,
mirroring the existing `embed` layout pattern (no NavBar / SideBar / SettingsBar chrome).

## Files

| Action | Path |
|---|---|
| created | `Taipei-City-Dashboard-FE/src/datalab/` (new sub-package directory for N components) |
| created | `Taipei-City-Dashboard-FE/src/datalab/README.md` (usage guide + how to switch to nested routes) |
| created | `Taipei-City-Dashboard-FE/src/views/DataLabView.vue` (route shell with `<router-view />` for optional nesting) |
| edited | `Taipei-City-Dashboard-FE/src/router/index.js` — added `datalab` route + mobile allow-list entry |
| edited | `Taipei-City-Dashboard-FE/src/App.vue` — NavBar `v-if` excludes `datalab` |

## Verification

- ESLint: pass on all touched files
- Vite dev server (Docker compose): HMR reloaded cleanly, `GET /datalab` → `200 OK`
- DataLabView.vue is empty by design (requirement #3: "view 上必須乾淨")

## Future steps (not in this scaffold)

- Add real components under `src/datalab/` and wire them into `DataLabView.vue`
- If sub-pages are needed, convert the route to nested children (see datalab/README.md)
- If stricter isolation is required, also exclude `datalab` from `LogIn`, `ChatBox`,
  `NotificationBar` overlays in `App.vue` (current scaffold matches `embed` parity,
  which keeps these overlays)
