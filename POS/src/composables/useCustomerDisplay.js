/**
 * CustomerDisplay (customer-facing second screen).
 *
 * The POSNextScreen sends a snapshot of the cart over a BroadcastChannel:
 *   { phase: "idle" | "cart", data }
 * Values are pre-formatted, so the CustomerDisplay needs no stores or API.
 */

import { computed, onUnmounted, ref, toValue, watch } from "vue"
import { computeDisplayTotals, computeLineTotal } from "@/utils/cartTotals"
import { formatCurrency } from "@/utils/currency"
import { useFormatters } from "./useFormatters"

const { formatQuantity } = useFormatters()

export const CUSTOMER_DISPLAY_PATH = "/pos/customer-display"
const CHANNEL_NAME = "posnext-customer-display"

// Send updates with half a second delay to bundle rapid button presses
const SEND_DELAY_MS = 500

const IDLE = { phase: "idle", data: null }

export function openCustomerDisplayWindow() {
	window.open(CUSTOMER_DISPLAY_PATH, CHANNEL_NAME, "popup")?.focus()
}

/** POSNextScreen side. Call once from the POS page setup. */
export function useCustomerDisplayPublisher({ cartStore, currency }) {
	const channel = new BroadcastChannel(CHANNEL_NAME)
	let sendTimer = null

	const fmt = (value) =>
		formatCurrency(Number.parseFloat(value || 0), toValue(currency))

	const snapshot = computed(() => {
		const items = cartStore.invoiceItems
		if (items.length === 0) return IDLE

		const totals = computeDisplayTotals({
			items,
			subtotal: cartStore.subtotal,
			taxAmount: cartStore.totalTax,
			discountAmount: cartStore.totalDiscount,
			taxInclusive: cartStore.taxInclusive,
		})
		return {
			phase: "cart",
			data: {
				items: items.map((item) => ({
					id: item.row_id,
					name: item.item_name || item.item_code,
					qty: formatQuantity(item.quantity),
					rate: fmt(item.rate),
					discount:
						item.discount_amount > 0
							? item.discount_percentage > 0
								? `${Number(item.discount_percentage).toFixed(0)}%`
								: fmt(item.discount_amount)
							: "",
					total: fmt(computeLineTotal(item)),
				})),
				totalQuantity: formatQuantity(totals.totalQuantity),
				discount:
					cartStore.totalDiscount > 0 ? fmt(cartStore.totalDiscount) : "",
				grandTotal: fmt(totals.displayGrandTotal),
			},
		}
	})

	watch(snapshot, () => {
		if (sendTimer) return
		sendTimer = setTimeout(() => {
			sendTimer = null
			channel.postMessage(snapshot.value)
		}, SEND_DELAY_MS)
	})

	// Reset the CustomerDisplay when the POSNextScreen is closed
	const sendIdle = () => channel.postMessage(IDLE)
	window.addEventListener("beforeunload", sendIdle)

	onUnmounted(() => {
		window.removeEventListener("beforeunload", sendIdle)
		clearTimeout(sendTimer)
		sendIdle()
		channel.close()
	})
}

// Startup CustomerDisplay with idle state
export function useCustomerDisplaySubscriber() {
	const state = ref(IDLE)
	const channel = new BroadcastChannel(CHANNEL_NAME)

	channel.onmessage = (event) => {
		state.value = event.data
	}

	onUnmounted(() => channel.close())

	return state
}
