<template>
	<label class="block px-4 py-3">
		<p class="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">{{ label }}</p>
		<select
			:value="modelValue"
			class="w-full h-12 px-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-base text-gray-900 dark:text-gray-100 cursor-pointer focus:border-primary focus:ring-1 focus:ring-primary"
			@change="$emit('update:modelValue', $event.target.value)"
		>
			<option value="">{{ __('-- Select --') }}</option>
			<option
				v-for="option in options"
				:key="option.value"
				:value="option.value"
			>
				{{ option.label }}
			</option>
		</select>
		<p v-if="description" class="text-sm text-gray-500 dark:text-gray-400 mt-1">
			{{ description }}
		</p>
	</label>
</template>

<script setup>
defineProps({
	modelValue: {
		type: [String, Number],
		default: "",
	},
	label: {
		type: String,
		required: true,
	},
	description: {
		type: String,
		default: "",
	},
	options: {
		type: Array,
		default: () => [],
	},
})

defineEmits(["update:modelValue"])
</script>
