<template>
	<Teleport to="body">
		<Transition name="dialog">
			<div
				v-if="show"
				class="fixed inset-0 bg-black/30 dark:bg-black/70 dialog-overlay flex items-center justify-center p-4"
				@click.self="handleClose"
			>
				<div class="w-full max-w-2xl h-[85vh] flex flex-col rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-5 select-none">
					<!-- Header -->
					<div class="flex items-start justify-between mb-4">
						<div class="min-w-0">
							<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
								{{ __('POS Settings') }}
							</h3>
							<p class="text-sm text-gray-500 dark:text-gray-400 truncate">
								{{ settings.pos_profile || posProfile }}
							</p>
						</div>
						<button
							class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
							:aria-label="__('Close')"
							@click="handleClose"
						>
							<FeatherIcon name="x" class="w-6 h-6" />
						</button>
					</div>

					<!-- Loading -->
					<div v-if="loading" class="flex-1 flex items-center justify-center">
						<LoadingIndicator class="w-8 h-8 text-gray-400" />
					</div>

					<!-- No profile -->
					<div
						v-else-if="!(settings.pos_profile || posProfile)"
						class="flex-1 flex flex-col items-center justify-center text-center"
					>
						<FeatherIcon name="settings" class="w-12 h-12 text-gray-300 mb-3" />
						<p class="text-base font-semibold text-gray-900 dark:text-gray-100">
							{{ __('No POS Profile Selected') }}
						</p>
						<p class="text-sm text-gray-500 mt-1">
							{{ __('Please select a POS Profile to configure settings') }}
						</p>
					</div>

					<template v-else>
						<!-- Content -->
						<div class="flex-1 min-h-0 overflow-y-auto flex flex-col gap-4 rounded-xl bg-gray-100 dark:bg-gray-800 p-3">
							<section>
								<div :class="groupClass">
									<CheckboxField
										v-model="settings.silent_print"
										:label="__('Silent Print')"
										:description="__('Send receipts directly to a thermal printer via QZ Tray (no browser dialog)')"
									/>
								</div>
							</section>

							<template v-if="settings.silent_print">
								<section>
									<h4 :class="groupTitleClass">{{ __('Printer') }}</h4>
									<div :class="groupClass">
										<!-- QZ connection status -->
										<div class="min-h-[4rem] flex items-center gap-3 px-4 py-3">
											<span
												:class="[
													'w-3 h-3 rounded-full flex-shrink-0',
													qzConnecting ? 'bg-yellow-500 animate-pulse' : qzConnected ? 'bg-green-500' : 'bg-red-500',
												]"
											/>
											<span class="flex-1 text-base font-semibold text-gray-900 dark:text-gray-100">
												{{ qzConnecting ? __('Connecting to QZ Tray...') : qzConnected ? __('QZ Tray Connected') : __('QZ Tray Not Connected') }}
											</span>
											<button
												v-if="!qzConnected && !qzConnecting"
												type="button"
												:class="secondaryButtonClass"
												@click="handleQzConnect"
											>
												{{ __('Retry') }}
											</button>
										</div>

										<!-- Printer selection -->
										<SelectField
											v-model="selectedPrinter"
											:label="__('Printer')"
											:options="printerOptions"
											:description="qzPrinters.length === 0 && !loadingPrinters ? __('No printers found. Is QZ Tray running?') : ''"
										/>
									</div>
								</section>

								<!-- Certificate -->
								<section>
									<h4 :class="groupTitleClass">{{ __('Silent Print Certificate') }}</h4>
									<div :class="groupClass">
										<div class="px-4 py-3 flex flex-col gap-3">
											<div class="flex items-center gap-3">
												<FeatherIcon
													:name="qzCertStatus === 'trusted' ? 'shield' : 'lock'"
													:class="['w-5 h-5 flex-shrink-0', certTone.icon]"
												/>
												<span :class="['text-base font-semibold', certTone.text]">
													{{ qzCertStatus === 'trusted' ? __('Installed') : qzCertStatus === 'untrusted' ? __('Not Installed') : __('Checking...') }}
												</span>
											</div>
											<p class="text-sm text-gray-600 dark:text-gray-400">
												{{
													qzCertStatus === 'trusted'
														? __('Certificate is installed and signing is active. Print jobs will be sent silently without confirmation dialogs.')
														: qzCertStatus === 'untrusted'
															? __('Certificate is not installed on this machine. Generate a certificate, download it, and import it into QZ Tray.')
															: __('To print without confirmation dialogs, generate a signing certificate and install it on each POS machine.')
												}}
											</p>
											<div
												v-if="qzCertStatus !== 'trusted' || qzCertReady"
												class="flex flex-wrap gap-2"
											>
												<button
													v-if="qzCertStatus !== 'trusted'"
													type="button"
													:disabled="qzCertLoading"
													:class="secondaryButtonClass"
													@click="handleSetupQzCertificate"
												>
													<LoadingIndicator v-if="qzCertLoading" class="w-4 h-4" />
													{{ __('Generate Certificate') }}
												</button>
												<button
													v-if="qzCertReady"
													type="button"
													:class="secondaryButtonClass"
													@click="handleDownloadQzCertificate"
												>
													<FeatherIcon name="download" class="w-4 h-4" />
													{{ __('Download Certificate') }}
												</button>
											</div>
											<p
												v-if="qzCertReady && qzCertStatus !== 'trusted'"
												class="text-sm text-gray-600 dark:text-gray-400"
											>
												{{ __('Download the certificate and import it into QZ Tray, then restart QZ Tray.') }}
											</p>
										</div>
									</div>
								</section>

								<p class="px-1 text-sm text-gray-500 dark:text-gray-400">
									{{ __('QZ Tray must be installed and running on this computer. Download from') }}
									<a href="https://qz.io/download/" target="_blank" class="font-semibold underline">qz.io</a>.
									{{ __('If QZ Tray is unavailable, printing will fall back to the browser dialog.') }}
								</p>
							</template>
						</div>

						<!-- Footer -->
						<div class="grid grid-cols-2 gap-2 pt-4">
							<button
								type="button"
								class="h-14 rounded-xl bg-gray-200 dark:bg-gray-700 text-base font-semibold text-gray-700 dark:text-gray-200 active:bg-gray-300 dark:active:bg-gray-600 transition-colors duration-75 touch-manipulation"
								@click="handleClose"
							>
								{{ __('Cancel') }}
							</button>
							<button
								type="button"
								:disabled="saving"
								class="h-14 rounded-xl bg-secondary hover:bg-secondary-hover active:bg-secondary-active disabled:opacity-60 text-white text-lg font-bold flex items-center justify-center gap-2 transition-colors duration-75 touch-manipulation"
								@click="saveSettings"
							>
								<LoadingIndicator v-if="saving" class="w-5 h-5" />
								<FeatherIcon v-else name="check" class="w-6 h-6" />
								{{ saving ? __('Saving...') : __('Save') }}
							</button>
						</div>
					</template>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import CheckboxField from "@/components/settings/CheckboxField.vue"
import SelectField from "@/components/settings/SelectField.vue"
import { usePOSEvents } from "@/composables/usePOSEvents"
import { useQzTray } from "@/composables/useQzTray"
import { useToast } from "@/composables/useToast"
import { logger } from "@/utils/logger"
import { FeatherIcon, LoadingIndicator, call, createResource } from "frappe-ui"
import { computed, ref, watch } from "vue"

const log = logger.create("POSSettings")
const { detectSettingsChanges, updateSettingsSnapshot } = usePOSEvents()
const { showSuccess, showError } = useToast()

const props = defineProps({
	modelValue: Boolean,
	posProfile: String,
})

const emit = defineEmits(["update:modelValue"])

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const groupTitleClass =
	"px-1 pb-1 text-sm font-semibold text-gray-600 dark:text-gray-400"
const groupClass =
	"rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 shadow-sm divide-y divide-gray-200 dark:divide-gray-700 overflow-hidden"
const secondaryButtonClass =
	"h-12 px-4 inline-flex items-center gap-2 rounded-xl bg-gray-200 dark:bg-gray-700 text-base font-semibold text-gray-700 dark:text-gray-200 active:bg-gray-300 dark:active:bg-gray-600 disabled:opacity-60 transition-colors duration-75 touch-manipulation"

// State
const loading = ref(true)
const saving = ref(false)
const settings = ref({
	pos_profile: props.posProfile || "",
	silent_print: 0,
})

// QZ Tray composable
const {
	qzConnected,
	qzConnecting,
	qzCertStatus,
	printers: qzPrinters,
	selectedPrinter,
	loadingPrinters,
	printerOptions,
	certLoading: qzCertLoading,
	certReady: qzCertReady,
	handleConnect: handleQzConnect,
	generateCertificate: handleSetupQzCertificate,
	downloadCertificate: handleDownloadQzCertificate,
} = useQzTray()

const certTone = computed(() => {
	if (qzCertStatus.value === "trusted")
		return { icon: "text-green-600", text: "text-green-700 dark:text-green-400" }
	if (qzCertStatus.value === "untrusted")
		return { icon: "text-red-600", text: "text-red-700 dark:text-red-400" }
	return { icon: "text-amber-600", text: "text-amber-700 dark:text-amber-400" }
})

const settingsResource = createResource({
	url: "pos_next.pos_next.doctype.pos_settings.pos_settings.get_pos_settings",
	makeParams() {
		return { pos_profile: props.posProfile }
	},
	onSuccess(data) {
		if (data) {
			Object.assign(settings.value, data)
			settings.value.pos_profile = props.posProfile
			updateSettingsSnapshot(settings.value)
		}
		loading.value = false
	},
	onError() {
		loading.value = false
		showError(__("Failed to load settings"))
	},
})

watch(
	() => props.modelValue,
	(open) => {
		if (open) loadSettings()
	},
)

// Auto-connect and discover printers when silent_print is toggled on
watch(
	() => settings.value.silent_print,
	async (enabled) => {
		if (enabled) await handleQzConnect()
	},
)

function handleClose() {
	show.value = false
}

function loadSettings() {
	if (!props.posProfile) return
	loading.value = true
	settings.value.pos_profile = props.posProfile
	settingsResource.reload()
}

async function saveSettings() {
	if (!props.posProfile) {
		showError(__("POS Profile not found"))
		return
	}

	saving.value = true
	const oldSettings = { ...settings.value }

	try {
		const result = await call(
			"pos_next.pos_next.doctype.pos_settings.pos_settings.update_pos_settings",
			{
				pos_profile: props.posProfile,
				// Only send what this dialog edits, so other settings stay untouched
				settings: { silent_print: settings.value.silent_print },
			},
		)

		if (result) {
			Object.assign(settings.value, result)
			settings.value.pos_profile = props.posProfile
		}

		// Notify listeners (POSSale, cart store, ...) of what changed
		detectSettingsChanges(settings.value, oldSettings)

		showSuccess(__("Settings saved successfully"))
		handleClose()
	} catch (error) {
		log.error("Error saving settings:", error)
		showError(error.message || __("Failed to save settings"))
	} finally {
		saving.value = false
	}
}
</script>
