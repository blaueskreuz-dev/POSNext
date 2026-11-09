<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="show && localItem"
				class="fixed inset-0 bg-black/30 dark:bg-black/70 dialog-overlay flex items-center justify-center p-4"
				@click.self="cancel"
			>
				<div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-5 select-none">
					<!-- Header: item name + close -->
					<div class="flex items-start justify-between mb-4">
						<h3 class="min-w-0 text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
							{{ localItem.item_name }}
						</h3>
						<button
							class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
							:aria-label="__('Cancel')"
							@click="cancel"
						>
							<FeatherIcon name="x" class="w-6 h-6" />
						</button>
					</div>

					<!-- Tabs -->
					<div
						v-if="tabs.length > 1"
						class="grid grid-cols-2 gap-1 p-1 mb-4 rounded-xl bg-gray-100 dark:bg-gray-800"
						role="tablist"
					>
						<button
							v-for="tab in tabs"
							:key="tab.key"
							type="button"
							role="tab"
							:aria-selected="activeTab === tab.key"
							:class="[
								'h-11 rounded-lg text-base font-semibold transition-colors duration-75 touch-manipulation',
								activeTab === tab.key
									? 'bg-primary text-white shadow-sm'
									: 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600',
							]"
							@click="selectTab(tab.key)"
						>
							{{ tab.label }}
						</button>
					</div>

					<div
						v-if="activeTab"
						:class="['grid grid-cols-4 gap-2 mb-4', activeTab !== 'discount' && 'invisible']"
						:aria-hidden="activeTab !== 'discount'"
					>
						<button
							v-for="preset in DISCOUNT_PRESETS"
							:key="preset"
							type="button"
							:disabled="!isDiscountAllowed(preset)"
							:class="[
								'h-14 rounded-xl text-xl font-bold transition-colors duration-75 touch-manipulation disabled:opacity-40',
								preset === discountPercent
									? 'bg-primary text-white active:bg-primary-active'
									: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700',
							]"
							@click="applyPreset(preset)"
						>
							{{ preset }}%
						</button>
					</div>

					<!-- Display -->
					<div
						v-if="activeTab"
						class="mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-4 text-end tabular-nums"
					>
							<span
								v-if="activeTab === 'rate'"
								class="text-lg font-medium text-gray-500 dark:text-gray-400 me-2"
							>{{ currencySymbol }}</span>
							<span
								:class="[
									'text-[40px] leading-none font-bold',
									buffer !== null ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
								]"
							>{{ displayValue }}</span>
							<span
								v-if="activeTab === 'discount'"
								class="text-lg font-medium text-gray-500 dark:text-gray-400 ms-2"
							>%</span>
					</div>

					<!-- Keypad (same as PriceKeypadDialog) -->
					<div class="grid grid-cols-4 gap-2">
						<template v-if="activeTab">
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
						</template>
						<button
							:style="activeTab ? 'grid-column: 4; grid-row: 3 / span 2' : 'grid-column: 1 / span 4'"
							:class="[
								'rounded-xl bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-white text-lg font-bold flex items-center justify-center gap-1 transition-colors duration-75 touch-manipulation',
								activeTab ? 'flex-col' : 'h-16',
							]"
							@click="updateItem"
						>
							<FeatherIcon name="check" class="w-7 h-7" />
							{{ __('OK') }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import { useToast } from "@/composables/useToast"
import { usePOSSettingsStore } from "@/stores/posSettings"
import { getCurrencySymbol, roundCurrency } from "@/utils/currency"
import { FeatherIcon } from "frappe-ui"
import { computed, ref, watch } from "vue"

const DISCOUNT_PRESETS = [0, 20, 30, 50]
const MAX_INTEGER_DIGITS = 6

const { showError } = useToast()
const settingsStore = usePOSSettingsStore()

const props = defineProps({
	modelValue: Boolean,
	item: Object,
	currency: {
		type: String,
		default: "EGP",
	},
})

const emit = defineEmits(["update:modelValue", "update-item"])

const show = computed({
	get: () => props.modelValue,
	set: (val) => emit("update:modelValue", val),
})

// ─── Local state ────────────────────────────────────────────────────────────
const localItem = ref(null)
const localRate = ref(0)
const localDiscount = ref(0)
const originalPriceListRate = ref(0)

const activeTab = ref(null)
const buffer = ref(null)

const currencySymbol = computed(() => getCurrencySymbol(props.currency))

const hasPricingRules = computed(
	() =>
		Boolean(localItem.value?.pricing_rules) &&
		localItem.value.pricing_rules.length > 0,
)
const canEditRate = computed(
	() => settingsStore.allowUserToEditRate && !hasPricingRules.value,
)
const canEditDiscount = computed(() => settingsStore.allowItemDiscount)

const tabs = computed(() =>
	[
		canEditRate.value && { key: "rate", label: __("Adjust Price") },
		canEditDiscount.value && { key: "discount", label: __("Discount") },
	].filter(Boolean),
)

// Effective values include whatever is currently typed on the keypad
const ratePrice = computed(() =>
	activeTab.value === "rate" && buffer.value !== null
		? Number.parseFloat(buffer.value) || 0
		: localRate.value,
)
const discountPercent = computed(() =>
	activeTab.value === "discount" && buffer.value !== null
		? Number.parseFloat(buffer.value) || 0
		: localDiscount.value,
)

const displayValue = computed(() => {
	if (buffer.value !== null) return buffer.value || "0"
	return activeTab.value === "rate"
		? Number(localRate.value || 0).toFixed(2)
		: String(roundCurrency(localDiscount.value || 0))
})

// ─── Init ───────────────────────────────────────────────────────────────────
watch(
	() => props.item,
	(newItem) => {
		if (!newItem) return
		localItem.value = { ...newItem }
		localRate.value = newItem.rate || 0
		originalPriceListRate.value = newItem.price_list_rate || newItem.rate || 0
		localDiscount.value = roundCurrency(
			Number(newItem.discount_percentage) || 0,
		)
	},
	{ immediate: true },
)

watch(show, (open) => {
	if (!open) return
	buffer.value = null
	activeTab.value = tabs.value[0]?.key ?? null
})

// ─── Tabs & keypad ──────────────────────────────────────────────────────────
function commitBuffer() {
	if (buffer.value === null) return
	if (activeTab.value === "rate") localRate.value = ratePrice.value
	if (activeTab.value === "discount")
		localDiscount.value = discountPercent.value
	buffer.value = null
}

function selectTab(tab) {
	if (tab === activeTab.value) return
	commitBuffer()
	activeTab.value = tab
}

function applyPreset(preset) {
	buffer.value = null
	localDiscount.value = preset
	updateItem()
}

function isDiscountAllowed(percent) {
	return settingsStore.validateDiscount(percent)
}

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

function press(key) {
	const current = buffer.value ?? ""
	const [integer, decimals] = current.split(".")

	if (key === ".") {
		if (decimals === undefined) buffer.value = `${current || "0"}.`
		return
	}

	let next
	if (decimals !== undefined) {
		next = (current + key).replace(/(\.\d{2}).*$/, "$1")
	} else {
		next = (integer + key).replace(/^0+(?=\d)/, "")
		if (next.length > MAX_INTEGER_DIGITS) return
	}

	if (activeTab.value === "discount" && Number.parseFloat(next) > 100) return
	buffer.value = next
}

function backspace() {
	if (buffer.value === null) {
		const value =
			activeTab.value === "rate" ? localRate.value : localDiscount.value
		buffer.value = value ? String(roundCurrency(value)) : ""
	}
	buffer.value = buffer.value.slice(0, -1)
}

// ─── Save ───────────────────────────────────────────────────────────────────
function updateItem() {
	commitBuffer()

	const rate = roundCurrency(localRate.value)
	const isRateManuallyEdited =
		rate !== roundCurrency(originalPriceListRate.value)

	if (settingsStore.allowUserToEditRate && isRateManuallyEdited) {
		if (rate <= 0) {
			showError(__("Rate must be greater than zero"))
			activeTab.value = "rate"
			return
		}

		const maxDiscount = settingsStore.maxDiscountAllowed
		if (maxDiscount > 0 && rate < originalPriceListRate.value) {
			const reduction =
				Math.round(
					((originalPriceListRate.value - rate) / originalPriceListRate.value) *
						10000,
				) / 100
			if (reduction > maxDiscount) {
				showError(
					__(
						"Rate reduction of {0}% exceeds maximum allowed discount of {1}%",
						[reduction.toFixed(2), maxDiscount],
					),
				)
				activeTab.value = "rate"
				return
			}
		}
	}

	if (!isDiscountAllowed(localDiscount.value)) {
		showError(
			__("Maximum allowed discount is {0}%", [
				settingsStore.maxDiscountAllowed,
			]),
		)
		activeTab.value = "discount"
		return
	}

	emit("update-item", {
		...localItem.value,
		rate,
		price_list_rate: originalPriceListRate.value,
		discount_percentage: localDiscount.value,
		discount_amount: 0,
		is_rate_manually_edited: isRateManuallyEdited ? 1 : 0,
		original_rate: isRateManuallyEdited ? originalPriceListRate.value : null,
	})
	show.value = false
}

function cancel() {
	show.value = false
}
</script>
