const { sign } = require("jsonwebtoken");

const createTokensCustomer = (user) => {
	const accessToken = sign({ username: user }, process.env.JWT_SECRET_KEY, {
		expiresIn: process.env.JWT_EXPIRE,
	});
	return accessToken;
};

const createTokensEntrepreneur = (user) => {
	const accessToken = sign({ username: user }, process.env.JWT_SECRET_KEY, {
		expiresIn: process.env.JWT_EXPIRE,
	});
	return accessToken;
};

module.exports = { createTokensCustomer, createTokensEntrepreneur };
