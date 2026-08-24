'use strict';

const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const CheckoutUtils = require('./CheckoutUtils');
const StripeUtils = require('./StripeUtils');
const PRODUCTS = require('../data/products');

describe('CheckoutUtils.priceCart', () => {
	it('maps every catalog slug to the client retail price in cents', () => {
		assert.equal(PRODUCTS['1-n-1'].unit_amount_cents, 112500);
		assert.equal(PRODUCTS['2-n-1'].unit_amount_cents, 130000);
		assert.equal(PRODUCTS['3-n-1'].unit_amount_cents, 149500);
		assert.equal(PRODUCTS['4-n-1'].unit_amount_cents, 190000);
		assert.equal(PRODUCTS['5-n-1'].unit_amount_cents, 212500);
		assert.equal(PRODUCTS['xxx'].unit_amount_cents, 200000);
		assert.equal(PRODUCTS['rice-brand'].unit_amount_cents, 79500);
		assert.equal(PRODUCTS['duel-tray'].unit_amount_cents, 137500);
		assert.equal(PRODUCTS['backyard'].unit_amount_cents, 75000);
		assert.equal(PRODUCTS['dock-feeder'].unit_amount_cents, 99500);
		assert.equal(PRODUCTS['covey-cafe'].unit_amount_cents, 125000);
	});

	it('recalculates totals from the server price map', () => {
		const cart = CheckoutUtils.priceCart([
			{ slug: '1-n-1', qty: 2 },
			{ slug: 'backyard', qty: 1 }
		]);
		assert.equal(cart.items.length, 2);
		assert.equal(cart.subtotal_cents, 112500 * 2 + 75000);
		assert.equal(cart.total_cents, cart.subtotal_cents);
		assert.equal(cart.connect_transfer_cents, Math.round(cart.total_cents * 0.05));
	});

	it('rejects unknown slugs', () => {
		assert.throws(
			() => CheckoutUtils.priceCart([{ slug: 'not-a-feeder', qty: 1 }]),
			(err) => err.status === 400 && /Unknown product slug/.test(err.message)
		);
	});

	it('rejects qty below 1', () => {
		assert.throws(
			() => CheckoutUtils.priceCart([{ slug: '1-n-1', qty: 0 }]),
			(err) => err.status === 400 && /at least 1/.test(err.message)
		);
		assert.throws(
			() => CheckoutUtils.priceCart([{ slug: '1-n-1', qty: -2 }]),
			(err) => err.status === 400
		);
	});

	it('rejects an empty cart', () => {
		assert.throws(
			() => CheckoutUtils.priceCart([]),
			(err) => err.status === 400
		);
	});

	it('merges duplicate slugs', () => {
		const cart = CheckoutUtils.priceCart([
			{ slug: 'xxx', qty: 1 },
			{ slug: 'xxx', qty: '2' }
		]);
		assert.equal(cart.items.length, 1);
		assert.equal(cart.items[0].qty, 3);
		assert.equal(cart.total_cents, 600000);
	});

	it('builds product links on /deer-feeders/{slug}', () => {
		assert.equal(CheckoutUtils.productPageUrl('1-n-1'), 'https://pgmoutfitters.com/deer-feeders/1-n-1');
		assert.equal(CheckoutUtils.productPageUrl('rice-brand').includes('/products/deer-feeders/'), false);
	});

	it('does not store dealer prices on the server catalog', () => {
		Object.values(PRODUCTS).forEach((product) => {
			assert.equal(product.dealer, undefined);
			assert.equal(product.price, undefined);
			assert.ok(product.unit_amount_cents > 0);
		});
	});

	it('refuses checkout when the CLT Dev connected account is missing', () => {
		assert.throws(
			() => StripeUtils.assertCheckoutConfigured({ secretKey: 'sk_test_x' }),
			(err) => err.status === 503 && err.code === 'STRIPE_CONNECT_NOT_CONFIGURED'
		);
		assert.throws(
			() => StripeUtils.assertCheckoutConfigured({ secretKey: 'sk_test_x', cltDevAccountId: 'not-an-acct' }),
			(err) => err.status === 503 && /5% split/.test(err.message)
		);
	});

	it('accepts a configured test secret and acct_ destination', () => {
		assert.doesNotThrow(() => StripeUtils.assertCheckoutConfigured({
			secretKey: 'sk_test_x',
			cltDevAccountId: 'acct_123'
		}));
	});

	it('verifies Stripe webhook signatures and rejects tampering', () => {
		const Stripe = require('stripe');
		const stripe = new Stripe('sk_test_dummy');
		const payload = JSON.stringify({
			id: 'evt_test',
			object: 'event',
			type: 'checkout.session.completed',
			data: { object: { id: 'cs_test' } }
		});
		const secret = 'whsec_test_secret';
		const signature = stripe.webhooks.generateTestHeaderString({ payload, secret });
		const event = StripeUtils.constructEvent(
			{ body: payload, headers: { 'stripe-signature': signature } },
			secret
		);
		assert.equal(event.type, 'checkout.session.completed');
		assert.throws(
			() => StripeUtils.constructEvent(
				{ body: payload, headers: { 'stripe-signature': signature } },
				'whsec_other'
			)
		);
	});

	it('rounds the 5% CLT Dev transfer to the nearest cent', () => {
		// 3-N-1 retail $1495 → 149500 cents × 5% = 7475 exactly
		assert.equal(CheckoutUtils.connectTransferCents(149500), 7475);
		// Half-up: 1010 × 0.05 = 50.5 → 51
		assert.equal(CheckoutUtils.connectTransferCents(1010), 51);
		// 1009 × 0.05 = 50.45 → 50
		assert.equal(CheckoutUtils.connectTransferCents(1009), 50);
	});
});
