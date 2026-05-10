# GOTHRA E-commerce Platform - PRD

## Original Problem Statement
Create a full e-commerce website for GOTHRA - an entrepreneurial arm for proletarian women promoting indigenous, organic, and eco-friendly products.

## What's Been Implemented
- [x] Hero section with GOTHRA jute background (no text overlay)
- [x] 39 products across 7 categories from PDF catalog
- [x] Shopping cart with customer name & email collection
- [x] **Razorpay Standard Checkout** with signature verification
- [x] Stripe checkout (legacy)
- [x] **Clerk Auth on /admin** — SignedIn + Protect wrapping admin dashboard
- [x] **Admin Dashboard** — Orders table, revenue/orders/products/subscribers stats
- [x] About Us, Contact, Newsletter, Image Zoom
- [x] Product Search, Product Detail Pages, Shop with category filters
- [x] Mobile-optimized responsive design
- [x] Order email notifications (Resend — needs domain verification)
- [x] Scroll to top, all images from user uploads

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI, @clerk/clerk-react
- Backend: FastAPI, MongoDB, razorpay SDK
- Payments: Razorpay (primary), Stripe (legacy)
- Auth: Clerk (admin dashboard)
- Email: Resend (pending domain verification)

## Key Routes
- `/` — Homepage
- `/shop` — All products with category filters
- `/product/:id` — Product detail
- `/about`, `/contact` — Info pages
- `/admin` — Clerk-protected admin dashboard
- `/checkout/success` — Payment confirmation

## Remaining
- P0: Verify gothra.org in Resend for emails
- P1: Order history for customers
- P2: Wishlist, reviews, analytics
