# DataLab Components

This directory hosts a self-contained set of components for the DataLab view (`/datalab`),
mounted by `src/views/DataLabView.vue`.

Treat it like a sub-package — keep its components decoupled from the main app's
Pinia stores (`authStore`, `contentStore`, `mapStore`, etc.) unless you have a
specific reason. The DataLab view is rendered without the global NavBar / SideBar
chrome, mirroring the `embed` layout, so anything you put here renders on a clean
canvas.

## Adding components

Put each component as its own `.vue` file here, then import into
`src/views/DataLabView.vue`:

```vue
<script setup>
import MyComponent from "../datalab/MyComponent.vue";
</script>
<template>
  <div class="datalab-view">
    <MyComponent />
  </div>
</template>
```

## Switching to nested routes

`DataLabView.vue` already renders `<router-view />`. To make `/datalab` host
sub-pages, change the route in `src/router/index.js` from a single entry into:

```js
{
    path: "/datalab",
    component: () => import("../views/DataLabView.vue"),
    children: [
        { path: "", name: "datalab", component: () => import("../datalab/DataLabHome.vue") },
        { path: ":section", name: "datalab-section", component: () => import("../datalab/DataLabSection.vue") },
    ],
}
```

Then add `"datalab-section"` to the mobile allow-list and the NavBar exclusion list
in `App.vue` if you want the same clean shell across all sub-pages.
