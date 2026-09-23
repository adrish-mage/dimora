const Listing = require("./models/listing");
const ExpressError = require("./utils/expressError.js");
const { ListingSchema, ReviewSchema } = require("./schemaValidator.js");

module.exports.isLoggedIn = (req, res, next) => {
    if (!req.isAuthenticated()) {
        req.session.redirectUrl = req.originalUrl;
        let errorMessage = "You must be logged in to perform this action";
        if(req.originalUrl === "/listings/new"){
            errorMessage = "You must be logged in to add a new listing !";
        }
        if (req.originalUrl.includes("/reviews")) {
            errorMessage = "You must be logged in to leave a review!";
        }
        if (req.originalUrl.includes("/reviews")) {
            errorMessage = "You must be logged in to leave a review!";
        }
        req.flash("error", errorMessage);
        return res.redirect("/login");
    }
    next();
}

module.exports.isApprovedHost = (req, res, next) => {
    if (!res.locals.CurrUser || !res.locals.CurrUser.isVerifiedHost) {
        req.flash("error", "Apply to become an approved host before adding a listing.");
        return res.redirect("/host/apply");
    }
    next();
}

module.exports.isStudentVerified = (req, res, next) => {
    const user = res.locals.CurrUser;
    const hasActiveVerification = user && user.verificationStatus === "verified" &&
        (!user.verificationExpiresAt || new Date(user.verificationExpiresAt) > new Date());

    if (!hasActiveVerification) {
        req.flash("error", "Verify your student status before continuing.");
        return res.redirect("/verify/student");
    }
    next();
}

module.exports.saveRedirectUrl = (req, res, next) => {
    if (req.session.redirectUrl) {
        res.locals.redirectUrl = req.session.redirectUrl;
    }
    next();
}
module.exports.isOwner = async (req, res, next) => {
    let { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    if (!listing.owner || !listing.owner.equals(res.locals.CurrUser._id)) {
        req.flash("error", "You are not the owner of this listing");
        return res.redirect(`/listings/${id}`);
    }
    req.listing = listing;
    next();
}
module.exports.isAdmin = async (req,res,next) => {
    if(!res.locals.CurrUser || res.locals.CurrUser.role !== "admin"){
        req.flash("error","You dont have permission to do that");
        return res.redirect(`/listings`);
    }
    next();
}
module.exports.validateListing = (req, res, next) => {
    const listingData = { ...req.body };
    delete listingData._csrf;
    const { error } = ListingSchema.validate(listingData);

    if (error) {
        throw new ExpressError(400, error.details[0].message);
    } else {
        next();
    }
};
module.exports.validateReview = ((req, res, next) => {
    const reviewData = { ...req.body };
    delete reviewData._csrf;
    const { error } = ReviewSchema.validate(reviewData);
    if (error) {
        let errMsg = error.details.map((el) => el.message).join(",");
        throw new ExpressError(400, errMsg);
    } else {
        next();
    }
})
