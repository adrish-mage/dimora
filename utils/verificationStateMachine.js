const { findById } = require("../models/review");
const Listing = require("../models/listing");


const ALLOWED_TRANSITIONS = {
    unverified: ["pending"],
    pending:    ["verified", "unverified"],
    verified:   ["flagged"],
    flagged:    ["pending"],
};

function canTransition(from, to) {
    if(!ALLOWED_TRANSITIONS[from]){
        return false;
    }
    return ALLOWED_TRANSITIONS[from]?.includes(to);   
}

async function transitionListingStatus(listingId, newStatus) {
    const listing = await Listing.findById(listingId);
    if (!listing) {
        throw new Error("Listing not found");
    }
    if (!canTransition(listing.verificationStatus, newStatus)) {
        throw new Error("Invalid verification status transition");
    }
    const updated = await Listing.findByIdAndUpdate(
        listingId,
        { verificationStatus: newStatus },
        { new: true, runValidators: true }
    );
    return updated;
}

module.exports = { ALLOWED_TRANSITIONS, canTransition, transitionListingStatus };