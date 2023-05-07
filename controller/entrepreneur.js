const mysql = require("mysql2");
const bcrypt = require("bcrypt");
const fs = require("fs");
const { createTokensEntrepreneur } = require("../utils/token");

const db = require("../db/db");
const { imagesUpload } = require("../middleware/imageUpload");

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
	res.render("Entrepreneur/login");
};

const postLogin = (req, res) => {
	try {
		const { username, password } = req.body;
		const findUser = "SELECT * from entrepreneur WHERE username = ?";

		db.query(findUser, [username], async (err, result) => {
			if (err) {
				res.redirect("/seller/login");
			} else {
				if (result.length > 0) {
					const match_password = await bcrypt.compare(
						password,
						result[0].password
					);
					if (match_password) {
						const generateToken = createTokensEntrepreneur(
							result[0].username
						);

						res.cookie("token", generateToken, { httpOnly: true });
						req.flash("success_msg", "Successfully logged in");
						res.redirect("/seller/dashboard");
					} else {
						req.flash(
							"error_msg",
							"Incorrect username or password"
						);
						res.redirect("/seller/login");
					}
				} else {
					req.flash("error_msg", "Could'nt find your account");
					res.redirect("/seller/login");
				}
			}
		});
	} catch {
		throw err;
	}
};

const getRegister = (req, res) => {
	res.render("Entrepreneur/register");
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
		  ) AS combined_results`,
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
		  ) AS combined_results`,
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
	};
	//Add account to database
	var sql = "INSERT INTO entrepreneur SET ?";
	db.query(sql, data, (err, rset) => {
		if (err) {
			throw err;
		} else {
			req.flash("success_msg", "Successfully created your account");
			res.redirect(`/seller/login`);
		}
	});
};
// render the home page
const getDashboard = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;

	const entrepreneur_id = res.locals.id;
	const most_rated_shop = await queryParam(
		"SELECT restaurants.name, AVG(reviews.rating) AS avg_rating FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) GROUP BY restaurants.id ORDER BY avg_rating DESC LIMIT 1",
		[entrepreneur_id]
	);

	const least_rated_shop = await queryParam(
		"SELECT restaurants.name, AVG(reviews.rating) AS avg_rating FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) GROUP BY restaurants.id ORDER BY avg_rating ASC LIMIT 1",
		[entrepreneur_id]
	);

	const recent_review = (
		await queryParam(
			"SELECT reviews.*, users.username FROM ( SELECT restaurant_id, MAX(date) AS max_date FROM reviews WHERE restaurant_id IN ( SELECT id FROM restaurants WHERE entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) ) GROUP BY restaurant_id ) AS latest_reviews INNER JOIN reviews ON reviews.restaurant_id = latest_reviews.restaurant_id AND reviews.date = latest_reviews.max_date INNER JOIN users ON reviews.customer_id = users.id ORDER BY `reviews`.`date` DESC",
			[entrepreneur_id]
		)
	)[0];

	// Query to get the restaurants owned by the entrepreneur
	db.query(
		"SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count FROM restaurants LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) GROUP BY restaurants.id ORDER BY (AVG(reviews.rating) * LOG10(COUNT(reviews.id) + 1)) DESC LIMIT 4",
		[entrepreneur_id],
		(err, restaurantRows) => {
			if (err) {
				throw err;
			}

			// Query to get the overall rating, reviews count, and recent comments for the entrepreneur's shops
			db.query(
				`SELECT AVG(avg_rating) AS overall_rating, SUM(reviews_count) AS reviews_count
				FROM (
				  SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count
				  FROM restaurants
				  LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id
				  WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?)
				  GROUP BY restaurants.id
				) AS ratings
				`,
				[entrepreneur_id],
				(err, overallRows) => {
					if (err) {
						throw err;
					}

					const overallRating = overallRows[0].overall_rating;
					const reviewsCount = overallRows[0].reviews_count;

					res.render("Entrepreneur/dashboard", {
						overallRating: overallRating,
						reviewsCount: reviewsCount,
						review: recent_review,
						restaurants: restaurantRows,
						least_rated_shop,
						most_rated_shop,
						mini_profile,
					});
				}
			);
		}
	);
};

const getShops = async (req, res) => {
	// Get the owner ID of the logged in user
	const ownerID = (
		await queryParam("SELECT id FROM entrepreneur WHERE username = ?", [
			res.locals.id,
		])
	)[0].id;

	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;

	const page = req.query.page || 1;
	const limit = 12;
	const sortField = req.query.sortField || "name"; // default sort field
	const sortOrder = req.query.sortOrder || "asc"; // default sort order
	const countQuery =
		"SELECT COUNT(*) as count FROM restaurants WHERE entrepreneur_id = ?";
	const totalPagesPromise = new Promise((resolve, reject) => {
		db.query(countQuery, [ownerID], (err, results) => {
			if (err) reject(err);
			const count = results[0].count;
			const totalPages = Math.ceil(count / limit);
			resolve(totalPages);
		});
	});
	totalPagesPromise
		.then((totalPages) => {
			if (page > totalPages) {
				res.render("Entrepreneur/page_not_found", { mini_profile });
			} else {
				const offset = (page - 1) * limit;

				// Fetch only the restaurants owned by the logged in user
				const selectQuery = `SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count
			FROM restaurants 
			LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id 
			WHERE restaurants.entrepreneur_id = ?
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
					db.query(
						selectQuery,
						[ownerID, limit, offset],
						(err, results) => {
							if (err) reject(err);
							resolve(results);
						}
					);
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
						res.render("Entrepreneur/shops", {
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

const getAddShops = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	res.render("Entrepreneur/add_shops", { mini_profile });
};

const getShopsDetails = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const id = req.params.id;
	const entrepreneur_id = res.locals.id;
	const entrepreneur_details = (
		await queryParam(
			"SELECT email,phone_number FROM entrepreneur WHERE username = ?",
			[entrepreneur_id]
		)
	)[0];

	db.query("SELECT * FROM restaurants WHERE id = ?", [id], (err, rows) => {
		if (err) throw err;

		db.query(
			"SELECT users.username, users.name, users.profile_picture, reviews.title, reviews.rating, reviews.comment, reviews.date,reviews.modified_date, (SELECT COUNT(reviews.customer_id) FROM reviews WHERE reviews.customer_id = users.id) AS review_count FROM reviews JOIN users ON reviews.customer_id = users.id WHERE restaurant_id = ? GROUP BY reviews.id ORDER BY `reviews`.`date` DESC",
			[id],
			(err, reviewsAndUsers) => {
				if (err) throw err;

				const page = req.query.page || 1;
				const limit = 10;
				const totalPages = Math.ceil(reviewsAndUsers.length / limit);

				const currentPage = parseInt(page);
				const prevPage = currentPage > 1 ? currentPage - 1 : null;
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

						res.render("Entrepreneur/shop_details", {
							restaurant: rows[0],
							reviews: paginatedReviews,
							entrepreneur_details,
							images: result,
							currentPage,
							totalPages,
							prevPage,
							nextPage,
							mini_profile,
						});
					}
				);
			}
		);
	});
};

const postAddShops = async (req, res) => {
	const date = new Date().toISOString();
	try {
		const entrepreneur_id = (
			await queryParam("SELECT id FROM entrepreneur WHERE username = ?", [
				res.locals.id,
			])
		)[0].id;

		// Extract the form data from the request body
		const { name, description, location } = req.body;

		// Get the path to the uploaded thumbnail image
		const thumbnail = req.files["thumbnail"][0].filename;
		const location_image = req.files["location_image"][0].filename;

		// Get the paths to the uploaded images
		const images = req.files["images"].map((file) => file.filename);

		// Insert the restaurant data into the restaurants table
		db.query(
			"INSERT INTO restaurants (entrepreneur_id, name, description, location, thumbnail_path,location_image,created_at) VALUES (?, ?, ?, ?, ?,?,?)",
			[
				entrepreneur_id,
				name,
				description,
				location,
				thumbnail,
				location_image,
				date,
			],
			(err, result) => {
				if (err) {
					console.log(err);
					req.flash("error_msg", "Failed to add shops");
					res.redirect("/seller/shops");
				}

				const shop_id = result.insertId;

				// Insert the image data into the images table
				for (const image of images) {
					db.query(
						"INSERT INTO images (shop_id, image_path) VALUES (?, ?)",
						[shop_id, image],
						(err) => {
							if (err) {
								console.log(err);
								req.flash("error_msg", "Failed to add shops");
								res.redirect("/seller/shops");
							}
						}
					);
				}

				req.flash("success_msg", "Successfully created shops");
				res.redirect("/seller/shops");
			}
		);
	} catch (err) {
		console.log(err);
		res.status(500).send({ error: "An error occurred." });
	}
};

const getEditShops = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const id = req.params.id;
	const restaurant = (
		await queryParam("SELECT * FROM restaurants WHERE id = ?", [id])
	)[0];
	const images = await queryParam("SELECT * FROM images WHERE shop_id = ?", [
		id,
	]);

	res.render("Entrepreneur/edit_shops", { restaurant, images, mini_profile });
};
const postEditShops = async (req, res) => {
	try {
		const id = req.params.id;

		// Extract the form data from the request body
		const { name, description, location } = req.body;

		// Update the restaurant data in the restaurants table
		db.query(
			"UPDATE restaurants SET name = ?, description = ?, location = ? WHERE id = ?",
			[name, description, location, id],
			(err, result) => {
				if (err) {
					console.log(err);
					req.flash("error_msg", "Failed to add shops");
					res.redirect(`/seller/shops/${id}`);
				}

				if (req.files && req.files.thumbnail) {
					// Get the path to the uploaded thumbnail image
					const thumbnail = req.files["thumbnail"][0].filename;

					// Update the thumbnail path in the restaurants table
					db.query(
						"UPDATE restaurants SET thumbnail_path = ? WHERE id = ?",
						[thumbnail, id],
						(err, result) => {
							if (err) {
								req.flash("error_msg", "Failed to add shops");
								res.redirect(`/seller/shops/${id}`);
							}
						}
					);
				}
				if (req.files && req.files.location_image) {
					// Get the path to the uploaded location image
					const location_image =
						req.files["location_image"][0].filename;

					// Update the location image in the restaurants table
					db.query(
						"UPDATE restaurants SET location_image = ? WHERE id = ?",
						[location_image, id],
						(err, result) => {
							if (err) {
								req.flash("error_msg", "Failed to add shops");
								res.redirect(`/seller/shops/${id}`);
							}
						}
					);
				}

				if (req.files && req.files.images) {
					// Get the paths to the uploaded images
					const images = req.files["images"].map(
						(file) => file.filename
					);

					// Insert the image data into the images table
					for (const image of images) {
						db.query(
							"INSERT INTO images (shop_id, image_path) VALUES (?, ?)",
							[id, image],
							(err) => {
								if (err) {
									console.log(err);
									req.flash(
										"error_msg",
										"Failed to add shops"
									);
									res.redirect(`/seller/shops/${id}`);
								}
							}
						);
					}
				}

				req.flash("success_msg", "Successfully edited shops");
				res.redirect(`/seller/shops/${id}`);
			}
		);
	} catch (err) {
		console.log(err);
		res.status(500).send({ error: "An error occurred." });
	}
};

const getProfile = async (req, res) => {
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const entrepreneur_id = res.locals.id;
	const total_shop = (
		await queryParam(
			"SELECT COUNT(*) as 'count' FROM `restaurants` WHERE entrepreneur_id = (SELECT entrepreneur_id FROM entrepreneur WHERE username = ?)",
			[entrepreneur_id]
		)
	)[0].count;

	db.query(
		"SELECT * FROM entrepreneur WHERE username = ?",
		[entrepreneur_id],
		(err, result) => {
			if (err) throw err;
			db.query(
				`SELECT AVG(avg_rating) AS overall_rating, SUM(reviews_count) AS reviews_count
			FROM (
			  SELECT restaurants.*, AVG(reviews.rating) AS avg_rating, COUNT(reviews.id) AS reviews_count
			  FROM restaurants
			  LEFT JOIN reviews ON restaurants.id = reviews.restaurant_id
			  WHERE restaurants.entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?)
			  GROUP BY restaurants.id
			) AS ratings`,
				[entrepreneur_id],
				(err, overallRows) => {
					if (err) throw err;
					const overallRating = overallRows[0].overall_rating;
					const reviewsCount = overallRows[0].reviews_count;
					res.render("Entrepreneur/profile", {
						user: result[0],
						total_shop,
						avg_rating: overallRating,
						total_review: reviewsCount,
						mini_profile,
					});
				}
			);
		}
	);
};

const postProfile = (req, res) => {
	const username = res.locals.id;
	const { name, location, bio, profile_picture, phone, email } = req.body;

	const avatar = req.file ? req.file.filename : null; // set avatar to null if req.file is empty

	db.query(
		"UPDATE entrepreneur SET name = ?, location = ?, bio = ?,phone_number = ?, email = ?, updated_at = current_timestamp() WHERE username = ?",
		[name, location, bio, phone, email, username],
		(err, rset) => {
			if (err) {
				console.log(err);
				req.flash(
					"error_msg",
					"Failed to update your profile phonenumber or email was already registered"
				);
				res.redirect(`/seller/profile`);
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
						"UPDATE entrepreneur SET profile_picture = ? WHERE username = ?",
						[avatar, username],
						(err, rset) => {
							if (err) {
								console.log(err);
								req.flash(
									"error_msg",
									"Failed to update your profile"
								);
								res.redirect(`/seller/profile`);
							} else {
								req.flash(
									"success_msg",
									"Successfully updated your profile"
								);
								res.redirect(`/seller/profile`);
							}
						}
					);
				} else {
					req.flash(
						"success_msg",
						"Successfully updated your profile"
					);
					res.redirect(`/seller/profile`);
				}
			}
		}
	);
};

const getDeleteImage = (req, res) => {
	const imageId = req.body.data;
	console.log(imageId);
	// Get the image record from the database
	db.query("SELECT * FROM images WHERE id = ?", [imageId], (err, result) => {
		if (err) {
			console.log(err);
			return res.status(500).json({ status: "error" });
		}

		if (result.length === 0) {
			// If the image record does not exist, redirect back to the edit shop page
			return res.status(500).json({ status: "error" });
		}

		const image = result[0];

		// Delete the image record from the database
		db.query(
			"DELETE FROM images WHERE id = ?",
			[imageId],
			(err, result) => {
				if (err) {
					console.log(err);
					return res.status(500).json({ status: "error" });
				}

				// Delete the image file from the folder
				fs.unlink(`public/img/shops/${image.image_path}`, (err) => {
					if (err) {
						console.log(err);
						return res.status(500).json({ status: "error" });
					}

					return res.status(200).json({ status: "success" });
				});
			}
		);
	});
};

const getDeleteShop = (req, res) => {
	const shopId = req.body.data;

	db.query(
		"SELECT images.image_path, restaurants.location_image,restaurants.thumbnail_path FROM images INNER JOIN restaurants ON restaurants.id = images.shop_id INNER JOIN entrepreneur ON entrepreneur.id = restaurants.entrepreneur_id WHERE shop_id = ?",
		[shopId],
		(err, results) => {
			if (err) {
				console.log(err);
				return res.status(500).json({ status: "error" });
			}

			const imagePaths = results.map((result) => result.image_path);
			const thumbnailPath = results.map(
				(result) => result.thumbnail_path
			);
			const locationPath = results.map((result) => result.location_image);

			imagePaths.forEach((imagePath) => {
				fs.unlink(`public/img/shops/${imagePath}`, (err) => {
					if (err && err.code !== "ENOENT") {
						console.log(err);
						return res.status(500).json({ status: "error" });
					}
				});
			});

			fs.unlink(`public/img/thumbnail/${thumbnailPath[0]}`, (err) => {
				if (err && err.code !== "ENOENT") {
					console.log(err);
					return res.status(500).json({ status: "error" });
				}
			});

			fs.unlink(`public/img/location/${locationPath[0]}`, (err) => {
				if (err && err.code !== "ENOENT") {
					console.log(err);
					return res.status(500).json({ status: "error" });
				}
			});

			db.query(
				"DELETE FROM images WHERE shop_id = ?",
				[shopId],
				(err, result) => {
					if (err) {
						console.log(err);
						return res.status(500).json({ status: "error" });
					}

					db.query(
						"DELETE FROM reviews WHERE restaurant_id = ?",
						[shopId],
						(err, result) => {
							if (err) {
								console.log(err);
								return res
									.status(500)
									.json({ status: "error" });
							}

							db.query(
								"DELETE FROM restaurants WHERE id = ?",
								[shopId],
								(err, result) => {
									if (err) {
										console.log(err);
										return res
											.status(500)
											.json({ status: "error" });
									}

									if (result.affectedRows === 0) {
										return res
											.status(500)
											.json({ status: "error" });
									} else {
										return res
											.status(200)
											.json({ status: "success" });
									}
								}
							);
						}
					);
				}
			);
		}
	);
};
// handle POST request for the search results
const getSearch = async (req, res) => {
	const username = res.locals.id;
	const mini_profile = (
		await queryParam(
			"SELECT profile_picture FROM entrepreneur WHERE username = ?",
			[res.locals.id]
		)
	)[0].profile_picture;
	const keyword = req.query.keyword;
	const pageSize = 12;
	const page = parseInt(req.query.page) || 1;

	const countSql =
		"SELECT COUNT(*) as count FROM restaurants WHERE (name LIKE ? OR description LIKE ?) AND entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?)";
	const countInserts = [`%${keyword}%`, `%${keyword}%`, username];
	const countQuery = mysql.format(countSql, countInserts);

	db.query(countQuery, (err, countResults) => {
		if (err) throw err;
		const totalCount = countResults[0].count;
		const totalPages = Math.ceil(totalCount / pageSize);
		const offset = (page - 1) * pageSize;

		const sql =
			"SELECT * FROM restaurants WHERE (name LIKE ? OR description LIKE ?) AND entrepreneur_id = (SELECT id FROM entrepreneur WHERE username = ?) LIMIT ?, ?";
		const inserts = [
			`%${keyword}%`,
			`%${keyword}%`,
			username,
			offset,
			pageSize,
		];
		const query = mysql.format(sql, inserts);

		db.query(query, (err, results) => {
			if (err) throw err;

			const prevPageUrl =
				page > 1
					? `/seller/search?keyword=${keyword}&page=${page - 1}`
					: null;
			const nextPageUrl =
				page < totalPages
					? `/seller/search?keyword=${keyword}&page=${page + 1}`
					: null;
			res.render("Entrepreneur/search_results", {
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
	res.redirect("/seller/login");
};

module.exports = {
	getLogin,
	postLogin,
	getRegister,
	getCheckUsername,
	getCheckEmail,
	getCheckPhone,
	postRegister,
	getDashboard,
	getShops,
	getAddShops,
	postAddShops,
	getShopsDetails,
	getEditShops,
	postEditShops,
	getProfile,
	postProfile,
	getDeleteImage,
	getDeleteShop,
	getSearch,
	getLogout,
};
