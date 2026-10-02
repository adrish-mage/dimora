
const mongoose = require("mongoose");
const { BOOKING_STATUSES } = require("../utils/bookingRules");

const bookingSchema = new mongoose.Schema({

    listing: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Listing",
        required: true
    },

    guest: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    checkIn: {
        type: Date,
        required: true
    },

    checkOut: {
        type: Date,
        required: true
    },

    guests: {
        type: Number,
        required: true,
        min: 1
    },

    message: {
        type: String,
        trim: true
    },

    days: {
        type: Number,
        required: true,
        min: 1
    },

    basePrice: {
        type: Number,
        required: true,
        min: 0
    },

    cleaningFee: {
        type: Number,
        default: 0,
        min: 0
    },

    serviceFee: {
        type: Number,
        default: 0,
        min: 0
    },

    totalPrice: {
        type: Number,
        required: true,
        min: 0
    },

    status: {
        type: String,
        enum: BOOKING_STATUSES,
        default: "pending"
    }

}, {
    timestamps: true
});

module.exports = mongoose.model("Booking", bookingSchema);

