'use strict';

const express = require('express');
const StripeUtils = require('../utils/StripeUtils');
const CheckoutUtils = require('../utils/CheckoutUtils');

const router = express.Router();

router.post(
	'/api/stripe/webhook',
	express.raw({ type: 'application/json' }),
	(req, res) => {
		let event;
		try {
			event = StripeUtils.constructEvent(req);
		} catch (err) {
			console.error('Stripe webhook signature verification failed:', err.message);
			return res.status(400).send(`Webhook signature verification failed: ${err.message}`);
		}

		const handle = (() => {
			if (
				event.type === 'checkout.session.completed' ||
				event.type === 'checkout.session.async_payment_succeeded'
			) {
				return CheckoutUtils.handleCheckoutCompleted(event.data.object);
			}
			if (
				event.type === 'checkout.session.async_payment_failed' ||
				event.type === 'checkout.session.expired'
			) {
				return CheckoutUtils.handleCheckoutFailed(event.data.object);
			}
			return Promise.resolve();
		})();

		handle
			.then(() => {
				res.json({ received: true });
			})
			.catch((err) => {
				console.error('Stripe webhook handler failed:', err);
				res.status(500).json({ error: err.message || 'Webhook handler failed.' });
			});
	}
);

module.exports = router;
