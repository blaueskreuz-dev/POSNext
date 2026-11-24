<template>
	<Teleport to="body">
		<Transition name="lock-overlay">
			<div v-if="isLocked" class="fixed inset-0 z-[10000] flex items-center justify-center">
				<!-- Backdrop -->
				<div class="absolute inset-0 bg-black/70 backdrop-blur-md"></div>

				<!-- Lock Card -->
				<div
					class="relative z-10 w-full max-w-md mx-4 rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-8 select-none">
					<div class="flex flex-col items-center text-center mb-6">
						<div class="mb-6 rounded-lg bg-white px-3 py-2">
							<img :src="blauesKreuzLogo" alt="Blaues Kreuz Schweiz" class="h-20 w-auto"
								draggable="false" />
						</div>
						<h3
							class="max-w-full flex items-baseline justify-center gap-3 text-3xl font-bold text-gray-900 dark:text-gray-100">
							<span v-if="shiftStore.profileName" class="truncate">{{ shiftStore.profileName }}</span>
							<span class="truncate">{{ lockedUser?.name || __('User') }}</span>
						</h3>
						<p v-if="isOffline"
							class="mt-3 inline-block px-3 py-1 rounded-full bg-amber-100 text-amber-700 text-base font-semibold">
							{{ __('Offline') }}
						</p>
					</div>

					<form @submit.prevent="handleUnlock">
						<input ref="passwordInputRef" v-model="password" type="password"
							:placeholder="__('Enter your password')" :disabled="isVerifying" :class="[
								'block w-full h-16 rounded-xl border px-4 text-2xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder:text-lg placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50',
								verifyError ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : 'border-gray-300 dark:border-gray-600',
							]" autocomplete="current-password" />
						<p v-if="verifyError" class="mt-2 text-base font-medium text-red-600">
							{{ verifyError }}
						</p>

						<button type="submit" :disabled="!password || isVerifying"
							class="mt-5 w-full h-20 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:shadow-none disabled:cursor-not-allowed text-white text-2xl font-bold shadow-lg transition-colors duration-75 touch-manipulation">
							{{ isVerifying ? __('Verifying...') : __('Unlock') }}
						</button>
					</form>
				</div>
			</div>
		</Transition>
	</Teleport>
</template>

<script setup>
import blauesKreuzLogo from "@/assets/blaues-kreuz-logo.svg"
import { ref, watch, nextTick } from "vue"
import { useSessionLock } from "@/composables/useSessionLock"
import { useOfflineStatus } from "@/composables/useOfflineStatus"
import { usePOSShiftStore } from "@/stores/posShift"
import { session } from "@/data/session"
import { cleanupUserSession } from "@/utils/sessionCleanup"

const { isLocked, isVerifying, verifyError, lockedUser, unlock } = useSessionLock()
const { isOffline } = useOfflineStatus()
const shiftStore = usePOSShiftStore()

const password = ref("")
const passwordInputRef = ref(null)

// Auto-focus password input when locked
watch(isLocked, async (locked) => {
	if (locked) {
		password.value = ""
		await nextTick()
		passwordInputRef.value?.focus()
	}
})

async function handleUnlock() {
	if (!password.value || isVerifying.value) return

	const result = await unlock(password.value)

	if (result.sessionExpired) {
		// Session expired — full logout
		await cleanupUserSession()
		session.logout.submit()
		return
	}

	if (!result.success) {
		// Wrong password — clear and re-focus
		password.value = ""
		await nextTick()
		passwordInputRef.value?.focus()
	}
}
</script>

<style scoped>
.lock-overlay-enter-active,
.lock-overlay-leave-active {
	transition: opacity 0.3s ease;
}

.lock-overlay-enter-from,
.lock-overlay-leave-to {
	opacity: 0;
}
</style>
