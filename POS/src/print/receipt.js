/**
 * Client-side receipt rendering.
 *
 * brocki_receipt.njk is a Nunjucks port of docs/print_formats/brocki_receipt.html.
 * The Jinja version reads address, cashier and VAT data from the database; here
 * buildReceiptContext() collects the same values from data the POS already holds
 * locally (cart, payments, shift cache, cached VAT rates), so the template only
 * formats.
 */
import nunjucks from "nunjucks/browser/nunjucks.min.js"
import { logger } from "@/utils/logger"
import { printHTML as qzPrintHTML } from "@/utils/qzTray"
import receiptTemplate from "./brocki_receipt.njk?raw"

const log = logger.create("Receipt")

const env = new nunjucks.Environment(null, { autoescape: true })
env.addFilter("money", (value) => (Number(value) || 0).toFixed(2))
// Python's "%g": no trailing zeros (1 -> "1", 2.6 -> "2.6", 0.5 -> "0.5")
env.addFilter("num", (value) => String(Number.parseFloat((Number(value) || 0).toPrecision(6))))

const compiledReceipt = nunjucks.compile(receiptTemplate, env)

const round2 = (value) => Math.round((value + Number.EPSILON) * 100) / 100
const pad = (n) => String(n).padStart(2, "0")

/**
 * Build the template context from the cart before it is cleared.
 *
 * @param {Object} params
 * @param {Array} params.items - cart items (cartStore.invoiceItems)
 * @param {Object} params.taxRatesByGroup - VAT percent per Item Group
 * @param {Array} params.payments - [{ mode_of_payment, amount }]
 * @param {number} params.grandTotal
 * @param {number} [params.changeAmount]
 * @param {number} [params.outstandingAmount]
 * @param {string} params.posProfile
 * @param {string} params.company
 * @param {Object} [params.address] - { address_line1, pincode, city, phone }
 * @param {string} params.cashier
 * @param {string} [params.invoiceName] - left empty for offline sales for now
 * @param {Date} [params.date]
 */
export function buildReceiptContext({
	items,
	taxRatesByGroup,
	payments,
	grandTotal,
	changeAmount = 0,
	outstandingAmount = 0,
	posProfile,
	company,
	address = null,
	cashier,
	invoiceName = null,
	date = new Date(),
}) {
	// VAT codes are numbered in order of first appearance, like the Jinja version
	const vatRates = []
	const vatNet = new Map()
	let totalGross = 0

	const receiptItems = items.map((item) => {
		const qty = item.quantity ?? item.qty ?? 0
		const isManuallyEdited = item.is_rate_manually_edited === 1
		const unitPrice = item.price_list_rate || item.rate || 0
		const effectiveRate = isManuallyEdited ? item.rate : unitPrice
		const gross = round2(qty * unitPrice)
		const finalGross = round2(qty * effectiveRate - (item.discount_amount || 0))
		const discount = round2(gross - finalGross)

		const rate = taxRatesByGroup?.[item.item_group] ?? 0
		if (!vatRates.includes(rate)) vatRates.push(rate)
		// item.amount is the net amount (tax extracted) computed by the cart
		vatNet.set(rate, (vatNet.get(rate) || 0) + (item.amount || 0))

		totalGross += gross

		return {
			name: item.item_name || item.item_code,
			qty,
			unit_price: unitPrice,
			gross,
			discount,
			discount_percentage:
				!isManuallyEdited && item.discount_percentage > 0 ? item.discount_percentage : 0,
			discount_per_unit: qty ? discount / qty : 0,
			vat_code: vatRates.indexOf(rate) + 1,
		}
	})

	// Same formula as the Jinja version: tax on the summed net per rate
	const vatRows = vatRates.map((rate, index) => {
		const net = round2(vatNet.get(rate))
		const tax = round2((net * rate) / 100)
		return { code: index + 1, rate, net, tax, gross: round2(net + tax) }
	})

	totalGross = round2(totalGross)

	return {
		shop_name: posProfile || company,
		company: posProfile ? company : null,
		cashier,
		address,
		invoice_name: invoiceName,
		posting_date: `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`,
		posting_time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
		items: receiptItems,
		total_gross: totalGross,
		total_discount: round2(totalGross - grandTotal),
		grand_total: grandTotal,
		payments: (payments || []).map((p) => ({
			mode_of_payment: p.mode_of_payment,
			amount: p.amount || 0,
		})),
		change_amount: changeAmount || 0,
		outstanding_amount: outstandingAmount || 0,
		vat_rows: vatRows,
	}
}

/** Render a receipt context to a complete HTML document. */
export function renderReceiptHTML(context) {
	const body = compiledReceipt.render(context)
	return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Beleg</title><style>body { margin: 0; }</style></head>
<body>${body}</body>
</html>`
}

/** Print through a hidden iframe: no popup window, no server request. */
function printViaIframe(html) {
	return new Promise((resolve, reject) => {
		const iframe = document.createElement("iframe")
		iframe.setAttribute("aria-hidden", "true")
		iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;"
		document.body.appendChild(iframe)

		const cleanup = () => setTimeout(() => iframe.remove(), 1000)

		iframe.onload = () => {
			try {
				const win = iframe.contentWindow
				win.addEventListener("afterprint", cleanup, { once: true })
				win.focus()
				win.print()
				resolve(true)
			} catch (err) {
				cleanup()
				reject(err)
			}
		}
		iframe.srcdoc = html
	})
}

/**
 * Print a receipt rendered on the client.
 * Silent mode sends it to QZ Tray and falls back to the browser dialog.
 *
 * @returns {Promise<{method: "silent"|"browser", success: boolean}>}
 */
export async function printReceipt(context, { silent = false } = {}) {
	const html = renderReceiptHTML(context)

	if (silent) {
		try {
			await qzPrintHTML(html)
			return { method: "silent", success: true }
		} catch (err) {
			log.warn("Silent receipt print failed, falling back to browser:", err?.message || err)
		}
	}

	try {
		await printViaIframe(html)
		return { method: "browser", success: true }
	} catch (err) {
		log.error("Browser receipt print failed:", err)
		return { method: "browser", success: false }
	}
}
