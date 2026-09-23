const User = require("../models/user.js");
const Listing = require("../models/listing");
const Review = require("../models/review.js");

const recognizedInstitutionDomains = [".edu", ".edu.in", ".ac.uk", ".ac.in"];

const hasRecognizedInstitutionDomain = (email) => {
    const domain = email.split("@")[1] || "";
    return recognizedInstitutionDomains.some(suffix => domain.endsWith(suffix));
};

module.exports.renderSignupForm = (req, res) => {
    res.render("./users/signup.ejs");
};

module.exports.renderStudentVerificationForm = (req, res) => {
    res.render("users/studentVerification.ejs", { user: req.user });
};

module.exports.submitStudentVerification = async (req, res) => {
    const { institution, institutionEmail, verificationType, verificationProof, verificationNote } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "Your account could not be found.");
        return res.redirect("/login");
    }
    if (!institution || institution.trim().length < 2) {
        req.flash("error", "Please enter your institution or organization name.");
        return res.redirect("/verify/student");
    }
    if (!["student", "intern", "other"].includes(verificationType)) {
        req.flash("error", "Please choose your student or intern status.");
        return res.redirect("/verify/student");
    }
    if (!verificationProof || verificationProof.trim().length < 20) {
        req.flash("error", "Add details about your proof. At least 20 characters.");
        return res.redirect("/verify/student");
    }
    if (!req.files || !req.files.length) {
        req.flash("error", "Please upload at least one proof document for enrollment or affiliation.");
        return res.redirect("/verify/student");
    }

    const uploadedDocs = req.files.map(file => file.path || file.filename).filter(Boolean);

    const normalizedInstitutionEmail = institutionEmail ? institutionEmail.trim().toLowerCase() : "";
    if (normalizedInstitutionEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedInstitutionEmail)) {
        req.flash("error", "Enter a valid institutional email address.");
        return res.redirect("/verify/student");
    }

    user.institution = institution.trim();
    user.institutionEmail = normalizedInstitutionEmail || undefined;
    user.institutionEmailDomain = normalizedInstitutionEmail ? normalizedInstitutionEmail.split("@")[1] : undefined;
    user.institutionEmailSignal = normalizedInstitutionEmail && hasRecognizedInstitutionDomain(normalizedInstitutionEmail)
        ? "recognized_domain"
        : "admin_review";
    user.verificationType = verificationType;
    user.verificationNote = verificationNote ? verificationNote.trim() : "";
    user.verificationDocs = uploadedDocs;
    user.verificationAdminNote = "";
    user.verificationStatus = "pending";
    user.verificationSubmittedAt = new Date();
    user.verificationVerifiedAt = undefined;
    user.verificationExpiresAt = undefined;
    user.institutionVerified = false;
    await user.save();

    req.flash("success", "Your student verification application has been submitted for review.");
    res.redirect(`/users/${user._id}`);
};

module.exports.renderHostApplication = (req, res) => {
    res.render("users/hostApplication.ejs", { user: req.user });
};

module.exports.submitHostApplication = async (req, res) => {
    const { hostType, hostApplicationNote } = req.body;
    const user = await User.findById(req.user._id);

    if (!user) {
        req.flash("error", "Your account could not be found.");
        return res.redirect("/login");
    }
    if (user.isVerifiedHost || user.hostApplicationStatus === "approved") {
        req.flash("success", "Your account is already approved to host.");
        return res.redirect("/listings/new");
    }
    if (!["owner", "tenant", "manager"].includes(hostType)) {
        req.flash("error", "Choose how you are connected to the room.");
        return res.redirect("/host/apply");
    }
    if (!hostApplicationNote || hostApplicationNote.trim().length < 30) {
        req.flash("error", "Add at least 30 characters explaining your connection to the room.");
        return res.redirect("/host/apply");
    }
    if (!req.files || !req.files.length) {
        req.flash("error", "Upload proof that matches your connection to the property.");
        return res.redirect("/host/apply");
    }

    user.hostType = hostType;
    user.hostApplicationNote = hostApplicationNote.trim();
    user.hostDocuments = req.files.map(file => file.path || file.filename).filter(Boolean);
    user.hostContactVerified = false;
    user.hostTrustFlags = [];
    user.hostApplicationAdminNote = undefined;
    user.hostApplicationStatus = "pending";
    user.hostApplicationSubmittedAt = new Date();
    await user.save();
    req.flash("success", "Your host application is ready for admin review.");
    res.redirect(`/users/${user._id}`);
};

module.exports.signup = async (req, res, next) => {
    try {
        const { name, email, username, dob, password } = req.body;
        const newUser = new User({ name, email, username, dob });
        await User.register(newUser, password);
        req.login(newUser, (err) => {
            if (err) {
                return next(err);
            }
            req.flash("success", `${username} registered successfully`);
            res.redirect("/listings");
        });
    } catch (err) {
        req.flash("error", err.message);
        res.redirect("/signup");
    }
};
module.exports.showProfile = async (req, res) => {
    const { id } = req.params;
    const user = await User.findById(id);
    const listings = await Listing.find({ owner: id });
    const reviews = await Review.find({ author: id }).populate("listing");
    if (!user) {
        req.flash("error","User Not Found");
        return res.redirect("/listings");
    }   
                            
    let verificationPortals = [];
    if (user.role === "admin" && req.user && req.user._id.equals(user._id)) {
        const [pendingListings, approvedListings, pendingStudents, approvedStudents, pendingHosts, approvedHosts] = await Promise.all([
            Listing.countDocuments({ verificationStatus: "pending" }),
            Listing.countDocuments({ verificationStatus: "verified" }),
            User.countDocuments({ verificationStatus: { $in: ["pending", "needs_information"] } }),
            User.countDocuments({ verificationStatus: "verified" }),
            User.countDocuments({ hostApplicationStatus: { $in: ["pending", "needs_information"] } }),
            User.countDocuments({ hostApplicationStatus: "approved" }),
        ]);

        verificationPortals = [
            { title: "Listing verification", description: "Review rooms before they appear as trusted listings.", icon: "fa-list-check", pending: pendingListings, approved: approvedListings, pendingHref: "/admin/listings/pending", approvedHref: "/admin/listings/pending?status=approved" },
            { title: "Student verification", description: "Review institution status and enrollment evidence.", icon: "fa-user-check", pending: pendingStudents, approved: approvedStudents, pendingHref: "/admin/students/pending", approvedHref: "/admin/students/pending?status=approved" },
            { title: "Host verification", description: "Review identity, authority, and room-access applications.", icon: "fa-house-circle-check", pending: pendingHosts, approved: approvedHosts, pendingHref: "/admin/hosts/pending", approvedHref: "/admin/hosts/pending?status=approved" },
        ];
    }

    res.render("users/showProfile.ejs", { user, listings, reviews, verificationPortals });
}
module.exports.renderLoginForm = (req, res) => {
    if (req.isAuthenticated()) {
        req.flash("success", "You are already logged in !");
        return res.redirect("/listings");
    }
    res.render("users/login.ejs");
};

module.exports.login = async (req, res) => {
    req.flash("success", `Welcome back ${req.body.username}`);
    res.redirect(res.locals.redirectUrl || "/listings");
};

module.exports.logout = (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        req.flash("success", "You logged out successfully");
        res.redirect("/listings");
    });
};


