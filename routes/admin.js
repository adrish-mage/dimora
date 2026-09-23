const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isAdmin } = require("../middleware");
const adminController = require("../controllers/admin.js");
const { doubleCsrfProtection } = require("../utils/csrf.js");

router.get("/verification", isLoggedIn, isAdmin, wrapAsync(adminController.verificationDesk));
router.get("/listings/pending", isLoggedIn, isAdmin, wrapAsync(adminController.pendingListings));
router.post("/listings/:id/approve", isLoggedIn, isAdmin, wrapAsync(adminController.approveListing));
router.post("/listings/:id/reject", isLoggedIn, isAdmin, wrapAsync(adminController.rejectListing));
router.get("/students/pending", isLoggedIn, isAdmin, wrapAsync(adminController.pendingStudentVerifications));
router.post("/students/:id/approve", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.approveStudentVerification));
router.post("/students/:id/needs-information", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.requestStudentVerificationInfo));
router.post("/students/:id/reject", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.rejectStudentVerification));
router.get("/hosts/pending", isLoggedIn, isAdmin, wrapAsync(adminController.pendingHosts));
router.post("/hosts/:id/approve", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.approveHost));
router.post("/hosts/:id/needs-information", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.requestHostInformation));
router.post("/hosts/:id/reject", isLoggedIn, isAdmin, doubleCsrfProtection, wrapAsync(adminController.rejectHost));

module.exports = router;