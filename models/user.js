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
        enum: ["guest","host","admin"],
        default: "guest",
    },
    institution: {
        type: String,
    },
    institutionVerified: {
        type: Boolean,
    },
    isVerifiedHost: {
        type: Boolean,
        default: false  
    }
})

userSchema.plugin(passportLocalMongoose);
module.exports = mongoose.model("User",userSchema);