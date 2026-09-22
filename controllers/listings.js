const ExpressError = require("../utils/expressError.js");
const Listing = require("../models/listing");
const { transitionListingStatus } = require("../utils/verificationStateMachine");
const escapeRegex = require("../utils/escapeRegex.js");

module.exports.index = async (req, res) => {
    const search = (req.query.q || "").trim();
    const campus = req.query.campus ? String(req.query.campus).trim() : "";
    const verified = req.query.verified === "true";
    const escapedSearch = escapeRegex(search);

    const filters = [];

    if (search) {
        filters.push({
            $or: [
                { title: { $regex: escapedSearch, $options: "i" } },
                { location: { $regex: escapedSearch, $options: "i" } },
                { country: { $regex: escapedSearch, $options: "i" } },
                { description: { $regex: escapedSearch, $options: "i" } },
                { nearestCampus: { $regex: escapedSearch, $options: "i" } }
            ]
        });
    }

    if (campus) {
        filters.push({ nearestCampus: campus });
    }

    if (verified) {
        filters.push({ verificationStatus: "verified" });
    }

    const campusOptions = (await Listing.distinct("nearestCampus"))
        .filter(Boolean)
        .sort((first, second) => first.localeCompare(second));

    const allListings = await Listing.find(filters.length ? { $and: filters } : {});
    res.render("listings/index.ejs", {
        allListings,
        search,
        campus,
        verified,
        campusOptions
    });
};

module.exports.renderNewForm = (req, res) => {
    res.render("listings/new");
};

module.exports.show = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id)
        .populate({ path: "reviews", populate: { path: "author" } })
        .populate("owner");

    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    listing.reviews.sort((first, second) =>
        new Date(second.createdAt) - new Date(first.createdAt)
    );
    res.render("listings/show.ejs", { listing });
};

module.exports.renderEditForm = async (req, res) => {
    const listing = req.listing || await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }
    let origImage = listing.image.url;
    origImage = origImage.replace(
        "/upload",
        "/upload/c_limit,w_1200,q_auto:best,f_auto"
    );
    res.render("listings/edit.ejs", { listing, origImage });
};

module.exports.create = async (req, res) => {
    if (!req.body.listing) {
        throw new ExpressError(400, "Send valid data for listing");
    }
    const newListing = new Listing(req.body.listing);
    if (req.file) {
        newListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }
    newListing.owner = req.user._id;
    await newListing.save();
    req.flash("success", "New Listing Added");
    res.redirect("/listings");
};

module.exports.update = async (req, res) => {
    const { id } = req.params;
    const updatedListing = await Listing.findById(id);
    Object.assign(updatedListing, req.body.listing);
    if (req.file) {
        updatedListing.image = {
            url: req.file.path,
            filename: req.file.filename
        };
    }
    await updatedListing.save();
    res.redirect(`/listings/${id}`);
};

module.exports.destroy = async (req, res) => {
    const listing = req.listing || await Listing.findById(req.params.id);
    if (!listing) {
        throw new ExpressError(404, "Listing not found");
    }

    await Listing.findByIdAndDelete(listing._id);
    req.flash("error", `${listing.title} is deleted successfully`);
    res.redirect("/listings");
};


module.exports.requestVerification = async (req, res) => {
    try{
        await transitionListingStatus(req.params.id, "pending");
        req.flash("success", "Verification requested");
    } catch (err) {
        req.flash("error", err.message);
    }
    res.redirect(`/listings/${req.params.id}`);
    
};