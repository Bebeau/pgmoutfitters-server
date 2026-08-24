'use strict';

// Server-side catalog: slug → retail unit amount in cents.
// Prices match pgmoutfitters-client develop (commit 1bfcd6d) price.retail
// in src/assets/data/feeders/*.tsx. Dealer prices are not used.

const PRODUCTS = {
	'1-n-1': { name: '1-N-1', unit_amount_cents: 112500 },
	'2-n-1': { name: '2-N-1', unit_amount_cents: 130000 },
	'3-n-1': { name: '3-N-1', unit_amount_cents: 149500 },
	'4-n-1': { name: '4-N-1', unit_amount_cents: 190000 },
	'5-n-1': { name: '5-N-1', unit_amount_cents: 212500 },
	'xxx': { name: 'XXX', unit_amount_cents: 200000 },
	'rice-brand': { name: 'Rice Brand', unit_amount_cents: 79500 },
	'duel-tray': { name: 'Duel Tray', unit_amount_cents: 137500 },
	'backyard': { name: 'Backyard', unit_amount_cents: 75000 },
	'dock-feeder': { name: 'Dock Feeder', unit_amount_cents: 99500 },
	'covey-cafe': { name: 'Covey Cafe', unit_amount_cents: 125000 }
};

module.exports = PRODUCTS;
