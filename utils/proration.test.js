const proration = require("./proration");

function utcDate(value) {
    return new Date(`${value}T00:00:00.000Z`);
}

describe("monthly lease proration", () => {
    test("charges one monthly rate for exactly one calendar month", () => {
        expect(proration(30000, utcDate("2026-04-01"), utcDate("2026-05-01"))).toEqual({
            fullMonths: 1,
            extraDays: 0,
            total: 30000
        });
    });

    test("prorates a 45-day lease as one month plus 15 days", () => {
        expect(proration(30000, utcDate("2026-04-01"), utcDate("2026-05-16"))).toEqual({
            fullMonths: 1,
            extraDays: 15,
            total: 45000
        });
    });

    test("prorates a 10-day lease on a 30-day monthly basis", () => {
        expect(proration(30000, utcDate("2026-04-01"), utcDate("2026-04-11"))).toEqual({
            fullMonths: 0,
            extraDays: 10,
            total: 10000
        });
    });

    test("charges three monthly rates for three calendar months", () => {
        expect(proration(30000, utcDate("2026-04-01"), utcDate("2026-07-01"))).toEqual({
            fullMonths: 3,
            extraDays: 0,
            total: 90000
        });
    });

    test.each([
        ["same date", "2026-04-01", "2026-04-01"],
        ["earlier end date", "2026-04-02", "2026-04-01"]
    ])("rejects %s", (_label, start, end) => {
        expect(() => proration(30000, utcDate(start), utcDate(end)))
            .toThrow("Lease end must be after lease start");
    });
});