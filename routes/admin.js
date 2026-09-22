const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");

router.get("/listings/pending", isLoggedIn, isAdmin, wrapAsync(adminController.pendingListings));
router.post("/listings/:id/approve", isLoggedIn, isAdmin, wrapAsync(adminController.approveListing));
router.post("/listings/:id/reject", isLoggedIn, isAdmin, wrapAsync(adminController.rejectListing));

module.exports = router;