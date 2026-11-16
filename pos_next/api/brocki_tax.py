# -*- coding: utf-8 -*-
"""
Brocki VAT rates.

Brockis use one customer-facing VAT rate per Item Group, stored in the custom
Select field "Kunden-MWST-Satz" on Item Group. This module is the only place
that reads it. The frontend loads the rates once at startup via get_tax_rates().

Yes the tax rates are loaded via item groups even tho the kundenmwstsatz also exists on item.
Don't ask me why it was decided todo it like that but we have to work with it for now...

IMPORTANT!
This implementation expects the Tax rate to be on the direct item_group and
does not care about further parenting!
"""

import json

import frappe

from pos_next.api.items import _get_item_group_with_descendants

# Fieldname of the "Kunden-MWST-Satz" custom field on Item Group
# (Select, options "8.1", "2.6", "0.0")
CUSTOMER_VAT_FIELD = "kundenmwstsatz"


def parse_vat_rate(raw):
	"""Turn a Select value ("8.1", "2.6", "0.0") into a float. Empty → None."""
	return float(raw) if raw else None


@frappe.whitelist()
def get_tax_rates(pos_profile):
	"""Return {item_group: rate_or_None} for the Item Groups the POS Profile can load.

	That is the groups configured on the profile plus all their descendants, the
	same rule get_items uses. Without configured groups, all groups are returned.

	There is no point in loading and caching all rates for all item groups in this case
	"""
	filters = {}
	configured = frappe.get_all(
		"POS Item Group", filters={"parent": pos_profile}, pluck="item_group"
	)
	if configured:
		allowed = set()
		for group in configured:
			allowed.update(_get_item_group_with_descendants(group))
		filters = {"name": ["in", list(allowed)]}

	groups = frappe.get_all("Item Group", filters=filters, fields=["name", CUSTOMER_VAT_FIELD])
	return {g.name: parse_vat_rate(g.get(CUSTOMER_VAT_FIELD)) for g in groups}


def apply_item_tax_rates(doc):
	"""Book each item of a POS Sales Invoice with the VAT rate of its Item Group.

	The tax rows still come from the POS Profile's tax template; it only has to
	provide the VAT account. Every item gets an item_tax_rate that overrides the
	template rate for that account, so the booked VAT matches the cart.
	Returns keep the rates copied from their original invoice.
	"""
	if not doc.pos_profile or doc.get("is_return"):
		return

	# The VAT account(s) from the profile's tax template
	vat_accounts = [tax.account_head for tax in doc.taxes if tax.charge_type == "On Net Total"]
	if not vat_accounts:
		return

	# Rate per Item Group of the items on this invoice
	item_groups = {item.item_group for item in doc.items if item.item_group}
	rate_by_group = {}
	if item_groups:
		rows = frappe.get_all(
			"Item Group",
			filters={"name": ["in", list(item_groups)]},
			fields=["name", CUSTOMER_VAT_FIELD],
		)
		rate_by_group = {row.name: parse_vat_rate(row.get(CUSTOMER_VAT_FIELD)) for row in rows}

	# Override the template rate per item; a group without a rate counts as 0 %
	for item in doc.items:
		rate = rate_by_group.get(item.item_group) or 0
		item.item_tax_rate = json.dumps(dict.fromkeys(vat_accounts, rate))

	doc.calculate_taxes_and_totals()
