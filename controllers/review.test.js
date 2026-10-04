const mockReviewSave = jest.fn();

jest.mock("../models/listing", () => ({
    findById: jest.fn()
}));

jest.mock("../models/booking", () => ({
    findOne: jest.fn()
}));

jest.mock("../models/review", () => {
    const MockReview = jest.fn(function (values) {
        Object.assign(this, values);
        this.save = mockReviewSave;
    });
    MockReview.exists = jest.fn();
    return MockReview;
});

const Listing = require("../models/listing");
const Booking = require("../models/booking");
const Review = require("../models/review");
const reviewController = require("./review");

function makeRequest() {
    return {
        params: { id: "room-id" },
        body: { review: { booking: "completed-booking-id", rating: "5", comment: "A good room" } },
        user: { _id: "guest-id" },
        flash: jest.fn()
    };
}

function makeResponse() {
    return { redirect: jest.fn() };
}

beforeEach(() => {
    jest.clearAllMocks();
    mockReviewSave.mockResolvedValue(undefined);
    Listing.findById.mockResolvedValue({
        _id: "room-id",
        reviews: [],
        save: jest.fn().mockResolvedValue(undefined)
    });
    Booking.findOne.mockResolvedValue({ _id: "completed-booking-id" });
    Review.exists.mockResolvedValue(null);
});

describe("review controller", () => {
    test("rejects a review without a completed lease owned by the guest", async () => {
        Booking.findOne.mockResolvedValue(null);
        const req = makeRequest();
        const res = makeResponse();

        await reviewController.create(req, res);

        expect(Booking.findOne).toHaveBeenCalledWith({
            _id: "completed-booking-id",
            listing: "room-id",
            guest: "guest-id",
            status: "completed"
        });
        expect(Review).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", expect.stringContaining("completed"));
    });

    test("creates one review linked to the guest's completed lease", async () => {
        const req = makeRequest();
        const res = makeResponse();

        await reviewController.create(req, res);

        expect(Review).toHaveBeenCalledWith(expect.objectContaining({
            author: "guest-id",
            listing: "room-id",
            booking: "completed-booking-id",
            rating: "5",
            comment: "A good room"
        }));
        expect(mockReviewSave).toHaveBeenCalled();
        expect(res.redirect).toHaveBeenCalledWith("/listings/room-id");
    });

    test("prevents duplicate reviews for the same completed lease", async () => {
        Review.exists.mockResolvedValue({ _id: "existing-review-id" });
        const req = makeRequest();
        const res = makeResponse();

        await reviewController.create(req, res);

        expect(Review).not.toHaveBeenCalled();
        expect(mockReviewSave).not.toHaveBeenCalled();
        expect(req.flash).toHaveBeenCalledWith("error", expect.stringContaining("already reviewed"));
    });
});