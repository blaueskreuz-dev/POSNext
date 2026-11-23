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
						<h3 class="min-w-0 text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">
							{{ item?.item_name }}
						</h3>
						<button
							class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
							:aria-label="__('Cancel')"
							@click="cancel"
						>
							<FeatherIcon name="x" class="w-6 h-6" />
						</button>
					</div>

					<div
						:class="[
							'mb-4 rounded-xl bg-gray-100 dark:bg-gray-800 px-4 py-4 text-end truncate tabular-nums text-[40px] leading-none font-bold',
							buffer ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500',
						]"
					>
						{{ displayValue }}
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
								@click="confirm"
							>
								<FeatherIcon name="check" class="w-7 h-7" />
								{{ __('Add') }}
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

const props = defineProps({
	modelValue: Boolean,
	item: Object,
})

const emit = defineEmits(["update:modelValue", "confirm"])

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const buffer = ref("")

watch(show, (open) => {
	if (open) buffer.value = ""
})

const displayValue = computed(() => buffer.value || "0.00")

const price = computed(() => Number.parseFloat(buffer.value) || 0)

const canConfirm = computed(() => price.value > 0)

function press(key) {
	const next = appendDecimalKey(buffer.value, key)
	if (next !== null) buffer.value = next
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
