'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/keys');

async function run() {
	const sqlPath = path.join(__dirname, '..', 'migrations', '001_create_inquiries.sql');
	const sql = fs.readFileSync(sqlPath, 'utf8');
	const pool = new Pool({ connectionString: config.db });

	try {
		await pool.query(sql);
		console.log('Migration applied: 001_create_inquiries.sql');
	} finally {
		await pool.end();
	}
}

run().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
