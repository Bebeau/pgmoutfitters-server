const mongoose = require('mongoose');

const productPriceSchema = new mongoose.Schema({
	retail: {
		type: Number,
		default: 0
	},
	dealer: {
		type: Number,
		default: 0
	}
})

const cartProductSchema = new mongoose.Schema({
	name: {
    type: String,
    default: ''
  },
	qty: {
		type: String,
		default: ''
	},
	price: productPriceSchema
});

const InquirySchema = new mongoose.Schema({
	type: {
		type: String,
		default: ''
	},
	firstName: {
		type: String,
		default: ''
	},
	lastName: {
		type: String,
		default: ''
	},
	companyName: {
		type: String,
		default: ''
	},
	email: {
		type: String,
		default: ''
	},
	phone: {
		type: String,
		default: ''
	},
	status: {
		type: String,
		default: ''
	},
	cart: [
		cartProductSchema
	],
	cost: {
		type: String,
		default: ''
	},
	createdAt: {
		type: Date,
		default: Date.now
	},
	updatedAt: {
		type: Date,
		default: Date.now
	}
});

InquirySchema.methods.getPublic = inquiry => {
	return {
    _id: inquiry._id,
		type: inquiry.type,
		first: inquiry.firstName,
		last: inquiry.lastName,
		company: inquiry.companyName,
		email: inquiry.email,
		phone: inquiry.phone,
		cart: inquiry.cart,
		cost: inquiry.cost
	}
}

module.exports = mongoose.model('Inquiry', InquirySchema);