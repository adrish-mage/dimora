const express = require("express");
const router = express.Router({ mergeParams: true });
const wrapAsync = require('../utils/wrapAsync.js');

const multer = require('multer');
const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });

const { isLoggedIn, isApprovedHost, isOwner, validateListing } = require("../middleware.js");
const listingController = require("../controllers/listings.js");
const { doubleCsrfProtection } = require("../utils/csrf.js");

// Index Route
router.get("/", wrapAsync(listingController.index));

// New Route
router.get("/new", isLoggedIn, isApprovedHost, listingController.renderNewForm);

// Show Route
router.get("/:id", wrapAsync(listingController.show));

// Edit Route
router.get(
    "/:id/edit", 
    isLoggedIn,
    isApprovedHost,
    isOwner,
    wrapAsync(listingController.renderEditForm)
);

// Update Route
router.put(
    "/:id",
    isLoggedIn,
    isApprovedHost,
    isOwner,
    upload.single("listing[image]"),
    doubleCsrfProtection,
    validateListing,
    wrapAsync(listingController.update)
);

// Create Route
router.post(
    "/",
    isLoggedIn,
    isApprovedHost,
    upload.single("listing[image]"),
    doubleCsrfProtection,
    validateListing,
    wrapAsync(listingController.create)
);

// Delete Route
router.delete("/:id", isLoggedIn, isOwner, doubleCsrfProtection, wrapAsync(listingController.destroy));

// verification route 
router.post("/:id/request-verification", isLoggedIn, isOwner, doubleCsrfProtection,     wrapAsync(listingController.requestVerification));

module.exports = router;