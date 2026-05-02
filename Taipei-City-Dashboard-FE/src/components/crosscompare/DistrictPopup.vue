<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->
<script setup>
import { computed } from "vue";

const props = defineProps({
	districtName: {
		type: String,
		required: true,
	},
	rank: {
		type: Number,
		default: null,
	},
	totalScore: {
		type: Number,
		default: null,
	},
	courseScore: {
		type: Number,
		default: null,
	},
	inspectionScore: {
		type: Number,
		default: null,
	},
});

// 防呆：分數可能為 null/undefined（store 找不到該區或 BE 漏欄位）— toFixed(1) 不能對非數字呼叫
const fmt = (v) => (Number.isFinite(Number(v)) ? Number(v).toFixed(1) : "—");

const totalLabel = computed(() => fmt(props.totalScore));
const courseLabel = computed(() => fmt(props.courseScore));
const inspectionLabel = computed(() => fmt(props.inspectionScore));
const rankLabel = computed(() =>
	Number.isFinite(Number(props.rank)) ? `#${props.rank}` : "—",
);
</script>

<template>
  <div class="districtpopup">
    <h3 class="districtpopup__name">
      {{ districtName }}
    </h3>
    <span class="districtpopup__rank">{{ rankLabel }}</span>
    <div class="districtpopup__total">
      {{ totalLabel }}
    </div>
    <div class="districtpopup__breakdown">
      <div>
        <p class="districtpopup__label">
          課程分數
        </p>
        <p class="districtpopup__value">
          {{ courseLabel }}
        </p>
      </div>
      <div>
        <p class="districtpopup__label">
          抽查分數
        </p>
        <p class="districtpopup__value">
          {{ inspectionLabel }}
        </p>
      </div>
    </div>
  </div>
</template>

<style scoped lang="scss">
.districtpopup {
	display: flex;
	flex-direction: column;
	gap: var(--font-s);
	padding: var(--font-s) var(--font-m);
	background-color: var(--color-component-background);
	border-radius: 5px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
	min-width: 160px;

	&__name {
		color: var(--color-normal-text);
		font-size: var(--font-m);
		margin: 0;
	}

	&__rank {
		align-self: flex-start;
		padding: 2px 8px;
		border-radius: 999px;
		background-color: var(--color-highlight);
		color: var(--color-component-background);
		font-size: var(--font-ms);
	}

	&__total {
		color: var(--color-normal-text);
		font-size: 1.6rem;
		font-weight: 600;
	}

	&__breakdown {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--font-s);
	}

	&__label {
		color: var(--color-complement-text);
		font-size: var(--font-s);
		margin: 0;
	}

	&__value {
		color: var(--color-normal-text);
		font-size: var(--font-ms);
		margin: 0;
	}
}
</style>
