const express = require("express");
const router = express.Router();
const wrapAsync = require("../utils/wrapAsync");
const { isLoggedIn, isStudentVerified, isApprovedHost } = require("../middleware");
const { doubleCsrfProtection } = require("../utils/csrf.js");
const bookingController = require("../controllers/booking.js");

router.get(
    "/:id/request-booking",
    isLoggedIn, isStudentVerified,
    wrapAsync(bookingController.requestBooking)
);
router.post(
    "/:id/request-booking",
    isLoggedIn,
    isStudentVerified,
    doubleCsrfProtection,
    wrapAsync(bookingController.sendBooking)
);
router.get("/view-bookings",
    isLoggedIn,
    isApprovedHost,
    wrapAsync(bookingController.viewAllBookings)
);
router.get("/:id/view-booking",
    isLoggedIn,
    isApprovedHost,
    wrapAsync(bookingController.viewBooking)
);
router.post("/:id/status",
    isLoggedIn,
    isApprovedHost,
    doubleCsrfProtection,
    wrapAsync(bookingController.updateBookingStatus)
);
module.exports = router; 