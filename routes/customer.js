const express = require("express");
const router = express.Router();

const customerController = require("../controller/customer");
const {imageUpload} = require("../middleware/imageUpload");

const { forwardAuth, requireAuth } = require("../middleware/customerAuth");

router.get("/login", forwardAuth, customerController.getLogin);
router.post("/login", forwardAuth, customerController.postLogin);

router.get("/check-username", forwardAuth, customerController.getCheckUsername);
router.get("/check-email", forwardAuth, customerController.getCheckEmail);
router.get("/check-phone", forwardAuth, customerController.getCheckPhone);

router.get("/register", forwardAuth, customerController.getRegister);
router.post("/register", forwardAuth, customerController.postRegister);

router.get("/home", requireAuth, customerController.getHome);

router.get("/restaurants", requireAuth, customerController.getRestaurants);
router.get(
	"/restaurants/:id",
	requireAuth,
	customerController.getRestaurantsId
);
router.post(
	"/restaurants/:id/reviews",
	requireAuth,
	customerController.postRestaurantsReviews
);
router.post(
	"/restaurants/:id/edit-review",
	requireAuth,
	customerController.postEditReviews
);

router.get("/profile", requireAuth, customerController.getProfile);
router.post(
	"/profile",
	requireAuth,
	imageUpload.single("avatar"),
	customerController.postProfile
);

router.get("/search", requireAuth, customerController.getSearch);

router.get("/logout", requireAuth, customerController.getLogout);

module.exports = router;
