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
		// Stripe Dashboard → Developers → API keys (test mode is fine for this PR)
		secretKey: 'sk_test_...',
		// Stripe Dashboard → Developers → Webhooks → add POST /api/stripe/webhook
		// and paste the signing secret here.
		webhookSecret: 'whsec_...',
		// CLT Dev connected account id (acct_...). Checkout refuses to start if
		// this is missing so PGM is never charged 100% with no 5% split.
		cltDevAccountId: 'acct_...'
	}
};
