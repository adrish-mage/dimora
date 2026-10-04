const mongoose = require("mongoose");
const Listing = require("../models/listing");
const Booking = require("../models/booking.js");
const Review = require("../models/review.js");
const { getDays } = require("../utils/durationOfStay");
const proration = require("../utils/proration");
const {
    canTransitionBooking,
    createDateOverlapQuery,
    normalizeBookingStatus
} = require("../utils/bookingRules");

const activeBookingRequests = new Map();

function waitForConcurrentBookingRequests(listingId) {
    const key = String(listingId);
    let group = activeBookingRequests.get(key);
    if (!group) {
        group = { active: 0, waiters: [] };
        activeBookingRequests.set(key, group);
    }
    group.active++;

    let releasePromise;
    return () => {
        if (!releasePromise) {
            releasePromise = new Promise(resolve => {
                group.active--;
                group.waiters.push(resolve);
                if (group.active === 0) {
                    activeBookingRequests.delete(key);
                    group.waiters.splice(0).forEach(release => release());
                }
            });
        }
        return releasePromise;
    };
}

function parseUtcMidnight(dateValue) {
    const match = typeof dateValue === "string" && /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateValue);
    if (!match) {
        return new Date(NaN);
    }

    const [, year, month, day] = match.map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(0, 0, 0, 0);

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
        return new Date(NaN);
    }

    return date;
}

module.exports.requestBooking = async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    res.render("booking/bookingForm.ejs", { listing });
};

module.exports.sendBooking = async (req, res) => {
    const listing = await Listing.findById(req.params.id);
    if (!listing) {
        req.flash("error", "Room not found.");
        return res.redirect("/listings");
    }

    const {
        checkIn,
        checkOut,
        guests,
        message
    } = req.body.booking || {};

    const checkInDate = parseUtcMidnight(checkIn);
    const checkOutDate = parseUtcMidnight(checkOut);
    const days = getDays(checkInDate, checkOutDate);
    const guestCount = Number(guests);

    if (checkInDate <= new Date() || !Number.isFinite(days) || days <= 0 || !Number.isInteger(days) || !Number.isInteger(guestCount) || guestCount < 1) {
        req.flash("error", "Choose valid lease dates and at least one guest.");
        return res.redirect(`/booking/${listing._id}/request-booking`);
    }

    if (listing.owner && String(listing.owner) === String(req.user._id)) {
        req.flash("error", "You cannot book your own listing.");
        return res.redirect(`/listings/${listing._id}`);
    }

    const waitForConcurrentRequests = waitForConcurrentBookingRequests(listing._id);
    try {
        const overlapQuery = createDateOverlapQuery(listing._id, checkInDate, checkOutDate);
        const conflictingBooking = await Booking.exists(overlapQuery);
        if (conflictingBooking) {
            req.flash("error", "dates unavailable");
            return res.redirect(`/booking/${listing._id}/request-booking`);
        }

        const cleaningFee = Number(listing.cleaningFee) || 0;
        const serviceFee = Number(listing.serviceFee) || 0;
        const basePrice = proration(Number(listing.price), checkInDate, checkOutDate).total;
        const totalPrice = basePrice + cleaningFee + serviceFee;

        const booking = new Booking({
            listing: listing._id,
            guest: req.user._id,
            checkIn: checkInDate,
            checkOut: checkOutDate,
            guests: guestCount,
            message,
            days,
            basePrice,
            cleaningFee,
            serviceFee,
            totalPrice,
            status: "pending"
        });

        let lostRace = false;
        const session = await mongoose.startSession();
        try {
            await session.withTransaction(async () => {
                await Listing.updateOne(
                    { _id: listing._id },
                    { $inc: { bookingWriteVersion: 1 } },
                    { session }
                );

                await booking.save({ session });

                const raceQuery = createDateOverlapQuery(
                    listing._id,
                    checkInDate,
                    checkOutDate,
                    booking._id
                );
                const racedBooking = await Booking.findOne(raceQuery)
                    .sort({ _id: 1 })
                    .session(session);

                if (racedBooking && String(racedBooking._id) < String(booking._id)) {
                    await Booking.deleteOne({ _id: booking._id }, { session });
                    lostRace = true;
                    return;
                }

                if (racedBooking) {
                    await Booking.deleteMany({
                        ...raceQuery,
                        _id: { $gt: booking._id }
                    }, { session });
                }
            });
        } finally {
            await session.endSession();
        }

        await waitForConcurrentRequests();
        const bookingStillExists = !lostRace && await Booking.exists({ _id: booking._id });
        if (!bookingStillExists) {
            req.flash("error", "dates unavailable");
            return res.redirect(`/booking/${listing._id}/request-booking`);
        }

        req.flash("success", "Your booking request has been sent to the host.");
        return res.redirect(`/listings/${listing._id}`);
    } finally {
        await waitForConcurrentRequests();
    }
};

module.exports.viewBooking = async (req, res) => {
    const listing = await Listing.findById(req.params.id);

    if (!listing) {
        req.flash("error", "Listing not found.");
        return res.redirect("/listings");
    }

    if (!listing.owner.equals(req.user._id)) {
        req.flash("error", "You do not have access to these bookings.");
        return res.redirect("/listings");
    }

    const bookings = await Booking.find({
        listing: listing._id
    }).populate("guest");

    res.render("booking/hostBookings.ejs", {
        listing,
        bookings
    });
};

module.exports.viewAllBookings = async (req, res) => {
    const listings = await Listing.find({ owner: req.user._id }).select("_id");
    const bookings = await Booking.find({
        listing: { $in: listings.map(listing => listing._id) }
    })
        .populate("guest")
        .populate("listing")
        .sort({ createdAt: -1 });

    res.render("booking/hostBookings.ejs", {
        listing: null,
        bookings
    });
};

module.exports.viewMyLeases = async (req, res) => {
    const bookings = await Booking.find({ guest: req.user._id })
        .populate("listing")
        .sort({ createdAt: -1 });
    const completedBookingIds = bookings
        .filter(booking => booking.status === "completed")
        .map(booking => booking._id);
    const reviews = completedBookingIds.length
        ? await Review.find({ booking: { $in: completedBookingIds } }).select("booking").lean()
        : [];

    res.render("booking/guestLeases.ejs", {
        bookings,
        reviewedBookingIds: reviews.map(review => String(review.booking))
    });
};

module.exports.cancelGuestBooking = async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) {
        req.flash("error", "Lease request not found.");
        return res.redirect("/booking/my-leases");
    }

    if (!booking.guest || String(booking.guest) !== String(req.user._id)) {
        req.flash("error", "You cannot cancel another guest's lease request.");
        return res.redirect("/booking/my-leases");
    }

    if (!canTransitionBooking(normalizeBookingStatus(booking.status), "cancelled") || new Date(booking.checkIn) <= new Date()) {
        req.flash("error", "Only upcoming pending or approved leases can be cancelled.");
        return res.redirect("/booking/my-leases");
    }

    booking.status = "cancelled";
    await booking.save();
    req.flash("success", "Your lease request has been cancelled.");
    return res.redirect("/booking/my-leases");
};

module.exports.updateBookingStatus = async (req, res) => {
    const booking = await Booking.findById(req.params.id).populate("listing");
    if (!booking || !booking.listing) {
        req.flash("error", "Booking or room not found.");
        return res.redirect("/booking/view-bookings");
    }

    if (!booking.listing.owner || !booking.listing.owner.equals(req.user._id)) {
        req.flash("error", "You do not have access to update this booking.");
        return res.redirect("/booking/view-bookings");
    }

    const currentStatus = normalizeBookingStatus(booking.status);
    const nextStatus = req.body.status;
    const returnPath = req.body.returnTo === "all"
        ? "/booking/view-bookings"
        : `/booking/${booking.listing._id}/view-booking`;

    if (!canTransitionBooking(currentStatus, nextStatus)) {
        req.flash("error", "That booking status change is not allowed.");
        return res.redirect(returnPath);
    }

    if (nextStatus === "approved") {
        const conflictingBooking = await Booking.exists(
            createDateOverlapQuery(booking.listing._id, booking.checkIn, booking.checkOut, booking._id)
        );
        if (conflictingBooking) {
            req.flash("error", "Another pending or approved booking overlaps these dates.");
            return res.redirect(returnPath);
        }
    }

    if (nextStatus === "completed" && new Date(booking.checkOut) > new Date()) {
        req.flash("error", "A booking can only be completed after its lease ends.");
        return res.redirect(returnPath);
    }

    booking.status = nextStatus;
    await booking.save();

    const successMessages = {
        approved: "Booking request approved.",
        rejected: "Booking request declined.",
        completed: "Booking marked as completed.",
        cancelled: "Booking cancelled."
    };
    req.flash("success", successMessages[nextStatus]);
    return res.redirect(returnPath);
};