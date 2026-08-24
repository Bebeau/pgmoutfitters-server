// Copy to config/keys.js (that path is gitignored). Never commit real keys.
// Test-mode Stripe keys are fine for local / PR verification.

module.exports = {
	db: 'postgres://USER:PASSWORD@HOST:5432/DATABASE',
	publicDomain: 'http://localhost:3000',
	proxyPort: 5000,
	email: {
		auth: {
			user: 'SES_SMTP_USER',
			pass: 'SES_SMTP_PASS'
		}
	},
	stripe: {
		secretKey: 'sk_test_...',
		webhookSecret: 'whsec_...',
		// CLT Dev connected account. Checkout refuses to start if this is missing
		// so PGM is never charged 100% with no split.
		cltDevAccountId: 'acct_...'
	}
};
