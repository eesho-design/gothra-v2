# GOTHRA E-commerce Platform - PRD

## Original Problem Statement
Create a full e-commerce website for GOTHRA - an entrepreneurial arm for proletarian women promoting indigenous, organic, and eco-friendly products. Features include Hero section (jute background, no text overlay), Product categories divided by type (Jute Curtains, Planters, Beauty, Herbs, Spices, Pickles, Punch), About section with store interior photo, Contact details, shopping cart with Stripe checkout, and image zoom feature.

## User Personas
1. **Conscious Consumer**: Looking for ethically sourced, organic products
2. **Gift Buyer**: Seeking unique, artisanal products from India
3. **Supporter of Women Entrepreneurs**: Wants to contribute to women's livelihoods

## Core Requirements
- Product catalog with 39 products matching PDF catalog exactly
- Product categories: Jute Curtains, Planters, Beauty, Herbs, Spices, Pickles, Punch
- Shopping cart functionality
- Stripe payment integration
- Image enlargement/zoom on product click
- Earthy, minimalist design (raw jute, terracotta, deep forest green)
- NO stock photos - only user-uploaded or PDF-extracted images
- Hero section: clean jute background with GOTHRA logo, NO text overlay
- About Us section with store interior photo displayed large and legibly
- Contact section with Trivandrum store details

## What's Been Implemented (Apr 2026)
- [x] Hero section with GOTHRA jute background (no text overlay)
- [x] Product catalog with 39 products across 7 categories from PDF
- [x] Category sections: Jute Curtains, Planters, Beauty, Herbs, Spices, Pickles, Punch
- [x] Shopping cart with add/update/remove functionality
- [x] Stripe checkout integration
- [x] About Us section with large, legible store interior image (homepage + /about page)
- [x] Contact section with Trivandrum address, phone, email, Instagram
- [x] Image zoom modal on all product images
- [x] Footer with contact info
- [x] Sticky header with navigation
- [x] Mobile responsive design
- [x] All product images from user uploads / PDF extraction (no stock photos)

## Tech Stack
- Frontend: React, Tailwind CSS, Shadcn/UI
- Backend: FastAPI, MongoDB (motor)
- Payments: Stripe via emergentintegrations

## P0/P1/P2 Features Remaining
### P0 (Critical)
- None - core e-commerce flow complete

### P1 (Important)
- Component refactoring: Break monolithic App.js (1300+ lines) into modular components
- Order history/tracking
- User authentication

### P2 (Nice to have)
- Product search
- Wishlist
- Reviews & ratings
- Email order confirmation

## Key API Endpoints
- GET /api/products
- POST /api/cart/add
- GET /api/cart/{session_id}
- POST /api/cart/update
- DELETE /api/cart/{session_id}
- POST /api/checkout/create-session

## DB Schema
- products: {id, name, description, price, image_url, category, subcategory}
- carts: {session_id, items: [{product_id, quantity}]}
- payment_transactions: {session_id, amount, status}

## Critical Notes
- DO NOT use stock photos - user is highly sensitive to this
- Hero section must have NO text overlay
- Store interior image is a screenshot uploaded by user (1358x764px)
