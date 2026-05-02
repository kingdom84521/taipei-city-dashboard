<script setup>
</script>

<template>
  <div class="datalab-view">
    <router-view />
  </div>
</template>

<style scoped lang="scss">
.datalab-view {
	width: 100vw;
	height: calc(var(--vh) * 100);
	max-height: calc(var(--vh) * 100);
	overflow: auto;
	background-color: var(--color-background);
}
</style>
