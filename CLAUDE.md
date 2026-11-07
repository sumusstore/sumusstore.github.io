# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (Nigerian multi-vendor e-commerce store for electrical building materials, laptop and gaming accessories, AC and refrigerator repair parts, solar and power products, smart home devices, phones, TVs and appliances, and third-party seller shops).
- **Live Site:** https://sumusstore.github.io
- **Repository:** https://github.com/sumusstore/sumusstore.github.io
- **Tech Stack:** Next.js 15 (App Router, static export `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`), React 19, TypeScript 5 (strict mode), Tailwind CSS 4 (`@theme` in `app/globals.css`), Zustand 5 (persisted to `localStorage`), Supabase (Postgres, Auth, Storage, Edge Functions, `pg_cron`, `pg_net`), Paystack (card, bank, USSD), GitHub Pages (deployed via GitHub Actions on push to `main`).
- **Currency:** Nigerian Naira (₦). Prices stored as integers in kobo.

## Working Rules for the AI
1. **Complete files only:** Output the complete, full code for each file that changes, so the owner can replace the file in one paste. Never send snippets, partial edits or "add this line" instructions, because the owner is not a technical expert.
2. **Full file integrity:** Each file must end with its closing brace or export. A truncated paste causes "Unexpected eof" build failures. If a file is long, split the feature into smaller files rather than sending a cut-off file.
3. **Exact file paths:** Every import must match a real file path. State the exact path (for example `components/saved-feed.tsx`) for each new or replaced file.
4. **One feature at a time:** Focus on the specific feature requested. Do not rewrite unrelated files.
5. **Database awareness:** Refer strictly to the tables, views, functions and policies in `Database_Schema_Summary.md`. If code calls an RPC or table not listed there, flag it and ask the owner to confirm it exists in Supabase before relying on it.
6. **Inline responses:** Keep replies in plain text. Use files only for the code deliverables. Skip long greetings and repeated explanations. Give the code, then a short summary.
7. **Check the design first:** Match controls to the owner's screenshots exactly (for example, a dropdown stays a dropdown). Ask if unsure.
8. **Ask before deciding money rules:** Do not build payout logic until the owner has answered the payout questions in the Active Priority Task section.
9. **Security:** Never expose Supabase `service_role` keys or Paystack secret keys in client code. RLS policies must use `(select auth.uid())`. Visitor-facing code must not select private seller columns (`account_number`, `bank_name`, `owner_phone`, `address`, `registration_number`, `account_name`, `tax_id`). Visitors read seller data only through `public_sellers`, or the granted columns on `sellers` (`id`, `slug`, `display_name`, `kind`, `state`, `created_at`, `status`).

## Core Architecture & Reference Rules
- **Reference Model:** eBay for marketplace behaviour (seller shop pages, "Sold by" with a shop link, listing filters and sort, eBay-style messaging, Best Offer, My eBay style account menu and Saved feed). Slot.ng for the storefront layout (trust strip, category icons, deal rows, strong CTAs). Do not copy or refer to other marketplaces by name in the UI.
- **Approval System:** Sumus approves each seller and each product listing before it goes live. Sumus can hide any product or conversation at any time.
- **Multi-Vendor Model:** Products belong to Sumus (`seller_id` is null) or approved third-party sellers (`seller_id` linked to `sellers`). Approved public sellers are read via `public_sellers` (`security_invoker = true`).
- **Money Handling:** Prices are stored as integers in kobo (`price_kobo`, `amount_kobo`, `fee_kobo`, `total_kobo`) and formatted with `formatNaira(kobo)` (`lib/format.ts`). Admin and seller inputs use `nairaToKobo` and `koboToNairaText` (`lib/admin-utils.ts`).
- **Static Export Constraints:** Built with `output: "export"` and `trailingSlash: true`. Dynamic routes rely on `generateStaticParams`. Pages that depend on live data (shop, search, homepage rows, messages, account, saved feed) read from Supabase in the browser.
- **Visual System:** Teal primary (`#0F5C5A`, via `blue-*` overrides), gold accent (`#C9A227`), paper background (`#FAF7F0`), ink text (`#1F2937`). Cards use `rounded-xl`, a 1px slate border and a 4px gold top border (`border-t-4 border-t-gold`). Primary buttons use `rounded-full`. Info page header bands are teal with a short gold bar beneath.
- **Mobile First:** Build for phones first, then `md` and `lg`. Use the `hidden` / `lg:block` pattern where layouts differ, and render shared panels once where possible.

## Key Business Rules
- **Delivery:** Lagos 1 to 3 working days; outside Lagos 2 to 7 working days; store pickup free. Defined in `lib/store-policies.ts` (`POLICY_NUMBERS`) and mirrored in the `delivery_zones` table. Keep both in step.
- **Returns window:** 7 days. **Pickup hold:** 7 days.
- **Support hours:** Monday to Saturday, 9am to 6pm (`SUPPORT_HOURS`).
- **Offers:** 48-hour offer window and 3 offers per buyer per variant (`OFFER_RULES` in `lib/store-policies.ts`; enforced by `offer_window()` and `max_buyer_offers()`).
- **Seller commission (pending confirmation):** Sumus keeps 10% of each sale; sellers keep 90%. Sellers deliver their own orders. The payout terms are not yet final (see Active Priority Task).
- **Policy pages** (`lib/policy-content.ts`) are DRAFT wording and need legal review before launch. Update `POLICY_LAST_UPDATED` in `lib/store-policies.ts` on each change.

## Completed & Confirmed Features
- **Storefront:** Homepage (hero search, category icons, Today's deals / Price drops / New arrivals rows, trust strip, newsletter), shop (`/shop/`), category pages with subcategory chips, search (`/search/`), product pages with gallery, variants, quantity, buy buttons, similar items, reviews and a details pop-up system, quick view, compare (max 4), wishlist, cart, guest and signed-in checkout (Paystack or bank transfer), order confirmation with card polling, order tracking (`/track/`), store locator (`/stores/`), FAQ, about, contact, bulk sales, policy pages and 404.
- **Search:** Results page (`/search/`) with a "Save this search" button. Guests are sent to log in and returned to the same search.
- **Header:** Sticky header with a top strip (sign in, track, store locator, help, phone), main row (menu, logo, icon row: search, account, messages, wishlist, cart) and a desktop category bar with mega menu. The search icon opens a dropdown search panel.
- **Account menu (My Sumus, `/account/`):** Rows in this order: Messages, Watchlist, Saved feed (NEW), Saved (not built), Buy again, Purchases, Addresses, Bids & offers, Recently viewed, Selling, Payments (NEW, not built), Account settings. Preferences, My Collection and My Garage were removed by decision. Rows without a link show "Coming soon".
- **Account pages:**
  - `/account/orders/` (Purchases, via `components/orders-list.tsx`)
  - `/account/addresses/` (via `components/addresses-panel.tsx` and `components/account-addresses.tsx`)
  - `/account/profile/` (Account settings, via `components/profile-panel.tsx`)
  - `/account/recently-viewed/` (via `components/recently-viewed.tsx`, with Clear history)
- **Saved feed (`/account/saved-feed/`):**
  - Page file `app/account/saved-feed/page.tsx` (thin wrapper, with the sign-in guard).
  - Feed component `components/saved-feed.tsx`, with the "Add a saved search" button that opens a form, and a Grid/List view control. The view control is one dropdown-style button showing the current view, which opens a menu with Grid and List and a tick on the chosen view.
  - Item component `components/saved-feed-item.tsx`, with grid and list layouts and a three-dot menu (Add to cart, Remove from saved for wishlist items, Share via WhatsApp).
  - Four sections: From your saved searches; From sellers you follow; From sellers you've been in touch with (messages only); Similar to your wishlist and recent views. Each card shows a short reason label.
- **Follow sellers:** `components/follow-seller-button.tsx`, shown on each seller shop page (`components/seller-view.tsx`). Guests are sent to log in.
- **Product view tracking:** `components/track-product-view.tsx`, included on the product page. Signed-in customers only. One row per product, newest on top.
- **Accounts:** Sign up, log in, forgot and reset password, account dashboard, profile and password change, log out. Wishlist syncs to the account when signed in; the cart does not sync. Email confirmation is currently off.
- **Product Detail Specifications:** Admin category field builder (`category_fields`) with required and filter flags, seller forms validated against required fields, dynamic filters in the catalogue sidebar (`buildSpecFacets`), specifications in the "Item description" pop-up in admin-defined order.
- **Best Offer:** Seller toggle (`accepts_offers`), in-app negotiation in message threads (accept, counter, decline, withdraw, pay at this price), offer cards with 48-hour expiry, cart and checkout offer pricing (`offerId` on cart items), automatic release on cancellation and unpaid card orders via cron.
- **Messaging:** `/messages/` inbox and thread view (`/messages/?c=<id>`), "Message" button on seller products (`MessageSellerButton`), "Make an offer" entry (`MakeOfferButton`, opens thread with `&offer=`), unread badge in header, seller dashboard messages card, admin messaging view with hide and restore. Thread polls every 20 seconds while visible.
- **Seller marketplace:** Application form with documents (private `seller-documents` bucket, signed URLs), seller dashboard (`/my-shop/`), seller product editor with live checklist, brand request from sellers, versions, photos, pause and resume per product (`seller_set_pause`), public sellers index (`/sellers/`), public shop pages (`/seller/[slug]/`), seller rating when reviews exist.
- **Reviews:** Product page review form (`components/review-form.tsx`, RPCs `review_status` and `submit_review`) for customers who received the product. Approved reviews shown on product pages. Admin moderation (`admin_reviews`, `admin_moderate_review`). Reviews show only after approval.
- **Admin (`/admin/`):** Tabs for Orders (confirm bank transfer, status changes, refunds that restock, cancel), Enquiries (mark replied), Messages, Reviews, Sellers (approve, reject, suspend, view documents), Products (create, hide and restore, visibility toggle, edit), Product fields (category field builder and missing-required report), Brands and categories (with in-use checks and real database error text). Unseen order and enquiry counts poll every 60 seconds with optional browser notifications. Paused products show a banner until acknowledged.
- **Build pipeline:** GitHub Actions deploy from `.github/workflows/deploy.yml`; rebuild queue (`rebuild_queue`) drained every 5 minutes by the `rebuild-site` Edge Function via `pg_cron` and `pg_net`.

## Database Changes Covered
- `reviews`: `status` ('pending' | 'approved'), `verified_purchase` boolean. Customers may insert reviews only as pending and not verified; approval is admin-only.
- `products.seller_paused`, `products.seller_paused_at`, `products.pause_seen_by_admin` (admin pause banner).
- `products.accepts_offers` (boolean, default false).
- `offers` table and functions (`make_offer`, `respond_to_offer`, `withdraw_offer`, `release_offer_on_cancel`, `release_unpaid_offers`), with cron job `release-unpaid-offers`.
- `conversations.hidden_by_admin`, `last_sender_id`, `buyer_last_read_at`, `seller_last_read_at`, `buyer_name`; functions `start_conversation`, `send_message`, `mark_conversation_read`, `admin_set_conversation_hidden`.
- `enquiries.handled` (the app uses this column; `Database_Schema_Summary.md` lists `replied`, so reconcile before use).
- `sellers` extended columns: `business_name`, `registration_number`, `tax_id`, `owner_full_name`, `owner_phone`, `address`, `bank_name`, `account_name`, `account_number`, `terms_version`, `terms_accepted_at`, `admin_note`, `reviewed_at`. Visitors must not read the private ones.
- `seller_documents.doc_type` values: `registration`, `owner_id`, `genuine_proof`. Bucket `seller-documents` is private.
- `addresses` and `wishlist_items` use owner-only RLS.
- **New (created and confirmed):**
  - `seller_follows` (`user_id`, `seller_id`, `created_at`; primary key on both ids; owner-only RLS policy "Customers manage own follows").
  - `saved_searches` (`id`, `user_id`, `label` 1 to 120 characters, `query`, `category_id`, `created_at`; owner-only RLS policy "Customers manage own saved searches").
  - `product_views` (`id`, `user_id`, `product_id`, `viewed_at`; index `product_views_user_recent`; owner-only RLS policy "Customers manage own product views").
- Storage bucket `product-images` is public. Path convention: `<product_id>/<timestamp>-<random>.jpg`. Helper `can_manage_product_photo(path)` must be kept when editing storage rules.
- `category_field_usage(p_category_id)` and `products_missing_required()` RPCs drive the Product fields admin screen.
- `seller_rating(p_slug)` RPC returns average and review_count for a seller.
- `pg_cron` runs `rebuild-site` every 5 minutes; `expire-offers` and `release-unpaid-offers` every 15 minutes.

## Decisions Made
- Header search uses an icon with a dropdown panel. The homepage search is the only full-width search.
- Product detail "Sold by" links to the seller shop; Sumus products link to `/about/`.
- Warranty period is shown on product pages under "Shop with confidence".
- Suspending a seller hides their products immediately.
- Reviews show only after approval.
- Admin screens show real database error text, not generic messages.
- Seller and admin product editors hide a product while it is being edited, then decide visibility again at the end.
- Cart items priced by an accepted offer stay at quantity 1 and cannot be changed.
- My Sumus menu: Preferences, My Collection and My Garage removed. Items without a built page show "Coming soon".
- Saved feed is personal and owner-only. Guests see the sign-in prompt, not a feed.
- Saved feed "Sellers you've been in touch with" uses messages only. Purchases are not yet a source. Revisit only if the owner asks.
- Product views are recorded for signed-in customers only, one row per product.
- The "Save this search" button appears on search results only. The feed's own form also creates searches.
- Duplicate workflow folder `.github/workflows /` (with a space) and `components/account-view.tsx` were deleted. Keep `components/account-addresses.tsx`, which `addresses-panel.tsx` uses.

## Active Priority Task & Next Steps
1. **Seller payouts (blocked until the owner answers):** The owner must answer four questions before any code is written:
   1. Does the seller's 90% apply to the item price only, or to the total including delivery?
   2. Who keeps the delivery fee?
   3. When are sellers paid: on delivery, after a set number of days (for returns), or weekly in a batch?
   4. Are payouts automatic through Paystack split payments (a subaccount per seller, created on approval, stored in `sellers.paystack_subaccount_code`), or manual bank transfers recorded by the site?
   Once answered: subaccount creation on approval, split logic in `create-order`, seller orders view in My shop, and payout tracking for admin.
2. **Unbuilt menu rows:** "Saved" and "Payments" (NEW) still show "Coming soon". "Buy again" and "Bids & offers" link to existing pages, but "Buy again" has no dedicated behaviour yet. Owner to confirm what each should do.
3. **Launch items:** Replace bank details in `lib/bank-details.ts`; replace placeholder contact details in `lib/site-config.ts`; update store branches in Supabase `stores`; legal review of policy wording and seller terms; switch Paystack to live keys in GitHub and Supabase; set Paystack fee bearer to the store; enable email confirmation; upgrade Supabase to Pro; add own domain and update redirect URLs; enable 2FA on Supabase, GitHub and Paystack; delete test data.
4. **Later:** Grid/list and three-dot menu are built; check any further visual changes against screenshots. Brand merge tool, coupons and discount codes, best sellers and frequently bought together, newsletter sending, transactional email and SMS (Resend, Termii), admin new-order email alert, live chat (optional), "Save this search" on more pages.

## Known Fragile Areas
- Static product, category and seller pages require Supabase to be reachable during build. Changes take up to 5 minutes to queue, plus build time, to appear on static pages. Listing pages update live.
- Public seller data depends on column privileges. A plain `sellers` select as a visitor will error; use `public_sellers`, or the granted columns listed above.
- New RLS policies must use `(select auth.uid())` and must not repeat existing checks.
- The storage seller rule depends on `can_manage_product_photo`. Do not replace it with a folder-name comparison.
- `rebuild_queue.done` may not update reliably; verify before depending on it.
- Photo upload converts images in the browser; HEIC may fail on some browsers. Ask users to use JPG.
- Suspending a seller leaves their products hidden after reactivation until they save them again.
- Build failures seen in practice: "Module not found" means an import path does not match a file in the commit; "Unexpected eof" means a file was pasted incomplete. Check the exact file path and that the file is whole.
- Next.js is version 15 (build log shows 15.5.29).

## Key Commands
- Dev Server: `npm run dev`
- Build Project: `npm run build`
