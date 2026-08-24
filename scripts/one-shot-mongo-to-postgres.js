'use strict';

/**
 * ONE-SHOT copy of Inquiry documents from MongoDB into Postgres.
 *
 * This is not used by the server. Do not run it against a real or
 * production database. IDs are new UUIDs (Mongo ObjectIds are not reused).
 *
 * Requires a temporary `mongodb` install (do not add it to package.json):
 *   npm install mongodb
 *   MONGO_URL='mongodb://...' POSTGRES_URL='postgres://...' \
 *     node scripts/one-shot-mongo-to-postgres.js
 */

let MongoClient;
try {
	({ MongoClient } = require('mongodb'));
} catch (err) {
	console.error('This script requires a temporary `npm install mongodb`. It is not a server dependency.');
	process.exit(1);
}

const { Pool } = require('pg');

async function run() {
	const mongoUrl = process.env.MONGO_URL;
	const postgresUrl = process.env.POSTGRES_URL;

	if (!mongoUrl || !postgresUrl) {
		console.error('Set MONGO_URL and POSTGRES_URL. Refusing to guess connection strings.');
		process.exit(1);
	}

	const mongo = new MongoClient(mongoUrl);
	const pool = new Pool({ connectionString: postgresUrl });

	try {
		await mongo.connect();
		const db = mongo.db();
		const docs = await db.collection('inquiries').find({}).toArray();
		console.log(`Found ${docs.length} Mongo inquiries`);

		for (const doc of docs) {
			await pool.query(
				`INSERT INTO inquiries (
					type, first_name, last_name, company_name, email, phone, status, cart, cost, created_at, updated_at
				) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)`,
				[
					doc.type || '',
					doc.firstName || '',
					doc.lastName || '',
					doc.companyName || '',
					doc.email || '',
					doc.phone || '',
					doc.status || '',
					JSON.stringify(doc.cart || []),
					doc.cost || '',
					doc.createdAt ? new Date(doc.createdAt) : new Date(),
					doc.updatedAt ? new Date(doc.updatedAt) : new Date()
				]
			);
		}

		console.log(`Copied ${docs.length} inquiries to Postgres`);
	} finally {
		await mongo.close();
		await pool.end();
	}
}

run().catch((err) => {
	console.error('One-shot Mongo → Postgres copy failed:', err);
	process.exit(1);
});
