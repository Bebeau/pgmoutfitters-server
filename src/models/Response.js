class Response {
	static success(message, data) {
		return this.getResponse(200, message, data);
	}

	static serverError(message, data) {
		return this.getResponse(500, message, data);
	}

	static clientError(message, data) {
		return this.getResponse(400, message, data);
	}

	static getResponse(status, message, data) {
		return {
			status: status,
			message: message,
			data: data
		}
	}
}

module.exports = Response;