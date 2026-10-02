const {
    BOOKING_STATUSES,
    canTransitionBooking,
    createDateOverlapQuery,
    normalizeBookingStatus
} = require("./bookingRules");

describe("booking rules", () => {
    test("uses the selected booking statuses", () => {
        expect(BOOKING_STATUSES).toEqual([
            "pending",
            "approved",
            "completed",
            "rejected",
            "cancelled"
        ]);
    });

    test("allows only forward booking transitions", () => {
        expect(canTransitionBooking("pending", "approved")).toBe(true);
        expect(canTransitionBooking("pending", "rejected")).toBe(true);
        expect(canTransitionBooking("approved", "completed")).toBe(true);
        expect(canTransitionBooking("approved", "cancelled")).toBe(true);
        expect(canTransitionBooking("completed", "approved")).toBe(false);
        expect(canTransitionBooking("rejected", "approved")).toBe(false);
    });

    test("treats legacy accepted bookings as approved", () => {
        expect(normalizeBookingStatus("accepted")).toBe("approved");
        expect(canTransitionBooking("accepted", "completed")).toBe(true);
    });

    test("builds an overlap query that blocks pending and approved ranges", () => {
        const checkIn = new Date("2026-10-01T00:00:00.000Z");
        const checkOut = new Date("2026-10-09T00:00:00.000Z");

        expect(createDateOverlapQuery("room-id", checkIn, checkOut, "booking-id")).toEqual({
            listing: "room-id",
            status: { $in: ["pending", "approved", "accepted"] },
            checkIn: { $lt: checkOut },
            checkOut: { $gt: checkIn },
            _id: { $ne: "booking-id" }
        });
    });
});