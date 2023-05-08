const multer = require("multer");
const path = require("path");
const crypto = require('crypto');

const imageStorage = multer.diskStorage({
	// Destination to store image
	destination: "public/img/avatar/",
	filename: (req, file, cb) => {
		cb(null, Date.now() + path.extname(file.originalname));

		// path.extname get the uploaded file extension
	},
});
const imageUpload = multer({
	storage: imageStorage,
	limits: {
		fileSize: 5000000, // 5000000 Bytes = 5 MB
	},
	fileFilter(req, file, cb) {
		if (!file.originalname.match(/\.(png|jpg|jpeg)$/)) {
			// upload only png, jpg, and jpeg format
			return cb(new Error("Please upload a Image. Try again"));
		}
		cb(undefined, true);
	},
});

const upload = multer({
	storage: multer.diskStorage({
		destination: function (req, file, cb) {
			if (file.fieldname === "thumbnail") {
				cb(null, "public/img/thumbnail/");
			} else if (file.fieldname === "images") {
				cb(null, "public/img/shops/");
			} else if (file.fieldname === "location_image") {
				cb(null, "public/img/location/");
			}
		},
		filename: function (req, file, cb) {
			crypto.randomBytes(8, function (err, buf) {
				if (err) return cb(err);
				const uniqueSuffix = buf.toString("hex");
				const filename =
					Date.now() +
					"_" +
					uniqueSuffix +
					path.extname(file.originalname);
				cb(null, filename);
			});
		},
	}),
	fileFilter: function (req, file, cb) {
		if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
			return cb(new Error("Please upload a valid image file."));
		}
		cb(null, true);
	},
});

const uploadImageShop = upload.fields([
	{ name: "thumbnail" },
	{ name: "location_image" },
	{ name: "images", maxCount: 5 },
]);
module.exports = { imageUpload, uploadImageShop };
