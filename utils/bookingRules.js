const BOOKING_STATUSES = Object.freeze([
    "pending",
    "approved",
    "completed",
    "rejected",
    "cancelled"
]);

const DATE_BLOCKING_STATUSES = Object.freeze(["pending", "approved", "accepted"]);

const BOOKING_TRANSITIONS = Object.freeze({
    pending: Object.freeze(["approved", "rejected", "cancelled"]),
    approved: Object.freeze(["completed", "cancelled"]),
    completed: Object.freeze([]),
    rejected: Object.freeze([]),
    cancelled: Object.freeze([])
});

function normalizeBookingStatus(status) {
    return status === "accepted" ? "approved" : status;
}

function canTransitionBooking(currentStatus, nextStatus) {
    const normalizedStatus = normalizeBookingStatus(currentStatus);
    return BOOKING_TRANSITIONS[normalizedStatus]?.includes(nextStatus) || false;
}

function createDateOverlapQuery(listingId, checkIn, checkOut, excludeBookingId) {
    const query = {
        listing: listingId,
        status: { $in: DATE_BLOCKING_STATUSES },
        checkIn: { $lt: checkOut },
        checkOut: { $gt: checkIn }
    };

    if (excludeBookingId) {
        query._id = { $ne: excludeBookingId };
    }

    return query;
}

module.exports = {
    BOOKING_STATUSES,
    canTransitionBooking,
    createDateOverlapQuery,
    normalizeBookingStatus
};