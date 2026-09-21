const User = require("../models/user.js");
const Listing = require("../models/listing");
const Review = require("../models/review.js");

module.exports.renderSignupForm = (req, res) => {
    res.render("./users/signup.ejs");
};

module.exports.signup = async (req, res, next) => {
    try {
        const { name, email, username, dob, password } = req.body;
        const newUser = new User({ name, email, username, dob });
        await User.register(newUser, password);
        req.login(newUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", `${username} registered successfully`);
            res.redirect("/listings");
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
};
module.exports.showProfile = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    const listings = await Listing.find({ owner: id });
    const reviews = await Review.find({ author: id }).populate("listing");
    if (!user) {
        req.flash("error","User Not Found");
        return res.redirect("/listings");
    }   
                            
    res.render("users/showProfile.ejs", {user,listings,reviews});
}
module.exports.renderLoginForm = (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already logged in !");
        return res.redirect("/listings");
    }
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", `Welcome back ${req.body.username}`);
    res.redirect(res.locals.redirectUrl || "/listings");
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You logged out successfully");
        res.redirect("/listings");
    });
};


