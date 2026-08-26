'use strict';

const cors = require('cors');
const config = require('../config/keys');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const PostgresUtils = require('./utils/PostgresUtils');

async function connectDb() {
	await PostgresUtils.connect();
}

function setupCors() {
	const allowedOrigins = [
		config.publicDomain,
		"http://127.0.0.1:3000",
		"http://localhost:3000"
	];

	app.use(cors({
		origin: allowedOrigins,
		methods: ['GET','POST','PUT','DELETE','OPTIONS'],
		credentials: true
	}));

	app.options('*', cors());
}

function setupSession() {
	app.use(cookieParser());
	app.use(session({
		secret: 'sldjfk9fji94ij9igjegwkjfwjif3i4j9g5igj49jgeof02i02kfpowekf09if90ekferpokf',
		resave: false,
		saveUninitialized: true
	}));
}

function setupWebhook() {
	// Raw body required for Stripe signature verification. Must run before JSON parsing.
	app.use(require('./routes/stripe.js'));
}

function setupMiddleware() {
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(express.static(path.join(__dirname, 'client/build')));
}

function setupRoutes() {
	var inquiry = require('./routes/inquiry.js');
	var checkout = require('./routes/checkout.js');
	app.use(inquiry);
	app.use(checkout);
}

function startServer() {
	const port = config.proxyPort || 5000;
	app.listen(port, () => console.log(`Listening on port ${port}`));
}

const app = express();

connectDb()
	.then(() => {
		setupCors();
		setupSession();
		setupWebhook();
		setupMiddleware();
		setupRoutes();
		startServer();
	})
	.catch((err) => {
		console.log(err);
		process.exit(1);
	});