<template>
	<Dialog disable-outside-click-to-close v-model="show" :options="{ size: '5xl' }">
		<template #body>
			<div class="h-[85vh] flex flex-col bg-white dark:bg-gray-900 p-5 select-none">
				<!-- Header -->
				<div class="flex items-start justify-between mb-4">
					<h3 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
						{{ __('Draft Invoices') }}
					</h3>
					<button
						class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
						:aria-label="__('Close')"
						@click="show = false"
					>
						<FeatherIcon name="x" class="w-7 h-7" />
					</button>
				</div>

				<!-- Empty State -->
				<div
					v-if="drafts.length === 0"
					class="flex-1 flex flex-col items-center justify-center text-center"
				>
					<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
						{{ __('No draft invoices') }}
					</p>
					<p class="text-base text-gray-500 mt-1">
						{{ __('Save invoices as drafts to continue later') }}
					</p>
				</div>

				<!-- Drafts table (same look as the invoice history dialog) -->
				<div
					v-else
					class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-2 pt-0"
				>
					<div
						:class="[
							gridCols,
							'sticky top-0 z-[1] bg-gray-100 dark:bg-gray-800 border border-transparent px-3 pt-3 pb-1 text-base font-semibold text-gray-600 dark:text-gray-400',
						]"
					>
						<span>{{ __('Date') }}</span>
						<span class="text-end">{{ __('Items') }}</span>
						<span class="text-end">{{ __('Total') }}</span>
						<span></span>
					</div>

					<div
						v-for="draft in drafts"
						:key="draft.draft_id"
						:class="[
							gridCols,
							'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm px-4 py-3',
						]"
					>
						<span class="text-xl font-semibold text-gray-900 dark:text-gray-100 tabular-nums truncate">
							{{ formatDateTime(draft.created_at) }}
						</span>
						<span class="text-lg text-gray-700 dark:text-gray-300 tabular-nums text-end">
							{{ draft.items?.length || 0 }}
						</span>
						<span class="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums text-end">
							{{ formatCurrency(calculateTotal(draft.items)) }}
						</span>
						<div class="flex items-center justify-end gap-4">
							<button
								type="button"
								:class="[actionButtonClass, 'bg-primary hover:bg-primary-hover active:bg-primary-active']"
								@click="askConfirm(draft.draft_id)"
							>
								{{ __('Delete') }}
							</button>
							<button
								type="button"
								:class="[actionButtonClass, 'bg-primary hover:bg-primary-hover active:bg-primary-active']"
								@click="$emit('load-draft', draft)"
							>
								{{ __('Open') }}
							</button>
						</div>
					</div>
				</div>

				<!-- Footer -->
				<div v-if="drafts.length > 0" class="pt-4">
					<button
						type="button"
						class="h-16 px-10 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-xl font-bold shadow-md transition-colors duration-75 touch-manipulation"
						@click="askConfirm('all')"
					>
						{{ __('Clear All') }}
					</button>
				</div>
			</div>
		</template>
	</Dialog>

	<!-- Delete confirmation (single draft or all), same look as the clear cart dialog -->
	<Dialog
		disable-outside-click-to-close
		:model-value="confirmTarget !== null"
		:options="{ size: 'md' }"
		@update:model-value="(open) => { if (!open) confirmTarget = null }"
	>
		<template #body>
			<div class="bg-white dark:bg-gray-900 p-5 select-none text-start">
				<h3 class="mb-4 text-2xl font-bold text-gray-900 dark:text-gray-100">
					{{ confirmTarget === 'all' ? __('Clear All Drafts?') : __('Delete Draft?') }}
				</h3>
				<p class="mb-6 text-lg text-gray-700 dark:text-gray-300">
					{{
						confirmTarget === 'all'
							? __('Permanently delete all {0} draft invoices?', [drafts.length])
							: __('Permanently delete this draft invoice?')
					}}
				</p>
				<div class="grid grid-cols-2 gap-3">
					<button
						type="button"
						class="h-20 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-xl font-semibold hover:bg-gray-200 active:bg-gray-300 dark:hover:bg-gray-700 dark:active:bg-gray-600 transition-colors duration-75 touch-manipulation"
						@click="confirmTarget = null"
					>
						{{ __('Cancel') }}
					</button>
					<button
						type="button"
						class="h-20 rounded-xl bg-red-600 hover:bg-red-700 active:bg-red-800 text-white text-xl font-bold shadow-lg transition-colors duration-75 touch-manipulation"
						@click="confirmDelete"
					>
						{{ confirmTarget === 'all' ? __('Clear All') : __('Delete') }}
					</button>
				</div>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import { useToast } from "@/composables/useToast"
import {
	DEFAULT_CURRENCY,
	formatCurrency as formatCurrencyUtil,
	roundCurrency,
} from "@/utils/currency"
import { clearAllDrafts, deleteDraft, getAllDrafts } from "@/utils/draftManager"
import { Dialog, FeatherIcon } from "frappe-ui"
import { computed, onMounted, ref, watch } from "vue"

const { showSuccess, showError } = useToast()

const props = defineProps({
	modelValue: Boolean,
	currency: {
		type: String,
		default: DEFAULT_CURRENCY,
	},
})

const emit = defineEmits(["update:modelValue", "load-draft", "drafts-updated"])

const gridCols = "grid grid-cols-[minmax(0,1fr)_6rem_10rem_17rem] items-center gap-3"

const actionButtonClass =
	"w-28 h-14 flex items-center justify-center rounded-xl text-white text-lg font-semibold shadow-sm transition-colors duration-75 touch-manipulation"

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const drafts = ref([])
// null | 'all' | <draft_id>
const confirmTarget = ref(null)

watch(show, (open) => {
	if (open) loadDrafts()
})

onMounted(loadDrafts)

async function loadDrafts() {
	try {
		drafts.value = await getAllDrafts()
	} catch (error) {
		console.error("Error loading drafts:", error)
		showError(__("Failed to load draft invoices"))
	}
}

function askConfirm(target) {
	confirmTarget.value = target
}

async function confirmDelete() {
	const target = confirmTarget.value
	try {
		if (target === "all") {
			await clearAllDrafts()
		} else {
			await deleteDraft(target)
		}
		await loadDrafts()
		emit("drafts-updated")
		showSuccess(
			target === "all"
				? __("All draft invoices deleted")
				: __("Draft invoice deleted"),
		)
	} catch (error) {
		console.error("Error deleting draft(s):", error)
		showError(
			target === "all"
				? __("Failed to clear drafts")
				: __("Failed to delete draft"),
		)
	} finally {
		confirmTarget.value = null
	}
}

const pad = (n) => String(n).padStart(2, "0")

function formatDateTime(dateStr) {
	const date = new Date(dateStr)
	return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}, ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function formatCurrency(amount) {
	return formatCurrencyUtil(Number.parseFloat(amount || 0), props.currency)
}

/** Line totals after row discounts */
function calculateTotal(items) {
	if (!items || items.length === 0) return 0
	return roundCurrency(
		items.reduce((sum, item) => {
			const qty = item.quantity || item.qty || 1
			const gross = roundCurrency(qty * roundCurrency(item.rate || 0))
			return sum + gross - roundCurrency(item.discount_amount || 0)
		}, 0),
	)
}
</script>
