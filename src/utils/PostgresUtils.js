// Connection string comes from config.db in config/keys (gitignored, not in the repo).
// Point config.db at a Postgres URL, e.g. postgres://USER:PASSWORD@HOST:5432/DATABASE
const { Pool } = require('pg');
const config = require('../../config/keys');

let pool;

class PostgresUtils {
	static connect() {
		pool = new Pool({ connectionString: config.db });
		return pool.query('SELECT 1')
			.then(() => {
				console.log('Successfully Connected to Postgres');
			})
			.catch((err) => {
				console.log('Error Connecting to Postgres...');
				throw err;
			});
	}

	static getPool() {
		if (!pool) {
			throw new Error('Postgres is not connected');
		}
		return pool;
	}

	static query(text, params) {
		return PostgresUtils.getPool().query(text, params);
	}
}

module.exports = PostgresUtils;
