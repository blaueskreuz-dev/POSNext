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
