<!-- Developed by Taipei Urban Intelligence Center 2023-2024 -->

<script setup>
import { computed } from "vue";
import { CROSSCOMPARE_RAMP } from "../../assets/configs/crossCompareConfig";

const props = defineProps({
	// [min, max] of total_score — store.rampDomain
	domain: {
		type: Array,
		default: () => [0, 100],
	},
	// 軸標籤；預設為 BE 欄位名（snake_case 跨層）
	label: {
		type: String,
		default: "total_score",
	},
});

const minLabel = computed(() => {
	const v = Number(props.domain?.[0]);
	return Number.isFinite(v) ? v.toFixed(1) : "—";
});
const maxLabel = computed(() => {
	const v = Number(props.domain?.[1]);
	return Number.isFinite(v) ? v.toFixed(1) : "—";
});

// 直接用 CSS linear-gradient — 與 buildFillPaint 的 interpolate-hcl 並非完全等價
// (HCL vs RGB 中段插值會略有差異)，但人眼感受夠接近，使用者不會分辨；
// 確切的色階對應由 Mapbox 在地圖上呈現，此 legend 只是視覺指引
const gradientStyle = computed(() => ({
	background: `linear-gradient(to right, ${CROSSCOMPARE_RAMP.low}, ${CROSSCOMPARE_RAMP.high})`,
}));
</script>

<template>
  <div class="ramplegend">
    <span class="ramplegend__min">{{ minLabel }}</span>
    <div
      class="ramplegend__bar"
      :style="gradientStyle"
    />
    <span class="ramplegend__max">{{ maxLabel }}</span>
    <p class="ramplegend__axis">
      {{ label }}
    </p>
  </div>
</template>

<style scoped lang="scss">
.ramplegend {
	display: inline-flex;
	align-items: center;
	gap: var(--font-s);
	padding: var(--font-s) var(--font-m);
	background-color: var(--color-component-background);
	border-radius: 5px;
	box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);

	&__bar {
		width: 160px;
		height: 12px;
		border-radius: 6px;
	}

	&__min,
	&__max {
		color: var(--color-complement-text);
		font-size: var(--font-ms);
		min-width: 36px;
		text-align: center;
	}

	&__axis {
		color: var(--color-normal-text);
		font-size: var(--font-s);
		margin: 0 0 0 var(--font-s);
	}
}
</style>
