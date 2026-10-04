const Listing = require("../models/listing.js");
const Review = require("../models/review.js");
const Booking = require("../models/booking.js");

module.exports.create = async (req, res) => {
    const { id } = req.params;
    const listing = await Listing.findById(id);
    if (!listing) {
        req.flash("error", "Room not found.");
        return res.redirect("/listings");
    }

    const reviewInput = req.body.review;
    const booking = await Booking.findOne({
        _id: reviewInput.booking,
        listing: listing._id,
        guest: req.user._id,
        status: "completed"
    });
    if (!booking) {
        req.flash("error", "A review is available only after your lease is completed.");
        return res.redirect(`/listings/${listing._id}`);
    }

    if (await Review.exists({ booking: booking._id })) {
        req.flash("error", "You have already reviewed this lease.");
        return res.redirect(`/listings/${listing._id}`);
    }

    const newReview = new Review({
        comment: reviewInput.comment,
        rating: reviewInput.rating,
        author: req.user._id,
        listing: listing._id,
        booking: booking._id
    });
    listing.reviews.push(newReview);

    try {
        await newReview.save();
    } catch (error) {
        if (error.code !== 11000) {
            throw error;
        }
        req.flash("error", "You have already reviewed this lease.");
        return res.redirect(`/listings/${listing._id}`);
    }
    await listing.save();
    res.redirect(`/listings/${listing._id}`);
};

module.exports.destroy = async (req, res) => {
    const { id, reviewId } = req.params;
    await Review.findByIdAndDelete(reviewId);
    await Listing.findByIdAndUpdate(id, { $pull: { reviews: reviewId } });
    res.redirect(`/listings/${id}`);
};
