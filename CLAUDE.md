# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (Nigerian multi-vendor e-commerce store for electrical building materials, gaming/laptop accessories, AC/refrigerator repair parts, solar/power products, smart home devices, and third-party seller shops).
- **Live Site:** https://sumusstore.github.io
- **Tech Stack:** Next.js 15 (App Router, static export `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`), React 19, TypeScript 5 (strict mode), Tailwind CSS 4 (`@theme` in `app/globals.css`), Zustand 5 (persisted to `localStorage`), Supabase (Postgres, Auth, Storage, Edge Functions, `pg_cron`, `pg_net`), Paystack (card, bank, USSD), GitHub Pages (deployed via GitHub Actions on push to `main`).

## Token-Saving & Workflow Rules
1. **Full File Replacement Mode:** Output the **complete, full code** for a single file when asked for a fix or feature so the old file can be deleted and the new one pasted in one go. Check that the last line is `}`.
2. **One File at a Time:** Focus strictly on the specific file requested (e.g., `components/product-detail-view.tsx`). Never rewrite or output multiple files or the whole project at once.
3. **Strict Feature Protection & Invariance:** **Never modify, refactor, remove, or alter any existing feature, logic, styling, or architecture unless explicitly requested by the user.** If a file or feature is working as intended, leave its surrounding implementation strictly untouched when applying targeted updates.
4. **Documentation Rule (No HANDOFF.md):** Never ask for, reference, or expect a `HANDOFF.md` file. All core historical context, active features, and guidelines are fully covered by `CLAUDE.md` and `Database_Schema_Summary.md`.
5. **Database Awareness:** Refer strictly to the tables, views, and functions defined in `Database_Schema_Summary.md` (`products`, `product_variants`, `sellers`, `public_sellers`, `orders`, `conversations`, `messages`, `offers`, `category_fields`, etc.).
6. **No Conversational Fluff:** Skip long greetings or repetitive explanations. Give the complete file code directly, followed by a short 1-sentence summary of what was updated.
7. **Security:** Never expose Supabase `service_role` keys or Paystack secret keys in client-side code. RLS policies must strictly use `(select auth.uid())`. Third-party sellers access public vendor data only through `public_sellers` or explicitly granted columns (`id`, `slug`, `display_name`, `kind`, `state`, `created_at`, `status`).

## Core Architecture & Reference Rules
- **Reference Model:** eBay ONLY (seller shop pages, "Sold by" on every product with a shop link, listings filters/sort, eBay-style messaging, and Best Offer). Do not copy or refer to other marketplaces.
- **Approval System:** Sumus approves each seller and each product listing before it goes live. Sumus can hide any product or conversation at any time.
- **Multi-Vendor Model:** Products belong to Sumus (`seller_id` is null) or approved third-party sellers (`seller_id` linked to `sellers`). Approved public sellers are queried via `public_sellers` (`security_invoker = true`).
- **Money Handling:** Prices are stored as integers in **kobo** (`price_kobo`, `amount_kobo`) and formatted using `formatNaira(kobo)` (`lib/format.ts`).
- **Static Export Constraints:** Built with `output: "export"` and `trailingSlash: true`. Dynamic routes rely on `generateStaticParams`.

## Completed & Confirmed Features
- **In-App Buyer-Seller Messaging:** `/messages/` inbox and conversation view (`/messages/?c=<id>`), message button on seller products, unread badge in header, seller dashboard messages card, admin messaging view (`components/admin-conversations.tsx`).
- **Best Offer ("Make an offer"):** Seller toggle (`accepts_offers`), in-app negotiation flow inside message thread, offer cards (Accept, Counter, Decline, Withdraw, Pay at this price), 48-hour expiration (`offer_window()`), 3 lifetime buyer offers per variant (`max_buyer_offers()`), cart/checkout offer pricing, automatic offer release on order cancellation trigger (`release_offer_on_cancel()`) or unpaid card orders via cron (`release_unpaid_offers()`).
- **Product Specification Fields:** Admin category field builder (`category_fields`), required validation on seller forms, dynamic filters in catalogue sidebar (`specFacets`), specifications rendered on product page.
- **Seller Controls:** Seller pause/resume per product (`seller_paused`), document uploads (`seller_documents`), live checklist.

## Active Priority Task & Next Steps
- **Replacing WhatsApp Links:** Replacing remaining legacy WhatsApp links (wishlist, contact page, footer, Sumus-stock messaging) with in-app flows step-by-step.
- **Seller Payouts & Orders:** Paystack subaccount setup, split payments (90/10 proposal), seller order management in My Shop.
- **Verified Reviews & Moderation:** Admin review approval screen and verified buyer review forms.

## Key Commands
- Dev Server: `npm run dev`
- Build Project: `npm run build`
