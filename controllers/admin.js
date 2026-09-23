const { transitionListingStatus } = require("../utils/verificationStateMachine");
const Listing = require("../models/listing");
const User = require("../models/user.js");

module.exports.pendingListings = async (req, res) => {
    const queueStatus = req.query.status === "approved" ? "approved" : "pending";
    const verificationStatus = queueStatus === "approved" ? "verified" : "pending";
    const pending = await Listing.find({ verificationStatus }).populate("owner");
    res.render("admin/pending.ejs", { pending, queueStatus });
};
module.exports.approveListing = async (req, res) => {
    try {
        await transitionListingStatus(req.params.id, "verified");
        req.flash("success", "Listing verified");
    } catch (err) {
        req.flash("error", err.message);
    }
    res.redirect("/admin/listings/pending");
};

module.exports.rejectListing = async (req, res) => {
    try {
        await transitionListingStatus(req.params.id, "unverified");
        req.flash("success", "Listing rejected");
    } catch (err) {
        req.flash("error", err.message);
    }
    res.redirect("/admin/listings/pending");
};

module.exports.pendingStudentVerifications = async (req, res) => {
    const statusQuery = req.query.status === "approved" ? "verified" : { $in: ["pending", "needs_information"] };
    const pendingStudentVerifications = await User.find({ verificationStatus: statusQuery })
        .sort({ verificationSubmittedAt: 1 });
    res.render("admin/studentVerifications.ejs", { pendingStudentVerifications, queueStatus: req.query.status === "approved" ? "approved" : "pending" });
};

module.exports.approveStudentVerification = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Verification request not found");
    if (!user.institution || (!user.institutionEmail && (!user.verificationDocs || !user.verificationDocs.length))) {
        req.flash("error", "This request needs an institution and either an institutional email or proof document.");
        return res.redirect("/admin/students/pending");
    }
    user.verificationStatus = "verified";
    user.institutionVerified = true;
    user.verificationVerifiedAt = new Date();
    user.verificationExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
    user.verificationAdminNote = "Verified by Dimora admin.";
    await user.save();
    req.flash("success", `${user.name} is now verified as a student or intern.`);
    res.redirect("/admin/students/pending");
};

module.exports.requestStudentVerificationInfo = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Verification request not found");
    user.verificationStatus = "needs_information";
    user.verificationAdminNote = "Please upload a clearer proof of your enrollment or institution affiliation.";
    await user.save();
    req.flash("success", "More information requested from the student.");
    res.redirect("/admin/students/pending");
};

module.exports.rejectStudentVerification = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Verification request not found");
    user.verificationStatus = "rejected";
    user.institutionVerified = false;
    user.verificationVerifiedAt = undefined;
    user.verificationExpiresAt = undefined;
    user.verificationAdminNote = "This verification request was not approved.";
    await user.save();
    req.flash("success", "Student verification rejected.");
    res.redirect("/admin/students/pending");
};

module.exports.pendingHosts = async (req, res) => {
    const statusQuery = req.query.status === "approved" ? "approved" : { $in: ["pending", "needs_information"] };
    const pendingHosts = await User.find({ hostApplicationStatus: statusQuery })
        .sort({ hostApplicationSubmittedAt: 1 });
    res.render("admin/hosts.ejs", { pendingHosts, queueStatus: req.query.status === "approved" ? "approved" : "pending" });
};

module.exports.verificationDesk = async (req, res) => {
    const [pendingListings, approvedListings, pendingStudents, approvedStudents, pendingHosts, approvedHosts] = await Promise.all([
        Listing.countDocuments({ verificationStatus: "pending" }),
        Listing.countDocuments({ verificationStatus: "verified" }),
        User.countDocuments({ verificationStatus: { $in: ["pending", "needs_information"] } }),
        User.countDocuments({ verificationStatus: "verified" }),
        User.countDocuments({ hostApplicationStatus: { $in: ["pending", "needs_information"] } }),
        User.countDocuments({ hostApplicationStatus: "approved" }),
    ]);

    res.render("admin/verificationDesk.ejs", {
        portals: [
            { key: "listings", title: "Listing verification", description: "Review rooms before they appear as trusted listings.", icon: "fa-list-check", pending: pendingListings, approved: approvedListings, pendingHref: "/admin/listings/pending", approvedHref: "/admin/listings/pending?status=approved" },
            { key: "students", title: "Student verification", description: "Review institution status and enrollment evidence.", icon: "fa-user-check", pending: pendingStudents, approved: approvedStudents, pendingHref: "/admin/students/pending", approvedHref: "/admin/students/pending?status=approved" },
            { key: "hosts", title: "Host verification", description: "Review identity, authority, and room-access applications.", icon: "fa-house-circle-check", pending: pendingHosts, approved: approvedHosts, pendingHref: "/admin/hosts/pending", approvedHref: "/admin/hosts/pending?status=approved" },
        ],
    });
};

module.exports.approveHost = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Host application not found");
    if (!user.hostDocuments || !user.hostDocuments.length || !user.hostApplicationNote) {
        req.flash("error", "This host application needs a proof document and authority explanation before approval.");
        return res.redirect("/admin/hosts/pending");
    }
    user.role = "host";
    user.isVerifiedHost = true;
    user.hostApplicationStatus = "approved";
    user.hostApplicationAdminNote = "Approved by Dimora admin.";
    await user.save();
    req.flash("success", `${user.name} is now approved to host.`);
    res.redirect("/admin/hosts/pending");
};

module.exports.requestHostInformation = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Host application not found");
    user.hostApplicationStatus = "needs_information";
    user.hostApplicationAdminNote = "Please provide more information about your connection to the room and your permission to list it.";
    await user.save();
    req.flash("success", "More information requested from the applicant.");
    res.redirect("/admin/hosts/pending");
};

module.exports.rejectHost = async (req, res) => {
    const user = await User.findById(req.params.id);
    if (!user) throw new Error("Host application not found");
    user.hostApplicationStatus = "rejected";
    user.isVerifiedHost = false;
    user.hostApplicationAdminNote = "This application was not approved.";
    await user.save();
    req.flash("success", "Host application rejected.");
    res.redirect("/admin/hosts/pending");
};