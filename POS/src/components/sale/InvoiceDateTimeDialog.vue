<template>
	<Dialog v-model="show" :options="{ size: 'sm' }">
		<template #body>
			<div class="bg-white dark:bg-gray-900 p-5 select-none">
				<div class="flex items-start justify-between mb-4">
					<h3 class="text-xl font-semibold text-gray-900 dark:text-gray-100">
						{{ __('Date & Time') }}
					</h3>
					<button
						class="-me-2 -mt-1 p-2 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 touch-manipulation"
						:aria-label="__('Cancel')"
						@click="show = false"
					>
						<FeatherIcon name="x" class="w-6 h-6" />
					</button>
				</div>

				<div class="grid grid-cols-[3fr_2fr] gap-2 mb-4">
					<button
						v-for="field in fields"
						:key="field.key"
						type="button"
						:class="[
							'h-16 px-4 rounded-xl border bg-white dark:bg-gray-900 flex flex-col items-start justify-center text-start transition-colors duration-75 touch-manipulation',
							field.invalid
								? 'border-red-500 ring-2 ring-red-500/20'
								: activeField === field.key
									? 'border-primary ring-2 ring-primary/20'
									: 'border-gray-300 dark:border-gray-600',
						]"
						@click="activeField = field.key"
					>
						<span
							:class="[
								'text-xs font-medium uppercase tracking-wide',
								field.invalid ? 'text-red-600 dark:text-red-400' : 'text-gray-500 dark:text-gray-400',
							]"
						>
							{{ field.invalid ? __('Invalid') : field.label }}
						</span>
						<span
							v-if="field.display"
							class="text-xl font-semibold tabular-nums text-gray-900 dark:text-gray-100"
						>{{ field.display }}</span>
						<span v-else class="text-lg text-gray-400">{{ field.placeholder }}</span>
					</button>
				</div>

				<NumericKeypad
					:decimal="false"
					@press="press"
					@backspace="backspace"
					@clear="digits[activeField] = ''"
				>
					<template #confirm>
						<button
							type="button"
							:disabled="!canApply"
							class="rounded-xl bg-secondary hover:bg-secondary-hover active:bg-secondary-active text-white text-lg font-bold flex flex-col items-center justify-center gap-1 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-gray-800 dark:disabled:text-gray-600 transition-colors duration-75 touch-manipulation"
							@click="apply"
						>
							<FeatherIcon name="check" class="w-7 h-7" />
							{{ __('Apply') }}
						</button>
					</template>
				</NumericKeypad>
			</div>
		</template>
	</Dialog>
</template>

<script setup>
import NumericKeypad from "@/components/common/NumericKeypad.vue"
import { Dialog, FeatherIcon } from "frappe-ui"
import { computed, reactive, ref, watch } from "vue"

const MAX_DIGITS = { date: 8, time: 4 }

const props = defineProps({
	modelValue: Boolean,
	date: String,
	time: String,
})

const emit = defineEmits(["update:modelValue", "apply"])

const show = computed({
	get: () => props.modelValue,
	set: (value) => emit("update:modelValue", value),
})

const activeField = ref("date")
const digits = reactive({ date: "", time: "" })

watch(show, (open) => {
	if (!open) return
	const [y, m, d] = props.date ? props.date.split("-") : []
	digits.date = props.date ? `${d}${m}${y}` : ""
	digits.time = props.time ? props.time.replace(":", "") : ""
	activeField.value = "date"
})

// Parse date into format the backend filter understands YYYY.MM.DD
const parsedDate = computed(() => {
	const d = digits.date
	if (d.length !== MAX_DIGITS.date) return null
	const day = Number(d.slice(0, 2))
	const month = Number(d.slice(2, 4))
	const year = Number(d.slice(4))
	const date = new Date(year, month - 1, day)
	const valid =
		date.getFullYear() === year &&
		date.getMonth() === month - 1 &&
		date.getDate() === day
	return valid ? `${d.slice(4)}-${d.slice(2, 4)}-${d.slice(0, 2)}` : null
})

const parsedTime = computed(() => {
	const d = digits.time
	if (d.length !== MAX_DIGITS.time) return null
	const valid = Number(d.slice(0, 2)) < 24 && Number(d.slice(2)) < 60
	return valid ? `${d.slice(0, 2)}:${d.slice(2)}` : null
})

const fields = computed(() => [
	{
		key: "date",
		label: __("Date"),
		placeholder: __("DD.MM.YYYY"),
		// "1411" → "14.11", "14112026" → "14.11.2026"
		display: [
			digits.date.slice(0, 2),
			digits.date.slice(2, 4),
			digits.date.slice(4),
		]
			.filter(Boolean)
			.join("."),
		invalid: digits.date.length === MAX_DIGITS.date && !parsedDate.value,
	},
	{
		key: "time",
		label: __("Time"),
		placeholder: __("HH:MM"),
		// "143" → "14:3", "1432" → "14:32"
		display: [digits.time.slice(0, 2), digits.time.slice(2)]
			.filter(Boolean)
			.join(":"),
		invalid: digits.time.length === MAX_DIGITS.time && !parsedTime.value,
	},
])

// Each field must have fully valid dates or times, otherwise the filter would return false values
const canApply = computed(
	() =>
		(digits.date === "" || parsedDate.value !== null) &&
		(digits.time === "" || parsedTime.value !== null),
)

function press(key) {
	const field = activeField.value
	if (digits[field].length >= MAX_DIGITS[field]) return
	digits[field] += key
	if (
		field === "date" &&
		digits.date.length === MAX_DIGITS.date &&
		parsedDate.value
	) {
		activeField.value = "time"
	}
}

function backspace() {
	digits[activeField.value] = digits[activeField.value].slice(0, -1)
}

function apply() {
	if (!canApply.value) return
	emit("apply", { date: parsedDate.value, time: parsedTime.value })
	show.value = false
}
</script>
