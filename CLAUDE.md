# Project Overview & AI Operating Rules

## Project Context
- **Project Name:** Sumus Marketplace (Nigerian multi-vendor e-commerce store selling building materials, electrical products, laptop and gaming accessories, AC and fridge repair parts, solar and power products, smart home devices, and third-party seller shops).
- **Live Site:** https://sumusstore.github.io
- **Tech Stack:** Next.js 15 (App Router, static export `output: "export"`, `trailingSlash: true`, `images: { unoptimized: true }`), React 19, TypeScript 5 (strict), Tailwind CSS 4 (`@theme` in `app/globals.css`), Zustand 5 (persisted to `localStorage`), Supabase (Postgres, Auth, Storage, Edge Functions, `pg_cron`, `pg_net`), Paystack (card, bank, USSD), GitHub Pages (GitHub Actions deploy on push to `main`).
- **Build Environment:** The owner works from a phone browser and has no computer. Give step-by-step, plain-language instructions for any database or dashboard work, with exact text to paste and clear confirmation checks. Avoid unexplained technical jargon.

## Token-Saving & Workflow Rules
1. **Full File Replacement Mode:** Output the complete, full code for a single file when asked for a fix or feature so the old file can be replaced in one go. Check that the last line is `}`.
2. **One File at a Time:** Focus on the specific file requested. Never rewrite or output multiple files or the whole project at once.
3. **Database Awareness:** Refer to the tables, views, and functions in `Database_Schema_Summary.md` and the changes listed below.
4. **No Conversational Fluff:** Skip long greetings. Give the complete file code, followed by a short one-sentence summary.
5. **Test Steps:** After each file, give a short phone test the owner can run to confirm the change works.
6. **Inline Responses:** The owner prefers inline text answers over file downloads or interactive widgets.
7. **Security:** Never expose Supabase `service_role` keys or Paystack secret keys in client code. RLS policies must use `(select auth.uid())`. Third-party sellers access public vendor data only through `public_sellers` or explicitly granted columns (`id`, `slug`, `display_name`, `kind`, `state`, `created_at`, `status`).
8. **Database Scripts:** Give SQL in a single block the owner can paste into the Supabase SQL Editor. Warn them if a script must not be run twice, and say what to check afterwards.

## Core Architecture & Reference Rules
- **Reference Model:** eBay ONLY (seller shop pages, "Sold by" with a shop link on every product, listing filters and sort, eBay-style messaging, Best Offer). Do not copy or refer to other marketplaces.
- **Approval System:** Sumus approves each seller and each product listing before it goes live. Sumus can hide any product or conversation at any time.
- **Multi-Vendor Model:** Every product belongs to an approved seller. Sumus's own stock is sold through its own seller record, `slug = 'sumus'`, which is owned by the owner's admin account. Approved sellers are queried via `public_sellers` (`security_invoker = true`).
- **Money Handling:** Prices are stored as integers in **kobo** (`price_kobo`, `amount_kobo`) and formatted with `formatNaira(kobo)` (`lib/format.ts`).
- **Static Export Constraints:** Built with `output: "export"` and `trailingSlash: true`. Dynamic routes rely on `generateStaticParams`.

## Sumus Seller Record (in place)
- The admin account (`adimonyechidi@gmail.com`) owns the seller row `slug = 'sumus'`, kind `individual`, status `approved`. No CAC number is held yet, so it's registered as individual. Add the CAC number later when available.
- Sumus's bank details are saved on this row. Keep the state and head office address up to date, since the state appears on the public seller page.
- A database trigger, `products_default_sumus_seller`, sets `seller_id` to Sumus on any new product that has no seller. All existing products with no seller were linked to Sumus.
- Sumus products now use the same messaging, shop links and offers as other sellers. The "Make an offer" button only appears on Sumus products when "accepts offers" is ticked, so leave it off unless wanted.
- Known test record: a seller named "B Seller Text" (slug `b-seller-text-0fhx`) exists in the database. Delete it when no longer needed.

## Completed & Confirmed Features
- **In-App Buyer-Seller Messaging:** `/messages/` inbox and conversation view (`/messages/?c=<id>`), Message button on seller products, unread badge in header, seller dashboard messages card, admin messaging view (`components/admin-conversations.tsx`).
- **Best Offer ("Make an offer"):** Seller toggle (`accepts_offers`), negotiation inside the message thread, offer cards (Accept, Counter, Decline, Withdraw, Pay at this price), 48-hour expiry (`offer_window()`), 3 lifetime buyer offers per variant (`max_buyer_offers()`), offer pricing in cart and checkout, automatic release on order cancellation (`release_offer_on_cancel()`) or unpaid card orders (`release_unpaid_offers()`).
- **Product Specification Fields:** Admin category field builder (`category_fields`), required validation on seller forms, dynamic catalogue filters (`specFacets`), specifications on product pages. Fields are set per subcategory only. Parent categories can't hold products.
- **Seller Controls:** Seller pause and resume per product (`seller_paused`), Sumus is notified of pauses, document uploads (`seller_documents`), live checklist.
- **Contact Routing:** The footer, mobile menu, wishlist summary, store locator empty state and cart now use the in-app contact form (`/contact/`) instead of WhatsApp. The cart's "Order on WhatsApp instead" button was removed.

## Bank Transfer Flow (current)
1. Customer chooses bank transfer at checkout. Order is saved as `awaiting_transfer`. Nothing is charged yet.
2. The confirmation page shows the bank details from `lib/bank-details.ts`, the exact total, and the order number as the reference.
3. Customer pays from their own banking app, then sends proof on WhatsApp (kept for now).
4. Owner checks the bank app, then uses **Confirm transfer received** in the admin Orders tab. Status becomes `paid`, stock is reduced, the order moves to processing.
5. Fulfilment buttons in admin: Start processing, Mark as shipped (or Ready for pickup), Mark as delivered (or Customer collected). Refund and Cancel are also available.
- **Open issue:** `lib/bank-details.ts` is one fixed account. It must not be used for orders containing seller items. Until the payout decision is made, bank transfer should be limited to Sumus's own products.

## Seller Payouts (decided in principle, not yet built)
- Each approved seller gets a Paystack subaccount, created on approval.
- Sumus keeps 10% of each seller's item sale. The seller keeps the delivery fee and bears refund costs.
- Card and USSD payments are split by Paystack at checkout. Sumus's own products are paid in full to Sumus.
- Bank transfer must not be used for mixed or seller orders, since the money would go to Sumus and the split would be manual.
- **Open decisions to confirm with the owner before building:**
  1. Who pays Paystack's transaction fees (Sumus or seller).
  2. Whether mixed carts (Sumus and seller items together) are allowed.
  3. Whether bank transfer is hidden when an order contains seller items.
  4. Payout timing, since Paystack settles on its own schedule and the "24 hours" target must be checked against the Paystack account.
- The `create-order` Edge Function source must be provided before changing the split. It is not in the project files.

## Active Priority Task & Next Steps
1. **Contact routing (in progress):** Replace the remaining WhatsApp links one file at a time. Done: footer, mobile menu, cart, wishlist, store locator. Next: order confirmation and order tracking, keeping WhatsApp only for bank transfer proof of payment for now. Then handle the card-payment help button and "Can't find your order?" link.
2. **Proof of Payment Upload (later):** A private storage bucket and upload on the order pages, with a proof view in admin. Guest orders would need an Edge Function that checks order number and email.
3. **Seller Payouts & Orders:** Paystack subaccount on approval, split in `create-order`, seller order management in My Shop.
4. **Verified Reviews & Moderation:** Admin review approval screen and verified buyer review form.
5. **Admin error messages:** The category form should show the real database error, as the seller editor already does.
6. **Housekeeping:** Delete the duplicate workflow folder `.github/workflows /` (note the space), keeping `.github/workflows/deploy.yml`.

## Launch Checklist
- Replace bank details in `lib/bank-details.ts` (currently a placeholder account).
- Replace contact placeholders in `lib/site-config.ts` (phone, email, address, social links currently "#").
- Update store branches in the Supabase `stores` table.
- Lawyer review of policy wording, seller agreement, commission and payout terms.
- Update `POLICY_LAST_UPDATED` in `lib/store-policies.ts`.
- Switch Paystack to live keys in GitHub and Supabase, add the webhook URL, and set the fee bearer to the store.
- Delete test orders, products, categories and sellers (including "B Seller Text").
- Turn on email confirmation in Supabase Auth.
- Upgrade Supabase to Pro. Add the custom domain and update site and redirect URLs.
- Turn on 2FA for Supabase, GitHub and Paystack.

## Key Commands
- Dev Server: `npm run dev`
- Build Project: `npm run build`
