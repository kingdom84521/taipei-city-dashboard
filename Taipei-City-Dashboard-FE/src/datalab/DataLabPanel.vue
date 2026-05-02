<script setup>
</script>

<template>
  <div class="datalab-panel">
    <!-- Mount your N components here. This panel renders inside MapView when route.query.index === "datalab". -->
  </div>
</template>

<style scoped lang="scss">
.datalab-panel {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--font-m);
	overflow-y: auto;
}
</style>
