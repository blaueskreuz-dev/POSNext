/**
 * Simple JS helper to calculate together cart totals
 * Used in both the cashiers screen and the custoemr facing screen to
 * ensure both show the same numbers
 *
 * @param {Object} params
 * @param {Array} params.items - All items added to cart
 * @param {number} params.subtotal - Subtotal
 * @param {number} params.taxAmount - Total tax amount
 * @param {number} params.discountAmount - Total discount amount
 */

export function computeLineTotal(item) {
	return (item.rate || 0) * (item.quantity || 0) - (item.discount_amount || 0)
}

export function computeDisplayTotals({
	items,
	subtotal,
	taxAmount,
	discountAmount,
}) {
	const totalQuantity = items.reduce((sum, item) => {
		const freeQty = item.is_free_item ? 0 : item.free_qty || 0
		return sum + (item.quantity || 0) + freeQty
	}, 0)

	// Prices include tax: show the net subtotal, then add the extracted tax back
	const displaySubtotal = subtotal - taxAmount
	const displayGrandTotal = displaySubtotal + taxAmount - discountAmount

	return { totalQuantity, displaySubtotal, displayGrandTotal }
}
