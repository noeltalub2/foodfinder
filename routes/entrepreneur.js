const express = require("express");
const router = express.Router();

const entrepreneurController = require("../controller/entrepreneur");
const { imageUpload, uploadImageShop } = require("../middleware/imageUpload");

const { forwardAuth, requireAuth } = require("../middleware/entrepreneurAuth");

router.get("/login", forwardAuth, entrepreneurController.getLogin);
router.post("/login", forwardAuth, entrepreneurController.postLogin);

router.get(
	"/check-username",
	forwardAuth,
	entrepreneurController.getCheckUsername
);
router.get("/check-email", forwardAuth, entrepreneurController.getCheckEmail);
router.get("/check-phone", forwardAuth, entrepreneurController.getCheckPhone);

router.get("/register", forwardAuth, entrepreneurController.getRegister);
router.post("/register", forwardAuth, entrepreneurController.postRegister);

router.get("/dashboard", requireAuth, entrepreneurController.getDashboard);
router.get("/shops", requireAuth, entrepreneurController.getShops);
router.get("/shops/:id", requireAuth, entrepreneurController.getShopsDetails);
router.get("/add_shops", requireAuth, entrepreneurController.getAddShops);
router.post(
	"/add_shops",
	requireAuth,
	uploadImageShop,
	entrepreneurController.postAddShops
);

router.get("/shops/edit/:id", requireAuth, entrepreneurController.getEditShops);
router.post(
	"/shops/edit/:id",
	requireAuth,
	uploadImageShop,
	entrepreneurController.postEditShops
);
router.delete(
	"/delete_image/",
	requireAuth,
	entrepreneurController.getDeleteImage
);router.delete(
	"/delete_shop/",
	requireAuth,
	entrepreneurController.getDeleteShop
);

router.get("/profile", requireAuth, entrepreneurController.getProfile);
router.post(
	"/profile",
	requireAuth,
	imageUpload.single("avatar"),
	entrepreneurController.postProfile
);

router.get("/search", requireAuth, entrepreneurController.getSearch);
router.get("/logout", requireAuth, entrepreneurController.getLogout);

module.exports = router;
