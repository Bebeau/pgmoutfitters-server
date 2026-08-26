'use strict';

function stripeConfig() {
	try {
		const config = require('../../config/keys');
		return (config && config.stripe) || {};
	} catch (err) {
		if (err && err.code === 'MODULE_NOT_FOUND') {
			return {};
		}
		throw err;
	}
}

class StripeUtils {
	static assertCheckoutConfigured(stripe) {
		stripe = stripe || stripeConfig();
		if (!stripe.secretKey) {
			const err = new Error('Checkout is not configured: missing Stripe secret key (config.stripe.secretKey).');
			err.status = 503;
			err.code = 'STRIPE_NOT_CONFIGURED';
			throw err;
		}
		if (!stripe.cltDevAccountId || !String(stripe.cltDevAccountId).startsWith('acct_')) {
			const err = new Error('Checkout is not configured: missing CLT Dev connected account (config.stripe.cltDevAccountId). Refusing to charge without the 5% split.');
			err.status = 503;
			err.code = 'STRIPE_CONNECT_NOT_CONFIGURED';
			throw err;
		}
	}

	static getClient() {
		const secretKey = stripeConfig().secretKey;
		if (!secretKey) {
			const err = new Error('Checkout is not configured: missing Stripe secret key (config.stripe.secretKey).');
			err.status = 503;
			throw err;
		}
		const Stripe = require('stripe');
		return new Stripe(secretKey);
	}

	static isAbsoluteHttpsUrl(value) {
		return typeof value === 'string' && /^https:\/\//i.test(value.trim());
	}

	static lineItemProductData(item) {
		const CheckoutUtils = require('./CheckoutUtils');
		const PRODUCTS = require('../data/products');
		const product = PRODUCTS[item.slug] || {};
		const product_data = {
			name: CheckoutUtils.checkoutProductName(item.name),
			metadata: { slug: item.slug }
		};
		if (StripeUtils.isAbsoluteHttpsUrl(product.image)) {
			product_data.images = [product.image];
		}
		return product_data;
	}

	static async createCheckoutSession({ order, priced, origin }) {
		StripeUtils.assertCheckoutConfigured();
		const stripe = StripeUtils.getClient();
		const destination = stripeConfig().cltDevAccountId;

		return stripe.checkout.sessions.create({
			mode: 'payment',
			currency: 'usd',
			line_items: priced.items.map((item) => ({
				quantity: item.qty,
				price_data: {
					currency: 'usd',
					unit_amount: item.unit_amount_cents,
					product_data: StripeUtils.lineItemProductData(item)
				}
			})),
			phone_number_collection: { enabled: true },
			success_url: `${origin}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
			cancel_url: `${origin}/cart`,
			metadata: {
				order_id: String(order.id)
			},
			payment_intent_data: {
				metadata: {
					order_id: String(order.id)
				},
				transfer_data: {
					destination,
					amount: priced.connect_transfer_cents
				}
			}
		});
	}

	static constructEvent(req, webhookSecret) {
		webhookSecret = webhookSecret || stripeConfig().webhookSecret;
		if (!webhookSecret) {
			const err = new Error('Checkout is not configured: missing Stripe webhook secret (config.stripe.webhookSecret).');
			err.status = 503;
			throw err;
		}
		const signature = req.headers['stripe-signature'];
		const Stripe = require('stripe');
		const stripe = new Stripe(stripeConfig().secretKey || 'sk_webhook_verify');
		return stripe.webhooks.constructEvent(
			req.body,
			signature,
			webhookSecret
		);
	}
}

module.exports = StripeUtils;
