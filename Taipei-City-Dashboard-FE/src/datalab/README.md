# DataLab Components

This directory hosts a self-contained set of components for **DataLab**, a special
section that lives **inside MapView** under the synthetic dashboard index `datalab`.

## How it's wired

- Entry point: a fixed `DataLab` link in `SideBar.vue` (above the public dashboards
  list) that navigates to `/mapview?index=datalab`
- `MapView.vue` has a top-level branch `v-if="route.query.index === 'datalab'"`
  that renders `DataLabPanel.vue` from this directory, **bypassing** the normal
  `currentDashboard.components` rendering. This guarantees the content area shows
  only DataLab components, not other dashboards' data.
- The MapView's NavBar + SideBar chrome stays in place — only the right-side content
  area is swapped.

## Adding components

Put each component as its own `.vue` under `components/`, then import into
`DataLabPanel.vue`:

```vue
<script setup>
import MyComponent from "./components/MyComponent.vue";
</script>
<template>
  <div class="datalab-panel">
    <MyComponent />
  </div>
</template>
```

## Decoupling from app stores

Treat this like a sub-package — keep components decoupled from the main app's
Pinia stores (`contentStore`, `mapStore`, etc.) unless you have a specific reason
to wire them in. The DataLab content area is intentionally clean of other
dashboards' data.
