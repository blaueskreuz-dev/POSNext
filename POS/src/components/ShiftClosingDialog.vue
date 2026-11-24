<template>
  <Dialog disable-outside-click-to-close v-model="open" :options="{ size: 'md' }">
    <template #body>
      <div class="bg-white dark:bg-gray-900 p-5 select-none text-start">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ __('Close Shift') }}
          </h3>
          <button
            class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
            :aria-label="__('Cancel')"
            :disabled="submitResource.loading"
            @click="closeDialog"
          >
            <FeatherIcon name="x" class="w-6 h-6" />
          </button>
        </div>

        <!-- Loading -->
        <div v-if="closingDataResource.loading" class="py-12 flex flex-col items-center gap-3">
          <div class="animate-spin rounded-full h-10 w-10 border-b-4 border-primary"></div>
          <p class="text-base text-gray-500 dark:text-gray-400">{{ __('Loading shift data...') }}</p>
        </div>

        <template v-else-if="closingData">
          <!-- Shift info -->
          <div class="grid grid-cols-2 gap-2 mb-4">
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ __('Duration') }}</p>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{{ getShiftDuration() }}</p>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ __('Sales') }}</p>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums">
                {{ closingData.sales_count || 0 }}<span v-if="closingData.returns_count" class="text-sm font-medium text-gray-500 dark:text-gray-400"> · {{ __('{0} returns', [closingData.returns_count]) }}</span>
              </p>
            </div>
          </div>

          <!-- Expected totals per payment method (read-only) -->
          <div class="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-5">
            <div
              v-for="payment in closingData.payment_reconciliation"
              :key="payment.mode_of_payment"
              class="flex items-center justify-between gap-4 px-4 py-3.5 border-b border-gray-200 dark:border-gray-700"
            >
              <span class="text-lg text-gray-700 dark:text-gray-300">{{ payment.mode_of_payment }}</span>
              <span class="text-lg font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{{ money(payment.expected_amount) }}</span>
            </div>
            <div class="flex items-center justify-between gap-4 px-4 py-4 bg-gray-100 dark:bg-gray-800">
              <span class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ __('Total') }}</span>
              <span class="text-2xl font-bold text-gray-900 dark:text-gray-100 tabular-nums">{{ money(totalExpected) }}</span>
            </div>
          </div>
        </template>

        <!-- Error (load or submit) -->
        <div v-if="errorMessage" class="mb-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p class="text-base font-semibold text-red-800 dark:text-red-300">
            {{ closingData ? __('Error Closing Shift') : __('Failed to Load Shift Data') }}
          </p>
          <p class="text-sm text-red-700 dark:text-red-400 mt-0.5">{{ errorMessage }}</p>
        </div>

        <!-- Actions -->
        <div class="grid grid-cols-2 gap-2">
          <button
            type="button"
            class="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg font-semibold active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-50 transition-colors duration-75 touch-manipulation"
            :disabled="submitResource.loading"
            @click="closeDialog"
          >
            {{ __('Cancel') }}
          </button>
          <button
            type="button"
            class="h-16 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-lg font-bold flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 transition-colors duration-75 touch-manipulation"
            :disabled="!closingData || submitResource.loading"
            @click="submitClosing"
          >
            <div v-if="submitResource.loading" class="animate-spin rounded-full h-5 w-5 border-2 border-white/40 border-t-white"></div>
            <FeatherIcon v-else name="check" class="w-6 h-6" />
            {{ submitResource.loading ? __('Closing Shift...') : __('Close Shift') }}
          </button>
        </div>
      </div>
    </template>
  </Dialog>
</template>

<script setup>
import { Dialog, FeatherIcon } from "frappe-ui"
import { computed, onBeforeUnmount, ref, watch } from "vue"
import { useShift, shiftState } from "../composables/useShift"
import { usePOSShiftStore } from "../stores/posShift"

const props = defineProps({
	modelValue: {
		type: Boolean,
		required: true,
	},
	openingShift: {
		type: String,
		required: true,
		validator: (value) => value && value.length > 0,
	},
})

const emit = defineEmits(["update:modelValue", "shift-closed"])

const open = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const { getClosingShiftData, submitClosingShift } = useShift()
const shiftStore = usePOSShiftStore()

function money(amount) {
	return (Number.parseFloat(amount) || 0).toFixed(2)
}

const closingData = ref(null)
const closingDataResource = getClosingShiftData
const submitResource = submitClosingShift
const errorMessage = ref("")

// Pause the header's shift timer while the dialog is open
watch(open, (isOpen) => {
	shiftStore.shiftTimerPaused = isOpen
	if (isOpen && props.openingShift) loadClosingData()
})

onBeforeUnmount(() => {
	shiftStore.shiftTimerPaused = false
})

async function loadClosingData() {
	errorMessage.value = ""
	try {
		closingData.value = await closingDataResource.submit({
			opening_shift: props.openingShift,
		})
	} catch (error) {
		console.error("Error loading closing data:", error)
		errorMessage.value = __("Unable to load shift data. Please check your connection and try again.")
	}
}

async function submitClosing() {
	if (!closingData.value) return
	errorMessage.value = ""

	// No counted amounts at close: they're entered later by the counting team.
	const payload = {
		...closingData.value,
		payment_reconciliation: closingData.value.payment_reconciliation.map((p) => ({
			...p,
			closing_amount: null,
			difference: 0,
		})),
	}

	try {
		await submitResource.submit({ closing_shift: payload })
		emit("shift-closed")
		closeDialog()
	} catch (error) {
		console.error("Error submitting closing shift:", error)
		errorMessage.value = error?.messages?.[0] || error?.message || __("Failed to close shift.")
	}
}

function closeDialog() {
	open.value = false
	closingData.value = null
	errorMessage.value = ""
}

const totalExpected = computed(() =>
	(closingData.value?.payment_reconciliation || []).reduce(
		(sum, p) => sum + (Number.parseFloat(p.expected_amount) || 0),
		0,
	),
)

function getShiftDuration() {
	// Same timezone-safe approach as the header timer
	const { _initialElapsedMs, _receivedAt } = shiftState.value
	const diff = _initialElapsedMs + (Date.now() - (_receivedAt || Date.now()))
	if (!closingData.value?.period_start_date || diff < 0) return __("N/A")

	const days = Math.floor(diff / (1000 * 60 * 60 * 24))
	const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
	const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
	if (days > 0) return __("{0}d {1}h", [days, hours])
	return hours > 0 ? __("{0}h {1}m", [hours, minutes]) : __("{0}m", [minutes])
}
</script>
