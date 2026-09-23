const Listing = require("../models/listing");

function averageRating(reviews) {
    if (!reviews.length) return 0;
    return reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length;
}
function computeTrustScore(listing) {
    const reviews = listing.reviews || [];
    const reviewCount = reviews.length;

    // 1. Rating quality - 35
    const avgRating = averageRating(reviews);

    const baselineRating = 4;
    const confidenceThreshold = 5;

    const adjustedRating = reviewCount
        ? (
            (reviewCount / (reviewCount + confidenceThreshold)) * avgRating +
            (confidenceThreshold / (reviewCount + confidenceThreshold)) * baselineRating
        )
        : baselineRating;

    const ratingScore = (adjustedRating / 5) * 35;


    // 2. Review confidence - 25
    const reviewConfidence = Math.min(reviewCount / 10, 1);
    const confidenceScore = reviewConfidence * 25;


    // 3. Listing verification - 25
    let verificationScore = 0;

    if (listing.verificationStatus === "verified") {
        verificationScore = 25;
    } else if (listing.verificationStatus === "pending") {
        verificationScore = 12.5;
    } else if (listing.verificationStatus === "unverified") {
        verificationScore = 5;
    }else if (listing.verificationStatus === "flagged") {
        verificationScore = 0;
    }   


    // 4. Review consistency - 15
    let consistencyScore = 0;

    if (reviewCount >= 2) {
        const variance =
            reviews.reduce(
                (sum, r) => sum + Math.pow(r.rating - avgRating, 2),
                0
            ) / reviewCount;

        const standardDeviation = Math.sqrt(variance);

        consistencyScore = Math.max(
            0,
            15 - standardDeviation * 6
        );
    }


    const score =
        ratingScore +
        confidenceScore +
        verificationScore +
        consistencyScore;

    return Math.round(Math.min(100, Math.max(0, score)));
}
module.exports = { computeTrustScore, averageRating };