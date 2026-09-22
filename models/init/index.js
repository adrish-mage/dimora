const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", "..", ".env")
});

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../listing.js");
const Review = require("../review.js");
const User = require("../user.js");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    console.log("Connected to database:", mongoose.connection.name);
}

const adminName = "Adrish Dey";
const adminUsername = "Adrish Dey";
const adminPassword = "dimoraAdmin";

const initDB = async () => {
    await Review.deleteMany({});
    await Listing.deleteMany({});
    await User.deleteMany({
        username: { $in: [...initData.hosts.map(h => h.username), adminUsername] }
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
        });
        const registered = await User.register(newUser, "password123");
        seededHosts.push(registered);
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

    console.log("data was initialized");
    console.log(`Seeded ${seededReviews.length} reviews`);
    console.log(`Seeded ${seededHosts.length} hosts, login with password: password123`);
    console.log(`Seeded admin "${adminUsername}", login with password: ${adminPassword}`);
};

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