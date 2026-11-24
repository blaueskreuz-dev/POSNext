<template>
	<div ref="menuRef" class="relative">
		<button
			type="button"
			:class="[
				'h-12 w-14 flex items-center justify-center rounded-xl transition-colors duration-75 touch-manipulation select-none',
				isOpen
					? 'bg-primary text-white'
					: 'bg-gray-100 text-gray-900 hover:bg-gray-200 active:bg-gray-300',
			]"
			:aria-label="__('Menu')"
			@click="isOpen = !isOpen"
		>
			<FeatherIcon name="menu" class="w-7 h-7" />
		</button>

		<!-- Dropdown Menu -->
		<div
			v-if="isOpen"
			@click="handleMenuItemClick"
			class="user-menu absolute end-0 mt-2 w-72 flex flex-col gap-1 bg-white rounded-2xl shadow-2xl border border-gray-200 p-2 z-[250] select-none"
		>
			<!-- Menu Items -->
			<slot name="menu-items"></slot>

			<!-- Additional Actions -->
			<slot name="additional-actions"></slot>

			<!-- Language Switcher - Mobile Only -->
			<div class="md:hidden">
				<hr class="my-1 border-gray-100">
				<button
					@click.stop="showLanguageDropdown = !showLanguageDropdown"
					class="w-full text-start px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2.5 transition-colors"
				>
					<svg class="w-4 h-4 shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"/>
					</svg>
					<span class="flex-1">{{ __('Language') }}</span>
					<div class="flex items-center gap-2">
						<img
							:src="supportedLocales[locale]?.flagUrlSvg"
							:alt="supportedLocales[locale]?.name"
							class="w-5 h-3.5 object-cover rounded-sm shadow-sm"
						/>
						<svg
							class="w-4 h-4 text-gray-400 transition-transform"
							:class="{ 'rotate-180': showLanguageDropdown }"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
						</svg>
					</div>
				</button>

				<!-- Language Dropdown -->
				<div
					v-if="showLanguageDropdown"
					class="bg-gray-50 border-t border-gray-100"
				>
					<button
						v-for="(config, code) in supportedLocales"
						:key="code"
						@click.stop="handleLanguageChange(code)"
						class="w-full text-start px-3 py-2 text-sm flex items-center gap-2.5 transition-colors"
						:class="locale === code
							? 'bg-blue-50 text-blue-700'
							: 'text-gray-600 hover:bg-gray-100'"
					>
						<img
							:src="config.flagUrlSvg"
							:alt="config.name"
							class="w-5 h-3.5 object-cover rounded-sm shadow-sm ms-6"
						/>
						<span class="flex-1">{{ config.nativeName }}</span>
						<svg
							v-if="locale === code"
							class="w-4 h-4 text-blue-600"
							fill="currentColor"
							viewBox="0 0 20 20"
						>
							<path
								fill-rule="evenodd"
								d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
								clip-rule="evenodd"
							/>
						</svg>
					</button>
				</div>
			</div>

			<!-- Divider -->
			<hr v-if="showLogout" class="my-1 border-gray-200">

			<!-- Logout -->
			<button
				v-if="showLogout"
				type="button"
				class="user-menu-item text-red-600 hover:bg-red-50 active:bg-red-100"
				@click="handleLogout"
			>
				{{ __('Logout') }}
			</button>
		</div>
	</div>
</template>

<script setup>
import { FeatherIcon } from "frappe-ui"
import { onMounted, onUnmounted, ref, watch } from "vue"
import { useLocale } from "@/composables/useLocale"

const { locale, supportedLocales, changeLocale } = useLocale()

defineProps({
	userName: {
		type: String,
		required: true,
	},
	profileImage: {
		type: String,
		default: null,
	},
	showLogout: {
		type: Boolean,
		default: true,
	},
})

const emit = defineEmits(["logout", "menu-opened", "menu-closed"])

const menuRef = ref(null)
const isOpen = ref(false)
const showLanguageDropdown = ref(false)

// Watch isOpen and emit events
watch(isOpen, (newValue) => {
	if (newValue) {
		emit("menu-opened")
	} else {
		emit("menu-closed")
		showLanguageDropdown.value = false
	}
})

function handleMenuItemClick() {
	isOpen.value = false
}

function handleLogout() {
	isOpen.value = false
	emit("logout")
}

async function handleLanguageChange(code) {
	if (code === locale.value) {
		return
	}
	isOpen.value = false
	await changeLocale(code)
}

function handleClickOutside(event) {
	if (isOpen.value && menuRef.value && !menuRef.value.contains(event.target)) {
		isOpen.value = false
	}
}

onMounted(() => {
	document.addEventListener("click", handleClickOutside)
})

onUnmounted(() => {
	document.removeEventListener("click", handleClickOutside)
})
</script>

<style>
.user-menu-item {
	@apply w-full h-14 px-4 rounded-xl text-start text-lg font-semibold flex items-center gap-3 transition-colors duration-75 touch-manipulation;
}
</style>
