<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="show"
				class="fixed inset-0 bg-black/30 dark:bg-black/70 dialog-overlay flex items-center justify-center p-4"
				@click.self="cancel"
			>
				<div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-5 select-none">
					<div class="flex items-start justify-between mb-4">
						<div class="min-w-0">
							<p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
								{{ __('Price') }}
							</p>
							<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
								{{ item?.item_name }}
							</h3>
						</div>
						<button
							class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
							:aria-label="__('Cancel')"
							@click="cancel"
						>
							<FeatherIcon name="x" class="w-6 h-6" />
						</button>
					</div>

					<div class="mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-4 text-end tabular-nums">
						<span class="text-lg font-medium text-gray-500 dark:text-gray-400 me-2">{{ currencySymbol }}</span>
						<span
							:class="[
								'text-4xl font-bold',
								buffer ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
							]"
						>{{ displayValue }}</span>
					</div>

					<div class="grid grid-cols-4 gap-2">
						<button
							v-for="key in digitKeys"
							:key="key.value"
							:style="key.style"
							class="h-16 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-2xl font-semibold text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700 transition-colors duration-75 touch-manipulation"
							@click="press(key.value)"
						>
							{{ key.value }}
						</button>

						<button
							style="grid-column: 4; grid-row: 1"
							class="h-16 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 flex items-center justify-center active:bg-gray-300 dark:active:bg-gray-600 transition-colors duration-75 touch-manipulation"
							:aria-label="__('Backspace')"
							@click="backspace"
						>
							<FeatherIcon name="delete" class="w-6 h-6" />
						</button>
						<button
							style="grid-column: 4; grid-row: 2"
							class="h-16 rounded-xl bg-gray-200 dark:bg-gray-700 text-base font-semibold text-gray-700 dark:text-gray-200 active:bg-gray-300 dark:active:bg-gray-600 transition-colors duration-75 touch-manipulation"
							@click="buffer = ''"
						>
							{{ __('Clear') }}
						</button>
						<button
							style="grid-column: 4; grid-row: 3 / span 2"
							:disabled="!canConfirm"
							class="rounded-xl bg-green-600 text-white text-lg font-bold flex flex-col items-center justify-center gap-1 active:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 transition-colors duration-75 touch-manipulation"
							@click="confirm"
						>
							<FeatherIcon name="check" class="w-7 h-7" />
							{{ __('Add') }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import { getCurrencySymbol } from "@/utils/currency"
import { FeatherIcon } from "frappe-ui"
import { computed, ref, watch } from "vue"

const MAX_INTEGER_DIGITS = 6

const props = defineProps({
	modelValue: Boolean,
	item: Object,
	currency: String,
})

const emit = defineEmits(["update:modelValue", "confirm"])

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const digitKeys = [
	"7",
	"8",
	"9",
	"4",
	"5",
	"6",
	"1",
	"2",
	"3",
	"00",
	"0",
	".",
].map((value, i) => ({
	value,
	style: { gridColumn: (i % 3) + 1, gridRow: Math.floor(i / 3) + 1 },
}))

const buffer = ref("")

watch(show, (open) => {
	if (open) buffer.value = ""
})

const currencySymbol = computed(() => getCurrencySymbol(props.currency))

const displayValue = computed(() => buffer.value || "0.00")

const price = computed(() => Number.parseFloat(buffer.value) || 0)

const canConfirm = computed(() => price.value > 0)

function press(key) {
	const [integer, decimals] = buffer.value.split(".")

	if (key === ".") {
		if (decimals === undefined) buffer.value = `${buffer.value || "0"}.`
		return
	}

	if (decimals !== undefined) {
		// At most two decimal places
		buffer.value = (buffer.value + key).replace(/(\.\d{2}).*$/, "$1")
		return
	}

	// Drop leading zeros and cap the integer part
	const next = (integer + key).replace(/^0+(?=\d)/, "")
	if (next.length <= MAX_INTEGER_DIGITS) buffer.value = next
}

function backspace() {
	buffer.value = buffer.value.slice(0, -1)
}

function confirm() {
	if (!canConfirm.value) return
	emit("confirm", Math.round(price.value * 100) / 100)
	show.value = false
}

function cancel() {
	show.value = false
}
</script>
