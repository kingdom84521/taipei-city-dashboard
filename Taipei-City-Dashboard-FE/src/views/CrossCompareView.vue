<!-- Developed By Taipei Urban Intelligence Center 2023-2024 -->
<!--
Lead Developer:  Igor Ho (Full Stack Engineer)
Data Pipelines:  Iima Yu (Data Scientist)
Design and UX: Roy Lin (Fmr. Consultant), Chu Chen (Researcher)
Systems: Ann Shih (Systems Engineer)
Testing: Jack Huang (Data Scientist), Ian Huang (Data Analysis Intern)
-->
<!-- Department of Information Technology, Taipei City Government -->

<!-- 跨區比較頁：地圖底圖 + 各區分數渲染（地圖實例與資料拉取於 Plan 02-04 / 02-02 補上） -->

<script setup>
// 此頁面在 Plan 02-04 會掛上 mapboxgl.Map 實例與 fill layers。
// 此 Plan (02-01) 僅建立路由骨架，確保 /crosscompare 可解析到一個真正的 Vue view。
</script>

<template>
	<div class="crosscompare">
		<!-- #crosscompareMapBox needs to be empty to ensure Mapbox performance (Plan 02-04 attaches map here) -->
		<div id="crosscompareMapBox" />
	</div>
</template>

<style scoped lang="scss">
.crosscompare {
	height: calc(100vh - 60px);
	height: calc(var(--vh) * 100 - 60px);
	position: relative;

	#crosscompareMapBox {
		width: 100%;
		height: 100%;
		border-radius: 0;
	}
}
</style>
