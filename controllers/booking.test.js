const mockSave = jest.fn();
const mockDeleteOne = jest.fn();
const mockSort = jest.fn();
let mockBookingId = "new-booking-id";

jest.mock("../models/listing", () => ({
    findById: jest.fn()
}));

jest.mock("../models/booking", () => {
    const MockBooking = jest.fn(function (values) {
        Object.assign(this, values);
        this._id = mockBookingId;
        this.save = mockSave;
        this.deleteOne = mockDeleteOne;
    });
    MockBooking.exists = jest.fn();
    MockBooking.findOne = jest.fn(() => ({ sort: mockSort }));
    MockBooking.findById = jest.fn();
    return MockBooking;
});

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const bookingController = require("./booking");

function futureDate(daysFromToday) {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + daysFromToday);
    return date.toISOString().slice(0, 10);
}

function makeRequest(overrides = {}) {
    return {
        params: { id: "room-id" },
        body: {
            booking: {
                checkIn: futureDate(2),
                checkOut: futureDate(5),
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
    mockBookingId = "new-booking-id";
    mockSave.mockResolvedValue(undefined);
    mockDeleteOne.mockResolvedValue(undefined);
    mockSort.mockResolvedValue(null);
    Booking.exists.mockResolvedValue(null);
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
        expect(Booking.findOne).not.toHaveBeenCalled();
        expect(Booking).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", "dates unavailable");
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
        const checkIn = futureDate(2);
        const checkOut = futureDate(5);
        const req = makeRequest({
            body: {
                booking: {
                    checkIn,
                    checkOut,
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
            basePrice: 10,
            totalPrice: 13,
            status: "pending",
            checkIn: new Date(`${checkIn}T00:00:00.000Z`),
            checkOut: new Date(`${checkOut}T00:00:00.000Z`)
        }));
        expect(mockSave).toHaveBeenCalled();
        expect(Booking.findOne).toHaveBeenCalledWith(expect.objectContaining({
            listing: "room-id",
            _id: { $ne: "new-booking-id" }
        }));
        expect(mockSort).toHaveBeenCalledWith({ _id: 1 });
        expect(res.redirect).toHaveBeenCalledWith("/listings/room-id");
    });

    test("rejects invalid or past lease dates before checking availability", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id" });
        const req = makeRequest({
            body: { booking: { checkIn: "2020-01-01", checkOut: "2020-01-04", guests: "1" } }
        });
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(Booking.exists).not.toHaveBeenCalled();
        expect(Booking).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", expect.stringContaining("valid lease dates"));
    });

    test("rejects a lease whose end does not follow its start", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id" });
        const start = futureDate(5);
        const req = makeRequest({
            body: { booking: { checkIn: start, checkOut: start, guests: "1" } }
        });
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(Booking.exists).not.toHaveBeenCalled();
        expect(Booking).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", expect.stringContaining("valid lease dates"));
    });

    test("prevents a host from requesting their own listing", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id", owner: "guest-id" });
        const req = makeRequest();
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(Booking.exists).not.toHaveBeenCalled();
        expect(Booking).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", "You cannot book your own listing.");
        expect(res.redirect).toHaveBeenCalledWith("/listings/room-id");
    });

    test("deletes its request when a lower-ID booking wins the race", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id", price: 100 });
        mockSort.mockResolvedValue({ _id: "aaa-booking-id" });
        const req = makeRequest();
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(mockSave).toHaveBeenCalled();
        expect(mockDeleteOne).toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", "dates unavailable");
        expect(res.redirect).toHaveBeenCalledWith("/booking/room-id/request-booking");
    });

    test("keeps its request when its ID wins the race", async () => {
        Listing.findById.mockResolvedValue({ _id: "room-id", price: 100 });
        mockBookingId = "aaa-booking-id";
        mockSort.mockResolvedValue({ _id: "zzz-booking-id" });
        const req = makeRequest();
        const res = makeResponse();

        await bookingController.sendBooking(req, res);

        expect(mockDeleteOne).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("success", expect.any(String));
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