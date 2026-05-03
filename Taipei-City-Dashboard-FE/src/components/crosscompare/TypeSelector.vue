<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->

<script setup>
import { computed } from "vue";
import { useCrossCompareStore } from "../../store/crossCompareStore";
import { CROSSCOMPARE_BASE_TYPES } from "../../assets/configs/crossCompareConfig";

const store = useCrossCompareStore();

// 用 Set 加速 includes 判斷（4 個 type，其實 .includes 也行 — 為一致性而已）
const selectedSet = computed(() => new Set(store.selectedTypes));

function isSelected(value) {
	return selectedSet.value.has(value);
}

function handleToggle(value) {
	const current = [...store.selectedTypes];
	const idx = current.indexOf(value);
	if (idx === -1) {
		current.push(value);
	} else {
		// 守住「至少 1 個」— 最後一個被取消時忽略
		if (current.length === 1) return;
		current.splice(idx, 1);
	}
	store.setSelectedTypes(current);
}
</script>

<template>
  <div
    class="typeselector"
    role="group"
    aria-label="Score dimensions"
  >
    <p class="typeselector__title">
      評分維度
    </p>
    <div class="typeselector__list">
      <button
        v-for="opt in CROSSCOMPARE_BASE_TYPES"
        :key="opt.value"
        :class="{
          typeselector__btn: true,
          'typeselector__btn--active': isSelected(opt.value),
        }"
        :aria-pressed="isSelected(opt.value)"
        :title="opt.desc"
        type="button"
        @click="handleToggle(opt.value)"
      >
        <span
          class="typeselector__check"
          aria-hidden="true"
        >{{ isSelected(opt.value) ? "✓" : "" }}</span>
        {{ opt.label }}
      </button>
    </div>
  </div>
</template>

<style scoped lang="scss">
.typeselector {
	display: flex;
	flex-direction: column;
	gap: 6px;
	padding: var(--font-s) var(--font-m);
	background-color: var(--color-component-background);
	border-radius: 8px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	min-width: 140px;

	&__title {
		margin: 0;
		color: var(--color-complement-text);
		font-size: var(--font-s);
	}

	&__list {
		display: flex;
		flex-direction: column;
		gap: 4px;
	}

	&__btn {
		display: flex;
		align-items: center;
		gap: 6px;
		padding: 6px 10px;
		border: 1px solid transparent;
		background: transparent;
		color: var(--color-complement-text);
		border-radius: 6px;
		font-size: var(--font-s);
		text-align: left;
		cursor: pointer;
		transition: background-color 0.15s, color 0.15s, border-color 0.15s;

		&:hover {
			background-color: rgba(255, 255, 255, 0.04);
		}

		&--active {
			background-color: var(--color-highlight);
			color: var(--color-component-background);
			border-color: var(--color-highlight);
		}
	}

	&__check {
		display: inline-block;
		width: 12px;
		font-size: var(--font-s);
	}
}
</style>
