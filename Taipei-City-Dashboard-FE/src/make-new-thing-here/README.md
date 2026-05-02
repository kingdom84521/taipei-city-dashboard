# Make New Thing Here Components

This directory hosts a self-contained set of components for **Make New Thing Here**,
a special section that lives **inside MapView** under the synthetic dashboard index
`make-new-thing-here`.

## How it's wired

- Entry point: a fixed `Make New Thing Here` link in `SideBar.vue` (above the public
  dashboards list) that navigates to `/mapview?index=make-new-thing-here`
- `MapView.vue` has a top-level branch
  `v-if="route.query.index === 'make-new-thing-here'"` that renders
  `MakeNewThingHerePanel.vue` from this directory, **bypassing** the normal
  `currentDashboard.components` rendering. This guarantees the content area shows
  only this section's components, not other dashboards' data.
- The MapView's NavBar + SideBar chrome stays in place — only the right-side content
  area is swapped.

## Adding components

Put each component as its own `.vue` under `components/`, then import into
`MakeNewThingHerePanel.vue`:

```vue
<script setup>
import MyComponent from "./components/MyComponent.vue";
</script>
<template>
  <div class="make-new-thing-here-panel">
    <MyComponent />
  </div>
</template>
```

## Decoupling from app stores

Treat this like a sub-package — keep components decoupled from the main app's
Pinia stores (`contentStore`, `mapStore`, etc.) unless you have a specific reason
to wire them in. The content area is intentionally clean of other dashboards' data.
