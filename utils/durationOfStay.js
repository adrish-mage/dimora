function getDays(checkIn, checkOut) {
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);

    return (checkOutDate - checkInDate) / (1000 * 60 * 60 * 24);
}

module.exports = { getDays };