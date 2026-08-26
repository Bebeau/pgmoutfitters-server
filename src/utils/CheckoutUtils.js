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
	static MAX_QTY_PER_SLUG = 20;

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

	// Same rule as client productPageTitle, without the site suffix:
	// "{name} Deer Feeder" unless name already ends with Feeder.
	static checkoutProductName(name) {
		const trimmed = String(name || '').trim();
		const suffix = /feeder$/i.test(trimmed) ? '' : ' Deer Feeder';
		return `${trimmed}${suffix}`;
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
		items.forEach((item) => {
			if (item.qty > CheckoutUtils.MAX_QTY_PER_SLUG) {
				throw new CheckoutError(
					`Quantity cannot exceed ${CheckoutUtils.MAX_QTY_PER_SLUG} for ${item.slug}.`
				);
			}
		});
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

	// Delayed methods (ACH, etc.) fire checkout.session.completed while still
	// unpaid. Only mark paid when Stripe says paid, or on async success.
	static shouldMarkPaid(session, eventType) {
		if (eventType === 'checkout.session.async_payment_succeeded') {
			return true;
		}
		return !!(session && session.payment_status === 'paid');
	}

	static assertSessionMatchesOrder(session, order) {
		const currency = String((session && session.currency) || '').toLowerCase();
		const amountTotal = session && session.amount_total;
		if (amountTotal !== order.totalCents || currency !== 'usd') {
			const err = new Error(
				`Checkout session amount/currency mismatch: session ${amountTotal} ${currency || '(none)'} vs order ${order.totalCents} usd.`
			);
			err.status = 500;
			throw err;
		}
	}

	static async handleCheckoutCompleted(session, eventType, deps) {
		const OrderUtils = (deps && deps.OrderUtils) || require('./OrderUtils');
		const EmailUtils = (deps && deps.EmailUtils) || require('./EmailUtils');

		if (!CheckoutUtils.shouldMarkPaid(session, eventType)) {
			return null;
		}

		const sessionId = session.id;
		const orderId = session.metadata && session.metadata.order_id;
		const order = await OrderUtils.findBySessionOrOrderId(sessionId, orderId);
		if (!order) {
			const err = new Error('Order not found for checkout session.');
			err.status = 404;
			throw err;
		}

		CheckoutUtils.assertSessionMatchesOrder(session, order);

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

		const paidOrder = result.order;
		if (!paidOrder.emailSentAt) {
			await EmailUtils.sendOrderEmails(paidOrder);
			await OrderUtils.markEmailSent(paidOrder.id);
		}
		return paidOrder;
	}

	static async handleCheckoutFailed(session) {
		const OrderUtils = require('./OrderUtils');
		const sessionId = session.id;
		const orderId = session.metadata && session.metadata.order_id;
		return OrderUtils.markFailed({ sessionId, orderId });
	}
}

module.exports = CheckoutUtils;
