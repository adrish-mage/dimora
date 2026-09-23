const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const passportLocalMongoose = require("passport-local-mongoose").default;

const userSchema = new Schema({
    name: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
    },
    dob: {
        type: Date,
        required: true,
    },
    role: {
        type: String,
        enum: ["guest", "host", "admin"],
        default: "guest",
    },
    institution: {
        type: String,
        trim: true,
    },
    institutionEmail: {
        type: String,
        trim: true,
        lowercase: true,
    },
    institutionEmailDomain: {
        type: String,
        trim: true,
        lowercase: true,
    },
    institutionEmailSignal: {
        type: String,
        enum: ["none", "recognized_domain", "admin_review"],
        default: "none",
    },
    institutionVerified: {
        type: Boolean,
        default: false,
    },
    verificationType: {
        type: String,
        enum: ["student", "intern", "other"],
    },
    verificationDocs: [{
        type: String,
        trim: true,
    }],
    verificationSubmittedAt: Date,
    verificationVerifiedAt: Date,
    verificationExpiresAt: Date,
    verificationAdminNote: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    verificationStatus: {
        type: String,
        enum: ["unverified", "pending", "verified", "rejected", "needs_information"],
        default: "unverified",
    },
    verificationNote: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    hostApplicationStatus: {
        type: String,
        enum: ["not_started", "pending", "approved", "needs_information", "rejected"],
        default: "not_started",
    },
    hostType: {
        type: String,
        enum: ["owner", "tenant", "manager"],
    },
    hostApplicationNote: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    hostDocuments: [{
        type: String,
        trim: true,
    }],
    hostContactVerified: {
        type: Boolean,
        default: false,
    },
    hostTrustFlags: [{
        type: String,
        trim: true,
    }],
    hostApplicationAdminNote: {
        type: String,
        trim: true,
        maxlength: 1000,
    },
    hostApplicationSubmittedAt: Date,
    isVerifiedHost: {
        type: Boolean,
        default: false
    }
})

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User",userSchema);