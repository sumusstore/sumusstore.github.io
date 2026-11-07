# Marketplace Database Schema (`supabase`)

This file is the structural overview of the Supabase database for the Sumus marketplace: tables, RLS policies, views, functions, triggers and scheduled jobs.

Items marked **(verify)** are referenced by the application code but their exact definition was not checked in the database. Confirm them in the Supabase Table Editor or SQL Editor before relying on them.

---

## 1. Core User & Marketplace Tables

### `profiles`
Profile details for buyers, sellers and administrators.
- `id` (uuid, primary key, references `auth.users.id`)
- `full_name` (text)
- `phone` (text)
- `role` (text): `'customer'` | `'admin'`

### `sellers`
Seller registrations, business details and approval status. Sumus's own stock is held on a seller row (`slug = 'sumus'`) owned by the admin account.
- `id` (uuid, primary key)
- `user_id` (uuid, unique, references `auth.users.id`)
- `kind` (text): `'individual'` | `'business'`
- `display_name` (text)
- `slug` (text, unique)
- `business_name` (text, nullable)
- `registration_number` (text, nullable)
- `tax_id` (text, nullable)
- `owner_full_name` (text)
- `state` (text)
- `address` (text)
- `status` (text): `'pending'` | `'approved'` | `'suspended'` | `'rejected'`
- `admin_note` (text, nullable)
- `reviewed_at` (timestamptz, nullable)
- `terms_version` (text) **(verify)**
- `terms_accepted_at` (timestamptz)
- `paystack_subaccount_code` (text, nullable). Not yet populated; subaccount creation is pending the payout decisions.
- `created_at` (timestamptz)
- **Private columns (never readable by visitors):** `account_number`, `bank_name`, `account_name`, `owner_phone`, `address`, `registration_number`, `tax_id`

**Sumus seller row:** `slug = 'sumus'`, kind `individual`, status `approved`, owned by the admin account. Its state and address must be kept current because the state is shown on the public seller page.

### `seller_documents`
Verification documents uploaded by sellers. Opened by admins through 5-minute signed URLs.
- `id` (uuid, primary key)
- `seller_id` (uuid, references `sellers.id`)
- `doc_type` (text): `'registration'` | `'owner_id'` | `'genuine_proof'`
- `file_path` (text)
- `created_at` (timestamptz)

### `seller_follows`
Customers following seller shops. Created and confirmed.
- `user_id` (uuid, not null, references `auth.users.id`, on delete cascade)
- `seller_id` (uuid, not null, references `sellers.id`, on delete cascade)
- `created_at` (timestamptz, not null, default `now()`)
- **Primary key:** `(user_id, seller_id)`

### `saved_searches`
Searches a customer asked the saved feed to watch. Created and confirmed.
- `id` (uuid, primary key, default `gen_random_uuid()`)
- `user_id` (uuid, not null, references `auth.users.id`, on delete cascade)
- `label` (text, not null, 1 to 120 characters)
- `query` (text, not null, default `''`)
- `category_id` (uuid, nullable, references `categories.id`, on delete set null)
- `created_at` (timestamptz, not null, default `now()`)

### `product_views`
One row per product per signed-in customer, recording the most recent view. Created and confirmed.
- `id` (uuid, primary key, default `gen_random_uuid()`)
- `user_id` (uuid, not null, references `auth.users.id`, on delete cascade)
- `product_id` (uuid, not null, references `products.id`, on delete cascade)
- `viewed_at` (timestamptz, not null, default `now()`)
- **Index:** `product_views_user_recent` on `(user_id, viewed_at desc)`

---

## 2. Catalog & Products Tables

### `categories`
Hierarchical product categories. Only subcategories (rows with no children) can hold products.
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `parent_id` (uuid, nullable, self-referencing)
- `sort_order` (integer)

### `brands`
Product brands. Sellers can add brands; exact duplicates are blocked.
- `id` (uuid, primary key)
- `name` (text, unique)
- `slug` (text, unique)

### `category_fields`
Detail fields set per subcategory by admins. Sellers must fill in required fields.
- `id` (uuid, primary key)
- `category_id` (uuid, references `categories.id`)
- `label` (text), unique per category
- `field_type` (text): `'text'` | `'number'` | `'choice'`
- `unit` (text, nullable)
- `options` (text array, nullable). Used by choice fields.
- `is_required` (boolean)
- `is_filter` (boolean). Only number and choice fields can be filters.
- `sort_order` (integer)

### `products`
Catalogue products. Every product has a seller: Sumus's own stock uses the Sumus seller row.
- `id` (uuid, primary key)
- `name` (text)
- `slug` (text, unique)
- `description` (text)
- `specifications` (jsonb). Values keyed by `category_fields` label.
- `brand_id` (uuid, references `brands.id`)
- `category_id` (uuid, references `categories.id`)
- `seller_id` (uuid, references `sellers.id`). Set to Sumus by default.
- `is_active` (boolean)
- `moderation` (text): `'live'` | `'hidden'`. Set by Sumus.
- `warranty_period` (text)
- `seller_paused` (boolean, default `false`)
- `seller_paused_at` (timestamptz, nullable)
- `pause_seen_by_admin` (boolean) **(verify default)**
- `accepts_offers` (boolean, default `false`)
- `created_at` (timestamptz)

### `product_variants`
SKUs, storage and colour options, pricing and stock.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `storage` (text, nullable)
- `colour` (text, nullable)
- `sku` (text, unique)
- `price_kobo` (integer)
- `compare_at_kobo` (integer, nullable)
- `stock_qty` (integer)
- `sale_ends_at` (timestamptz, nullable)
- `is_active` (boolean)

### `product_images`
Photo gallery references.
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `variant_id` (uuid, nullable, references `product_variants.id`)
- `image_url` (text)
- `position` (integer)

---

## 3. Orders & Transactions Tables

### `orders`
Order header.
- `id` (uuid, primary key)
- `order_number` (text, unique). Format `SS-XXXXXXXX-XXXX`.
- `user_id` (uuid, nullable, references `auth.users.id`). Null for guest orders.
- `status` (text): `'pending_payment'` | `'awaiting_transfer'` | `'paid'` | `'processing'` | `'shipped'` | `'delivered'` | `'cancelled'` | `'refunded'`
- `payment_method` (text): `'paystack'` | `'bank_transfer'`
- `email` (text)
- `phone` (text)
- `subtotal_kobo` (integer)
- `delivery_fee_kobo` (integer)
- `total_kobo` (integer)
- `shipping_address` (jsonb)
- `delivery_zone_id` (uuid, references `delivery_zones.id`)
- `store_id` (uuid, nullable, references `stores.id`)
- `admin_note` (text, nullable)
- `seen_by_admin` (boolean)
- `created_at` (timestamptz)

### `order_items`
Line items.
- `id` (uuid, primary key)
- `order_id` (uuid, references `orders.id`)
- `variant_id` (uuid, references `product_variants.id`)
- `product_name` (text)
- `variant_label` (text, nullable)
- `quantity` (integer)
- `unit_price_kobo` (integer)

### `payments`
Payment gateway log.
- `id` (uuid, primary key)
- `order_id` (uuid, references `orders.id`)
- `reference` (text)
- `amount_kobo` (integer)
- `currency` (text)
- `payload` (jsonb)

### `delivery_zones`
- `id` (uuid, primary key)
- `name` (text): `'Lagos'` | `'Outside Lagos'` | `'Store Pickup'`
- `fee_kobo` (integer)
- `min_days` (integer)
- `max_days` (integer)
- `is_active` (boolean)

### `stores`
Pickup branches.
- `id` (uuid, primary key)
- `name` (text)
- `address` (text)
- `state` (text)
- `phone` (text, nullable)
- `latitude` (numeric, nullable)
- `longitude` (numeric, nullable)
- `opening_hours` (text, nullable)
- `is_active` (boolean)

---

## 4. Messaging & Offer Tables

### `conversations`
Buyer-seller messaging threads.
- `id` (uuid, primary key)
- `buyer_id` (uuid, references `auth.users.id`)
- `seller_id` (uuid, references `sellers.id`). Always set, including for Sumus products.
- `product_id` (uuid, nullable, references `products.id`, on delete set null)
- `product_name` (text)
- `buyer_name` (text). First-name snapshot.
- `last_message_at` (timestamptz)
- `last_sender_id` (uuid, nullable)
- `buyer_last_read_at` (timestamptz, nullable)
- `seller_last_read_at` (timestamptz, nullable)
- `hidden_by_admin` (boolean, default `false`)
- `created_at` (timestamptz)
- **Unique:** `(buyer_id, seller_id, product_id)`

### `messages`
- `id` (uuid, primary key)
- `conversation_id` (uuid, references `conversations.id`, on delete cascade)
- `sender_id` (uuid, references `auth.users.id`)
- `body` (text). 1 to 2000 characters.
- `created_at` (timestamptz)

### `offers`
Price negotiation records inside conversations.
- `id` (uuid, primary key)
- `conversation_id` (uuid, references `conversations.id`, on delete cascade)
- `variant_id` (uuid, references `product_variants.id`, on delete cascade)
- `buyer_id` (uuid, references `auth.users.id`, on delete cascade)
- `seller_id` (uuid, references `sellers.id`, on delete cascade)
- `amount_kobo` (integer, check > 0)
- `listed_price_kobo` (integer, check > 0)
- `made_by` (text): `'buyer'` | `'seller'`
- `parent_offer_id` (uuid, nullable, references `offers.id`, on delete set null)
- `status` (text): `'pending'` | `'accepted'` | `'declined'` | `'countered'` | `'withdrawn'` | `'expired'` | `'used'`
- `expires_at` (timestamptz)
- `responded_at` (timestamptz, nullable)
- `order_id` (uuid, nullable, references `orders.id`, on delete set null)
- `created_at` (timestamptz)

---

## 5. Reviews, Customer & Other Tables

### `reviews`
- `id` (uuid, primary key)
- `product_id` (uuid, references `products.id`)
- `user_id` (uuid, references `auth.users.id`)
- `rating` (integer, 1 to 5)
- `comment` (text, nullable)
- `status` (text): `'pending'` | `'approved'`. Only approved reviews are shown.
- `verified_purchase` (boolean)
- `created_at` (timestamptz)

### `addresses`
- `id`, `user_id`, `label` (nullable), `full_name`, `phone`, `state`, `area` (nullable), `street`, `is_default`

### `wishlist_items`
- `id`, `user_id`, `variant_id`
- **Unique:** `(user_id, variant_id)`

### `enquiries`
Contact and bulk sales messages.
- `id` (uuid, primary key)
- `kind` (text): `'contact'` | `'bulk'`
- `name`, `email`, `phone` (nullable), `company` (nullable), `message`
- `handled` (boolean, default `false`). The app uses this column.
- `created_at` (timestamptz)

### `newsletter_subscribers`
- `id` (uuid, primary key), `email` (text, unique)

### `rebuild_queue`
Queue for the GitHub Pages rebuild.
- `id` (bigint, primary key)
- `reason` (text), e.g. `product <slug>`, `category <slug>`, `seller <slug>`
- `created_at` (timestamptz)
- `done` (boolean). May not update reliably; check before relying on it.

---

## 6. Views

### `public_sellers` (`security_invoker = true`)
Approved sellers only. Exposes `slug`, `display_name`, `kind`, `state`, `created_at`, `status`. Visitors may read these columns only.

---

## 7. Stored Functions

### Access and status helpers
- `is_admin()`: true when `profiles.role = 'admin'` for `auth.uid()`.
- `current_seller_id()`: the approved seller id for `auth.uid()`, or null.
- `offer_window()`: returns `interval '48 hours'`.
- `max_buyer_offers()`: returns `3`.
- `offer_payment_grace()`: returns `interval '1 hour'`.
- `seller_product_ready(product_id)`: true when a product has a name of at least 3 characters, a brand, a category, a description of at least 20 characters, a warranty, a photo and an active variant priced above zero.
- `can_manage_product_photo(path)`: true when the first folder of a storage path is a product id owned by the current seller. Keep this helper when editing storage rules.

### Products and sellers
- `seller_set_pause(p_product_id, p_paused)`: toggles `seller_paused` for the seller's own product.
- `seller_rating(p_slug)`: returns average rating and review count for a seller.
- `category_field_usage(p_category_id)`: returns how many products use each field.
- `products_missing_required()`: lists live products missing a required detail.

### Triggers
- `products_default_sumus_seller` (before insert on `products`): sets `seller_id` to the Sumus seller when none is given.
- `guard_product_changes()` (on `products`): sellers cannot change `seller_id` or `moderation`, and cannot show a product Sumus has hidden. Admin changes are allowed.
- `check_seller_publish()` (on `products`): blocks sellers from showing an incomplete product.
- `pause_seller_products()` (on `sellers`): hides all products when a seller leaves `approved`.
- `queue_site_rebuild()` (on `products` and `categories`): writes to `rebuild_queue` for changes that affect public pages.
- `queue_seller_rebuild()` (on `sellers`): queues a rebuild on approval, rename, slug, state, kind or status change.
- `release_offer_on_cancel()` (on `orders`): returns an attached offer to `accepted` (or `expired`) when an order is cancelled.
- `handle_new_user()`: creates a `profiles` row on sign-up.
- `notify_site_rebuild()`: old, replaced by the queue. Can be removed.

### Orders and payment
- `mark_order_paid(reference, amount_kobo, currency, payload)`: marks an order paid, reduces stock and records any overpayment in `admin_note`.
- `admin_confirm_bank_transfer(p_order_id)`: admin only. Marks a bank transfer order paid. Returns `already_processed`, `paid_short_stock` or success.
- `admin_set_order_status(p_order_id, p_status)`: admin only. Restocks on cancel or refund.
- `release_unpaid_offers()`: releases offers linked to unpaid card orders past the grace period.

### Messaging and offers
- `start_conversation(p_product_id)`: returns the conversation id for the buyer and the product's seller, creating it if needed.
- `send_message(p_conversation_id, p_body)`
- `mark_conversation_read(p_conversation_id)`
- `admin_set_conversation_hidden(p_conversation_id, p_hidden)`: admin only.
- `make_offer(p_conversation_id, p_variant_id, p_amount_kobo)`: validates stock, listed price, open offers and the buyer's limit, then creates a pending offer.
- `respond_to_offer(p_offer_id, p_action, p_amount_kobo)`: `'accept'`, `'decline'` or `'counter'`. A counter resets the expiry window or inserts a counter offer.
- `withdraw_offer(p_offer_id)`: withdraws a pending offer made by the sender.

### Reviews and moderation
- `review_status(p_product_id)`: returns `can_review`, `already` or `not_eligible` for the signed-in customer.
- `submit_review(p_product_id, p_rating, p_comment)`
- `admin_reviews(p_status)`: admin only. Lists reviews by status.
- `admin_moderate_review(p_review_id, p_action)`: admin only. `'approve'` or `'remove'`.

---

## 8. Row-Level Security

All policies use `(select auth.uid())`.

- **profiles:** "Users read own profile"; "Users update own name and phone".
- **addresses:** "Customers manage own addresses" (owner only).
- **wishlist_items:** "Customers manage own wishlist" (owner only).
- **seller_follows:** "Customers manage own follows" (owner only, all operations).
- **saved_searches:** "Customers manage own saved searches" (owner only, all operations).
- **product_views:** "Customers manage own product views" (owner only, all operations).
- **orders:** "Customers read own orders". **order_items:** "Customers read own order items". Writes go through Edge Functions.
- **conversations and messages:** participants only, and hidden conversations are excluded for buyer and seller. Writes go through the functions above.
- **offers:** participants read. Writes go through the offer functions.
- **reviews:** "Customers read own reviews"; "Customers write own reviews" (insert only, pending, not verified by the client). Public read of approved reviews **(verify name)**.
- **Public catalogue reads:** categories "Public read categories"; brands "Public read brands"; products, variants and images public read for active rows **(verify names)**.
- **Admin writes:** categories and brands use separate insert, update and delete rules, each checking `is_admin()`. Brands also allow inserts from approved sellers ("Admins and approved sellers add brands").
- **sellers:** "Sellers read own application"; "Sellers apply once as pending" (insert, status pending); "Public read approved sellers" (select where `status = 'approved'`). Column privileges limit visitors to `id`, `slug`, `display_name`, `kind`, `state`, `created_at`, `status`.
- **Seller products:** "Sellers read own products", "Sellers add products", "Sellers edit own products", "Sellers manage own versions", "Sellers manage own photos".
- **seller_documents:** "Sellers add own documents"; "Sellers read own documents". Admin reads exist **(verify names)**.
- **enquiries:** public insert from the contact and bulk forms; admin read and update **(verify names)**.
- **newsletter_subscribers:** public insert **(verify name)**.

---

## 9. Storage

- **Bucket `product-images`** (public). Path: `<product_id>/<timestamp>-<random>.jpg`.
  - "Admins upload product images" and "Admins delete product images".
  - "Sellers upload photos for own products" (insert) and "Sellers remove photos for own products" (delete). Both use `can_manage_product_photo`.
- **Bucket `seller-documents`** (private). Accessed through 5-minute signed URLs.
  - "Sellers upload own documents" (insert).
  - "Sellers and admins read documents" (select).

---

## 10. Scheduled Cron Jobs (`pg_cron`)

- **`expire-offers`** (every 15 minutes): sets pending or accepted offers past `expires_at` to `'expired'`.
- **`release-unpaid-offers`** (every 15 minutes): calls `public.release_unpaid_offers()`.
- **`rebuild-site`** (every 5 minutes): calls the `rebuild-site` Edge Function through `pg_net` when `rebuild_queue` has pending items.

---

## 11. Edge Functions (reference)

- `create-order`: validates the cart on the server, creates the order, starts a Paystack transaction or records a bank transfer order. Attaches `user_id` when signed in. **Source not in the project files.**
- `verify-payment`: checks a Paystack reference, then calls `mark_order_paid`.
- `paystack-webhook`: verifies the HMAC-SHA512 signature, then calls `mark_order_paid`. JWT verification off.
- `track-order`: guest lookup by order number and email.
- `rebuild-site`: starts the GitHub Actions deploy when `rebuild_queue` has pending rows. JWT verification off.

---

## 12. Planned Changes (not yet built)

- **Seller payouts:** a Paystack subaccount per seller, stored in `sellers.paystack_subaccount_code`, created on approval. Split logic in `create-order`. Blocked until the owner answers the four payout questions in `CLAUDE.md`.
- **Payout tracking:** a payout record per seller order, once the payout rules are confirmed.
- **Payment proof:** a private storage bucket and a proof reference on `orders`, for bank transfer proof uploads.
