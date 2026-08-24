-- Paid checkout orders (Stripe Checkout). Separate from inquiries.
-- Items are stored as JSONB:
--   [{ "slug": "", "name": "", "qty": 1, "unit_amount_cents": 0 }]
-- Amounts are integer cents. Status is pending | paid | failed.
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- Apply with: npm run migrate

CREATE TABLE IF NOT EXISTS orders (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	stripe_checkout_session_id TEXT UNIQUE,
	stripe_payment_intent_id TEXT,
	customer_name TEXT NOT NULL DEFAULT '',
	customer_email TEXT NOT NULL DEFAULT '',
	customer_phone TEXT NOT NULL DEFAULT '',
	items JSONB NOT NULL DEFAULT '[]'::jsonb,
	subtotal_cents INTEGER NOT NULL DEFAULT 0,
	connect_transfer_cents INTEGER NOT NULL DEFAULT 0,
	total_cents INTEGER NOT NULL DEFAULT 0,
	status TEXT NOT NULL DEFAULT 'pending'
		CHECK (status IN ('pending', 'paid', 'failed')),
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
