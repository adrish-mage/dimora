const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env")
});

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../listing.js");
const Review = require("../review.js");
const Booking = require("../booking.js");
const User = require("../user.js");
const proration = require("../../utils/proration.js");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    console.log("Connected to database:", mongoose.connection.name);
}

const adminName = "Adrish Dey";
const adminUsername = "Adrish Dey";
const adminPassword = "dimoraAdmin";

const initDB = async () => {
    await Booking.deleteMany({});
    await Review.deleteMany({});
    await Listing.deleteMany({});
    await User.deleteMany({
        username: {
            $in: [
                ...initData.hosts.map(host => host.username),
                ...initData.guests.map(guest => guest.username),
                adminUsername
            ]
        }
    });

    const seededHosts = [];
    for (const host of initData.hosts) {
        const newUser = new User({
            username: host.username,
            name: host.name,
            email: host.email,
            dob: host.dob,
            role: "host",
            institution: host.institution,
            institutionVerified: host.isVerifiedHost,
            isVerifiedHost: host.isVerifiedHost,
            hostApplicationStatus: host.isVerifiedHost ? "approved" : "not_started",
        });
        const registered = await User.register(newUser, "password123");
        seededHosts.push(registered);
    }

    const seededGuests = [];
    for (const guest of initData.guests) {
        const newUser = new User({
            ...guest,
            role: "guest",
            verificationStatus: "verified",
            verificationVerifiedAt: new Date(),
            verificationExpiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
        const registered = await User.register(newUser, "password123");
        seededGuests.push(registered);
    }

    const adminUser = new User({
        name: adminName,
        username: adminUsername,
        email: "adrish@example.com",
        dob: new Date("1999-01-01"),
        role: "admin",
    });
    await User.register(adminUser, adminPassword);

    const dataWithOwner = initData.data.map(({ hostIndex, ...listing }) => ({
        ...listing,
        owner: seededHosts[hostIndex]._id,
    }));

    const seededListings = await Listing.insertMany(dataWithOwner);

    const reviewData = initData.reviews.map(({ listingIndex, authorIndex, rating, comment }) => ({
        listing: seededListings[listingIndex]._id,
        author: seededHosts[authorIndex]._id,
        rating,
        comment,
    }));
    const seededReviews = await Review.insertMany(reviewData);

    await Promise.all(seededReviews.map((review) =>
        Listing.findByIdAndUpdate(review.listing, { $push: { reviews: review._id } })
    ));

    const demoBookings = initData.bookings.map((bookingData) => {
        const listing = seededListings[bookingData.listingIndex];
        const guest = bookingData.guestType === "host"
            ? seededHosts[bookingData.guestIndex]
            : seededGuests[bookingData.guestIndex];
        const checkIn = new Date();
        checkIn.setUTCHours(0, 0, 0, 0);
        checkIn.setUTCDate(checkIn.getUTCDate() + bookingData.startOffsetDays);
        const checkOut = new Date(checkIn);
        checkOut.setUTCDate(checkOut.getUTCDate() + bookingData.durationDays);
        const days = (checkOut - checkIn) / (1000 * 60 * 60 * 24);
        const basePrice = proration(Number(listing.price), checkIn, checkOut).total;
        const cleaningFee = Number(listing.cleaningFee) || 0;
        const serviceFee = Number(listing.serviceFee) || 0;

        return {
            listing: listing._id,
            guest: guest._id,
            checkIn,
            checkOut,
            guests: 1,
            message: bookingData.message,
            days,
            basePrice,
            cleaningFee,
            serviceFee,
            totalPrice: basePrice + cleaningFee + serviceFee,
            status: bookingData.status,
        };
    });
    const seededBookings = await Booking.insertMany(demoBookings);

    console.log("data was initialized");
    console.log(`Seeded ${seededReviews.length} reviews`);
    console.log(`Seeded ${seededHosts.length} hosts, login with password: password123`);
    console.log(`Seeded ${seededGuests.length} demo guest${seededGuests.length === 1 ? "" : "s"}, login with password: password123`);
    console.log(`Seeded ${seededBookings.length} demo booking requests`);
    console.log(`Seeded admin "${adminUsername}", login with password: ${adminPassword}`);
};

if (require.main === module) {
    (async () => {
        try {
            await connectDB();
            await initDB();
        } catch (err) {
            console.log("error initializing database", err);
        } finally {
            await mongoose.disconnect();
            console.log("Database seed finished");
        }
    })();
}

module.exports = { connectDB, initDB };