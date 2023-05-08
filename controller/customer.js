const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { createTokensCustomer } = require("../utils/token");

const db = require("../db/db");

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
	res.render("Customer/login");
};

const postLogin = (req, res) => {
	try {
		const { username, password } = req.body;
		const findUser = "SELECT * from users WHERE username = ?";

		db.query(findUser, [username], async (err, result) => {
			if (err) {
				res.redirect("/login");
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
						res.redirect("/home");
					} else {
						req.flash(
							"error_msg",
							"Incorrect username or password"
						);
						res.redirect("/login");
					}
				} else {
					req.flash("error_msg", "Could'nt find your account");
					res.redirect("/login");
				}
			}
		});
	} catch {
		throw err;
	}
};

const getRegister = (req, res) => {
	res.render("Customer/register");
};

const getCheckUsername = (req, res) => {
	const { username } = req.query;
	db.query(
		`SELECT COUNT(*) AS count FROM (
			SELECT username FROM users WHERE username = '${username}'
			UNION
			SELECT username FROM entrepreneur WHERE username = '${username}'
		  ) AS combined_results
		  `,
		(error, results) => {
			if (error) {
				return res.status(500).send({
					error: "An error occurred while checking the username",
				});
			}
			if (results[0].count > 0) {
				return res.status(400).send({ available: false });
			}
			return res.status(200).send({ available: true });
		}
	);
};

const getCheckEmail = (req, res) => {
	const { email } = req.query;
	db.query(
		`SELECT COUNT(*) AS count FROM (
			SELECT email FROM users WHERE email = '${email}'
			UNION
			SELECT email FROM entrepreneur WHERE email = '${email}'
		  ) AS combined_results
		  `,
		(error, results) => {
			if (error) {
				return res.status(500).send({
					error: "An error occurred while checking the email",
				});
			}

			if (results[0].count > 0) {
				return res.status(400).send({ available: false });
			}
			return res.status(200).send({ available: true });
		}
	);
};

const getCheckPhone = (req, res) => {
	const { phone } = req.query;
	db.query(
		`SELECT COUNT(*) AS count FROM (
			SELECT phone_number FROM users WHERE phone_number = '${phone}'
			UNION
			SELECT phone_number FROM entrepreneur WHERE phone_number = '${phone}'
		  ) AS combined_results
		  `,
		(error, results) => {
			if (error) {
				return res.status(500).send({
					error: "An error occurred while checking the phone",
				});
			}
			if (results[0].count > 0) {
				return res.status(400).send({ available: false });
			}
			return res.status(200).send({ available: true });
		}
	);
};

const postRegister = async (req, res) => {
	const date = new Date().toISOString();
	//Data from the form ../register
	const { name, email, phone, username, password } = req.body;

	//To encrypt the password using hash
	const salt = bcrypt.genSaltSync(12);
	const hash = bcrypt.hashSync(password, salt);
	//Data to insert in sql
	var data = {
		name: name,
		email: email,
		phone_number: phone,
		username: username,
		password: hash,
		profile_picture: "default.png",
		created_at: date
	};
	//Add account to database
	var sql = "INSERT INTO users SET ?";
	db.query(sql, data, (err, rset) => {
		if (err) {
			throw err;
		} else {
			req.flash("success_msg", "Successfully created your account");
			res.redirect(`/login`);
		}
	});
};
// render the home page
const getHome = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM users WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;

	db.query(
		"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id GROUP BY restaurants.id ORDER BY (AVG(reviews.rating) * LOG10(COUNT(reviews.id) + 1)) DESC LIMIT 4",
		(err, rows) => {
			if (err) throw err;
			res.render("Customer/home", {
				restaurants: rows,
				mini_profile,
			});
		}
	);
};

// render the home page
const getRestaurants = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM users WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const page = req.query.page || 1;
	const limit = 12;
	const sortField = req.query.sortField || "name"; // default sort field
	const sortOrder = req.query.sortOrder || "asc"; // default sort order
	const countQuery = "SELECT COUNT(*) as count FROM restaurants";
	const totalPagesPromise = new Promise((resolve, reject) => {
		db.query(countQuery, (err, results) => {
			if (err) reject(err);
			const count = results[0].count;
			const totalPages = Math.ceil(count / limit);
			resolve(totalPages);
		});
	});
	totalPagesPromise
		.then((totalPages) => {
			if (page > totalPages) {
				res.render("Customer/page_not_found", { mini_profile });
			} else {
				const offset = (page - 1) * limit;
				const selectQuery = `SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count
      FROM restaurants 
      LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id 
      GROUP BY restaurants.id 
      ORDER BY 
        CASE '${sortField}'
          WHEN 'name' THEN restaurants.name
          WHEN 'location' THEN restaurants.location
          WHEN 'avg_rating' THEN AVG(reviews.rating)
          WHEN 'reviews_count' THEN COUNT(reviews.id)
          ELSE restaurants.name
        END ${sortOrder} 
      LIMIT ? OFFSET ?`;

				const selectPromise = new Promise((resolve, reject) => {
					db.query(selectQuery, [limit, offset], (err, results) => {
						if (err) reject(err);
						resolve(results);
					});
				});
				selectPromise
					.then((rows) => {
						const currentPage = parseInt(page);
						const urlBase = `/restaurants?sortField=${sortField}&sortOrder=${sortOrder}&`;
						const prevPageUrl =
							currentPage > 1
								? urlBase + `page=${currentPage - 1}`
								: null;
						const nextPageUrl =
							currentPage < totalPages
								? urlBase + `page=${currentPage + 1}`
								: null;
						res.render("Customer/restaurants", {
							restaurants: rows,
							currentPage,
							totalPages,
							sortField,
							sortOrder,
							prevPageUrl,
							nextPageUrl,
							mini_profile,
						});
					})
					.catch((err) => {
						console.error(err);
						res.sendStatus(500);
					});
			}
		})
		.catch((err) => {
			console.error(err);
			res.sendStatus(500);
		});
};

const getRestaurantsId = async (req, res) => {
	const id = req.params.id;
	const username = res.locals.id; // assuming you have a username stored in the session
	const entrepreneur_details = (
		await queryParam(
			"SELECT entrepreneur.email,entrepreneur.phone_number FROM entrepreneur INNER JOIN restaurants ON restaurants.entrepreneur_id = entrepreneur.id WHERE restaurants.id = ?",
			[id]
		)
	)[0];

	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM users WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	db.query("SELECT * FROM restaurants WHERE id = ?", [id], (err, rows) => {
		if (err) throw err;
		db.query(
			"SELECT users.username, users.name, users.profile_picture, reviews.title, reviews.rating, reviews.comment, reviews.date,reviews.modified_date FROM reviews JOIN users ON reviews.customer_id = users.id WHERE restaurant_id = ? AND username = ?",
			[id, username],
			(err, userReview) => {
				if (err) throw err;
				db.query(
					"SELECT users.username, users.name, users.profile_picture, reviews.title, reviews.rating, reviews.comment, reviews.date,reviews.modified_date, (SELECT COUNT(reviews.customer_id) FROM reviews WHERE reviews.customer_id = users.id) AS review_count FROM reviews JOIN users ON reviews.customer_id = users.id WHERE restaurant_id = ? GROUP BY reviews.id ORDER BY `reviews`.`date` DESC",
					[id],
					(err, reviewsAndUsers) => {
						if (err) throw err;

						const page = req.query.page || 1;
						const limit = 10;
						const totalPages = Math.ceil(
							reviewsAndUsers.length / limit
						);

						const currentPage = parseInt(page);
						const prevPage =
							currentPage > 1 ? currentPage - 1 : null;
						const nextPage =
							currentPage < totalPages ? currentPage + 1 : null;
						const startIndex = (currentPage - 1) * limit;
						const endIndex = startIndex + limit;
						const paginatedReviews = reviewsAndUsers.slice(
							startIndex,
							endIndex
						);

						db.query(
							"SELECT image_path FROM images WHERE shop_id = ?",
							[id],
							(err, result) => {
								if (err) {
									console.log(err);
								}

								res.render("Customer/restaurant_detail", {
									restaurant: rows[0],
									reviews: paginatedReviews,
									userReview: userReview[0] || null,
									images: result,
									currentPage,
									totalPages,
									prevPage,
									nextPage,
									mini_profile,
									entrepreneur_details,
								});
							}
						);
					}
				);
			}
		);
	});
};

// handle form submissions to add a new review
const postRestaurantsReviews = (req, res) => {
	const date = new Date().toISOString();

	const restaurantId = req.params.id;
	const comment = req.body.comment;
	const rating = req.body.rating;
	const title = req.body.title;
	const username = res.locals.id;

	db.query(
		"SELECT id FROM users WHERE username = ?",
		[username],
		(err, results) => {
			if (err) throw err;
			const customer_id = results[0].id;

			db.query(
				"INSERT INTO reviews (restaurant_id, customer_id, title, comment, rating, date) VALUES (?, ?, ?, ?, ?, ?)",
				[
					restaurantId,
					customer_id,
					title,
					comment.trim(),
					rating,
					date,
				],
				(err, results) => {
					if (err) {
						req.flash("error_msg", "Failed to submit your review");
						res.redirect(`/restaurants/${restaurantId}`);
					} else {
						req.flash(
							"success_msg",
							"Successfully submitted your review"
						);
						res.redirect(`/restaurants/${restaurantId}`);
					}
				}
			);
		}
	);
};

const postEditReviews = (req, res) => {
	const date = new Date().toISOString();
	const restaurantId = req.params.id;
	const username = res.locals.id;
	const { title, rating, comment } = req.body;

	db.query(
		"UPDATE reviews SET title = ?, rating = ?, comment = ?, modified_date = ? WHERE restaurant_id = ? AND customer_id = (SELECT id FROM users WHERE username = ?)",
		[title, rating, comment.trim(), date, restaurantId, username],
		(err, rset) => {
			if (err) {
				req.flash("error_msg", "Failed to update your review");
				res.redirect(`/restaurants/${restaurantId}`);
			} else {
				req.flash("success_msg", "Successfully updated your review");
				res.redirect(`/restaurants/${restaurantId}`);
			}
		}
	);
};

const getProfile = (req, res) => {
	const username = res.locals.id;
	db.query(
		"SELECT id FROM users WHERE username = ?",
		[username],
		(err, results) => {
			if (err) throw err;
			const customer_id = results[0].id;

			db.query(
				"SELECT * FROM users WHERE id = ?",
				[customer_id],
				(err, userResults) => {
					if (err) throw err;
					const user = userResults[0];

					db.query(
						"SELECT restaurants.*, reviews.* FROM restaurants INNER JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE reviews.customer_id = ? ORDER BY `reviews`.`date` DESC; ",
						[customer_id],
						(err, reviewResults) => {
							if (err) throw err;
							const review_count = reviewResults.length;
							const page = req.query.page || 1;
							const limit = 5;
							const totalPages = Math.ceil(review_count / limit);

							const currentPage = parseInt(page);
							const prevPage =
								currentPage > 1 ? currentPage - 1 : null;
							const nextPage =
								currentPage < totalPages
									? currentPage + 1
									: null;
							const startIndex = (currentPage - 1) * limit;
							const endIndex = startIndex + limit;
							const paginatedReviews = reviewResults.slice(
								startIndex,
								endIndex
							);

							res.render("Customer/profile", {
								user,
								reviews: paginatedReviews,
								review_count,
								currentPage,
								totalPages,
								prevPage,
								nextPage,
							});
						}
					);
				}
			);
		}
	);
};

const postProfile = (req, res) => {
	const date = new Date().toISOString();
	const username = res.locals.id;
	const { name, location, bio, profile_picture, phone, email } = req.body;

	const avatar = req.file ? req.file.filename : null; // set avatar to null if req.file is empty

	db.query(
		"UPDATE users SET name = ?, location = ?, bio = ?,phone_number = ? ,email = ?, updated_at = ? WHERE username = ?",
		[name, location, bio, phone, email, date, username],
		(err, rset) => {
			if (err) {
				console.log(err);
				req.flash(
					"error_msg",
					"Failed to update your profile phonenumber or email was already registered"
				);
				res.redirect(`/profile`);
			} else {
				if (avatar) {
					if (profile_picture !== "default.png") {
						const avatarPath = `public/img/avatar/${profile_picture}`;
						if (fs.existsSync(avatarPath)) {
							fs.unlink(avatarPath, (err) => {
								if (err) {
									console.log(err);
								}
							});
						}
					}
					db.query(
						"UPDATE users SET profile_picture = ? WHERE username = ?",
						[avatar, username],
						(err, rset) => {
							if (err) {
								console.log(err);
								req.flash(
									"error_msg",
									"Failed to update your profile"
								);
								res.redirect(`/profile`);
							} else {
								req.flash(
									"success_msg",
									"Successfully updated your profile"
								);
								res.redirect(`/profile`);
							}
						}
					);
				} else {
					req.flash(
						"success_msg",
						"Successfully updated your profile"
					);
					res.redirect(`/profile`);
				}
			}
		}
	);
};

// handle POST request for the search results
const getSearch = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM users WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const keyword = req.query.keyword;
	const pageSize = 12;
	const page = parseInt(req.query.page) || 1;

	const countSql =
		"SELECT COUNT(*) as count FROM restaurants WHERE name LIKE ? OR description LIKE ?";
	const countInserts = [`%${keyword}%`, `%${keyword}%`];
	const countQuery = mysql.format(countSql, countInserts);

	db.query(countQuery, (err, countResults) => {
		if (err) throw err;
		const totalCount = countResults[0].count;
		const totalPages = Math.ceil(totalCount / pageSize);
		const offset = (page - 1) * pageSize;

		const sql =
			"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.name LIKE ? OR restaurants.description LIKE ? GROUP BY restaurants.id LIMIT ?, ?";
		const inserts = [`%${keyword}%`, `%${keyword}%`, offset, pageSize];
		const query = mysql.format(sql, inserts);

		db.query(query, (err, results) => {
			if (err) throw err;

			const prevPageUrl =
				page > 1 ? `/search?keyword=${keyword}&page=${page - 1}` : null;
			const nextPageUrl =
				page < totalPages
					? `/search?keyword=${keyword}&page=${page + 1}`
					: null;
			res.render("Customer/search_results", {
				keyword,
				restaurants: results,
				mini_profile,
				prevPageUrl,
				nextPageUrl,
				currentPage: page,
				totalPages,
			});
		});
	});
};

const getLogout = (req, res) => {
	res.clearCookie("token");
	res.redirect("/login");
};

module.exports = {
	getLogin,
	postLogin,
	getRegister,
	postRegister,
	getCheckUsername,
	getCheckEmail,
	getCheckPhone,
	getHome,
	getRestaurants,
	getRestaurantsId,
	postRestaurantsReviews,
	postEditReviews,
	getProfile,
	getSearch,
	getLogout,
	postProfile,
};
