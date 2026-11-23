<template>
  <Dialog v-model="open" :options="{ size: 'md' }">
    <template #body>
      <div class="bg-white dark:bg-gray-900 p-5 select-none text-start">
        <!-- Header -->
        <div class="flex items-start justify-between mb-4">
          <h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            {{ existingShift ? __('Existing Shift Found') : __('Open Shift') }}
          </h3>
          <button
            class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
            :aria-label="__('Cancel')"
            :disabled="createShiftResource.loading"
            @click="closeDialog('cancelled')"
          >
            <FeatherIcon name="x" class="w-6 h-6" />
          </button>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="py-12 flex justify-center">
          <div class="animate-spin rounded-full h-10 w-10 border-b-4 border-primary"></div>
        </div>

        <!-- Existing open shift: resume or close -->
        <template v-else-if="existingShift">
          <div class="grid grid-cols-2 gap-2 mb-5">
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3 min-w-0">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ __('POS Profile') }}</p>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100 truncate">{{ existingShift.pos_profile?.name }}</p>
            </div>
            <div class="rounded-xl bg-gray-50 dark:bg-gray-800 px-4 py-3">
              <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">{{ __('Opened') }}</p>
              <p class="text-base font-semibold text-gray-900 dark:text-gray-100 tabular-nums">{{ formatOpened(existingShift.pos_opening_shift?.period_start_date) }}</p>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <button
              type="button"
              class="h-16 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-lg font-semibold active:bg-gray-200 dark:active:bg-gray-700 disabled:opacity-50 transition-colors duration-75 touch-manipulation"
              :disabled="showClosingDialog"
              @click="showClosingDialog = true"
            >
              {{ __('Close Shift') }}
            </button>
            <button
              type="button"
              class="h-16 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active text-white text-lg font-bold flex items-center justify-center gap-2 transition-colors duration-75 touch-manipulation"
              @click="resumeShift"
            >
              <FeatherIcon name="play" class="w-6 h-6" />
              {{ __('Resume Shift') }}
            </button>
          </div>
        </template>

        <!-- Pick a profile: one tap opens the shift -->
        <template v-else>
          <div v-if="profiles.length" class="flex flex-col gap-2">
            <button
              v-for="profile in profiles"
              :key="profile.name"
              type="button"
              class="h-16 px-5 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 text-lg font-semibold flex items-center justify-between gap-3 hover:border-primary active:border-primary active:bg-primary/5 disabled:opacity-50 transition-colors duration-75 touch-manipulation"
              :disabled="createShiftResource.loading"
              @click="openShift(profile)"
            >
              <span class="truncate">{{ profile.name }}</span>
              <div
                v-if="createShiftResource.loading && openingProfile === profile.name"
                class="animate-spin rounded-full h-6 w-6 border-2 border-primary/30 border-t-primary flex-shrink-0"
              ></div>
              <FeatherIcon v-else name="chevron-right" class="w-6 h-6 text-gray-400 flex-shrink-0" />
            </button>
          </div>
          <p v-else class="py-8 text-center text-base text-gray-500 dark:text-gray-400">
            {{ __('No POS Profiles available. Please contact your administrator.') }}
          </p>
        </template>

        <!-- Error -->
        <div v-if="errorMessage" class="mt-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
          <p class="text-sm text-red-700 dark:text-red-400">{{ errorMessage }}</p>
        </div>
      </div>
    </template>
  </Dialog>

  <ShiftClosingDialog
    v-if="existingShift"
    v-model="showClosingDialog"
    :opening-shift="existingShift?.pos_opening_shift?.name"
    @shift-closed="handleExistingShiftClosed"
  />
</template>

<script setup>
// Brocki: shifts always open with 0 for every payment method (nobody starts
// with a float), so there's no opening-balance step: tap a profile, done.
import { Dialog, FeatherIcon, createResource } from "frappe-ui"
import { computed, ref, watch } from "vue"
import { useShift } from "../composables/useShift"
import ShiftClosingDialog from "./ShiftClosingDialog.vue"

const props = defineProps({
	modelValue: Boolean,
})

const emit = defineEmits(["update:modelValue", "shift-opened", "dialog-closed"])

const open = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const { createOpeningShift, checkOpeningShift } = useShift()
const createShiftResource = createOpeningShift

const profilesResource = createResource({
	url: "pos_next.api.pos_profile.get_pos_profiles",
	auto: false,
})

// Payment methods per profile, needed to seed the 0-balance rows
const dialogDataResource = createResource({
	url: "pos_next.api.shifts.get_opening_dialog_data",
	auto: false,
})

const loading = ref(false)
const existingShift = ref(null)
const showClosingDialog = ref(false)
const openingProfile = ref(null)
const errorMessage = ref("")

const profiles = computed(() => profilesResource.data || [])

// immediate: the dialog can mount already open (e.g. after logout)
watch(
	open,
	(isOpen) => {
		if (isOpen) initDialog()
		else resetDialog()
	},
	{ immediate: true },
)

async function initDialog() {
	resetDialog()
	loading.value = true
	try {
		const [, , shift] = await Promise.all([
			profilesResource.fetch(),
			dialogDataResource.fetch(),
			checkOpeningShift.fetch(),
		])
		existingShift.value = shift || null
	} catch (error) {
		console.error("Error initializing shift dialog:", error)
		errorMessage.value = errorText(error)
	} finally {
		loading.value = false
	}
}

function resetDialog() {
	existingShift.value = null
	openingProfile.value = null
	errorMessage.value = ""
	createShiftResource.reset()
}

async function openShift(profile) {
	errorMessage.value = ""
	openingProfile.value = profile.name

	const balance_details = (dialogDataResource.data?.payments_method || [])
		.filter((method) => method.parent === profile.name)
		.map((method) => ({ mode_of_payment: method.mode_of_payment, opening_amount: 0 }))

	try {
		await createShiftResource.submit({
			pos_profile: profile.name,
			company: profile.company,
			balance_details,
		})
		emit("shift-opened")
		closeDialog("shift-opened")
	} catch (error) {
		console.error("Error opening shift:", error)
		errorMessage.value = errorText(error)
	} finally {
		openingProfile.value = null
	}
}

function resumeShift() {
	emit("shift-opened")
	closeDialog("resumed")
}

function closeDialog(reason) {
	open.value = false
	emit("dialog-closed", { reason })
}

async function handleExistingShiftClosed() {
	showClosingDialog.value = false
	existingShift.value = null
	// Refresh shift state; the profile list is shown again to open a new one
	await checkOpeningShift.fetch()
}

function errorText(error) {
	return error?.messages?.[0] || error?.message || String(error)
}

function formatOpened(value) {
	if (!value) return __("N/A")
	const d = new Date(String(value).replace(" ", "T"))
	if (Number.isNaN(d.getTime())) return String(value)
	const pad = (n) => String(n).padStart(2, "0")
	return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
}
</script>
