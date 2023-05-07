const express = require("express");
const router = express.Router();

const adminController = require("../controller/admin");
// const {imageUpload} = require("../middleware/imageUpload");

const { forwardAuth, requireAuth } = require("../middleware/adminAuth");


router.get("/login", forwardAuth, adminController.getLogin);
router.post("/login", forwardAuth, adminController.postLogin);
router.get("/dashboard", requireAuth, adminController.getDashboard);

router.get("/users", requireAuth, adminController.getUsers);
router.get("/users/:username", requireAuth, adminController.getUsersView);
router.get("/user_data", requireAuth, adminController.getAllUsers);
router.delete("/user/delete", requireAuth, adminController.deleteUser);

router.get("/entrepreneurs", requireAuth, adminController.getEntrepreneurs);
router.get(
	"/entrepreneurs/:username",
	requireAuth,
	adminController.getEntrepreneursView
);
router.get(
	"/entrepreneur_data",
	requireAuth,
	adminController.getAllEntrepreneurs
);
router.delete(
	"/entrepreneur/delete",
	requireAuth,
	adminController.deleteEntrepreneur
);

router.get("/shops", requireAuth, adminController.getShops);
router.get("/shops/:id", requireAuth, adminController.getShopsView);
router.get("/shop_data", requireAuth, adminController.getAllShops);
router.delete("/shop/delete", requireAuth, adminController.deleteShop);

router.get("/reviews", requireAuth, adminController.getReviews);
router.get("/review_data", requireAuth, adminController.getAllReviews);
router.delete("/review/delete", requireAuth, adminController.deleteReview);

router.get("/logout", requireAuth, adminController.getLogout);

module.exports = router;
