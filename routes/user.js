const express = require("express");
const router = express.Router({ mergeParams: true });
const passport = require("passport");
const { rateLimit } = require("express-rate-limit");

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

module.exports = router;
