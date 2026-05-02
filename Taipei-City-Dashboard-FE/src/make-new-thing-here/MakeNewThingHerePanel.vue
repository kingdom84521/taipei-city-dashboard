<script setup>
</script>

<template>
  <div class="make-new-thing-here-panel">
    <!-- Mount your N components here. This panel renders inside MapView when route.query.index === "make-new-thing-here". -->
  </div>
</template>

<style scoped lang="scss">
.make-new-thing-here-panel {
	width: 100%;
	height: 100%;
	display: flex;
	flex-direction: column;
	gap: var(--font-m);
	overflow-y: auto;
}
</style>
