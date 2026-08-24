const Inquiry = require('../models/Inquiry');
const PostgresUtils = require('./PostgresUtils');

class InquiryUtils {
	static async newInquiry (
		type,
		first,
		last,
		company,
		email, 
		phone,
		status,
		cart,
		cost,
		createAt, 
		updatedAt
		) {
		email = (email || '').toLowerCase();

		const createdAt = createAt != null ? new Date(createAt) : new Date();
		const updated = updatedAt != null ? new Date(updatedAt) : new Date();

		const result = await PostgresUtils.query(
			`INSERT INTO inquiries (
				type, first_name, last_name, company_name, email, phone, status, cart, cost, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11)
			RETURNING *`,
			[
				type || '',
				first || '',
				last || '',
				company || '',
				email || '',
				phone || '',
				status || '',
				JSON.stringify(cart || []),
				cost || '',
				createdAt,
				updated
			]
		);

		return new Inquiry(result.rows[0]);
	}

}

module.exports = InquiryUtils;
