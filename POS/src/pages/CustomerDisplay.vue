<template>
	<div
		v-if="state.phase === 'idle'"
		class="h-screen flex items-center justify-center bg-primary text-white text-[8rem] font-bold"
	>
		{{ __("Welcome") }}
	</div>

	<div v-else class="h-screen flex flex-col bg-gray-100 text-[2.5rem]">
		<div :class="['grid gap-8 px-12 py-4 bg-primary text-white text-3xl font-semibold', GRID_COLS]">
			<span>{{ __("Item") }}</span>
			<span class="text-end">{{ __("Qty") }}</span>
			<span class="text-end">{{ __("Rate") }}</span>
			<span class="text-end">{{ __("Discount") }}</span>
			<span class="text-end">{{ __("Total") }}</span>
		</div>

		<ul ref="listEl" class="flex-1 overflow-y-auto p-4 space-y-2">
			<li
				v-for="item in state.data.items"
				:key="item.id"
				:class="['grid gap-8 px-8 py-5 rounded-xl bg-white', GRID_COLS]"
			>
				<span class="font-semibold truncate">{{ item.name }}</span>
				<span class="text-end">{{ item.qty }}</span>
				<span class="text-end">{{ item.rate }}</span>
				<span class="text-end">{{ item.discount }}</span>
				<span class="text-end font-bold">{{ item.total }}</span>
			</li>
		</ul>

		<div class="px-12 py-6 bg-primary text-white">
			<div class="flex justify-between">
				<span>{{ __("Total Quantity") }}</span>
				<span>{{ state.data.totalQuantity }}</span>
			</div>
			<div v-if="state.data.discount" class="flex justify-between">
				<span>{{ __("Discount") }}</span>
				<span>-{{ state.data.discount }}</span>
			</div>
			<div class="flex justify-between text-[4rem] font-bold">
				<span>{{ __("Grand Total") }}</span>
				<span>{{ state.data.grandTotal }}</span>
			</div>
		</div>
	</div>
</template>

<script setup>
import { nextTick, ref, watch } from "vue"
import { useCustomerDisplaySubscriber } from "@/composables/useCustomerDisplay"

const GRID_COLS = "grid-cols-[minmax(0,1fr)_8rem_14rem_10rem_14rem]"

const state = useCustomerDisplaySubscriber()
const listEl = ref(null)

watch(
	() => state.value.data?.items.length ?? 0,
	async (count, oldCount) => {
		if (count <= oldCount) return
		await nextTick()
		listEl.value?.lastElementChild?.scrollIntoView({ block: "nearest" })
	},
)
</script>
