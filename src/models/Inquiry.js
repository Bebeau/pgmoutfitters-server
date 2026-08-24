class Inquiry {
	constructor(row) {
		this._id = row.id;
		this.type = row.type != null ? row.type : '';
		this.firstName = row.first_name != null ? row.first_name : '';
		this.lastName = row.last_name != null ? row.last_name : '';
		this.companyName = row.company_name != null ? row.company_name : '';
		this.email = row.email != null ? row.email : '';
		this.phone = row.phone != null ? row.phone : '';
		this.status = row.status != null ? row.status : '';
		this.cart = row.cart != null ? row.cart : [];
		this.cost = row.cost != null ? row.cost : '';
		this.createdAt = row.created_at;
		this.updatedAt = row.updated_at;
	}

	// Same calling convention as the old Mongoose method: inquiry.getPublic(inquiry)
	getPublic(inquiry) {
		const source = inquiry || this;
		return {
			_id: source._id,
			type: source.type,
			first: source.firstName,
			last: source.lastName,
			company: source.companyName,
			email: source.email,
			phone: source.phone,
			cart: source.cart,
			cost: source.cost
		};
	}
}

module.exports = Inquiry;
