<template>
	<!-- size "full" isn't a frappe-ui size, so no max-w-* is applied; the width cap lives in the <style> below -->
	<Dialog v-model="show" :options="{ title: 'invoice-history', size: 'full' }">
		<template #body>
			<div class="h-[85vh] flex flex-col bg-white dark:bg-gray-900 p-5">
				<!-- Header -->
				<div class="flex items-start justify-between mb-4">
					<h3 class="text-2xl font-semibold text-gray-900 dark:text-gray-100">
						{{ __('Invoice History') }}
					</h3>
					<button
						class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
						:aria-label="__('Close')"
						@click="show = false"
					>
						<FeatherIcon name="x" class="w-7 h-7" />
					</button>
				</div>

				<div class="flex-1 min-h-0 flex gap-5">
					<!-- List (start side) -->
					<div class="flex-1 min-w-0 flex flex-col">
						<!-- Initial loading -->
						<div
							v-if="loading && invoices.length === 0"
							class="flex-1 flex flex-col items-center justify-center"
						>
							<div class="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
							<p class="mt-3 text-base text-gray-500">{{ __('Loading invoices...') }}</p>
						</div>

						<!-- Empty State -->
						<div
							v-else-if="invoices.length === 0"
							class="flex-1 flex flex-col items-center justify-center text-center"
						>
							<FeatherIcon name="file-text" class="w-14 h-14 text-gray-300 mb-3" />
							<p class="text-lg font-semibold text-gray-900 dark:text-gray-100">
								{{ __('No invoices found') }}
							</p>
						</div>

						<!-- Invoices table (same look as the draft invoices dialog) -->
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
								<span>{{ __('Invoice') }}</span>
								<span>{{ __('Date') }}</span>
								<span class="text-end">{{ __('Total') }}</span>
								<span></span>
							</div>

							<div
								v-for="invoice in invoices"
								:key="invoice.name"
								:class="[
									gridCols,
									'rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm px-3 py-2',
								]"
							>
								<span class="text-base font-medium text-gray-900 dark:text-gray-100 truncate">
									{{ invoice.name }}
								</span>
								<span class="text-lg text-gray-700 dark:text-gray-300 tabular-nums">
									{{ formatPostingDateTime(invoice.posting_date, invoice.posting_time) }}
								</span>
								<span class="text-xl font-bold text-gray-900 dark:text-gray-100 tabular-nums text-end">
									{{ formatCurrency(invoice.grand_total) }}
								</span>
								<div class="flex items-center justify-end gap-2">
									<button
										v-if="canCreateReturn(invoice)"
										type="button"
										:class="[actionButtonClass, 'bg-secondary hover:bg-secondary-hover active:bg-secondary-active']"
										@click="openReturnModal(invoice)"
									>
										{{ __('Return') }}
									</button>
									<button
										type="button"
										:class="[actionButtonClass, 'bg-primary hover:bg-primary-hover active:bg-primary-active']"
										@click="printInvoice(invoice)"
									>
										{{ __('Print') }}
									</button>
									<button
										type="button"
										:class="[actionButtonClass, 'bg-primary hover:bg-primary-hover active:bg-primary-active']"
										@click="viewInvoice(invoice)"
									>
										{{ __('View') }}
									</button>
								</div>
							</div>

							<!-- Load More -->
							<button
								v-if="hasMore"
								type="button"
								class="shrink-0 h-14 mt-1 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:opacity-60 text-white text-lg font-semibold transition-colors duration-75 touch-manipulation"
								:disabled="loading"
								@click="loadMore"
							>
								{{ loading ? __('Loading...') : __('Load More') }}
							</button>
						</div>
					</div>

					<!-- Search + keypad (end side) -->
					<div class="w-96 shrink-0 flex flex-col gap-3">
						<div class="relative">
							<FeatherIcon
								name="search"
								class="absolute start-4 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400 pointer-events-none"
							/>
							<!-- inputmode="none": keypad instead of the OS keyboard; scanners and hardware keyboards still work -->
							<input
								v-model="searchTerm"
								type="text"
								inputmode="none"
								:placeholder="__('Invoice Number')"
								class="w-full h-16 ps-14 pe-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-2xl font-semibold tabular-nums text-gray-900 dark:text-gray-100 placeholder:text-lg placeholder:font-normal placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
							/>
						</div>
						<NumericKeypad
							:decimal="false"
							@press="searchTerm += $event"
							@backspace="searchTerm = searchTerm.slice(0, -1)"
							@clear="searchTerm = ''"
						/>
					</div>
				</div>
			</div>
		</template>
	</Dialog>

	<!-- Return Invoice Dialog -->
	<ReturnInvoiceDialog
		v-model="showReturnDialog"
		:pos-profile="posProfile"
		:pos-opening-shift="posOpeningShift"
		:currency="currency"
		:preselected-invoice="selectedInvoiceForReturn"
		@return-created="handleReturnCreated"
	/>
</template>

<script setup>
import NumericKeypad from "@/components/common/NumericKeypad.vue"
import { useToast } from "@/composables/useToast"
import {
	DEFAULT_CURRENCY,
	formatCurrency as formatCurrencyUtil,
} from "@/utils/currency"
import { formatPostingDateTime } from "@/utils/dateTime"
import { Dialog, FeatherIcon, call } from "frappe-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import ReturnInvoiceDialog from "./ReturnInvoiceDialog.vue"

const { showError } = useToast()

const props = defineProps({
	modelValue: Boolean,
	posProfile: String,
	posOpeningShift: String,
	currency: {
		type: String,
		default: DEFAULT_CURRENCY,
	},
})

function formatCurrency(amount) {
	return formatCurrencyUtil(Number.parseFloat(amount || 0), props.currency)
}

const emit = defineEmits([
	"update:modelValue",
	"create-return",
	"view-invoice",
	"print-invoice",
	"return-created",
])

const gridCols = "grid grid-cols-[minmax(0,1fr)_11rem_9rem_21rem] items-center gap-3"

const actionButtonClass = "w-24 h-14 flex items-center justify-center rounded-xl text-white text-lg font-semibold shadow-sm transition-colors duration-75 touch-manipulation"

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const invoices = ref([])
const searchTerm = ref("")
const page = ref(0)
const pageSize = 20
const hasMore = ref(true)

// Return dialog state
const showReturnDialog = ref(false)
const selectedInvoiceForReturn = ref(null)

const loading = ref(false)

// This increments per request, used to prevent async timing issues between multiple
// requests, for example if the first requests takes longer to laod than a second one
// we don't want the first one to override the second requests result just because
// it took longer
let requestSeq = 0

const SEARCH_DEBOUNCE_MS = 300
let searchTimeout = null

async function fetchInvoices({ append = false } = {}) {
	if (!props.posProfile) return

	const seq = ++requestSeq
	loading.value = true
	const term = searchTerm.value.trim()

	try {
		const data = await call("frappe.client.get_list", {
			doctype: "Sales Invoice",
			filters: {
				is_pos: 1,
				pos_profile: props.posProfile,
				...(term && { name: ["like", `%${term}%`] }),
			},
			fields: [
				"name",
				"customer",
				"customer_name",
				"posting_date",
				"posting_time",
				"grand_total",
				"status",
				"docstatus",
				"is_return",
			],
			order_by: "modified desc",
			limit_start: page.value * pageSize,
			limit_page_length: pageSize,
		})

		if (seq !== requestSeq) return

		const rows = Array.isArray(data) ? data : []
		invoices.value = append ? [...invoices.value, ...rows] : rows
		hasMore.value = rows.length === pageSize
	} catch (error) {
		if (seq !== requestSeq) return
		console.error("Error loading invoices:", error)
		showError(__("Failed to load invoices"))
		if (append) page.value--
	} finally {
		if (seq === requestSeq) {
			loading.value = false
		}
	}
}

watch(
	show,
	(open) => {
		if (open) loadInvoices()
	},
	{ immediate: true },
)

watch(searchTerm, () => {
	clearTimeout(searchTimeout)
	searchTimeout = setTimeout(loadInvoices, SEARCH_DEBOUNCE_MS)
})

onBeforeUnmount(() => clearTimeout(searchTimeout))

// Clear selected invoice when return dialog closes
watch(showReturnDialog, (val) => {
	if (!val) {
		selectedInvoiceForReturn.value = null
	}
})

function loadInvoices() {
	clearTimeout(searchTimeout)
	page.value = 0
	fetchInvoices()
}

function loadMore() {
	page.value++
	fetchInvoices({ append: true })
}

function viewInvoice(invoice) {
	emit("view-invoice", invoice)
}

function printInvoice(invoice) {
	emit("print-invoice", invoice)
}

function canCreateReturn(invoice) {
	// Can create return if:
	// 1. Invoice is submitted (docstatus === 1)
	// 2. Not already a return invoice
	// 3. Status is not "Credit Note Issued" (already has a return)
	return (
		invoice.docstatus === 1 &&
		!invoice.is_return &&
		invoice.status !== "Credit Note Issued"
	)
}

function openReturnModal(invoice) {
	selectedInvoiceForReturn.value = invoice
	showReturnDialog.value = true
}

function handleReturnCreated(returnInvoice) {
	// Refresh the invoice list to show updated statuses
	loadInvoices()
	// Emit the event to parent
	emit("return-created", returnInvoice)
}
</script>

<style>
.dialog-overlay[data-dialog="invoice-history"] .dialog-content {
	max-width: 96rem;
}
</style>
