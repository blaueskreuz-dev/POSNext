/**
 * Receipt rendering. All receipts are rendered and printed in the browser with
 * brocki_receipt.njk, online and offline; there is no server print format.
 *
 * The template only formats. Its data comes from one of two builders:
 * - buildReceiptContext(): from the cart, for sales saved offline (no invoice
 *   number yet, the server assigns it on sync)
 * - buildReceiptContextFromInvoice(): from a submitted Sales Invoice, so the
 *   receipt shows exactly what ERPNext booked
 */
import nunjucks from "nunjucks/browser/nunjucks.min.js"
import { logger } from "@/utils/logger"
import { printHTML as qzPrintHTML } from "@/utils/qzTray"
import receiptTemplate from "./brocki_receipt.njk?raw"
import logoSvg from "@/assets/blaues-kreuz-logo.svg?raw"

const log = logger.create("Receipt")

// Inlined as a data URI so it prints offline and inside QZ Tray (no asset request).
// Thermal printers dither the brand blue, so the logo is printed in solid black.
const LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
	logoSvg.replace(/#005ca8/gi, "#000"),
)}`

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
	const lines = items.map((item) => {
		const qty = item.quantity ?? item.qty ?? 0
		const isManuallyEdited = item.is_rate_manually_edited === 1
		const unitPrice = item.price_list_rate || item.rate || 0
		const effectiveRate = isManuallyEdited ? item.rate : unitPrice
		const gross = round2(qty * unitPrice)
		const finalGross = round2(qty * effectiveRate - (item.discount_amount || 0))
		const discount = round2(gross - finalGross)

		return {
			name: item.item_name || item.item_code,
			qty,
			unit_price: unitPrice,
			gross,
			discount,
			discount_percentage:
				!isManuallyEdited && item.discount_percentage > 0 ? item.discount_percentage : 0,
			discount_per_unit: qty ? discount / qty : 0,
			vat_rate: taxRatesByGroup?.[item.item_group] ?? 0,
			// item.amount is the net amount (tax extracted) computed by the cart
			net: item.amount || 0,
		}
	})

	return assembleContext(lines, {
		posProfile,
		company,
		cashier,
		address,
		invoiceName,
		postingDate: formatDate(date),
		postingTime: formatTime(date),
		grandTotal,
		payments,
		changeAmount,
		outstandingAmount,
	})
}

/**
 * Build the template context from a submitted Sales Invoice
 * (pos_next.api.invoices.get_invoice).
 *
 * @param {Object} invoice - Sales Invoice as dict, with `cashier` (owner's full name)
 * @param {Object} [options]
 * @param {Object} [options.address] - { address_line1, pincode, city, phone }
 */
export function buildReceiptContextFromInvoice(invoice, { address = null } = {}) {
	// Only "On Net Total" rows are VAT. An item's rate comes from its
	// item_tax_rate (set per Item Group by brocki_tax), else the row's rate.
	const vatTaxes = (invoice.taxes || []).filter((t) => t.charge_type === "On Net Total")

	const lines = (invoice.items || []).map((item) => {
		let itemTax = {}
		try {
			itemTax = JSON.parse(item.item_tax_rate || "{}") || {}
		} catch {}

		const vatRate = vatTaxes.reduce(
			(sum, t) => sum + (t.account_head in itemTax ? itemTax[t.account_head] : t.rate),
			0,
		)
		const unitPrice = item.price_list_rate || item.rate || 0
		const gross = round2(item.qty * unitPrice)
		// Taxes are included, so item.amount is the gross after discount
		const discount = round2(gross - item.amount)

		return {
			name: item.item_name || item.item_code,
			qty: item.qty,
			unit_price: unitPrice,
			gross,
			discount,
			discount_percentage: item.discount_percentage || 0,
			discount_per_unit: unitPrice - item.rate,
			vat_rate: vatRate,
			net: item.net_amount || 0,
		}
	})

	return assembleContext(lines, {
		posProfile: invoice.pos_profile,
		company: invoice.company,
		cashier: invoice.cashier || invoice.owner,
		address,
		invoiceName: invoice.name,
		postingDate: formatServerDate(invoice.posting_date),
		postingTime: formatServerTime(invoice.posting_time),
		grandTotal: invoice.grand_total,
		payments: invoice.payments,
		changeAmount: invoice.change_amount,
		outstandingAmount: invoice.outstanding_amount,
		vatTaxesPresent: vatTaxes.length > 0,
	})
}

const formatDate = (date) => `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}`
const formatTime = (date) => `${pad(date.getHours())}:${pad(date.getMinutes())}`

/** "2026-11-27" -> "27.11.2026" */
function formatServerDate(value) {
	const [year, month, day] = String(value || "").split("-")
	return day ? `${day}.${month}.${year}` : ""
}

/** "9:05:00.123456" -> "09:05" */
function formatServerTime(value) {
	const [hours, minutes] = String(value || "").split(":")
	return minutes ? `${pad(hours)}:${pad(minutes)}` : ""
}

/**
 * Shared part of both builders: VAT codes, VAT table and totals.
 * VAT codes are numbered in order of first appearance.
 */
function assembleContext(lines, meta) {
	const vatRates = []
	const vatNet = new Map()

	for (const line of lines) {
		if (!vatRates.includes(line.vat_rate)) vatRates.push(line.vat_rate)
		vatNet.set(line.vat_rate, (vatNet.get(line.vat_rate) || 0) + line.net)
		line.vat_code = vatRates.indexOf(line.vat_rate) + 1
	}

	// Tax on the summed net per rate
	const vatRows =
		meta.vatTaxesPresent === false
			? []
			: vatRates.map((rate, index) => {
					const net = round2(vatNet.get(rate))
					const tax = round2((net * rate) / 100)
					return { code: index + 1, rate, net, tax, gross: round2(net + tax) }
				})

	const totalGross = round2(lines.reduce((sum, line) => sum + line.gross, 0))

	return {
		shop_name: meta.posProfile || meta.company,
		company: meta.posProfile ? meta.company : null,
		cashier: meta.cashier,
		address: meta.address,
		invoice_name: meta.invoiceName,
		posting_date: meta.postingDate,
		posting_time: meta.postingTime,
		items: lines,
		total_gross: totalGross,
		total_discount: round2(totalGross - meta.grandTotal),
		grand_total: meta.grandTotal,
		payments: (meta.payments || []).map((p) => ({
			mode_of_payment: p.mode_of_payment,
			amount: p.amount || 0,
		})),
		change_amount: meta.changeAmount || 0,
		outstanding_amount: meta.outstandingAmount || 0,
		vat_rows: vatRows,
	}
}

/** Render a receipt context to a complete HTML document. */
export function renderReceiptHTML(context) {
	const body = compiledReceipt.render({ logo: LOGO_DATA_URI, ...context })
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
