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
								{{ __('Discount') }}
							</p>
							<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
								{{ __('Cart Discount') }}
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

					<div class="grid grid-cols-3 gap-2 mb-4">
						<button
							v-for="preset in PRESETS"
							:key="preset"
							:class="[
								'h-16 rounded-xl text-xl font-bold transition-colors duration-75 touch-manipulation',
								preset === currentPercentage
									? 'bg-primary text-white active:bg-primary-active'
									: 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 active:bg-gray-200 dark:active:bg-gray-700',
							]"
							@click="apply(preset)"
						>
							{{ preset }}%
						</button>
					</div>

					<div class="mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-4 text-end tabular-nums">
						<span
							:class="[
								'text-[40px] leading-none font-bold',
								buffer ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
							]"
						>{{ buffer || "0" }}</span>
						<span class="text-lg font-medium text-gray-500 dark:text-gray-400 ms-2">%</span>
					</div>

					<NumericKeypad
						@press="press"
						@backspace="backspace"
						@clear="buffer = ''"
					>
						<template #confirm>
							<button
								type="button"
								:disabled="!canConfirm"
								class="rounded-xl bg-secondary text-white text-lg font-bold flex flex-col items-center justify-center gap-1 hover:bg-secondary-hover active:bg-secondary-active disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 transition-colors duration-75 touch-manipulation"
								@click="apply(customPercentage)"
							>
								<FeatherIcon name="check" class="w-7 h-7" />
								{{ __('Apply') }}
							</button>
						</template>
					</NumericKeypad>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import NumericKeypad from "@/components/common/NumericKeypad.vue"
import { appendDecimalKey } from "@/utils/keypadInput"
import { FeatherIcon } from "frappe-ui"
import { computed, ref, watch } from "vue"

const PRESETS = [20, 30, 50]

const props = defineProps({
	modelValue: Boolean,
	currentPercentage: {
		type: Number,
		default: 0,
	},
})

const emit = defineEmits(["update:modelValue", "apply"])

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const buffer = ref("")

watch(show, (open) => {
	if (open) buffer.value = ""
})

const customPercentage = computed(() => Number.parseFloat(buffer.value) || 0)

const canConfirm = computed(() => customPercentage.value > 0)

function press(key) {
	const next = appendDecimalKey(buffer.value, key, { max: 100 })
	if (next !== null) buffer.value = next
}

function backspace() {
	buffer.value = buffer.value.slice(0, -1)
}

function apply(percentage) {
	if (!(percentage > 0)) return
	emit("apply", percentage)
	show.value = false
}

function cancel() {
	show.value = false
}
</script>
