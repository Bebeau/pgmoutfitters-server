'use strict';

const express = require('express');
const CheckoutUtils = require('../utils/CheckoutUtils');
const OrderUtils = require('../utils/OrderUtils');

const router = express.Router();

router.post('/api/checkout/session', (req, res) => {
	CheckoutUtils.createSession(req)
		.then((result) => {
			res.status(200).json({ url: result.url });
		})
		.catch((err) => {
			console.error('Checkout session create failed:', err);
			const status = err.status || 500;
			res.status(status).json({ error: err.message || 'Unable to create checkout session.' });
		});
});

router.get('/api/checkout/session/:sessionId', (req, res) => {
	OrderUtils.findBySessionId(req.params.sessionId)
		.then((order) => {
			if (!order) {
				return res.status(404).json({ error: 'Checkout session not found.' });
			}
			// Read-only. Webhook is the source of truth for payment.
			res.status(200).json({
				paid: order.status === 'paid',
				status: order.status
			});
		})
		.catch((err) => {
			console.error('Checkout session lookup failed:', err);
			res.status(500).json({ error: 'Unable to look up checkout session.' });
		});
});

module.exports = router;
