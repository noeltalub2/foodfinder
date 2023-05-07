const express = require("express");
const cookieParser = require("cookie-parser");
const flash = require("connect-flash");
const cookieSession = require("cookie-session");
const path = require("path");

const dotenv = require("dotenv");
dotenv.config();

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
//

//Database
const db = require("./db/db.js");
db.getConnection((err, connection) => {
	if (err) throw err;
	console.log("Database connected successfully");
	connection.release();
});

//Routes
const customer = require("./routes/customer");
const entrepreneur = require("./routes/entrepreneur");
const admin = require("./routes/admin");

const index = require("./routes/index");
//

app.use(
	cookieSession({
		name: "session",
		keys: [process.env.SESSION_SECRET],
		cookie: {
			secure: true,
			httpOnly: true,
		},
	})
);

app.use(flash());

// Global variables
app.use((req, res, next) => {
	res.locals.success_msg = req.flash("success_msg");
	res.locals.error_msg = req.flash("error_msg");
	res.locals.error = req.flash("error");
	next();
});

//Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use("/", customer);
app.use("/seller", entrepreneur);
app.use("/admin", admin);

app.use("/", index);

// Home Page
app.use(index);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
	console.log(`Server is running at http://localhost:${PORT}`);
});
