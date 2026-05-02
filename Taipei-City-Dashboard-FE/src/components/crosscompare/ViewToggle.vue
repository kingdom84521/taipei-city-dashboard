<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->

<script setup>
import { useCrossCompareStore } from "../../store/crossCompareStore";

const store = useCrossCompareStore();

// 兩個模式 — 'taipei' (12 區) / 'metrotaipei' (41 區)
const options = [
	{ value: "taipei", label: "台北" },
	{ value: "metrotaipei", label: "雙北" },
];

function handleClick(value) {
	// store.setViewMode 內部白名單驗證；不必再檢查
	if (store.viewMode === value) return;
	store.setViewMode(value);
}
</script>

<template>
  <div
    class="viewtoggle"
    role="tablist"
    aria-label="View mode"
  >
    <button
      v-for="opt in options"
      :key="opt.value"
      :class="{
        viewtoggle__btn: true,
        'viewtoggle__btn--active': store.viewMode === opt.value,
      }"
      role="tab"
      :aria-selected="store.viewMode === opt.value"
      type="button"
      @click="handleClick(opt.value)"
    >
      {{ opt.label }}
    </button>
  </div>
</template>

<style scoped lang="scss">
.viewtoggle {
	display: inline-flex;
	background-color: var(--color-component-background);
	border-radius: 999px;
	padding: 4px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);

	&__btn {
		padding: 6px 16px;
		border: 0;
		background: transparent;
		color: var(--color-complement-text);
		border-radius: 999px;
		font-size: var(--font-s);
		cursor: pointer;
		transition: background-color 0.2s, color 0.2s;

		&:hover {
			opacity: 0.85;
		}

		&--active {
			background-color: var(--color-highlight);
			color: var(--color-component-background);
		}
	}
}
</style>
