const { verify } = require("jsonwebtoken");
const db = require("../db/db")

const queryId = async (id) => {
	try {
		return (await db.promise().query("SELECT * FROM admin WHERE username = ?", [id]))[0];
	} catch (err) {
		throw err;
	}
};
const requireAuth = async (req, res, next) => {
	const token = req.cookies.token;
	if (token) {
		verify(token, process.env.JWT_SECRET_KEY, async (err, rset) => {
			if (err) res.redirect("/unauthorized");
			else {0 === (await queryId(rset.username)).length ?
				res.redirect("/unauthorized") : ((res.locals.id = rset.username), next());
			}
		});
	} else res.redirect("/unauthorized");
};

const forwardAuth = async (req, res, next) => {
	const token = req.cookies.token;
	if (token) {
		verify(token, process.env.JWT_SECRET_KEY, async (err, rset) => {
			if (err) next();
			else { 0 === (await queryId(rset.username)).length ? 
				next() : ((res.locals.id = rset.username), res.redirect("/admin/dashboard"));
			}
		});
	} else next();
};

module.exports = { requireAuth, forwardAuth };
