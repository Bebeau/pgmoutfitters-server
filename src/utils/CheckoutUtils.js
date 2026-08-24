'use strict';

const PRODUCTS = require('../data/products');

class CheckoutError extends Error {
	constructor(message, status) {
		super(message);
		this.name = 'CheckoutError';
		this.status = status || 400;
	}
}

class CheckoutUtils {
	static CheckoutError = CheckoutError;

	// 5% of the session total, rounded to the nearest cent (JS Math.round,
	// half-up / away from zero for positive amounts).
	static connectTransferCents(totalCents) {
		return Math.round(totalCents * 0.05);
	}

	static productPageUrl(slug) {
		return `https://pgmoutfitters.com/deer-feeders/${slug}`;
	}

	static parseQty(qty) {
		if (typeof qty === 'number' && Number.isInteger(qty)) {
			return qty;
		}
		if (typeof qty === 'string' && /^\d+$/.test(qty.trim())) {
			return Number(qty.trim());
		}
		return null;
	}

	static priceCart(rawItems) {
		if (!Array.isArray(rawItems) || rawItems.length === 0) {
			throw new CheckoutError('Cart items are required.');
		}

		const merged = new Map();

		rawItems.forEach((item, index) => {
			if (!item || typeof item.slug !== 'string' || !item.slug.trim()) {
				throw new CheckoutError(`Item ${index} is missing a product slug.`);
			}

			const slug = item.slug.trim();
			const product = PRODUCTS[slug];
			if (!product) {
				throw new CheckoutError(`Unknown product slug: ${slug}`);
			}

			const qty = CheckoutUtils.parseQty(item.qty);
			if (qty == null || qty < 1) {
				throw new CheckoutError(`Quantity must be an integer of at least 1 for ${slug}.`);
			}

			const existing = merged.get(slug);
			if (existing) {
				existing.qty += qty;
			} else {
				merged.set(slug, {
					slug,
					name: product.name,
					qty,
					unit_amount_cents: product.unit_amount_cents
				});
			}
		});

		const items = Array.from(merged.values());
		const subtotal_cents = items.reduce((sum, item) => {
			return sum + (item.unit_amount_cents * item.qty);
		}, 0);
		const total_cents = subtotal_cents;
		const connect_transfer_cents = CheckoutUtils.connectTransferCents(total_cents);

		return {
			items,
			subtotal_cents,
			connect_transfer_cents,
			total_cents
		};
	}

	static clientOrigin(req) {
		const config = require('../../config/keys');
		const allowed = [
			config.publicDomain,
			'http://127.0.0.1:3000',
			'http://localhost:3000'
		].filter(Boolean);

		const header = req.get('origin');
		if (header && allowed.includes(header)) {
			return header.replace(/\/$/, '');
		}

		const fallback = config.publicDomain || 'http://localhost:3000';
		return String(fallback).replace(/\/$/, '');
	}

	static async createSession(req) {
		const StripeUtils = require('./StripeUtils');
		const OrderUtils = require('./OrderUtils');

		const priced = CheckoutUtils.priceCart(req.body && req.body.items);
		StripeUtils.assertCheckoutConfigured();

		const order = await OrderUtils.insertPending(priced);
		const origin = CheckoutUtils.clientOrigin(req);

		try {
			const session = await StripeUtils.createCheckoutSession({
				order,
				priced,
				origin
			});
			await OrderUtils.setSessionId(order.id, session.id);
			return { url: session.url };
		} catch (err) {
			await OrderUtils.markFailedById(order.id);
			throw err;
		}
	}

	static async handleCheckoutCompleted(session) {
		const OrderUtils = require('./OrderUtils');
		const EmailUtils = require('./EmailUtils');

		const sessionId = session.id;
		const orderId = session.metadata && session.metadata.order_id;
		const paymentIntentId = typeof session.payment_intent === 'string'
			? session.payment_intent
			: (session.payment_intent && session.payment_intent.id) || null;
		const details = session.customer_details || {};

		const result = await OrderUtils.markPaid({
			sessionId,
			orderId,
			paymentIntentId,
			customerName: details.name || '',
			customerEmail: details.email || '',
			customerPhone: details.phone || ''
		});

		if (result.alreadyPaid) {
			return result.order;
		}

		try {
			await EmailUtils.sendOrderEmails(result.order);
		} catch (err) {
			// Payment already recorded. Do not fail the webhook (Stripe would retry
			// and the already-paid path would skip email anyway).
			console.error('Paid order email failed; order is still marked paid:', err);
		}
		return result.order;
	}

	static async handleCheckoutFailed(session) {
		const OrderUtils = require('./OrderUtils');
		const sessionId = session.id;
		const orderId = session.metadata && session.metadata.order_id;
		return OrderUtils.markFailed({ sessionId, orderId });
	}
}

module.exports = CheckoutUtils;
