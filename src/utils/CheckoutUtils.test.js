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

	it('titles checkout product names like the client product page', () => {
		assert.equal(CheckoutUtils.checkoutProductName(PRODUCTS['2-n-1'].name), '2-N-1 Deer Feeder');
		assert.equal(CheckoutUtils.checkoutProductName(PRODUCTS['dock-feeder'].name), 'Dock Feeder');
		assert.equal(CheckoutUtils.checkoutProductName(PRODUCTS['1-n-1'].name), '1-N-1 Deer Feeder');
		assert.equal(CheckoutUtils.checkoutProductName(PRODUCTS['xxx'].name), 'XXX Deer Feeder');
		assert.equal(CheckoutUtils.checkoutProductName(PRODUCTS['rice-brand'].name), 'Rice Brand Deer Feeder');
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

	it('rejects merged qty above 20 per slug', () => {
		assert.throws(
			() => CheckoutUtils.priceCart([{ slug: '1-n-1', qty: 21 }]),
			(err) => err.status === 400 && /20/.test(err.message)
		);
		assert.throws(
			() => CheckoutUtils.priceCart([
				{ slug: '1-n-1', qty: 12 },
				{ slug: '1-n-1', qty: 9 }
			]),
			(err) => err.status === 400 && /20/.test(err.message)
		);
		const atCap = CheckoutUtils.priceCart([{ slug: '1-n-1', qty: 20 }]);
		assert.equal(atCap.items[0].qty, 20);
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

function paidSession(overrides) {
	return Object.assign({
		id: 'cs_test',
		payment_status: 'paid',
		amount_total: 112500,
		currency: 'usd',
		metadata: { order_id: '11111111-1111-1111-1111-111111111111' },
		customer_details: { name: 'Pat', email: 'pat@example.com', phone: '3185550100' },
		payment_intent: 'pi_test'
	}, overrides);
}

function pendingOrder(overrides) {
	return Object.assign({
		id: '11111111-1111-1111-1111-111111111111',
		status: 'pending',
		totalCents: 112500,
		emailSentAt: null
	}, overrides);
}

describe('CheckoutUtils.handleCheckoutCompleted', () => {
	it('does not mark paid on unpaid checkout.session.completed', async () => {
		const calls = [];
		const order = pendingOrder();
		const result = await CheckoutUtils.handleCheckoutCompleted(
			paidSession({ payment_status: 'unpaid' }),
			'checkout.session.completed',
			{
				OrderUtils: {
					findBySessionOrOrderId: async () => order,
					markPaid: async () => {
						calls.push('markPaid');
						return { alreadyPaid: false, order };
					},
					markEmailSent: async () => { calls.push('emailSent'); }
				},
				EmailUtils: {
					sendOrderEmails: async () => { calls.push('email'); }
				}
			}
		);
		assert.equal(result, null);
		assert.deepEqual(calls, []);
		assert.equal(CheckoutUtils.shouldMarkPaid({ payment_status: 'unpaid' }, 'checkout.session.completed'), false);
	});

	it('marks paid on completed when payment_status is paid', async () => {
		const calls = [];
		const order = pendingOrder();
		const paid = pendingOrder({ status: 'paid' });
		await CheckoutUtils.handleCheckoutCompleted(
			paidSession(),
			'checkout.session.completed',
			{
				OrderUtils: {
					findBySessionOrOrderId: async () => order,
					markPaid: async () => {
						calls.push('markPaid');
						return { alreadyPaid: false, order: paid };
					},
					markEmailSent: async () => { calls.push('emailSent'); }
				},
				EmailUtils: {
					sendOrderEmails: async () => { calls.push('email'); }
				}
			}
		);
		assert.deepEqual(calls, ['markPaid', 'email', 'emailSent']);
	});

	it('marks paid on async_payment_succeeded even without payment_status paid', async () => {
		const calls = [];
		const order = pendingOrder();
		const paid = pendingOrder({ status: 'paid' });
		await CheckoutUtils.handleCheckoutCompleted(
			paidSession({ payment_status: 'unpaid' }),
			'checkout.session.async_payment_succeeded',
			{
				OrderUtils: {
					findBySessionOrOrderId: async () => order,
					markPaid: async () => {
						calls.push('markPaid');
						return { alreadyPaid: false, order: paid };
					},
					markEmailSent: async () => { calls.push('emailSent'); }
				},
				EmailUtils: {
					sendOrderEmails: async () => { calls.push('email'); }
				}
			}
		);
		assert.deepEqual(calls, ['markPaid', 'email', 'emailSent']);
	});

	it('returns 500 and does not mark paid when amount_total mismatches', async () => {
		const calls = [];
		const order = pendingOrder({ totalCents: 112500 });
		await assert.rejects(
			() => CheckoutUtils.handleCheckoutCompleted(
				paidSession({ amount_total: 999 }),
				'checkout.session.completed',
				{
					OrderUtils: {
						findBySessionOrOrderId: async () => order,
						markPaid: async () => {
							calls.push('markPaid');
							return { alreadyPaid: false, order };
						}
					},
					EmailUtils: { sendOrderEmails: async () => {} }
				}
			),
			(err) => err.status === 500 && /mismatch/.test(err.message)
		);
		assert.deepEqual(calls, []);
	});

	it('returns 500 and does not mark paid when currency is not usd', async () => {
		const calls = [];
		await assert.rejects(
			() => CheckoutUtils.handleCheckoutCompleted(
				paidSession({ currency: 'cad' }),
				'checkout.session.completed',
				{
					OrderUtils: {
						findBySessionOrOrderId: async () => pendingOrder(),
						markPaid: async () => {
							calls.push('markPaid');
							return { alreadyPaid: false, order: pendingOrder() };
						}
					},
					EmailUtils: { sendOrderEmails: async () => {} }
				}
			),
			(err) => err.status === 500 && /mismatch/.test(err.message)
		);
		assert.deepEqual(calls, []);
	});

	it('sends email when already paid but email_sent_at is null', async () => {
		const calls = [];
		const paid = pendingOrder({ status: 'paid', emailSentAt: null });
		await CheckoutUtils.handleCheckoutCompleted(
			paidSession(),
			'checkout.session.completed',
			{
				OrderUtils: {
					findBySessionOrOrderId: async () => paid,
					markPaid: async () => ({ alreadyPaid: true, order: paid }),
					markEmailSent: async () => { calls.push('emailSent'); }
				},
				EmailUtils: {
					sendOrderEmails: async () => { calls.push('email'); }
				}
			}
		);
		assert.deepEqual(calls, ['email', 'emailSent']);
	});

	it('skips email when email_sent_at is already set', async () => {
		const calls = [];
		const paid = pendingOrder({ status: 'paid', emailSentAt: new Date() });
		await CheckoutUtils.handleCheckoutCompleted(
			paidSession(),
			'checkout.session.completed',
			{
				OrderUtils: {
					findBySessionOrOrderId: async () => paid,
					markPaid: async () => ({ alreadyPaid: true, order: paid }),
					markEmailSent: async () => { calls.push('emailSent'); }
				},
				EmailUtils: {
					sendOrderEmails: async () => { calls.push('email'); }
				}
			}
		);
		assert.deepEqual(calls, []);
	});

	it('quotes product href in the order email template', () => {
		const fs = require('fs');
		const path = require('path');
		const template = fs.readFileSync(
			path.join(__dirname, '..', 'emails', 'templates', 'order.hbs'),
			'utf8'
		);
		assert.match(template, /href="\{\{link\}\}"/);
		assert.match(template, /href="\{\{pickupMapsUrl\}\}"/);
		assert.match(template, /https:\/\/pgmoutfitters\.com\/logo\.png/);
		assert.doesNotMatch(template, /files\.stripe\.com/);
		assert.doesNotMatch(template, /href=""/);
		assert.doesNotMatch(template, /<svg[\s>]/);
	});

	it('does not set email_sent_at and throws when send fails', async () => {
		const calls = [];
		const paid = pendingOrder({ status: 'paid', emailSentAt: null });
		await assert.rejects(
			() => CheckoutUtils.handleCheckoutCompleted(
				paidSession(),
				'checkout.session.completed',
				{
					OrderUtils: {
						findBySessionOrOrderId: async () => paid,
						markPaid: async () => ({ alreadyPaid: true, order: paid }),
						markEmailSent: async () => { calls.push('emailSent'); }
					},
					EmailUtils: {
						sendOrderEmails: async () => {
							const err = new Error('SES failed');
							err.status = 500;
							throw err;
						}
					}
				}
			),
			(err) => /SES failed/.test(err.message)
		);
		assert.deepEqual(calls, []);
	});
});
