# GOTHRA E-commerce Platform - PRD

## Original Problem Statement
Create a full e-commerce website for GOTHRA - an entrepreneurial arm for proletarian women promoting indigenous, organic, and eco-friendly products. Features include Hero section (jute background, no text overlay), Product categories divided by type (Jute Curtains, Planters, Beauty, Herbs, Spices, Pickles, Punch), About section with store interior photo, Contact details, shopping cart with Stripe checkout, image zoom feature, product search, individual product pages, and order email notifications.

## What's Been Implemented
- [x] Hero section with GOTHRA jute background (no text overlay)
- [x] Product catalog with 39 products across 7 categories from PDF
- [x] Category sections: Jute Curtains, Planters, Beauty, Herbs, Spices, Pickles, Punch
- [x] Shopping cart with add/update/remove + name & email collection at checkout
- [x] Stripe checkout integration
- [x] About Us section with large, legible store interior image
- [x] Contact section with Trivandrum address, phone, email, Instagram
- [x] Image zoom modal on all product images
- [x] Product Search overlay with live results & popular suggestions (Ctrl+K shortcut)
- [x] Product Detail Pages with related products & breadcrumbs
- [x] Shop Page with category filter tabs
- [x] Newsletter subscription (backend storage)
- [x] Scroll to top button
- [x] Order email notifications (Resend integration - backend ready, needs domain verification)
- [x] Customer order confirmation emails (backend ready, needs domain verification)
- [x] All product images from user uploads / PDF extraction (no stock photos)
- [x] Virgin Coconut Oil updated with GOTHRA branded bottle image

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, MongoDB (motor)
- Payments: Stripe via emergentintegrations
- Email: Resend (needs gothra.org domain verification to go live)

## P0 Features Remaining
- Razorpay payment integration (when user provides API keys)
- Complete Resend domain verification (gothra.org) for order emails

## P1 Features Remaining
- Order history/tracking
- User authentication
- Admin dashboard

## P2 Features
- Wishlist/Favorites
- Product reviews & ratings
- WhatsApp order notifications
- Analytics

## Key API Endpoints
- GET /api/products (with ?search= and ?category=)
- GET /api/products/{product_id}
- POST /api/cart/add, POST /api/cart/update, DELETE /api/cart/{session_id}
- GET /api/cart/{session_id}
- POST /api/checkout/create-session (accepts customer_email, customer_name)
- GET /api/checkout/status/{stripe_session_id}
- POST /api/newsletter/subscribe
- POST /api/webhook/stripe

## Critical Notes
- DO NOT use stock photos
- Hero section: NO text overlay
- Email notifications ready in code but need gothra.org verified at resend.com/domains
- Resend API Key: stored in backend/.env
- Store notification email: 7gothra@gmail.com
