/**
 * All receipts are rendered and printed in the browser with
 * brocki_receipt.njk
 */
import nunjucks from "nunjucks/browser/nunjucks.min.js"
import { logger } from "@/utils/logger"
import { printHTML as qzPrintHTML } from "@/utils/qzTray"
import receiptTemplate from "./brocki_receipt.njk?raw"
import logoSvg from "@/assets/blaues-kreuz-logo.svg?raw"

const log = logger.create("Receipt")
const LOGO_DATA_URI = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
	logoSvg.replace(/#005ca8/gi, "#000"),
)}`

const env = new nunjucks.Environment(null, { autoescape: true })
env.addFilter("money", (value) => (Number(value) || 0).toFixed(2))
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
 * @param {string} [params.taxId] - company VAT number
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
	taxId = null,
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
			net: item.amount || 0,
		}
	})

	return assembleContext(lines, {
		posProfile,
		company,
		cashier,
		address,
		taxId,
		invoiceName,
		posting: formatPosting({
			year: date.getFullYear(),
			month: date.getMonth() + 1,
			day: date.getDate(),
			hours: date.getHours(),
			minutes: date.getMinutes(),
		}),
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
 * @param {string} [options.taxId] - company VAT number
 */
export function buildReceiptContextFromInvoice(invoice, { address = null, taxId = null } = {}) {
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
		taxId,
		invoiceName: invoice.name,
		posting: formatServerPosting(invoice.posting_date, invoice.posting_time),
		grandTotal: invoice.grand_total,
		payments: invoice.payments,
		changeAmount: invoice.change_amount,
		outstandingAmount: invoice.outstanding_amount,
		vatTaxesPresent: vatTaxes.length > 0,
	})
}

function formatPosting({ year, month, day, hours, minutes }) {
	return {
		date: `${pad(day)}.${pad(month)}.${year}`,
		time: `${pad(hours)}:${pad(minutes)}`,
	}
}

function formatServerPosting(postingDate, postingTime) {
	const [year, month, day] = String(postingDate || "").split("-")
	const [hours = 0, minutes = 0] = String(postingTime || "").split(":")
	return formatPosting({ year, month, day, hours, minutes })
}

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
		tax_id: meta.taxId,
		invoice_name: meta.invoiceName,
		posting_date: meta.posting.date,
		posting_time: meta.posting.time,
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

export function renderReceiptHTML(context) {
	const body = compiledReceipt.render({ logo: LOGO_DATA_URI, ...context })
	return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Beleg</title><style>body { margin: 0; }</style></head>
<body>${body}</body>
</html>`
}

/** Print through a hidden iframe */
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
