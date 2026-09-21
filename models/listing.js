const mongoose = require("mongoose");
const Review = require("./review");
// define a schema
const listingSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    description: String,    
    image: {
        filename: {
            type: String,
            default: "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg",
        },
        url: {
            type: String,
            default: "https://t4.ftcdn.net/jpg/04/70/29/97/360_F_470299797_UD0eoVMMSUbHCcNJCdv2t8B2g1GVqYgs.jpg",
        },
    },
    price: Number,
    nearestCampus: {
        type: String,
        trim: true,
    },
    location: String,
    country: String,
    reviews: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Review",
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
    }
});

listingSchema.post("findOneAndDelete", async (listing) => {
    if(listing){
        await Review.deleteMany({ _id: { $in: listing.reviews } });
    }
    
})
//compile a model
const listing = mongoose.model("Listing", listingSchema);

module.exports = listing;
