const { computeTrustScore, averageRating } = require("./trustScore");

const repeat = (rating, n) => Array(n).fill(rating);
const make = (status, ratings = []) => ({
    verificationStatus: status,
    reviews: ratings.map((rating) => ({ rating })),
});

describe("averageRating", () => {
    test("returns 0 for no reviews", () => {
        expect(averageRating([])).toBe(0);
    });

    test("averages multiple ratings", () => {
        expect(averageRating([{ rating: 2 }, { rating: 4 }])).toBe(3);
    });

    test("returns the rating itself for a single review", () => {
        expect(averageRating([{ rating: 5 }])).toBe(5);
    });
});

describe("computeTrustScore: no reviews", () => {
    test("verified listing", () => {
        expect(computeTrustScore(make("verified"))).toBe(53);
    });

    test("pending listing", () => {
        expect(computeTrustScore(make("pending"))).toBe(41);
    });

    test("unverified listing", () => {
        expect(computeTrustScore(make("unverified"))).toBe(33);
    });

    test("flagged listing", () => {
        expect(computeTrustScore(make("flagged"))).toBe(28);
    });

    test("missing reviews field behaves like an empty array", () => {
        expect(computeTrustScore({ verificationStatus: "verified" })).toBe(53);
    });

    test("unknown status earns no verification points", () => {
        expect(computeTrustScore(make("banana"))).toBe(28);
    });
});

describe("computeTrustScore: Bayesian smoothing", () => {
    test("a single 5-star review barely moves the score", () => {
        expect(computeTrustScore(make("verified", [5]))).toBe(57);
    });

    test("a single 1-star review does not tank the score", () => {
        expect(computeTrustScore(make("verified", [1]))).toBe(52);
    });

    test("rating matters more as review count grows", () => {
        const gapOne =
            computeTrustScore(make("verified", [5])) -
            computeTrustScore(make("verified", [1]));
        const gapTen =
            computeTrustScore(make("verified", repeat(5, 10))) -
            computeTrustScore(make("verified", repeat(1, 10)));
        expect(gapTen).toBeGreaterThan(gapOne);
    });
});

describe("computeTrustScore: review confidence", () => {
    test("more reviews at the same rating score higher", () => {
        expect(computeTrustScore(make("verified", repeat(4, 2)))).toBe(73);
        expect(computeTrustScore(make("verified", repeat(4, 10)))).toBe(93);
    });

    test("confidence saturates at 10 reviews", () => {
        expect(computeTrustScore(make("verified", repeat(4, 50)))).toBe(
            computeTrustScore(make("verified", repeat(4, 10)))
        );
    });
});

describe("computeTrustScore: consistency", () => {
    test("uniform ratings beat polarized ratings with the same mean", () => {
        const uniform = make("verified", repeat(3, 10));
        const polarized = make("verified", [1, 5, 1, 5, 1, 5, 1, 5, 1, 5]);
        expect(computeTrustScore(uniform)).toBe(88);
        expect(computeTrustScore(polarized)).toBe(76);
    });
});

describe("computeTrustScore: verification status", () => {
    test("verified > pending > unverified > flagged for identical reviews", () => {
        const ratings = repeat(4, 5);
        const v = computeTrustScore(make("verified", ratings));
        const p = computeTrustScore(make("pending", ratings));
        const u = computeTrustScore(make("unverified", ratings));
        const f = computeTrustScore(make("flagged", ratings));
        expect(v).toBeGreaterThan(p);
        expect(p).toBeGreaterThan(u);
        expect(u).toBeGreaterThan(f);
    });
});

describe("computeTrustScore: bounds and purity", () => {
    test("clamps to 100 on out-of-range input", () => {
        expect(computeTrustScore(make("verified", repeat(100, 100)))).toBe(100);
    });

    test("clamps to 0 on out-of-range input", () => {
        expect(computeTrustScore(make("flagged", repeat(-100, 100)))).toBe(0);
    });

    test("always returns an integer in [0, 100] across a grid of inputs", () => {
        const statuses = ["verified", "pending", "unverified", "flagged", undefined];
        for (const status of statuses) {
            for (let n = 0; n <= 25; n++) {
                for (let r = 1; r <= 5; r++) {
                    const score = computeTrustScore(make(status, repeat(r, n)));
                    expect(Number.isInteger(score)).toBe(true);
                    expect(score).toBeGreaterThanOrEqual(0);
                    expect(score).toBeLessThanOrEqual(100);
                }
            }
        }
    });

    test("does not mutate its input", () => {
        const listing = make("verified", [5, 3, 4]);
        const before = JSON.stringify(listing);
        computeTrustScore(listing);
        expect(JSON.stringify(listing)).toBe(before);
    });

    test("is deterministic", () => {
        const listing = make("pending", [5, 2, 4, 4]);
        expect(computeTrustScore(listing)).toBe(computeTrustScore(listing));
    });
});