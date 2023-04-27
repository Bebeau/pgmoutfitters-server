const UserSession = require('../models/UserSession');

class AuthUtils {
	static checkAuth(userID, sessionID) {
		return new Promise((resolve, reject) => {
			if (typeof sessionID !== 'string' || !sessionID.length) {
				return resolve(false);
			}

			let userQuery = {
				_id: sessionID,
				userId: userID,
				isDeleted: false
			};

			UserSession.findOne(userQuery, (err, session) => {
				if (err) {
					console.log('Error fetching user session:' + err);
					return resolve(false);
				}

				if (session === null || typeof session !== 'object') {
					console.log('Session check failed, non object returned');
					return resolve(false);
				}

				return resolve(true);
			})
		});
	}
}

module.exports = AuthUtils;