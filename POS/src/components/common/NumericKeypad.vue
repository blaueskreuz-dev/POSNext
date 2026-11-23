<template>
	<!-- 3 digit columns + an action column (backspace, clear, optional confirm) -->
	<div class="grid grid-cols-4 auto-rows-[4rem] gap-2 select-none">
		<button
			v-for="key in digitKeys"
			:key="key.value"
			type="button"
			:style="key.style"
			class="rounded-xl bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-2xl font-semibold text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700 transition-colors duration-75 touch-manipulation"
			@click="emit('press', key.value)"
		>
			{{ key.value }}
		</button>

		<button
			type="button"
			:style="{ gridColumn: 4, gridRow: hasConfirm ? 1 : '1 / span 2' }"
			class="rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary-hover active:bg-primary-active transition-colors duration-75 touch-manipulation"
			:aria-label="__('Backspace')"
			@click="emit('backspace')"
		>
			<FeatherIcon name="delete" class="w-6 h-6" />
		</button>
		<button
			type="button"
			:style="{ gridColumn: 4, gridRow: hasConfirm ? 2 : '3 / span 2' }"
			class="rounded-xl bg-primary text-base font-semibold text-white hover:bg-primary-hover active:bg-primary-active transition-colors duration-75 touch-manipulation"
			@click="emit('clear')"
		>
			{{ __('Clear') }}
		</button>

		<!-- The slotted button stretches to fill the bottom two rows of the action column -->
		<div v-if="hasConfirm" class="grid" style="grid-column: 4; grid-row: 3 / span 2">
			<slot name="confirm" />
		</div>
	</div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { computed, useSlots } from "vue"

const props = defineProps({
	/** Show the "." key */
	decimal: {
		type: Boolean,
		default: true,
	},
})

const emit = defineEmits(["press", "backspace", "clear"])

const slots = useSlots()
const hasConfirm = computed(() => Boolean(slots.confirm))

const digitKeys = computed(() => {
	const rows = ["7", "8", "9", "4", "5", "6", "1", "2", "3"].map(
		(value, i) => ({
			value,
			style: { gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 1 },
		}),
	)

	// Bottom row: first column stays empty, "0" sits under "2", "." under "3" when shown
	rows.push({ value: "0", style: { gridColumn: 2, gridRow: 4 } })
	if (props.decimal) {
		rows.push({ value: ".", style: { gridColumn: 3, gridRow: 4 } })
	}
	return rows
})
</script>
