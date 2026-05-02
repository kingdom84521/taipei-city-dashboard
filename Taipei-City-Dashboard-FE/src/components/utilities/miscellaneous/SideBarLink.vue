<script setup>
import { useRoute } from "vue-router";
import { computed } from "vue";

const route = useRoute();

const props = defineProps({
	icon: { type: String },
	title: { type: String },
	to: { type: String, required: true },
	expanded: { type: Boolean },
});

const isActive = computed(() => {
	const [targetPath, targetQuery = ""] = props.to.split("?");
	if (route.path !== targetPath) return false;
	if (!targetQuery) return true;
	const expected = Object.fromEntries(new URLSearchParams(targetQuery));
	return Object.entries(expected).every(([k, v]) => route.query[k] === v);
});
</script>

<template>
  <router-link
    :to="props.to"
    :class="{ sidebarlink: true, 'sidebarlink-active': isActive }"
  >
    <span :title="!expanded ? title : ''">{{ icon }}</span>
    <h3 v-if="expanded">
      {{ title }}
    </h3>
  </router-link>
</template>

<style scoped lang="scss">
.sidebarlink {
	max-height: var(--font-xl);
	display: flex;
	align-items: center;
	margin: var(--font-s) 0;
	border-left: solid 4px transparent;
	border-radius: 0 5px 5px 0;
	transition: background-color 0.2s;
	white-space: nowrap;
	text-wrap: nowrap;

	&:hover {
		background-color: var(--color-component-background);
	}

	span {
		min-width: var(--font-l);
		margin-left: var(--font-s);
		font-family: var(--font-icon);
		font-size: calc(var(--font-m) * var(--font-to-icon));
	}

	h3 {
		margin-left: var(--font-s);
		font-size: var(--font-m);
		font-weight: 400;
	}

	&-active {
		border-left-color: var(--color-highlight);
		background-color: var(--color-component-background);

		span,
		h3 {
			color: var(--color-highlight);
		}
	}
}
</style>
