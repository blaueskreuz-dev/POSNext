<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="show"
				class="fixed inset-0 bg-black/30 dark:bg-black/70 dialog-overlay flex items-center justify-center p-4"
				@click.self="show = false"
			>
				<div class="w-full max-w-3xl h-[80vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-5 select-none">
					<!-- Header -->
					<div class="flex items-start justify-between mb-4">
						<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
							{{ __('Draft Invoices') }}
						</h3>
						<button
							class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
							:aria-label="__('Close')"
							@click="show = false"
						>
							<FeatherIcon name="x" class="w-6 h-6" />
						</button>
					</div>

					<!-- Empty State -->
					<div
						v-if="drafts.length === 0"
						class="flex-1 flex flex-col items-center justify-center text-center"
					>
						<FeatherIcon name="file-text" class="w-12 h-12 text-gray-300 mb-3" />
						<p class="text-base font-semibold text-gray-900 dark:text-gray-100">
							{{ __('No draft invoices') }}
						</p>
						<p class="text-sm text-gray-500 mt-1">
							{{ __('Save invoices as drafts to continue later') }}
						</p>
					</div>

					<!-- Drafts table (same look as the cart rows) -->
					<div
						v-else
						class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-2 rounded-xl bg-gray-100 dark:bg-gray-800 p-2 pt-0"
					>
						<div
							:class="[
								gridCols,
								'sticky top-0 z-[1] bg-gray-100 dark:bg-gray-800 border border-transparent px-3 pt-3 pb-1 text-sm font-semibold text-gray-600 dark:text-gray-400',
							]"
						>
							<span>{{ __('ID') }}</span>
							<span>{{ __('Time') }}</span>
							<span class="text-end">{{ __('Items') }}</span>
							<span class="text-end">{{ __('Total') }}</span>
							<span></span>
						</div>

						<div
							v-for="draft in drafts"
							:key="draft.draft_id"
							:class="[
								gridCols,
								'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm px-3 py-3 hover:bg-primary/5 hover:border-primary/50 active:bg-primary/10 cursor-pointer transition-colors duration-100',
							]"
							@click="$emit('load-draft', draft)"
						>
							<span class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">
								{{ draft.draft_id }}
							</span>
							<span class="text-base text-gray-700 dark:text-gray-300 tabular-nums">
								{{ formatDateTime(draft.created_at) }}
							</span>
							<span class="text-base text-gray-700 dark:text-gray-300 tabular-nums text-end">
								{{ draft.items?.length || 0 }}
							</span>
							<span class="text-lg font-bold text-gray-900 dark:text-gray-100 tabular-nums text-end">
								{{ formatCurrency(calculateTotal(draft.items)) }}
							</span>
							<div class="flex items-center justify-end gap-1">
								<button
									v-if="allowPrintDraftInvoices"
									type="button"
									class="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-primary hover:bg-primary/10 active:bg-primary/20 transition-colors touch-manipulation"
									:aria-label="__('Print draft')"
									:title="__('Print draft')"
									@click.stop="handlePrintDraft(draft)"
								>
									<FeatherIcon name="printer" class="w-5 h-5" />
								</button>
								<button
									type="button"
									class="w-10 h-10 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors touch-manipulation"
									:aria-label="__('Delete draft')"
									:title="__('Delete draft')"
									@click.stop="askConfirm(draft.draft_id)"
								>
									<FeatherIcon name="trash-2" class="w-5 h-5" />
								</button>
							</div>
						</div>
					</div>

					<!-- Footer -->
					<div v-if="drafts.length > 0" class="pt-4">
						<button
							type="button"
							class="h-14 px-6 rounded-xl bg-red-50 dark:bg-red-900/30 text-base font-semibold text-red-600 dark:text-red-400 active:bg-red-100 dark:active:bg-red-900/50 transition-colors duration-75 touch-manipulation"
							@click="askConfirm('all')"
						>
							{{ __('Clear All') }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>

	<!-- Delete confirmation (single draft or all) -->
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="confirmTarget"
				class="fixed inset-0 bg-black/30 dark:bg-black/70 dialog-overlay flex items-center justify-center p-4"
				@click.self="confirmTarget = null"
			>
				<div class="w-full max-w-sm rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-5 select-none">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">
						{{ confirmTarget === 'all' ? __('Clear All Drafts?') : __('Delete Draft?') }}
					</h3>
					<p class="text-base text-gray-600 dark:text-gray-400 mb-5">
						{{
							confirmTarget === 'all'
								? __('Permanently delete all {0} draft invoices?', [drafts.length])
								: __('Permanently delete this draft invoice?')
						}}
					</p>
					<div class="grid grid-cols-2 gap-2">
						<button
							type="button"
							class="h-14 rounded-xl bg-gray-200 dark:bg-gray-700 text-base font-semibold text-gray-700 dark:text-gray-200 active:bg-gray-300 dark:active:bg-gray-600 transition-colors duration-75 touch-manipulation"
							@click="confirmTarget = null"
						>
							{{ __('Cancel') }}
						</button>
						<button
							type="button"
							class="h-14 rounded-xl bg-red-600 text-base font-bold text-white active:bg-red-700 transition-colors duration-75 touch-manipulation"
							@click="confirmDelete"
						>
							{{ confirmTarget === 'all' ? __('Clear All') : __('Delete') }}
						</button>
					</div>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import { useToast } from "@/composables/useToast"
import { usePOSShiftStore } from "@/stores/posShift"
import {
	DEFAULT_CURRENCY,
	formatCurrency as formatCurrencyUtil,
	roundCurrency,
} from "@/utils/currency"
import { clearAllDrafts, deleteDraft, getAllDrafts } from "@/utils/draftManager"
import { printInvoiceCustom } from "@/utils/printInvoice"
import { FeatherIcon } from "frappe-ui"
import { computed, onMounted, ref, watch } from "vue"

const { showSuccess, showError } = useToast()
const shiftStore = usePOSShiftStore()

const props = defineProps({
	modelValue: Boolean,
	currency: {
		type: String,
		default: DEFAULT_CURRENCY,
	},
	allowPrintDraftInvoices: {
		type: Boolean,
		default: false,
	},
})

const emit = defineEmits(["update:modelValue", "load-draft", "drafts-updated"])

const gridCols =
	"grid grid-cols-[minmax(0,1fr)_9rem_5rem_9rem_6rem] items-center gap-3"

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

function handlePrintDraft(draft) {
	if (!props.allowPrintDraftInvoices) return

	try {
		printInvoiceCustom({
			name: draft.draft_id,
			company: shiftStore.profileCompany,
			items: draft.items,
			payments: [],
			grand_total: calculateTotal(draft.items),
			posting_date: draft.created_at,
			customer_name:
				draft.customer?.customer_name || draft.customer?.name || draft.customer,
			status: "Draft",
			header: "Draft",
			footer:
				"الفاتورة لم يتم تسجيلها في حسابات الجهة، وبالتالي لا يُعتد بها، ولا تتحمل الجهة أي مسؤولية عن أي أضرار قد تنتج عنها.",
		})
	} catch (error) {
		console.error("Error printing draft:", error)
		showError(__("Failed to print draft"))
	}
}

const pad = (n) => String(n).padStart(2, "0")

/** "14:30" for today, "09.11. 14:30" otherwise */
function formatDateTime(dateStr) {
	const date = new Date(dateStr)
	const time = `${pad(date.getHours())}:${pad(date.getMinutes())}`
	if (date.toDateString() === new Date().toDateString()) return time
	return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}. ${time}`
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
