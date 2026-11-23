<template>
	<div
		class="bg-white shadow-sm sticky top-0 z-[200]"
	>
		<div class="flex py-2 sm:py-3">
			<div class="flex-1 flex justify-between items-center gap-1 sm:gap-2 px-2 sm:px-4 md:px-6">
				<!-- Left Side: Logo and Profile -->
				<div class="flex items-center gap-3 sm:gap-4 min-w-0 flex-1 overflow-hidden">
					<img
						:src="blauesKreuzLogo"
						alt="Blaues Kreuz Schweiz"
						class="h-8 sm:h-10 w-auto flex-shrink-0"
						draggable="false"
					/>
					<div class="flex items-baseline gap-2 min-w-0">
						<h1 v-if="profileName" class="text-sm sm:text-base font-bold text-gray-900 truncate">{{ profileName }}</h1>
						<span class="text-sm sm:text-base font-bold text-gray-900 truncate">{{ userName }}</span>
					</div>
				</div>

				<!-- Right Side: Controls -->
				<div class="flex items-center gap-0.5 sm:gap-1 md:gap-2 flex-shrink-0">
					<!-- WiFi/Offline Status -->
					<button
						@click="$emit('sync-click')"
						:class="[
							'p-1.5 sm:p-2 hover:bg-gray-100 active:bg-gray-200 rounded-lg transition-colors relative group touch-manipulation',
							isSyncing ? 'animate-pulse' : ''
						]"
						:title="isOffline ? __('Offline ({0} pending)', [pendingInvoicesCount]) : __('Online - Click to sync')"
						:aria-label="isOffline ? __('Offline mode active') : __('Online mode active')"
					>
						<svg
							v-if="!isOffline"
							class="w-4 h-4 sm:w-5 sm:h-5 text-green-600"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M1 9l2 2c4.97-4.97 13.03-4.97 18 0l2-2C16.93 2.93 7.08 2.93 1 9zm8 8l3 3 3-3c-1.65-1.66-4.34-1.66-6 0zm-4-4l2 2c2.76-2.76 7.24-2.76 10 0l2-2C15.14 9.14 8.87 9.14 5 13z"/>
						</svg>
						<svg
							v-else
							class="w-4 h-4 sm:w-5 sm:h-5 text-orange-600"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a4.978 4.978 0 01-1.414-2.83m-1.414 5.658a9 9 0 01-2.167-9.238m7.824 2.167a1 1 0 111.414 1.414m-1.414-1.414L3 3m8.293 8.293l1.414 1.414"/>
						</svg>
						<span
							v-if="pendingInvoicesCount > 0"
							class="absolute -top-1 -end-1 bg-orange-600 text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow-md"
						>
							{{ pendingInvoicesCount }}
						</span>
					</button>

					<!-- Cache Status Indicator -->
					<div
						class="p-1.5 sm:p-2 relative"
						role="status"
						:aria-label="getCacheAriaLabel()"
						:title="getCacheAriaLabel()"
					>
						<svg
							class="w-4 h-4 sm:w-5 sm:h-5 transition-colors"
							:class="getCacheIconColor()"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path d="M12 2C8.13 2 5 3.12 5 4.5V7c0 1.38 3.13 2.5 7 2.5S19 8.38 19 7V4.5C19 3.12 15.87 2 12 2zM5 9v3c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5V9c0 1.38-3.13 2.5-7 2.5S5 10.38 5 9zm0 5v3c0 1.38 3.13 2.5 7 2.5s7-1.12 7-2.5v-3c0 1.38-3.13 2.5-7 2.5S5 15.38 5 14z"/>
						</svg>
						<svg
							v-if="cacheSyncing || isRefreshing"
							class="w-4 h-4 sm:w-5 sm:h-5 absolute top-2 start-2 animate-spin opacity-70"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
							:class="getCacheIconColor()"
						>
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						<!-- Sync progress badge (visible during sync) -->
						<span
							v-if="cacheSyncing && cacheStats?.items > 0"
							class="absolute -bottom-1 -end-1 bg-orange-500 text-white text-[8px] font-bold rounded-full px-1 min-w-[20px] h-4 flex items-center justify-center shadow-md animate-pulse"
							:title="__('Syncing: {0} items', [formatNumber(cacheStats.items)])"
						>
							{{ formatCompactNumber(cacheStats.items) }}
						</span>
					</div>

					<div class="w-px h-4 sm:h-6 bg-gray-200"></div>

					<!-- User Menu -->
					<UserMenu
						:user-name="userName"
						:profile-image="userImage"
						@logout="$emit('logout')"
						@menu-opened="$emit('menu-opened')"
						@menu-closed="$emit('menu-closed')"
					>
						<template #menu-items>
							<slot name="menu-items"></slot>
						</template>
						<template #additional-actions>
							<slot name="additional-actions"></slot>
						</template>
					</UserMenu>
				</div>
			</div>
		</div>
	</div>
</template>

<script setup>
import blauesKreuzLogo from "@/assets/blaues-kreuz-logo.svg"
import UserMenu from "@/components/common/UserMenu.vue"

const emit = defineEmits([
	"sync-click",
	"logout",
	"menu-opened",
	"menu-closed",
])

const props = defineProps({
	profileName: {
		type: String,
		default: null,
	},
	userName: {
		type: String,
		required: true,
	},
	userImage: {
		type: String,
		default: null,
	},
	isOffline: {
		type: Boolean,
		default: false,
	},
	isSyncing: {
		type: Boolean,
		default: false,
	},
	pendingInvoicesCount: {
		type: Number,
		default: 0,
	},
	cacheSyncing: {
		type: Boolean,
		default: false,
	},
	cacheStats: {
		type: Object,
		default: () => ({ items: 0, lastSync: null }),
	},
	stockSyncActive: {
		type: Boolean,
		default: false,
	},
	isRefreshing: {
		type: Boolean,
		default: false,
	},
})

// Cache status helpers
function getCacheIconColor() {
	if (!props.cacheStats || props.cacheStats.items === 0) {
		return "text-red-600" // Red: No cache
	}
	if (props.cacheSyncing) {
		return "text-orange-600" // Orange: Syncing in progress
	}
	return "text-green-600" // Green: Cache ready
}

function getCacheAriaLabel() {
	if (!props.cacheStats || props.cacheStats.items === 0) {
		return __("Cache empty")
	}
	if (props.cacheSyncing) {
		return __("Cache syncing")
	}
	return __("Cache ready")
}

function formatNumber(num) {
	if (!num) return '0'
	return num.toLocaleString()
}

function formatCompactNumber(num) {
	if (!num) return '0'
	if (num >= 1000) {
		return (num / 1000).toFixed(num >= 10000 ? 0 : 1) + 'K'
	}
	return num.toString()
}
</script>
