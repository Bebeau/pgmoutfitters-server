'use strict';

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');
const config = require('../config/keys');

async function run() {
	const migrationsDir = path.join(__dirname, '..', 'migrations');
	const files = fs.readdirSync(migrationsDir)
		.filter((file) => file.endsWith('.sql'))
		.sort();

	if (!files.length) {
		console.log('No migrations found.');
		return;
	}

	const pool = new Pool({ connectionString: config.db });

	try {
		for (const file of files) {
			const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
			await pool.query(sql);
			console.log(`Migration applied: ${file}`);
		}
	} finally {
		await pool.end();
	}
}

run().catch((err) => {
	console.error('Migration failed:', err);
	process.exit(1);
});
