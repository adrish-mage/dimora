const { transitionListingStatus } = require("../utils/verificationStateMachine");
const Listing = require("../models/listing");

module.exports.pendingListings = async (req, res) => {
    const pending = await Listing.find({ verificationStatus: "pending" }).populate("owner");
    res.render("admin/pending.ejs", { pending });
};
module.exports.approveListing = async (req, res) => {
    try {
        await transitionListingStatus(req.params.id, "verified");
        req.flash("success", "Listing verified");
    } catch (err) {
        req.flash("error", err.message);
    }
    res.redirect("/admin/listings/pending");
};

module.exports.rejectListing = async (req, res) => {
    try {
        await transitionListingStatus(req.params.id, "unverified");
        req.flash("success", "Listing rejected");
    } catch (err) {
        req.flash("error", err.message);
    }
    res.redirect("/admin/listings/pending");
};