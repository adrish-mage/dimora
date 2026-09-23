<p align="center">
  <img src="./public/image.png" alt="Dimora" width="72" />
</p>
<h1 align="center">Dimora</h1>
<p align="center"><b>Verified housing for students and interns relocating for 1–6 months.</b></p>



<p align="center">Most listing sites are built for a two-night trip: nice photos, a map pin, a price. Moving somewhere for a semester or an internship is a different problem. You're picking a place sight unseen, you don't know the city, and you have no way to tell if the listing or the person behind it is real. Dimora is built around that problem specifically.</p>

<p align="center">
  <a href="https://dimora.adrish.me">
    <img src="https://img.shields.io/badge/dimora.adrish.me-live-brightgreen?style=flat-square" alt="Live status">
  </a>
</p>

---

<h2 align="center">PRODUCT TOUR</h2>

<p align="center"><b>BROWSE LISTINGS</b></p>

<div align="center">

| | |
|---|---|
| <img width="1906" height="971" alt="image" src="https://github.com/user-attachments/assets/3e92918f-785b-44ed-903e-7e2deab93ccc" /> | <img width="1905" height="968" alt="image" src="https://github.com/user-attachments/assets/9d5ce302-948d-4f8c-99e8-162d1b691c07" /> |

</div>

<p align="center"><b>LISTING DETAIL + TRUST SCORE</b></p>

<div align="center">

| | |
|---|---|
| <img width="1901" height="970" alt="image" src="https://github.com/user-attachments/assets/e222ab80-32d4-4452-a9bd-ea2804a9f308" /> | <img width="1901" height="967" alt="image" src="https://github.com/user-attachments/assets/7701e944-de00-4423-9eee-ac2e56e23f52" /> |

</div>

<p align="center"><b>ADMIN VERIFICATION DESK</b></p>

<div align="center">

| | |
|---|---|
| <img width="1917" height="972" alt="image" src="https://github.com/user-attachments/assets/fada6108-40c1-478e-a1d0-621539d2707e" /> | <img width="1900" height="971" alt="image" src="https://github.com/user-attachments/assets/588c87c6-d9cc-4336-8a71-27776e62cf61" /> |

</div>

<p align="center"><b>HOST AND STUDENT VERIFICATION</b></p>

<div align="center">

| | |
|---|---|
| <img width="1682" height="968" alt="image" src="https://github.com/user-attachments/assets/47495994-e300-471a-9d16-08feb12b2417" /> | <img width="1900" height="962" alt="image" src="https://github.com/user-attachments/assets/0098b643-6fe7-4662-a159-8818eb4bb4a2" /> |

</div>

---

<h2 align="center">WHAT'S HERE (PART 1: DISCOVER + TRUST)</h2>

- Room search and browsing, filtered by campus/workplace proximity
- Host profiles
- Human-reviewed listing verification (admin approves/rejects, not self-attested)
- A trust score that combines verification status, rating quality, and review volume, not a single opaque number
- Reviews and ratings tied to listings
- Auth, CSRF protection, and rate-limited login/signup

<p align="center">Two more parts are planned: booking requests + host decisions, then saved rooms/comparisons and the wider relocation flow. Neither is built yet; this repo is Part 1 only.</p>

---

<h2 align="center">ROADMAP</h2>

- [x] **Part 1: Discover + Trust**: search, verification, trust scoring, reviews
- [ ] **Part 2: Request + Secure**: booking requests, host decisions, move-in dates, in-app communication
- [ ] **Part 3: Relocate + Grow**: saved rooms, comparisons, relocation tools

---

<h2 align="center">HOW THE TRUST SCORE WORKS</h2>

<p align="center">Verification counts for more than ratings, because before review quality matters at all, you need to know the room and the host are real. The score is a weighted sum out of 100:</p>

<div align="center">

| Component | Weight | Notes |
|---|---|---|
| Rating quality | 35 | Bayesian-adjusted average, so a single 5-star review doesn't outweigh ten honest 4-stars |
| Review confidence | 25 | Scales with review count, caps out at 10 reviews (can't be farmed past that) |
| Verification status | 25 | Verified > pending > unverified |
| Rating consistency | 15 | Penalizes high variance; wildly mixed reviews lower the score even if the average looks fine |

</div>

Logic lives in [`utils/trustScore.js`](./utils/trustScore.js), fully commented and unit-testable in isolation from the rest of the app.

---

<h2 align="center">LISTING VERIFICATION FLOW</h2>

```
unverified ──(owner requests review)──▶ pending ──▶ verified
                                            │
                                            ▼
                                         flagged ──(needs re-review)──▶ pending
```

Admins handle this through a dedicated verification desk (`/admin/verification`), not a database flag someone can self-set. Student identity and host applications go through the same reviewed-by-a-human pattern (`/admin/students/pending`, `/admin/hosts/pending`).

---

<h2 align="center">API / ROUTE MAP</h2>

<details>
<summary>Public</summary>

<div align="center">

| Method | Route | Description |
|---|---|---|
| GET | `/` | Home |
| GET | `/listings` | Browse/search listings |
| GET | `/listings/:id` | Listing detail + trust score |
| GET | `/signup`, `/login` | Auth forms |
| POST | `/signup`, `/login` | Auth actions (rate-limited) |

</div>

</details>

<details>
<summary>Authenticated</summary>

<div align="center">

| Method | Route | Description |
|---|---|---|
| GET/POST | `/listings/new` | Create listing (approved hosts only) |
| PUT | `/listings/:id` | Edit listing (owner only) |
| DELETE | `/listings/:id` | Delete listing (owner only) |
| POST | `/listings/:id/request-verification` | Owner submits for review |
| POST | `/listings/:id/reviews` | Leave a review |
| DELETE | `/listings/:id/reviews/:reviewId` | Remove a review |
| GET/POST | `/verify/student` | Student ID verification |
| GET/POST | `/host/apply` | Host application |

</div>

</details>

<details>
<summary>Admin only</summary>

<div align="center">

| Method | Route | Description |
|---|---|---|
| GET | `/admin/verification` | Verification desk overview |
| GET/POST | `/admin/listings/pending`, `/admin/listings/:id/approve`, `/admin/listings/:id/reject` | Listing review queue |
| GET/POST | `/admin/students/pending`, `/admin/students/:id/{approve,reject,needs-information}` | Student ID review queue |
| GET/POST | `/admin/hosts/pending`, `/admin/hosts/:id/{approve,reject,needs-information}` | Host application review queue |

</div>

</details>

<p align="center">Every state-changing route is behind <code>isLoggedIn</code>/<code>isOwner</code>/<code>isAdmin</code> and CSRF-protected.</p>

---

<h2 align="center">PROJECT STRUCTURE</h2>

```
dimora/
├── app.js               entry point: middleware, sessions, routes, error handling
├── middleware.js         auth guards, ownership checks, request validation
├── schemaValidator.js    Joi schemas for listings/reviews
├── cloudConfig.js        Cloudinary storage config for image uploads
├── routes/               listings, reviews, users, admin
├── controllers/          route handlers, one file per resource
├── models/               Mongoose schemas (User, Listing, Review) + init/ seed data
├── utils/                trustScore, expressError, csrf, wrapAsync
├── views/                EJS templates (listings, users, admin, layouts, includes)
└── public/               static assets (css, js, images)
```

---

<h2 align="center">STACK</h2>

<p align="center">
  <img src="https://img.shields.io/badge/Node.js-339933?style=flat&logo=node.js&logoColor=white" alt="Node.js">
  <img src="https://img.shields.io/badge/Express-000000?style=flat&logo=express&logoColor=white" alt="Express">
  <img src="https://img.shields.io/badge/MongoDB-47A248?style=flat&logo=mongodb&logoColor=white" alt="MongoDB">
  <img src="https://img.shields.io/badge/Mongoose-880000?style=flat&logo=mongoose&logoColor=white" alt="Mongoose">
  <img src="https://img.shields.io/badge/EJS-B4CA65?style=flat&logo=ejs&logoColor=black" alt="EJS">
  <img src="https://img.shields.io/badge/Passport.js-34E27A?style=flat&logo=passport&logoColor=white" alt="Passport.js">
  <img src="https://img.shields.io/badge/Cloudinary-3448C5?style=flat&logo=cloudinary&logoColor=white" alt="Cloudinary">
  <img src="https://img.shields.io/badge/Render-46E3B7?style=flat&logo=render&logoColor=white" alt="Render">
</p>

---

<h2 align="center">RUNNING LOCALLY</h2>

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

---

<h2 align="center">STATUS</h2>

<p align="center">Solo project, actively being built. Part 1 is live and usable end to end (sign up, browse, list a room, request verification, leave a review). No license file yet, so treat this as "source visible, all rights reserved" until one's added. Feedback and issues welcome.</p>