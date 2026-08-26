'use strict';

// Server-side catalog: slug → retail unit amount in cents.
// Prices match pgmoutfitters-client develop (commit 1bfcd6d) price.retail
// in src/assets/data/feeders/*.tsx. Dealer prices are not used.

const PRODUCTS = {
	'1-n-1': { name: '1-N-1', unit_amount_cents: 112500, image: 'https://pgmoutfitters.com/feeders/1-n-1.jpg' },
	'2-n-1': { name: '2-N-1', unit_amount_cents: 130000, image: 'https://pgmoutfitters.com/feeders/2-n-1.jpg' },
	'3-n-1': { name: '3-N-1', unit_amount_cents: 149500, image: 'https://pgmoutfitters.com/feeders/3-n-1.jpg' },
	'4-n-1': { name: '4-N-1', unit_amount_cents: 190000, image: 'https://pgmoutfitters.com/feeders/4-n-1.jpg' },
	'5-n-1': { name: '5-N-1', unit_amount_cents: 212500, image: 'https://pgmoutfitters.com/feeders/5-n-1.jpg' },
	'xxx': { name: 'XXX', unit_amount_cents: 200000, image: 'https://pgmoutfitters.com/feeders/xxx.jpg' },
	'rice-brand': { name: 'Rice Brand', unit_amount_cents: 79500, image: 'https://pgmoutfitters.com/feeders/rice-brand.jpg' },
	'duel-tray': { name: 'Duel Tray', unit_amount_cents: 137500, image: 'https://pgmoutfitters.com/feeders/duel-tray.jpg' },
	'backyard': { name: 'Backyard', unit_amount_cents: 75000, image: 'https://pgmoutfitters.com/feeders/backyard.jpg' },
	'dock-feeder': { name: 'Dock Feeder', unit_amount_cents: 99500, image: 'https://pgmoutfitters.com/feeders/dock-feeder.jpg' },
	'covey-cafe': { name: 'Covey Cafe', unit_amount_cents: 125000, image: 'https://pgmoutfitters.com/feeders/covey-cafe.jpg' }
};

module.exports = PRODUCTS;
