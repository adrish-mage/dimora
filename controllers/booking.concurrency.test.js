const express = require("express");
const mongoose = require("mongoose");
const { MongoMemoryReplSet } = require("mongodb-memory-server");
const Booking = require("../models/booking");
const Listing = require("../models/listing");
const bookingController = require("./booking");

jest.setTimeout(120000);

describe("booking request concurrency against MongoDB", () => {
    let replicaSet;
    let server;
    let baseUrl;

    beforeAll(async () => {
        replicaSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
        await mongoose.connect(replicaSet.getUri(), { dbName: "dimora_booking_test" });

        const app = express();
        app.use(express.urlencoded({ extended: true }));
        app.post("/booking/:id/request", async (req, res) => {
            req.body.booking = req.body;
            req.user = { _id: new mongoose.Types.ObjectId(req.get("x-guest-id")) };
            req.flash = (type, message) => res.setHeader("x-flash", `${type}:${message}`);
            await bookingController.sendBooking(req, res);
        });

        server = await new Promise(resolve => {
            const listener = app.listen(0, "127.0.0.1", () => resolve(listener));
        });
        baseUrl = `http://127.0.0.1:${server.address().port}`;
    });

    afterEach(async () => {
        await Booking.deleteMany({});
        await Listing.deleteMany({});
    });

    afterAll(async () => {
        if (server) {
            await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
        }
        await mongoose.disconnect();
        if (replicaSet) {
            await replicaSet.stop();
        }
    });

    test("keeps only the lower-ID booking when two overlapping requests race", async () => {
        const listing = await Listing.create({
            title: "Concurrency test room",
            price: 30000,
            owner: new mongoose.Types.ObjectId()
        });
        const guestIds = [new mongoose.Types.ObjectId(), new mongoose.Types.ObjectId()];
        const bookingIds = [];
        const originalExists = Booking.exists;
        const originalSave = Booking.prototype.save;

        let availabilityChecks = 0;
        let releaseAvailabilityChecks;
        const availabilityChecksReady = new Promise(resolve => {
            releaseAvailabilityChecks = resolve;
        });

        Booking.exists = function (...args) {
            return originalExists.apply(this, args).then(async result => {
                availabilityChecks++;
                if (availabilityChecks === 2) {
                    releaseAvailabilityChecks();
                }
                await availabilityChecksReady;
                return result;
            });
        };
        Booking.prototype.save = function (...args) {
            bookingIds.push(String(this._id));
            return originalSave.apply(this, args);
        };

        const start = new Date();
        start.setUTCHours(0, 0, 0, 0);
        start.setUTCDate(start.getUTCDate() + 20);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 3);
        const form = new URLSearchParams({
            checkIn: start.toISOString().slice(0, 10),
            checkOut: end.toISOString().slice(0, 10),
            guests: "1",
            message: "Concurrent request test"
        });

        try {
            const responses = await Promise.all(guestIds.map(guestId => fetch(
                `${baseUrl}/booking/${listing._id}/request`,
                {
                    method: "POST",
                    headers: {
                        "content-type": "application/x-www-form-urlencoded",
                        "x-guest-id": String(guestId)
                    },
                    body: form.toString(),
                    redirect: "manual"
                }
            )));

            const survivingBookings = await Booking.find({ listing: listing._id });
            expect(responses.map(response => response.status)).toEqual([302, 302]);
            expect(responses.map(response => response.headers.get("x-flash")).sort()).toEqual([
                "error:dates unavailable",
                "success:Your booking request has been sent to the host."
            ].sort());
            expect(survivingBookings).toHaveLength(1);
            expect(String(survivingBookings[0]._id)).toBe([...bookingIds].sort()[0]);
        } finally {
            Booking.exists = originalExists;
            Booking.prototype.save = originalSave;
        }
    });
});