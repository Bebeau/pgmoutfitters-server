'use strict';

const Order = require('../models/Order');
const PostgresUtils = require('./PostgresUtils');

class OrderUtils {
	static async insertPending(priced) {
		const result = await PostgresUtils.query(
			`INSERT INTO orders (
				items, subtotal_cents, connect_transfer_cents, total_cents, status
			) VALUES ($1::jsonb, $2, $3, $4, 'pending')
			RETURNING *`,
			[
				JSON.stringify(priced.items),
				priced.subtotal_cents,
				priced.connect_transfer_cents,
				priced.total_cents
			]
		);
		return new Order(result.rows[0]);
	}

	static async setSessionId(orderId, sessionId) {
		const result = await PostgresUtils.query(
			`UPDATE orders
			 SET stripe_checkout_session_id = $2, updated_at = NOW()
			 WHERE id = $1
			 RETURNING *`,
			[orderId, sessionId]
		);
		if (!result.rows[0]) {
			return null;
		}
		return new Order(result.rows[0]);
	}

	static async findBySessionId(sessionId) {
		const result = await PostgresUtils.query(
			`SELECT * FROM orders WHERE stripe_checkout_session_id = $1`,
			[sessionId]
		);
		if (!result.rows[0]) {
			return null;
		}
		return new Order(result.rows[0]);
	}

	static async findById(orderId) {
		const result = await PostgresUtils.query(
			`SELECT * FROM orders WHERE id = $1`,
			[orderId]
		);
		if (!result.rows[0]) {
			return null;
		}
		return new Order(result.rows[0]);
	}

	static async markPaid({ sessionId, orderId, paymentIntentId, customerName, customerEmail, customerPhone }) {
		const result = await PostgresUtils.query(
			`UPDATE orders
			 SET stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, $1),
			     stripe_payment_intent_id = $2,
			     customer_name = $3,
			     customer_email = $4,
			     customer_phone = $5,
			     status = 'paid',
			     updated_at = NOW()
			 WHERE status <> 'paid'
			   AND (stripe_checkout_session_id = $1 OR ($6::uuid IS NOT NULL AND id = $6::uuid))
			 RETURNING *`,
			[
				sessionId,
				paymentIntentId || null,
				customerName || '',
				(customerEmail || '').toLowerCase(),
				customerPhone || '',
				orderId || null
			]
		);

		if (result.rows[0]) {
			return { alreadyPaid: false, order: new Order(result.rows[0]) };
		}

		const existing = sessionId
			? await OrderUtils.findBySessionId(sessionId)
			: (orderId ? await OrderUtils.findById(orderId) : null);

		if (existing && existing.status === 'paid') {
			return { alreadyPaid: true, order: existing };
		}

		const err = new Error('Order not found for checkout session.');
		err.status = 404;
		throw err;
	}

	static async markFailed({ sessionId, orderId }) {
		const result = await PostgresUtils.query(
			`UPDATE orders
			 SET status = 'failed', updated_at = NOW()
			 WHERE status = 'pending'
			   AND (stripe_checkout_session_id = $1 OR ($2::uuid IS NOT NULL AND id = $2::uuid))
			 RETURNING *`,
			[sessionId || null, orderId || null]
		);
		if (!result.rows[0]) {
			return null;
		}
		return new Order(result.rows[0]);
	}

	static async markFailedById(orderId) {
		const result = await PostgresUtils.query(
			`UPDATE orders
			 SET status = 'failed', updated_at = NOW()
			 WHERE id = $1 AND status = 'pending'
			 RETURNING *`,
			[orderId]
		);
		if (!result.rows[0]) {
			return null;
		}
		return new Order(result.rows[0]);
	}
}

module.exports = OrderUtils;
