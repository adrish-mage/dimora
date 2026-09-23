# Dimora

Verified housing for students and interns relocating for 1–6 months.

Most listing sites are built for a two-night trip: nice photos, a map pin, a price. Moving somewhere for a semester or an internship is a different problem. You're picking a place sight unseen, you don't know the city, and you have no way to tell if the listing or the person behind it is real. Dimora is built around that problem specifically.

Live: [dimora.adrish.me](https://dimora.adrish.me)

## What's here (Part 1: Discover + Trust)

- Room search and browsing, filtered by campus/workplace proximity
- Host profiles
- Human-reviewed listing verification (admin approves/rejects, not self-attested)
- A trust score that combines verification status, rating quality, and review volume, not a single opaque number
- Reviews and ratings tied to listings
- Auth, CSRF protection, and rate-limited login/signup

Two more parts are planned: booking requests + host decisions, then saved rooms/comparisons and the wider relocation flow. Neither is built yet; this repo is Part 1 only.

## How the trust score works

Verification counts for more than ratings, because before review quality matters at all, you need to know the room and the host are real. The score is a weighted sum:

| Component | Weight | Notes |
|---|---|---|
| Rating quality | 35 | Bayesian-adjusted average, so a single 5-star review doesn't outweigh ten honest 4-stars |
| Review confidence | 25 | Scales with review count, caps out at 10 reviews (can't be farmed past that) |
| Verification status | 25 | Verified > pending > unverified |
| Rating consistency | 15 | Penalizes high variance; wildly mixed reviews lower the score even if the average looks fine |

Logic lives in [`utils/trustScore.js`](./utils/trustScore.js).

## Listing verification flow

```
unverified → (owner requests review) → pending → verified
                                              ↘ flagged (needs re-review)
```

Admins handle this through a dedicated verification desk (`/admin/verification`), not a database flag someone can self-set.

## Stack

Node, Express, MongoDB/Mongoose, EJS, Passport (local strategy), Cloudinary for image storage.

## Running locally

1. Copy `.env.example` (or create `.env`) with:
   ```
   MONGO_URI=
   SESSION_SECRET=
   CSRF_SECRET=
   CLOUD_NAME=
   CLOUD_API_KEY=
   CLOUD_API_SECRET=
   PORT=8080          # optional, defaults to 8080
   NODE_ENV=development
   ```
2. `npm install`
3. Seed the database: `node models/init/index.js`
4. `node app.js`

## Status

Solo project, actively being built. Part 1 is live and usable end to end (sign up, browse, list a room, request verification, leave a review). Feedback and issues welcome.