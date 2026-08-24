'use strict';

class Order {
	constructor(row) {
		this.id = row.id;
		this.stripeCheckoutSessionId = row.stripe_checkout_session_id != null ? row.stripe_checkout_session_id : null;
		this.stripePaymentIntentId = row.stripe_payment_intent_id != null ? row.stripe_payment_intent_id : null;
		this.customerName = row.customer_name != null ? row.customer_name : '';
		this.customerEmail = row.customer_email != null ? row.customer_email : '';
		this.customerPhone = row.customer_phone != null ? row.customer_phone : '';
		this.items = row.items != null ? row.items : [];
		this.subtotalCents = row.subtotal_cents != null ? row.subtotal_cents : 0;
		this.connectTransferCents = row.connect_transfer_cents != null ? row.connect_transfer_cents : 0;
		this.totalCents = row.total_cents != null ? row.total_cents : 0;
		this.status = row.status != null ? row.status : 'pending';
		this.createdAt = row.created_at;
		this.updatedAt = row.updated_at;
	}
}

module.exports = Order;
