jest.mock("../models/listing", () => ({
    exists: jest.fn(),
}));

jest.mock("../models/user", () => ({
    updateOne: jest.fn(),
}));

const Listing = require("../models/listing");
const User = require("../models/user");
const listingsController = require("./listings");

describe("saved listing actions", () => {
    const listingId = "507f1f77bcf86cd799439011";
    let req;
    let res;

    beforeEach(() => {
        jest.clearAllMocks();
        req = {
            params: { id: listingId },
            body: {},
            query: {},
            originalUrl: "/listings/saved",
            user: { _id: "user-id" },
            flash: jest.fn(),
        };
        res = { redirect: jest.fn(), render: jest.fn(), json: jest.fn() };
        User.updateOne.mockResolvedValue({ matchedCount: 1 });
    });

    it("saves an existing listing idempotently and returns the updated state", async () => {
        Listing.exists.mockResolvedValue({ _id: listingId });

        await listingsController.saveListing(req, res);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: "user-id" },
            { $addToSet: { savedListings: listingId } }
        );
        expect(res.json).toHaveBeenCalledWith({ saved: true });
    });

    it("does not save a listing that does not exist", async () => {
        Listing.exists.mockResolvedValue(null);

        await expect(listingsController.saveListing(req, res)).rejects.toMatchObject({
            statusCode: 404,
        });

        expect(User.updateOne).not.toHaveBeenCalled();
    });

    it("removes a listing id from the user's saved list", async () => {
        await listingsController.unsaveListing(req, res);

        expect(User.updateOne).toHaveBeenCalledWith(
            { _id: "user-id" },
            { $pull: { savedListings: listingId } }
        );
        expect(res.json).toHaveBeenCalledWith({ saved: false });
    });

    it("renders only the current user's saved listings on the saved rooms page", async () => {
        req.user.savedListings = [listingId];
        Listing.distinct = jest.fn().mockResolvedValue(["Campus"]);
        Listing.find = jest.fn().mockResolvedValue([]);

        await listingsController.saved(req, res);

        expect(Listing.find).toHaveBeenCalledWith({
            $and: [{ _id: { $in: [listingId] } }],
        });
        expect(res.render).toHaveBeenCalledWith("listings/index.ejs", expect.objectContaining({
            savedOnly: true,
            savedListingIds: [listingId],
        }));
    });
});
