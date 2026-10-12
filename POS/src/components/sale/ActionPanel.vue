<template>
	<aside class="flex flex-col gap-2 p-2 bg-white border-s border-gray-200 overflow-y-auto">
		<button
			type="button"
			:disabled="cartEmpty"
			class="h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
			@click="emit('clear-cart')"
		>
			<span class="text-sm sm:text-base font-semibold text-center leading-tight">
				{{ __("Clear Cart") }}
			</span>
		</button>
		<button
			type="button"
			:disabled="cartEmpty"
			class="h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
			@click="emit('save-draft')"
		>
			<span class="text-sm sm:text-base font-semibold text-center leading-tight">
				{{ __("Hold", null, "order") }}
			</span>
		</button>
		<button
			type="button"
			class="relative h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
			@click="emit('show-drafts')"
		>
			<span class="text-sm sm:text-base font-semibold text-center leading-tight">
				{{ __("Drafts") }}
			</span>
		</button>
	</aside>
</template>

<script setup>
	defineProps({
		cartEmpty: Boolean
	})

	const emit = defineEmits(["clear-cart", "save-draft", "show-drafts"])
</script>
