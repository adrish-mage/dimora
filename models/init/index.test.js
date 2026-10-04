const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Booking = require("../booking");
const Listing = require("../listing");
const User = require("../user");
const initData = require("./data");
const { initDB } = require("./index");

jest.setTimeout(120000);

describe("demo booking seed data", () => {
    let replicaSet;

    beforeAll(async () => {
        replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        await mongoose.connect(replicaSet.getUri(), { dbName: "dimora_seed_test" });
    });

    afterAll(async () => {
        await mongoose.disconnect();
        if (replicaSet) {
            await replicaSet.stop();
        }
    });

    test("seeds every room and seeded account with non-self demo lease requests", async () => {
        await initDB();

        const seededUsernames = [...initData.hosts, ...initData.guests].map(account => account.username);
        const seededUsers = await User.find({ username: { $in: seededUsernames } });
        const guest = seededUsers.find(account => account.username === "demo_guest");
        const hostIds = seededUsers.filter(account => account.role === "host").map(account => account._id);
        const hostListings = await Listing.find({ owner: { $in: hostIds } }).select("_id");
        const allBookings = await Booking.find({ listing: { $in: hostListings.map(listing => listing._id) } })
            .populate("listing");
        const guestIds = new Set(allBookings.map(booking => String(booking.guest)));
        const bookingStatuses = new Set(allBookings.map(booking => booking.status));

        expect(seededUsers).toHaveLength(11);
        expect(guest.verificationStatus).toBe("verified");
        expect(hostListings).toHaveLength(27);
        expect(allBookings).toHaveLength(hostListings.length);
        expect(new Set(allBookings.map(booking => String(booking.listing._id))).size).toBe(hostListings.length);
        expect(seededUsers.every(account => guestIds.has(String(account._id)))).toBe(true);
        expect(allBookings.every(booking => !booking.listing.owner.equals(booking.guest))).toBe(true);
        expect(bookingStatuses).toEqual(new Set(["pending", "approved", "rejected", "cancelled"]));
        expect(allBookings.some(booking => booking.status === "completed")).toBe(false);
        expect(allBookings.every(booking => booking.checkIn.getTime() > Date.now())).toBe(true);
        expect(allBookings.find(booking => String(booking.guest) === String(guest._id))).toBeDefined();
    });
});