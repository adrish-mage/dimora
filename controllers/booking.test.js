const mockSave = jest.fn();

jest.mock("../models/listing", () => ({
    findById: jest.fn()
}));

jest.mock("../models/booking", () => {
    const MockBooking = jest.fn(function (values) {
        Object.assign(this, values);
        this.save = mockSave;
    });
    MockBooking.exists = jest.fn();
    MockBooking.findById = jest.fn();
    return MockBooking;
});

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const bookingController = require("./booking");

function makeRequest(overrides = {}) {
    return {
        params: { id: "room-id" },
        body: {
            booking: {
                checkIn: "2026-10-01",
                checkOut: "2026-10-04",
                guests: "1",
                message: "Moving for an internship"
            }
        },
        user: { _id: "guest-id" },
        flash: jest.fn(),
        ...overrides
    };
}

function makeResponse() {
    return { redirect: jest.fn(), render: jest.fn() };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockSave.mockResolvedValue(undefined);
});

describe("booking controller", () => {
    test("rejects overlapping requests against pending and approved bookings", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id" });
        Booking.exists.mockResolvedValue({ _id: "existing-booking" });
        const req = makeRequest();
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(Booking.exists).toHaveBeenCalledWith(expect.objectContaining({
            listing: "room-id",
            status: { $in: ["pending", "approved", "accepted"] }
        }));
        expect(Booking).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", expect.stringContaining("overlap"));
        expect(res.redirect).toHaveBeenCalledWith("/booking/room-id/request-booking");
    });

    test("creates an available request using server-calculated dates and price", async () => {
        Listing.findById.mockResolvedValue({
            _id: "room-id",
            price: 100,
            cleaningFee: 1,
            serviceFee: 2
        });
        Booking.exists.mockResolvedValue(null);
        const req = makeRequest({
            body: {
                booking: {
                    checkIn: "2026-10-01",
                    checkOut: "2026-10-04",
                    guests: "1",
                    days: "999",
                    basePrice: "1",
                    totalPrice: "1"
                }
            }
        });
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(Booking).toHaveBeenCalledWith(expect.objectContaining({
            days: 3,
            basePrice: 300,
            totalPrice: 303
        }));
        expect(mockSave).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith("/listings/room-id");
    });

    test("approves a pending booking when the host owns its room", async () => {
        const booking = {
            _id: "booking-id",
            status: "pending",
            listing: {
                _id: "room-id",
                owner: { equals: jest.fn(() => true) }
            },
            checkIn: new Date("2026-10-01"),
            checkOut: new Date("2026-10-04"),
            save: mockSave
        };
        Booking.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(booking) });
        Booking.exists.mockResolvedValue(null);
        const req = makeRequest({
            params: { id: "booking-id" },
            body: { status: "approved", returnTo: "all" }
        });
        const res = makeResponse();

        await bookingController.updateBookingStatus(req, res);

        expect(booking.status).toBe("approved");
        expect(mockSave).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith("/booking/view-bookings");
    });

    test("does not approve a request that conflicts with another active booking", async () => {
        const booking = {
            _id: "booking-id",
            status: "pending",
            listing: {
                _id: "room-id",
                owner: { equals: jest.fn(() => true) }
            },
            checkIn: new Date("2026-10-01"),
            checkOut: new Date("2026-10-04"),
            save: mockSave
        };
        Booking.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(booking) });
        Booking.exists.mockResolvedValue({ _id: "conflicting-booking" });
        const req = makeRequest({
            params: { id: "booking-id" },
            body: { status: "approved", returnTo: "listing" }
        });
        const res = makeResponse();

        await bookingController.updateBookingStatus(req, res);

        expect(booking.status).toBe("pending");
        expect(mockSave).not.toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith("/booking/room-id/view-booking");
    });
});