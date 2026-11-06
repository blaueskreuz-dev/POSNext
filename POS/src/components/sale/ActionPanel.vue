<template>
	<aside class="flex flex-col gap-2 p-2 bg-white border-s border-gray-200 overflow-y-auto">
		<div class="grid grid-cols-2 content-start gap-2">
			<button
				type="button"
				:disabled="cartEmpty"
				:class="buttonClass"
				@click="emit('clear-cart')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Clear Cart") }}
				</span>
			</button>
			<button
				type="button"
				:class="buttonClass"
				@click="lockSession()"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Lock") }}
				</span>
			</button>
			<button
				type="button"
				:disabled="cartEmpty"
				:class="buttonClass"
				@click="emit('show-discount')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Discount") }}
				</span>
			</button>
			<button
				type="button"
				:disabled="!discountPercentage"
				:class="buttonClass"
				@click="emit('remove-discount')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Remove Discount") }}
				</span>
			</button>
			<button
				type="button"
				:class="['col-span-2', buttonClass]"
				@click="handleOpenCashDrawer"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Open cash register") }}
				</span>
			</button>

			<div class="col-span-2 h-20" aria-hidden="true"></div>

			<button
				type="button"
				:class="buttonClass"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Reprint Invoice") }}
				</span>
			</button>
			<button
				type="button"
				:class="buttonClass"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Invoice History") }}
				</span>
			</button>
			<button
				type="button"
				:disabled="cartEmpty"
				:class="buttonClass"
				@click="emit('save-draft')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Hold", null, "order") }}
				</span>
			</button>
			<button
				type="button"
				:class="buttonClass"
				@click="emit('show-drafts')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Drafts") }}
				</span>
			</button>
			<button
				type="button"
				:class="buttonClass"
				@click="emit('show-return')"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Return") }}
				</span>
			</button>
			<button
				type="button"
				:class="buttonClass"
			>
				<span class="text-sm sm:text-base font-semibold text-center leading-tight">
					{{ __("Cancel Invoice") }}
				</span>
			</button>
		</div>
		<div class="mt-auto shrink-0">
			<!-- Totals Summary -->
			<div class="flex flex-col gap-1 px-2.5 mb-2 text-xl text-gray-900">
				<template v-if="!cartEmpty">
					<div class="flex items-center justify-between">
						<span>{{ __("Total Quantity") }}</span>
						<span class="text-end">{{ formatQuantity(totalQuantity) }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span>{{ __("Subtotal") }}</span>
						<span class="text-end">{{ formatCurrency(displaySubtotal) }}</span>
					</div>
					<div v-if="discountAmount > 0" class="flex items-center justify-between text-red-600">
						<span>{{ __("Discount") }}</span>
						<span class="text-end">{{ formatCurrency(discountAmount) }}</span>
					</div>
					<div class="flex items-center justify-between">
						<span>{{ __("Tax") }}</span>
						<span class="text-end">{{ formatCurrency(taxAmount) }}</span>
					</div>
				</template>
				<div class="flex items-center justify-between font-bold">
					<span>{{ __("Grand Total") }}</span>
					<span class="text-end">{{ formatCurrency(displayGrandTotal) }}</span>
				</div>
			</div>

			<button
				type="button"
				:disabled="cartEmpty"
				class="w-full h-24 flex items-center justify-center p-2 rounded-xl bg-secondary hover:bg-secondary-hover active:bg-secondary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-lg text-white touch-manipulation transition-colors duration-75 select-none"
				:aria-label="__('Proceed to payment')"
				@click="emit('checkout')"
			>
				<span class="text-lg sm:text-xl font-bold">{{ __("Checkout") }}</span>
			</button>
		</div>
	</aside>
</template>

<script setup>
	import { computed } from "vue"
	import { useFormatters } from "@/composables/useFormatters"
	import { useSessionLock } from "@/composables/useSessionLock"
	import { useToast } from "@/composables/useToast"
	import { DEFAULT_CURRENCY, formatCurrency as formatCurrencyUtil } from "@/utils/currency"
	import { openCashDrawer } from "@/utils/qzTray"

	const { lock: lockSession } = useSessionLock()
	const { showError } = useToast()

	async function handleOpenCashDrawer() {
		try {
			await openCashDrawer()
		} catch (err) {
			showError(err?.message || __("Failed to open cash register"))
		}
	}

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

	const buttonClass =
		"h-20 flex items-center justify-center p-2 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed shadow-md text-white touch-manipulation transition-colors duration-75 select-none"

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
