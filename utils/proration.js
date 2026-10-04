function proration(monthlyRate, leaseStart, leaseEnd) {
    if (leaseEnd <= leaseStart) {
        throw new Error("Lease end must be after lease start");
    }

    let fullMonths = 0;
    let current = new Date(leaseStart);

    while (true) {
        const next = new Date(current);
        next.setUTCMonth(next.getUTCMonth() + 1);

        if (next > leaseEnd) {
            break;
        }

        fullMonths++;
        current = next;
    }

    const extraDays =
        (leaseEnd - current) / (1000 * 60 * 60 * 24);

    const total =
        fullMonths * monthlyRate +
        extraDays * (monthlyRate / 30);

    return {
        fullMonths,
        extraDays,
        total
    };
}

module.exports = proration;