-- Creates the inquiries table that replaces the Mongoose Inquiry model.
-- Cart is stored as JSONB in the same shape the API already sends:
--   [{ "name": "", "qty": "", "price": { "retail": 0, "dealer": 0 } }]
-- Requires PostgreSQL 13+ (gen_random_uuid is built in).
-- Apply with: npm run migrate

CREATE TABLE IF NOT EXISTS inquiries (
	id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
	type TEXT NOT NULL DEFAULT '',
	first_name TEXT NOT NULL DEFAULT '',
	last_name TEXT NOT NULL DEFAULT '',
	company_name TEXT NOT NULL DEFAULT '',
	email TEXT NOT NULL DEFAULT '',
	phone TEXT NOT NULL DEFAULT '',
	status TEXT NOT NULL DEFAULT '',
	cart JSONB NOT NULL DEFAULT '[]'::jsonb,
	cost TEXT NOT NULL DEFAULT '',
	created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
	updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
