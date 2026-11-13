<template>
	<button
		type="button"
		role="switch"
		:aria-checked="isOn"
		class="w-full min-h-[4rem] flex items-center gap-4 px-4 py-3 text-start active:bg-gray-50 dark:active:bg-gray-800 transition-colors duration-75 touch-manipulation"
		@click="$emit('update:modelValue', isOn ? 0 : 1)"
	>
		<div class="flex-1 min-w-0">
			<p class="text-base font-semibold text-gray-900 dark:text-gray-100">{{ label }}</p>
			<p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
				{{ description }}
			</p>
		</div>
		<span
			:class="[
				'relative flex-shrink-0 w-14 h-8 rounded-full transition-colors duration-100',
				isOn ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600',
			]"
		>
			<span
				:class="[
					'absolute top-1 start-1 w-6 h-6 rounded-full bg-white shadow transition-transform duration-100',
					isOn && 'translate-x-6 rtl:-translate-x-6',
				]"
			/>
		</span>
	</button>
</template>

<script setup>
import { computed } from "vue"

const props = defineProps({
	modelValue: {
		type: [Number, Boolean],
		default: 0,
	},
	label: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		default: "",
	},
})

defineEmits(["update:modelValue"])

const isOn = computed(() => Boolean(props.modelValue))
</script>
