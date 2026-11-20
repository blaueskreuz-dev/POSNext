/**
 * Exchange rate for foreign-currency cash payments ("Bar EUR").
 *
 * The rate is fetched once per shift from ERPNext's whitelisted
 * erpnext.setup.utils.get_exchange_rate (Currency Exchange records first,
 * else the provider configured in Currency Exchange Settings, Frankfurter/ECB
 * by default) and kept in localStorage together with the shift name. The whole
 * shift then uses that one rate.
 */

import { call } from "frappe-ui"
import { ref } from "vue"
import { logger } from "@/utils/logger"

const log = logger.create("ExchangeRate")

export function getPaymentMethodCurrency(modeOfPayment) {
	return /\bEUR\b/i.test(modeOfPayment || "") ? "EUR" : null
}

function cacheKey(currency) {
	return `pos_next_exchange_rate_${currency}`
}

function readCache(currency) {
	try {
		const raw = localStorage.getItem(cacheKey(currency))
		return raw ? JSON.parse(raw) : null
	} catch {
		return null
	}
}

function writeCache(currency, value) {
	try {
		localStorage.setItem(cacheKey(currency), JSON.stringify(value))
	} catch {
		// Storage unavailable - the in-memory rate still works for this session
	}
}

export function useExchangeRate(fromCurrency = "EUR") {
	const cached = readCache(fromCurrency)
	const rate = ref(cached?.rate > 0 ? cached.rate : 0)
	let loading = false

	async function ensureShiftRate(shiftName, toCurrency) {
		if (!shiftName || !toCurrency || loading) return
		if (readCache(fromCurrency)?.shift === shiftName && rate.value > 0) return

		loading = true
		try {
			const result = await call("erpnext.setup.utils.get_exchange_rate", {
				from_currency: fromCurrency,
				to_currency: toCurrency,
			})
			const newRate = Number(result)
			if (newRate > 0) {
				rate.value = newRate
				writeCache(fromCurrency, { rate: newRate, shift: shiftName })
			}
		} catch (error) {
			log.warn(
				`Could not fetch ${fromCurrency} rate for shift ${shiftName}`,
				error,
			)
		} finally {
			loading = false
		}
	}

	return { rate, ensureShiftRate }
}
