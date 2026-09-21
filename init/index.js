const path = require("path");

require("dotenv").config({
    path: path.join(__dirname, "..", ".env")
});

const mongoose = require("mongoose");
const initData = require("./data.js");
const Listing = require("../models/listing.js");
const User = require("../models/user.js");

async function connectDB() {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected");
    console.log("Connected to database:", mongoose.connection.name);
}

const adminName = "Adrish Dey";
const adminUsername = "Adrish Dey";
const adminPassword = "dimoraAdmin";

const initDB = async () => {
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

    await Listing.insertMany(dataWithOwner);

    console.log("data was initialized");
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