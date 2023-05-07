const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { createTokensCustomer } = require("../utils/token");

const db = require("../db/db");
const { constants } = require("buffer");
const queryParam = async (sql, data) => {
	try {
		return (await db.promise().query(sql, [data]))[0];
	} catch (err) {
		throw err;
	}
};
const zeroParam = async (sql) => {
	try {
		return (await db.promise().query(sql))[0];
	} catch (err) {
		throw err;
	}
};

const getLogin = (req, res) => {
	res.render("Admin/login");
};

const postLogin = (req, res) => {
	try {
		const { username, password } = req.body;
		const findUser = "SELECT * from admin WHERE username = ?";

		db.query(findUser, [username], async (err, result) => {
			if (err) {
				res.redirect("/admin/login");
			} else {
				if (result.length > 0) {
					const match_password = await bcrypt.compare(
						password,
						result[0].password
					);
					if (match_password) {
						const generateToken = createTokensCustomer(
							result[0].username
						);

						res.cookie("token", generateToken, { httpOnly: true });
						req.flash("success_msg", "Successfully logged in");
						res.redirect("/admin/dashboard");
					} else {
						req.flash(
							"error_msg",
							"Incorrect username or password"
						);
						res.redirect("/admin/login");
					}
				} else {
					req.flash("error_msg", "Could'nt find your account");
					res.redirect("/admin/login");
				}
			}
		});
	} catch {
		throw err;
	}
};

const getDashboard = async (req, res) => {
	const total_customer = (
		await zeroParam("SELECT COUNT(*) as 'count' FROM users")
	)[0].count;
	const total_entrepreneur = (
		await zeroParam("SELECT COUNT(*) as 'count' FROM entrepreneur")
	)[0].count;
	const total_shops = (
		await zeroParam("SELECT COUNT(*) as 'count' FROM restaurants")
	)[0].count;
	const total_reviews = (
		await zeroParam("SELECT COUNT(*) as 'count' FROM reviews")
	)[0].count;

	const recent_users = await zeroParam(
		"SELECT * FROM `users` ORDER BY `users`.`created_at` DESC LIMIT 5"
	);
	const recent_entrepreneurs = await zeroParam(
		"SELECT * FROM `entrepreneur` ORDER BY `entrepreneur`.`created_at` DESC LIMIT 5"
	);

	const recent_reviews = await zeroParam(
		"SELECT restaurants.name,users.username,reviews.* FROM `reviews` INNER JOIN users ON users.id = reviews.customer_id INNER JOIN restaurants ON restaurants.id = reviews.restaurant_id ORDER BY `reviews`.`date` LIMIT 5;"
	);
	res.render("Admin/dashboard", {
		title: "Dashboard",
		total_customer,
		total_entrepreneur,
		total_shops,
		total_reviews,
		recent_users,
		recent_entrepreneurs,
		recent_reviews,
	});
};

const getAllUsers = async (req, res) => {
	const users_record = await zeroParam("SELECT * FROM users");
	var resultData = [];

	users_record.forEach((data) => {
		resultData.push({
			id: data.id,
			username: data.username,
			name: data.name,
			email: data.email,
			phone_number: data.phone_number,
			created_at: data.created_at,
		});
	});

	res.json({ data: resultData });
};
const getUsers = async (req, res) => {
	res.render("Admin/users", { title: "Users Management" });
};
const getUsersView = async (req, res) => {
	const username = req.params.username;
	const user_record = (
		await queryParam("SELECT * FROM users WHERE username = ?", [username])
	)[0];

	const reviews_record = await queryParam(
		"SELECT restaurants.*, reviews.* FROM restaurants INNER JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE reviews.customer_id = (SELECT id FROM users WHERE username = ?) ORDER BY `reviews`.`date` DESC;",
		[username]
	);
	res.render("Admin/users_view", {
		user_record,
		reviews_record,
		title: `View Users - ${username}`,
	});
};
const deleteUser = async (req, res) => {
	const user_id = req.body.data;
	try {
		const del_review = (
			await queryParam(
				"DELETE FROM reviews WHERE `reviews`.`customer_id` = ?;",
				[user_id]
			)
		)[0];
		const del_user = (
			await queryParam("DELETE FROM users WHERE `users`.`id` = ?", [
				user_id,
			])
		)[0];
		res.status(200).json({ status: "success" });
	} catch (err) {
		res.status(500).json({ status: "error" });
	}
};

const getAllEntrepreneurs = async (req, res) => {
	const entrepreneurs_record = await zeroParam("SELECT * FROM entrepreneur");
	var resultData = [];

	entrepreneurs_record.forEach((data) => {
		resultData.push({
			id: data.id,
			username: data.username,
			name: data.name,
			email: data.email,
			phone_number: data.phone_number,
			created_at: data.created_at,
		});
	});

	res.json({ data: resultData });
};
const getEntrepreneurs = (req, res) => {
	res.render("Admin/entrepreneurs", { title: "Entrepreneur Management" });
};
const getEntrepreneursView = async (req, res) => {
	const username = req.params.username;
	const user_record = (
		await queryParam("SELECT * FROM entrepreneur WHERE username = ?", [
			username,
		])
	)[0];

	const shops_record = await queryParam(
		"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) GROUP BY restaurants.id;",
		[username]
	);

	console.log(shops_record);
	res.render("Admin/entrepreneurs_view", {
		user_record,
		shops_record,
		title: `View Entrepreneur - ${username}`,
	});
};

const deleteEntrepreneur = async (req, res) => {
	const id = req.body.data;
	try {
		const delete_image = await queryParam(
			"DELETE FROM images WHERE shop_id = ?",
			[id]
		);

		const delete_reviews = await queryParam(
			"DELETE FROM reviews WHERE restaurant_id = ?",
			[id]
		);

		const delete_restaurant = await queryParam(
			"DELETE FROM restaurants WHERE id = ?",
			[id]
		);

		const delete_entrepreneur = await queryParam(
			"DELETE FROM entrepreneur WHERE id = ?",
			[id]
		);
		res.status(200).json({ status: "success" });
	} catch (err) {
		res.status(500).json({ status: "error" });
	}
};

const getAllShops = async (req, res) => {
	const shops_record = await zeroParam(
		"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id GROUP BY restaurants.id;"
	);
	var resultData = [];

	shops_record.forEach((data) => {
		resultData.push({
			id: data.id,
			name: data.name,
			description: data.description,
			location: data.location,
			avg_rating: data.avg_rating,
			reviews_count: data.reviews_count,
		});
	});

	res.json({ data: resultData });
};
const getShops = (req, res) => {
	res.render("Admin/shops", { title: "Shop Management" });
};
const getShopsView = async (req, res) => {
	const id = req.params.id;
	const shop_record = (
		await queryParam(
			"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.id = ?;",
			[id]
		)
	)[0];

	const images = await queryParam(
		"SELECT image_path FROM images WHERE shop_id = ?",
		[id]
	);

	const shop_owner = (
		await queryParam(
			"SELECT entrepreneur.name, entrepreneur.username,entrepreneur.email,entrepreneur.phone_number FROM `restaurants` INNER JOIN entrepreneur ON entrepreneur.id = restaurants.entrepreneur_id WHERE restaurants.id = ?",
			[id]
		)
	)[0];

	res.render("Admin/shops_view", {
		shop_record,
		shop_owner,
		images,

		title: `View Entrepreneur - ID ${id}`,
	});
};
const deleteShop = async (req, res) => {
	const id = req.body.data;
	try {
		const delete_image = await queryParam(
			"DELETE FROM images WHERE shop_id = ?",
			[id]
		);

		const delete_reviews = await queryParam(
			"DELETE FROM reviews WHERE restaurant_id = ?",
			[id]
		);

		const delete_restaurant = await queryParam(
			"DELETE FROM restaurants WHERE id = ?",
			[id]
		);

		res.status(200).json({ status: "success" });
	} catch (err) {
		res.status(500).json({ status: "error" });
	}
};

const getAllReviews = async (req, res) => {
	const review_record = await zeroParam(
		"SELECT reviews.id,reviews.rating,reviews.title,reviews.comment,reviews.date,reviews.modified_date,users.username,restaurants.name FROM `reviews` INNER JOIN users ON users.id = reviews.customer_id INNER JOIN restaurants ON restaurants.id = reviews.restaurant_id  ORDER BY `reviews`.`date` DESC"
	);
	var resultData = [];

	review_record.forEach((data) => {
		resultData.push({
			id: data.id,
			username: data.username,
			restaurant: data.name,
			rating: data.rating,
			title: data.title,
			comment: data.comment,
			date: data.date,
			modified_date: data.modified_date,
		});
	});

	res.json({ data: resultData });
};
const getReviews = (req, res) => {
	res.render("Admin/reviews", { title: "Show All Reviews" });
};

const deleteReview = async (req, res) => {
	const id = req.body.data;
	try {
		const delete_review = await queryParam(
			"DELETE FROM reviews WHERE id = ?",
			[id]
		);

		res.status(200).json({ status: "success" });
	} catch (err) {
		res.status(500).json({ status: "error" });
	}
};

const getLogout = (req, res) => {
	res.clearCookie("token");
	res.redirect("/admin/login");
};

module.exports = {
	getLogin,
	postLogin,
	getDashboard,
	getEntrepreneurs,
	getUsers,
	getReviews,
	getUsersView,
	getEntrepreneursView,
	getAllUsers,
	getAllEntrepreneurs,
	getShops,
	getShopsView,
	getAllShops,
	getAllReviews,
	deleteUser,
	deleteEntrepreneur,
	deleteShop,
	deleteReview,
	getLogout
};
