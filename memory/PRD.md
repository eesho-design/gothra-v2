# GOTHRA E-commerce Platform - PRD

## Original Problem Statement
Create a full e-commerce website for GOTHRA - an entrepreneurial arm for proletarian women promoting indigenous, organic, and eco-friendly products.

## What's Been Implemented
- [x] Hero section with GOTHRA jute background (no text overlay)
- [x] 39 products across 7 categories from PDF catalog
- [x] Shopping cart with add/update/remove + customer name & email collection
- [x] **Razorpay Standard Checkout** — order creation, payment modal, signature verification
- [x] Stripe checkout integration (legacy, still functional)
- [x] About Us section with store interior image
- [x] Contact section with Trivandrum details
- [x] Image zoom modal on all products
- [x] Product Search with live results & Ctrl+K shortcut
- [x] Product Detail Pages with related products
- [x] Shop Page with category filter tabs
- [x] Newsletter subscription
- [x] Mobile-optimized responsive design (2-col grids, proper sizing)
- [x] Order email notifications (Resend — needs domain verification)
- [x] Scroll to top button
- [x] All images from user uploads (no stock photos)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, MongoDB (motor)
- Payments: Razorpay (primary), Stripe (legacy)
- Email: Resend (needs gothra.org domain verification)

## Key API Endpoints
- GET /api/products (with ?search= and ?category=)
- GET /api/products/{product_id}
- POST /api/cart/add, POST /api/cart/update, DELETE /api/cart/{session_id}
- POST /api/razorpay/create-order
- POST /api/razorpay/verify-payment
- POST /api/checkout/create-session (Stripe legacy)
- POST /api/newsletter/subscribe

## Remaining Tasks
- P0: Verify gothra.org domain in Resend for order emails
- P1: Admin dashboard, order history
- P2: Wishlist, reviews, analytics
