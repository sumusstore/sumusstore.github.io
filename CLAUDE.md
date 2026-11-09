# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (Nigerian multi-vendor e-commerce store for electrical building materials, laptop and gaming accessories, AC and refrigerator repair parts, solar and power products, smart home devices, phones, TVs and appliances, and third-party seller shops).
- **Live Site:** https://sumusstore.github.io
- **Tech Stack:** Next.js 15 (App Router, static export `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`), React 19, TypeScript 5 (strict mode), Tailwind CSS 4 (`@theme` in `app/globals.css`), Zustand 5 (persisted to `localStorage`), Supabase (Postgres, Auth, Storage, Edge Functions, `pg_cron`, `pg_net`), Paystack (card, bank, USSD), GitHub Pages (deployed via GitHub Actions on push to `main`).
- **Currency:** Nigerian Naira (₦). Prices stored as integers in kobo.

## Token-Saving & Workflow Rules
1. **Full File Replacement Mode:** Output the **complete, full code** for a single file when asked for a fix or feature so the old file can be deleted and the new one pasted in one go. Check that the last line is `}`.
2. **One File at a Time:** Focus strictly on the specific file requested (e.g., `components/product-detail-view.tsx`). Never rewrite or output multiple files or the whole project at once. Small, clearly marked edits (import line plus one replaced block) are acceptable when the user asks for them.
3. **Database Awareness:** Refer strictly to the tables, views, functions, and policies defined in `Database_Schema_Summary.md`. If code calls an RPC or table that is not in that file (for example `review_status`, `submit_review`, `seller_rating`, `mark_conversation_read`, `send_message`, `make_offer`, `respond_to_offer`, `withdraw_offer`, `start_conversation`, `admin_reviews`, `admin_moderate_review`, `admin_set_conversation_hidden`, `category_field_usage`, `products_missing_required`, `admin_confirm_bank_transfer`, `admin_set_order_status`, `seller_set_pause`), flag it and ask the user to confirm it exists in Supabase before relying on it.
4. **No Conversational Fluff:** Skip long greetings or repetitive explanations. Give the complete file code directly, followed by a short 1-sentence summary of what was updated.
5. **Security:** Never expose Supabase `service_role` keys or Paystack secret keys in client-side code. RLS policies must strictly use `(select auth.uid())`. Third-party sellers access public vendor data only through `public_sellers` or the explicitly granted columns on `sellers` (`id`, `slug`, `display_name`, `kind`, `state`, `created_at`, `status`). Private seller columns (`account_number`, `bank_name`, `owner_phone`, `address`, `registration_number`) must never be selected by visitor-facing code.
6. **Inline Responses:** The user prefers inline text responses over file-based or interactive outputs. Use files only for deliverables that are clearly needed as files.
7. **Plain-Language Support:** The owner is not a technical expert. Explain each step in plain language, say exactly where to click or paste, and state what the user should see when it works.

## Core Architecture & Reference Rules
- **Reference Model:** eBay ONLY for marketplace behaviour (seller shop pages, "Sold by" on every product with a shop link, listing filters and sort, eBay-style messaging, Best Offer). Slot.ng is the reference for the storefront layout (trust strip, category icons, deal rows, strong CTAs). Do not copy or refer to other marketplaces.
- **Approval System:** Sumus approves each seller and each product listing before it goes live. Sumus can hide any product or conversation at any time.
- **Multi-Vendor Model:** Products belong to Sumus (`seller_id` is null) or approved third-party sellers (`seller_id` linked to `sellers`). Approved public sellers are read via `public_sellers` (`security_invoker = true`).
- **Money Handling:** Prices are stored as integers in **kobo** (`price_kobo`, `amount_kobo`, `fee_kobo`, `total_kobo`) and formatted with `formatNaira(kobo)` (`lib/format.ts`). Admin and seller inputs use `nairaToKobo` and `koboToNairaText` (`lib/admin-utils.ts`).
- **Static Export Constraints:** Built with `output: "export"` and `trailingSlash: true`. Dynamic routes rely on `generateStaticParams`. Pages that depend on live data (shop, search, homepage rows, messages, account) read from Supabase in the browser.
- **Visual System:** Teal primary (`#0F5C5A`, via `blue-*` overrides), gold accent (`#C9A227`), paper background (`#FAF7F0`), ink text (`#1F2937`). Cards use `rounded-xl`, a 1px slate border, and a 4px gold top border (`border-t-4 border-t-gold`). Primary buttons use `rounded-full` on newer screens. Info page header bands are teal with a short gold bar beneath.
- **Mobile First:** Build for phones first, then `md` and `lg` breakpoints. Use the `hidden` / `lg:block` pattern for layouts that differ between phones and laptops, and render shared panels once where possible.

## Key Business Rules (copy and policy numbers)
- **Delivery:** Lagos 1 to 3 working days; outside Lagos 2 to 7 working days; store pickup free. Defined in `lib/store-policies.ts` (`POLICY_NUMBERS`) and mirrored in the `delivery_zones` table. Keep both in step.
- **Returns window:** 7 days. **Pickup hold:** 7 days.
- **Support hours:** Monday to Saturday, 9am to 6pm (`SUPPORT_HOURS`).
- **Offers:** 48-hour offer window and 3 offers per buyer per variant (`OFFER_RULES` in `lib/store-policies.ts`; enforced by `offer_window()` and `max_buyer_offers()`).
- **Seller commission:** Sumus keeps 10% of each sale; sellers keep 90%. Sellers deliver their own orders. Seller pages state this. Confirm with owner before building payouts.
- **Policy pages** (`lib/policy-content.ts`) are DRAFT wording and need legal review before launch. `POLICY_LAST_UPDATED` in `lib/store-policies.ts` must be updated on each change.

## Completed & Confirmed Features
- **Storefront:** Homepage (hero search, category icons, Today's deals / Price drops / New arrivals rows, trust strip, newsletter), shop (`/shop/`), category pages with subcategory chips, search (`/search/`), product pages with gallery, variants, quantity, buy buttons, similar items, reviews, and a details pop-up system, quick view, compare (max 4), wishlist, cart, guest and signed-in checkout (Paystack or bank transfer), order confirmation with card polling, order tracking (`/track/`), store locator (`/stores/`), FAQ, about, contact, bulk sales, policy pages, and 404.
- **Header:** Sticky header with a top strip (sign in, track, store locator, help, phone). Main row: SUMUS wordmark on the left; Search, Account, Cart and Menu icons on the right. Messages and Wishlist are not in the header (they live in the account dashboard). Search is an icon that opens a dropdown panel below the header and submits through app navigation to `/search/`. Desktop has a category bar with a mega menu.
- **Mobile menu (drawer):** Full-screen drawer with a three-level state machine (Root, Categories, Subcategory). Root shows Categories, Sell, Help (links to `/faq/`), and Sign In or Sign Out. Categories shows "Popular Categories" at the top (only if any category is marked popular), then "All Categories". Back arrow steps back one level; X closes the whole drawer. Category rows with children drill in; rows without children link to `/category/<slug>/`.
- **Accounts:** Sign up, log in, forgot and reset password, account dashboard (orders, addresses, wishlist, profile, password change, log out, messages). Wishlist syncs to the account when signed in; the cart does not sync. Email confirmation is currently off.
- **Product Detail Specifications:** Admin category field builder (`category_fields`) with required and filter flags, seller forms validated against required fields, dynamic filters in the catalogue sidebar (`buildSpecFacets`), specifications shown in the "Item description" pop-up in admin-defined order.
- **Best Offer:** Seller toggle (`accepts_offers`), in-app negotiation in message threads (accept, counter, decline, withdraw, pay at this price), offer cards with 48-hour expiry, cart and checkout offer pricing (`offerId` on cart items), automatic release on cancellation and unpaid card orders via cron.
- **Messaging:** `/messages/` inbox and thread view (`/messages/?c=<id>`), "Message" button on seller products (`MessageSellerButton`), "Make an offer" entry (`MakeOfferButton`, opens thread with `&offer=`), unread badge in the account area, seller dashboard messages card, admin messaging view (`admin-conversations.tsx`) with hide and restore. Thread polls every 20 seconds while visible.
- **Seller marketplace:** Application form with documents (`seller-application-form.tsx`, private `seller-documents` bucket, signed URLs), seller dashboard (`/my-shop/`), seller product editor with live checklist, brand request from sellers, versions, photos, pause and resume per product (`seller_set_pause`), public sellers index (`/sellers/`), public shop pages (`/seller/[slug]/`), seller rating shown when reviews exist.
- **Reviews:** Product page review form (`components/review-form.tsx`, RPCs `review_status` and `submit_review`) for customers who received the product; approved reviews shown on product pages; admin moderation (`admin-reviews.tsx`, RPCs `admin_reviews` and `admin_moderate_review`). Reviews show only after approval.
- **Admin (`/admin/`):** Tabs for Orders (confirm bank transfer, status changes, refunds that restock, cancel), Enquiries (mark replied), Messages, Reviews (approve, remove), Sellers (approve, reject, suspend, view documents), Products (create, hide and restore, visibility toggle, edit), Product fields (category field builder and missing-required report), Brands and categories (add and delete brands, create, edit and delete categories, with in-use checks, real database error text, and the Popular Categories switch). Unseen order and enquiry counts poll every 60 seconds with optional browser notifications. Paused products show a banner until acknowledged.
- **Build pipeline:** GitHub Actions deploy; rebuild queue (`rebuild_queue`) drained every 5 minutes by `rebuild-site` Edge Function via `pg_cron` and `pg_net`.

## Database Changes Covered in This Chat
- `categories.is_popular` (boolean, not null, default false). Main categories only, enforced by trigger `categories_popular_top_level_only`. Partial index `categories_popular_idx`. Drives "Popular Categories" in the mobile menu. Admin switch in `AdminPopularToggle`.
- `reviews`: `status` ('pending' | 'approved'), `verified_purchase` boolean. Customers may insert reviews only as pending and not verified; approval is admin-only.
- `products.seller_paused`, `products.seller_paused_at`, and `pause_seen_by_admin` (used by the admin pause banner).
- `products.accepts_offers` (boolean, default false).
- `offers` table and offer functions (`make_offer`, `respond_to_offer`, `withdraw_offer`, `release_offer_on_cancel`, `release_unpaid_offers`), with cron job `release-unpaid-offers`.
- `conversations.hidden_by_admin`, `conversations.last_sender_id`, `buyer_last_read_at`, `seller_last_read_at`, `buyer_name`, and the `start_conversation`, `send_message`, `mark_conversation_read`, `admin_set_conversation_hidden` functions.
- `enquiries.handled` (the UI uses `handled`; reconcile with any older `replied` references).
- `sellers` extended columns used by the application form: `business_name`, `registration_number`, `tax_id`, `owner_full_name`, `owner_phone`, `address`, `bank_name`, `account_name`, `account_number`, `terms_version`, `terms_accepted_at`, `admin_note`, `reviewed_at`. Visitors must not read the private ones.
- `seller_documents.doc_type` values: `registration`, `owner_id`, `genuine_proof`. Bucket `seller-documents` is private.
- `addresses` and `wishlist_items` use owner-only RLS.
- Storage bucket `product-images` is public. Path convention: `<product_id>/<timestamp>-<random>.jpg`. Helper `can_manage_product_photo(path)` must be kept when editing storage rules.
- `category_field_usage(p_category_id)` and `products_missing_required()` RPCs drive the Product fields admin screen.
- `seller_rating(p_slug)` RPC returns average and review_count for a seller.
- `pg_cron` runs `rebuild-site` every 5 minutes; `expire-offers` and `release-unpaid-offers` every 15 minutes.

## Decisions Made
- Header search is an icon with a dropdown panel. The homepage search is the only full-width search on the page.
- Mobile menu is a full-screen drawer, not a half-screen panel. Popular Categories sit at the top of the Categories view.
- Help in the mobile menu links to `/faq/`. Sell links to `/sell/`.
- Only main categories can be marked popular. Subcategories cannot.
- Product detail "Sold by" links to the seller shop; Sumus products link to `/about/`.
- Warranty period is shown on the product page under "Shop with confidence".
- The seller pause button is available to sellers (`seller_set_pause`). Suspending a seller hides their products immediately.
- Reviews require an approved review before display; the review form is shown on the product page and checks eligibility through the database.
- Category form and other admin screens show the real database error text, not a generic message.
- The seller editor and admin editor both hide a product while it is being edited, then decide visibility again at the end.
- Cart items priced by an accepted offer stay at quantity 1 and cannot be changed.

## Active Priority Task & Next Steps
1. **Wire in review form:** Add `ReviewForm` to `components/product-detail-view.tsx` in the Reviews section (replace the "comes with the account pages" paragraph). Confirm `review_status` and `submit_review` exist in Supabase.
2. **Test the mobile drawer and popular categories:** On a phone, confirm Popular Categories appears at the top of Menu, then Categories, after switching categories on in Admin, Brands and categories.
3. **Seller Payouts & Orders (next major build, pending owner confirmation):** Paystack subaccount on seller approval, split payment in `create-order` (90% seller, 10% Sumus; confirm who bears delivery fee and fee bearer), seller order view in My shop, and seller payout tracking.
4. **Launch items:** Replace bank details in `lib/bank-details.ts`; replace placeholder contact details in `lib/site-config.ts`; update store branches in Supabase `stores`; legal review of policy wording and seller terms; switch Paystack to live keys in GitHub and Supabase; set Paystack fee bearer to the store; enable email confirmation; upgrade Supabase to Pro; add own domain and update redirect URLs; enable 2FA on Supabase, GitHub and Paystack; delete the duplicate workflow file `.github/workflows /deploy.yml` (folder name contains a space); delete test data.
5. **Later:** Brand merge tool, coupons and discount codes, best sellers and frequently bought together, recently viewed, newsletter sending, transactional email and SMS (Resend, Termii), admin new-order email alert, live chat (optional).

## Known Fragile Areas
- Static product, category, and seller pages require Supabase to be reachable during build. Changes take up to 5 minutes to queue plus build time to appear on static pages; listing pages update live. Category changes, including Popular Categories, appear on static pages only after the next rebuild.
- Public seller data depends on column privileges. A plain `sellers` select as a visitor will error; use `public_sellers`.
- New RLS policies must use `(select auth.uid())` and avoid repeating existing checks.
- Storage seller rule depends on `can_manage_product_photo`. Do not replace with a folder-name comparison.
- `rebuild_queue.done` may not update reliably; verify before depending on it.
- Photo upload converts images in the browser; HEIC may fail on some browsers. Ask users to use JPG.
- Suspending a seller leaves their products hidden after reactivation until they save them again.
- Next.js is version 15 (earlier notes said 14).

## Key Commands
- Dev Server: `npm run dev`
- Build Project: `npm run build`
