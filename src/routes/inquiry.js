const express = require('express');
const InquiryUtils = require('../utils/InquiryUtils');
const EmailUtils = require('../utils/EmailUtils');
const Response = require('../models/Response');
const router = express.Router();

router.post('/api/inquiry/submit', (req,res) => {
	let requiredParams = ['type', 'first', 'last', 'email', 'phone', 'status', 'cart', 'cost'];
	requiredParams.forEach(param => {
		if (param !== 'cart' && typeof req.body[param] !== 'string' || param !== 'cart' && !req.body[param].length) {
			return res.send(Response.clientError('Unable to send inquiry. All fields required.', []));
		}
		// if(param === 'cart' && typeof req.body[param] !== 'object') {
		// 	return res.send(Response.clientError('Unable to send inquiry. Must include at least 1 product.', []));
		// }
	});

	InquiryUtils.newInquiry(
		req.body.type,
		req.body.first,
		req.body.last,
		req.body.company,
		req.body.email,
		req.body.phone,
		req.body.status,
		req.body.cart,
		req.body.cost,
		Date.now(), 
		Date.now(),
	)
	.then(async inquiry => {
		if (!inquiry) {
			console.log("ERROR WITH CREATING INQUIRY...");
			return res.send(Response.clientError('Unable to create inquiry.', []));
		}
		await EmailUtils.sendStaffEmail(inquiry);
		res.send(Response.success('success', inquiry.getPublic(inquiry)));
	})
	.catch(err => {
		console.log("CATCH ERROR CREATING INQUIRY...");
		console.log(err);
		return res.send(Response.serverError('Error while trying to create inquiry.', {err}));
	});
});

module.exports = router;