<template>
	<aside class="flex flex-col gap-2 p-2 bg-white border-s border-gray-200 overflow-y-auto">
		<div class="grid grid-cols-2 content-start gap-2">
			<button
				type="button"
				:disabled="cartEmpty"
				class="col-span-2 h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
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
			<button
				type="button"
				class="col-span-2 h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
				@click="emit('show-return')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Return") }}
				</span>
			</button>
			<button
				type="button"
				:disabled="cartEmpty"
				class="h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
				@click="emit('show-discount')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Discount") }}
				</span>
			</button>
			<button
				type="button"
				:disabled="!discountPercentage"
				class="h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"
				@click="emit('remove-discount')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Remove Discount") }}
				</span>
			</button>
		</div>
		<div class="mt-auto shrink-0">
			<!-- Totals Summary -->
			<div v-if="!cartEmpty" class="mb-1.5">
				<div class="flex items-center justify-between px-2.5 text-base text-gray-600 mb-0.5">
					<span class="font-medium">{{ __("Total Quantity") }}</span>
					<span class="font-bold text-gray-900 text-end min-w-[60px]">{{
						formatQuantity(totalQuantity)
					}}</span>
				</div>
				<div class="flex items-center justify-between px-2.5 text-base text-gray-600">
					<span class="font-medium">{{ __("Subtotal") }}</span>
					<span class="font-bold text-gray-900 text-end min-w-[60px]">{{
						formatCurrency(displaySubtotal)
					}}</span>
				</div>
			</div>

			<div v-if="!cartEmpty" class="mb-1.5">
				<!-- Discount Display - Highlighted -->
				<div
					v-if="discountAmount > 0"
					class="flex items-center justify-between mb-0.5 bg-red-50 rounded px-2.5 py-1 text-base"
				>
					<div class="flex items-center gap-1">
						<svg
							class="w-4 h-4 text-red-600"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M10 18a8 8 0 100-16 8 8 0 000 16zM7 9a1 1 0 000 2h6a1 1 0 100-2H7z"
								clip-rule="evenodd"
							/>
						</svg>
						<span class="font-bold text-red-700">{{ __("Discount") }}</span>
					</div>
					<span class="font-extrabold text-red-600 text-end min-w-[60px]">{{
						formatCurrency(discountAmount)
					}}</span>
				</div>

				<div class="flex items-center justify-between px-2.5 text-base text-gray-600">
					<span class="font-medium">{{ __("Tax") }}</span>
					<span class="font-bold text-gray-900 text-end min-w-[60px]">{{
						formatCurrency(taxAmount)
					}}</span>
				</div>
			</div>

			<!-- Grand Total -->
			<div class="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-2.5 mb-1.5">
				<div class="flex items-center justify-between">
					<span class="text-lg font-extrabold text-gray-900">{{
						__("Grand Total")
					}}</span>
					<span
						class="text-lg font-extrabold text-primary text-end min-w-[60px]"
					>
						{{ formatCurrency(displayGrandTotal) }}
					</span>
				</div>
			</div>

			<button
				type="button"
				:disabled="cartEmpty"
				class="w-full h-24 flex items-center justify-center gap-2 p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg text-white touch-manipulation transition-colors duration-75 select-none"
				:aria-label="__('Proceed to payment')"
				@click="emit('checkout')"
			>
				<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
					/>
				</svg>
				<span class="text-lg sm:text-xl font-bold">{{ __("Checkout") }}</span>
			</button>
		</div>
	</aside>
</template>

<script setup>
	import { computed } from "vue"
	import { useFormatters } from "@/composables/useFormatters"
	import { DEFAULT_CURRENCY, formatCurrency as formatCurrencyUtil } from "@/utils/currency"

	const props = defineProps({
		cartEmpty: Boolean,
		discountPercentage: Number,
		items: { type: Array, default: () => [] },
		subtotal: { type: Number, default: 0 },
		taxAmount: { type: Number, default: 0 },
		discountAmount: { type: Number, default: 0 },
		taxInclusive: Boolean,
		currency: { type: String, default: DEFAULT_CURRENCY }
	})

	const { formatQuantity } = useFormatters()

	function formatCurrency(amount) {
		return formatCurrencyUtil(Number.parseFloat(amount || 0), props.currency)
	}

	// Includes free items; dedicated free item rows already carry their qty in `quantity`
	const totalQuantity = computed(() =>
		props.items.reduce((sum, item) => {
			const freeQty = item.is_free_item ? 0 : item.free_qty || 0
			return sum + (item.quantity || 0) + freeQty
		}, 0)
	)

	// Shown net of tax so that Subtotal + Tax - Discount = Grand Total
	const displaySubtotal = computed(() =>
		props.taxInclusive ? props.subtotal - props.taxAmount : props.subtotal
	)

	const displayGrandTotal = computed(
		() => displaySubtotal.value + props.taxAmount - props.discountAmount
	)

	const emit = defineEmits(["clear-cart", "save-draft", "show-drafts", "show-discount", "remove-discount", "show-return", "checkout"])
</script>
