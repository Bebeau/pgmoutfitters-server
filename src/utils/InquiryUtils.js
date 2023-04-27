const Inquiry = require('../models/Inquiry');

class UserUtils {
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
		email = email.toLowerCase();
		
		console.log('COMPANY: ', company);

		return new Promise((resolve, reject) => {
			let inquiry = new Inquiry();
				
			inquiry.type = type;
			inquiry.firstName = first;
			inquiry.lastName = last;
			inquiry.companyName = company;
			inquiry.email = email;
			inquiry.phone = phone;
			inquiry.status = status;
			inquiry.cart = cart;
			inquiry.cost = cost;
			inquiry.createdAt = createAt;
			inquiry.updatedAt = updatedAt;
			
			inquiry.save((err, inquiry) => {
				if (err) {
					return reject(err);
				}
				resolve(inquiry);
			});
		});
	}

}

module.exports = UserUtils;
