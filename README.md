# Dimora

Dimora helps students and interns find a verified room for a 1-6 month stay when relocating to a new city for a semester or internship.

Generic listing sites are optimized for nightly travel. Dimora is for the harder move: finding a practical, trustworthy place to live temporarily, close to a campus or workplace, before arriving in an unfamiliar city.

## Product thesis

Dimora is verified, trust-scored housing for students and interns relocating for a semester or internship. It is not a generic "book any stay" marketplace.

## Design decisions

These decisions define the product as the housing workflows are built:

- **Verification state machine:** Listings move from `unverified` to `pending` when an owner requests review. An admin can move a listing to `verified` or `flagged`; flagged listings require a new review before they can be trusted again.
- **Trust score:** Verification should carry more weight than ratings because a relocating student needs confidence that the person and room are real before review quality can matter. Rating quality and review volume add evidence, but review volume is capped so it cannot be farmed.
- **Lease overlap invariant:** A room cannot have two active leases whose intervals overlap. For `[leaseStart, leaseEnd)`, two leases overlap when `existing.start < new.end && new.start < existing.end`; the database must enforce this under concurrent requests.

## Running locally

1. Create a `.env` file with the MongoDB connection and application secrets expected by the app.
2. Install dependencies with `npm install`.
3. Seed the database with `node init/index.js`.
4. Start the app with `node app.js`.
