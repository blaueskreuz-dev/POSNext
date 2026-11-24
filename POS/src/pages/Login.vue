<template>
  <div class="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
    <div class="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 shadow-2xl p-8 select-none">
      <div class="flex flex-col items-center text-center mb-8">
        <div class="mb-6 rounded-lg bg-white px-3 py-2">
          <img :src="blauesKreuzLogo" alt="Blaues Kreuz Schweiz" class="h-20 w-auto" draggable="false" />
        </div>
        <h2 class="text-3xl font-bold text-gray-900 dark:text-gray-100">Brocki POS</h2>
      </div>

      <form class="flex flex-col gap-4" @submit.prevent="submit">
        <input
          v-model="loginForm.email"
          required
          name="email"
          type="text"
          autocomplete="username"
          :placeholder="__('Enter your username or email')"
          :disabled="session.login.loading"
          :class="inputClass"
        />
        <input
          v-model="loginForm.password"
          required
          name="password"
          type="password"
          autocomplete="current-password"
          :placeholder="__('Enter your password')"
          :disabled="session.login.loading"
          :class="inputClass"
        />

        <p v-if="session.login.error" class="text-base font-medium text-red-600">
          {{ session.login.error.messages.join('\n') }}
        </p>

        <button
          type="submit"
          :disabled="!loginForm.email || !loginForm.password || session.login.loading"
          class="mt-1 w-full h-20 rounded-xl bg-primary hover:bg-primary-hover active:bg-primary-active disabled:bg-primary-disabled disabled:shadow-none disabled:cursor-not-allowed text-white text-2xl font-bold shadow-lg transition-colors duration-75 touch-manipulation"
        >
          {{ session.login.loading ? __('Signing in...') : __('Sign in') }}
        </button>
      </form>
    </div>

    <!-- Shift Opening Dialog -->
    <ShiftOpeningDialog
      v-model="showShiftDialog"
      @shift-opened="handleShiftOpened"
      @dialog-closed="handleDialogClosed"
    />
  </div>
</template>

<script setup>
import blauesKreuzLogo from "@/assets/blaues-kreuz-logo.svg"
import { onMounted, reactive, ref, watch } from "vue"
import { useRouter } from "vue-router"
import ShiftOpeningDialog from "../components/ShiftOpeningDialog.vue"
import { session } from "../data/session"
import { useSessionLock } from "../composables/useSessionLock"
import { cleanupUserSession } from "../utils/sessionCleanup"
import { ensureCSRFToken } from "../utils/csrf"
import { offlineWorker } from "../utils/offline/workerClient"
import { logger } from "@/utils/logger"

const log = logger.create("Login")

const router = useRouter()
const { cachePasswordHashFromLogin } = useSessionLock()

const loginForm = reactive({
	email: "",
	password: "",
})

const showShiftDialog = ref(false)

const inputClass =
	"block w-full h-16 rounded-xl border border-gray-300 dark:border-gray-600 px-4 text-2xl text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-900 placeholder:text-lg placeholder:text-gray-400 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:opacity-50"

// Reset state when login page mounts
onMounted(async () => {
	// Clear login form
	loginForm.email = ""
	loginForm.password = ""

	// Clear any login errors
	if (session.login.error) {
		session.login.reset()
	}

	// Only clear state if user is NOT logged in
	// If user is already logged in (e.g., after successful login), don't clear their session
	if (!session.isLoggedIn) {
		showShiftDialog.value = false
		await cleanupUserSession()
	}
})

function submit() {
	if (!loginForm.email || !loginForm.password) {
		return
	}

	session.login.submit({
		email: loginForm.email.trim(),
		password: loginForm.password,
	})
}

// Watch for successful login
watch(
	() => session.isLoggedIn,
	async (isLoggedIn) => {
		if (isLoggedIn) {
			// Initialize CSRF token after successful login
			try {
				log.info("User logged in, initializing CSRF token...")
				await ensureCSRFToken()

				// Sync CSRF token to worker for background API calls
				if (window.csrf_token) {
					await offlineWorker.setCSRFToken(window.csrf_token)
				}
			} catch (error) {
				log.error("Failed to initialize CSRF token after login:", error)
			}

			// Cache password hash for offline session unlock
			await cachePasswordHashFromLogin(loginForm.password)

			// Show shift opening dialog after successful login
			showShiftDialog.value = true
		}
	},
)

// Watch for dialog being closed via X button (v-model update)
// When user closes dialog without action, navigate to POSSale
watch(showShiftDialog, (isOpen, wasOpen) => {
	// Only navigate if dialog was open and is now closed, and user is logged in
	if (wasOpen === true && isOpen === false && session.isLoggedIn) {
		router.push({ name: "POSSale" })
	}
})

function handleShiftOpened() {
	// Navigate to POS sale after shift is opened
	router.push({ name: "POSSale" })
}

function handleDialogClosed({ reason }) {
	// Navigate to /pos when dialog is cancelled or resumed
	// "cancelled" means user closed dialog without action
	// "resumed" means user chose to resume existing shift
	// In both cases, navigate to POSSale (existing shift will be active)
	if (reason === "cancelled" || reason === "resumed") {
		router.push({ name: "POSSale" })
	}
}

// Clear error when user starts typing
watch([() => loginForm.email, () => loginForm.password], () => {
	if (session.login.error) {
		session.login.reset()
	}
})
</script>
