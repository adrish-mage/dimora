const express = require("express");
const router = express.Router({ mergeParams: true });
const passport = require("passport");
const multer = require("multer");
const { rateLimit } = require("express-rate-limit");

const { storage } = require("../cloudConfig.js");
const upload = multer({ storage });
const { isLoggedIn, saveRedirectUrl } = require("../middleware");
const userController = require("../controllers/user.js");
const { doubleCsrfProtection } = require("../utils/csrf.js");
const wrapAsync = require("../utils/wrapAsync.js");

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 10,
    handler: (req, res) => {
        req.flash("error", "Too many authentication attempts. Please try again later.");
        res.redirect(req.path);
    }
});

router.get("/signup", userController.renderSignupForm);
router.post("/signup", authLimiter, doubleCsrfProtection, userController.signup);
router.get("/login", userController.renderLoginForm);
router.post(
    "/login",
    authLimiter,
    saveRedirectUrl,
    doubleCsrfProtection,
    passport.authenticate("local", { failureRedirect: "/login", failureFlash: true }),
    userController.login
);
router.get("/logout", userController.logout);
router.get("/users/:id", wrapAsync(userController.showProfile));
router.get("/verify/student", isLoggedIn, userController.renderStudentVerificationForm);
router.post("/verify/student", isLoggedIn, upload.array("verificationDocs", 3), doubleCsrfProtection, wrapAsync(userController.submitStudentVerification));
router.get("/host/apply", isLoggedIn, userController.renderHostApplication);
router.post("/host/apply", isLoggedIn, upload.array("hostDocuments", 3), doubleCsrfProtection, wrapAsync(userController.submitHostApplication));

module.exports = router;
