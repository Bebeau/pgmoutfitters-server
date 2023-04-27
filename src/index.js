'use strict';

const cors = require('cors');
const config = require('../config/keys');
const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const MongoUtils = require('./utils/MongoUtils');

async function connectDb() {
	try {
		await MongoUtils.connect();
	} catch (err) {
		return console.log(err);
	}
}

function setupCors() {
	app.use(cors({
		origin: `${config.publicDomain}`,
		methods: ['POST', 'PUT', 'GET', 'OPTIONS', 'HEAD', 'DELETE'],
		credentials: true
	}));
}

function setupSession() {
	app.use(cookieParser());
	app.use(session({
		secret: 'sldjfk9fji94ij9igjegwkjfwjif3i4j9g5igj49jgeof02i02kfpowekf09if90ekferpokf',
		resave: false,
		saveUninitialized: true
	}));
}

function setupMiddleware() {
	app.use(bodyParser.json());
	app.use(bodyParser.urlencoded({extended: true}));
	app.use(express.static(path.join(__dirname, 'client/build')));
}

function setupRoutes() {
	var inquiry = require('./routes/inquiry.js');
	app.use(inquiry);
}

function startServer() {
	const port = config.proxyPort || 5000;
	app.listen(port, () => console.log(`Listening on port ${port}`));
}

const app = express();

connectDb();
setupCors();
setupSession();
setupMiddleware();
setupRoutes();
startServer();